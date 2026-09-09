import { hasWebPSignature, prepareWorkedExample } from "../worked-examples.js?pipeline-v2";
import { encodeWebP } from "../vendor/jsquash-webp/encode.js?pipeline-v2";

const result = document.querySelector("#result");

function loadDimensions(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve({ width: image.naturalWidth, height: image.naturalHeight }); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Prepared WebP could not be decoded.")); };
    image.src = url;
  });
}

try {
  const canvas = document.createElement("canvas");
  canvas.width = 2400;
  canvas.height = 1200;
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#0b4d3b");
  gradient.addColorStop(1, "#f3e6c7");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#fff";
  context.font = "96px sans-serif";
  context.fillText("Worked Example", 180, 420);

  const png = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
  const prepared = await prepareWorkedExample(new File([png], "pipeline-test.png", { type: "image/png" }));
  const dimensions = await loadDimensions(prepared);

  const fallbackCanvas = document.createElement("canvas");
  fallbackCanvas.width = 64;
  fallbackCanvas.height = 32;
  const fallbackContext = fallbackCanvas.getContext("2d");
  fallbackContext.fillStyle = "#1f6f5c";
  fallbackContext.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
  const fallbackBytes = await encodeWebP(fallbackContext.getImageData(0, 0, fallbackCanvas.width, fallbackCanvas.height), .86);
  const fallbackBlob = new Blob([fallbackBytes], { type: "image/webp" });
  const checks = {
    sourcePngRejectedAsWebP: !await hasWebPSignature(png),
    outputType: prepared.type,
    outputBytes: prepared.size,
    outputSignature: await hasWebPSignature(prepared),
    dimensions,
    longestEdge: Math.max(dimensions.width, dimensions.height),
    fallbackSignature: await hasWebPSignature(fallbackBlob),
    fallbackBytes: fallbackBlob.size
  };
  const passed = checks.sourcePngRejectedAsWebP && checks.outputType === "image/webp" && checks.outputSignature
    && checks.longestEdge <= 1800 && checks.outputBytes <= 2 * 1024 * 1024 && checks.fallbackSignature;
  result.dataset.status = passed ? "passed" : "failed";
  result.textContent = JSON.stringify({ passed, ...checks }, null, 2);
} catch (error) {
  result.dataset.status = "failed";
  result.textContent = JSON.stringify({ passed: false, error: error.message }, null, 2);
}
