import { getFirebaseServices } from "./firebase.js";

export const MAX_WORKED_EXAMPLES = 12;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_EDGE = 1800;
const stableId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

function canvasBlob(canvas, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("The image could not be prepared.")), "image/webp", quality));
}

export async function prepareWorkedExample(file) {
  if (!file?.type?.startsWith("image/")) throw new Error(`“${file?.name || "File"}” is not an image.`);
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  let blob = await canvasBlob(canvas, .86);
  if (blob.size > MAX_BYTES) blob = await canvasBlob(canvas, .68);
  if (blob.size > MAX_BYTES) throw new Error(`“${file.name}” is still larger than 2 MB after optimisation.`);
  return blob;
}

export async function uploadWorkedExample(unitId, lessonId, prepared, onProgress = () => {}) {
  assertIds(unitId, lessonId);
  const services = await getFirebaseServices();
  if (!services.auth.currentUser) throw new Error("Sign in with an authorised teacher account before uploading Worked Examples.");
  const file = prepared.file || prepared;
  const blob = prepared.blob || await prepareWorkedExample(file);
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
