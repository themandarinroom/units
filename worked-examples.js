import { getFirebaseServices } from "./firebase.js";
import { encodeWebP } from "./vendor/jsquash-webp/encode.js";

export const MAX_WORKED_EXAMPLES = 12;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_EDGE = 1800;
const stableId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const imageExtension = /\.(?:png|jpe?g|webp|heic|heif)$/i;

function assertIds(unitId, lessonId) {
  if (!stableId.test(unitId) || !stableId.test(lessonId)) throw new Error("Save valid Unit and Lesson IDs before uploading images.");
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`“${file.name}” could not be read as an image.`)); };
    image.src = url;
  });
}

function nativeCanvasBlob(canvas, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("The image could not be prepared.")), "image/webp", quality));
}

export async function hasWebPSignature(blob) {
  if (!blob?.slice || blob.size < 12) return false;
  const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
}

async function canvasWebPBlob(canvas, context, quality) {
  const nativeBlob = await nativeCanvasBlob(canvas, quality);
  if (await hasWebPSignature(nativeBlob)) return nativeBlob;

  try {
    const encoded = await encodeWebP(context.getImageData(0, 0, canvas.width, canvas.height), quality);
    const fallbackBlob = new Blob([encoded], { type: "image/webp" });
    if (await hasWebPSignature(fallbackBlob)) return fallbackBlob;
  } catch (error) {
    console.info("[Units] Native WebP encoding unavailable; libwebp fallback failed.", error);
  }

  throw new Error("This browser could not create a genuine WebP image. Update the browser or try a current version of Chrome, Firefox or Safari.");
}

export async function prepareWorkedExample(file) {
  if (!file || (!file.type?.startsWith("image/") && !imageExtension.test(file.name || ""))) throw new Error(`“${file?.name || "File"}” is not an image.`);
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser could not prepare the image canvas.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let blob = await canvasWebPBlob(canvas, context, .86);
  if (blob.size > MAX_BYTES) blob = await canvasWebPBlob(canvas, context, .68);
  if (blob.size > MAX_BYTES) throw new Error(`“${file.name}” is still larger than 2 MB after optimisation.`);
  if (!await hasWebPSignature(blob)) throw new Error("The prepared image is not a genuine WebP file.");
  return blob;
}

export async function uploadWorkedExample(unitId, lessonId, prepared, onProgress = () => {}) {
  assertIds(unitId, lessonId);
  const services = await getFirebaseServices();
  if (!services.auth.currentUser) throw new Error("Sign in with an authorised teacher account before uploading Worked Examples.");
  const file = prepared.file || prepared;
  const blob = prepared.blob || await prepareWorkedExample(file);
  if (!await hasWebPSignature(blob)) throw new Error("Upload stopped because the prepared image is not a genuine WebP file.");
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const storagePath = `units/${unitId}/${lessonId}/worked-example-${id}.webp`;
  const imageRef = services.storageSdk.ref(services.storage, storagePath);
  const task = services.storageSdk.uploadBytesResumable(imageRef, blob, { contentType: "image/webp", cacheControl: "public,max-age=31536000,immutable" });
  await new Promise((resolve, reject) => task.on("state_changed", snapshot => onProgress(snapshot.totalBytes ? Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100) : 0), reject, resolve));
  return { id, url: await services.storageSdk.getDownloadURL(imageRef), storagePath, alt: file.name.replace(/\.[^.]+$/, "") };
}

export async function deleteWorkedExample(storagePath) {
  if (!/^units\/[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*\/worked-example-[a-z0-9-]+\.webp$/.test(storagePath || "")) return;
  const services = await getFirebaseServices();
  try { await services.storageSdk.deleteObject(services.storageSdk.ref(services.storage, storagePath)); }
  catch (error) { if (error.code !== "storage/object-not-found") throw error; }
}
