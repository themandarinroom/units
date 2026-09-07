import { getUnit, saveUnit, getVocabularySets, getSpeakingPractices, makeId, yearLabel } from "./store.js";
import { getFirebaseServices } from "./firebase.js";
import { deleteWorkedExample, MAX_WORKED_EXAMPLES, prepareWorkedExample, uploadWorkedExample } from "./worked-examples.js";

const q = selector => document.querySelector(selector);
const form = q("#unit-form");
const list = q("#lessons");
const status = q("#status");
const saveButton = q("#save");
const requested = new URLSearchParams(location.search).get("unit");
const pending = new Map();
const removedPaths = new Set();
let currentUser = null;
let saving = false;
let vocab = [];
let speaking = [];

try { vocab = await getVocabularySets(); }
catch (error) { console.info("[Units] Vocabulary Library unavailable.", error); }
try { speaking = await getSpeakingPractices(); }
catch (error) { console.info("[Units] Speaking Practice Library unavailable.", error); }

let unit = requested ? await getUnit(requested) : null;
let lessons = unit?.lessons?.map(lesson => ({ ...lesson, workedExamples: [...(lesson.workedExamples || [])] })) || [];

q("#year").innerHTML = [0, 1, 2, 3, 4, 5, 6].map(year => `<option value="${year}">${yearLabel(year)}</option>`).join("");
if (unit) {
  q("#page-title").textContent = "Edit unit";
  q("#year").value = unit.yearLevel;
  q("#english").value = unit.englishTitle;
  q("#chinese").value = unit.chineseTitle || "";
}

const esc = (value = "") => { const element = document.createElement("div"); element.textContent = value; return element.innerHTML; };
const pendingFor = lessonId => pending.get(lessonId) || [];
const totalExamples = lesson => (lesson.workedExamples || []).length + pendingFor(lesson.id).length;
const errorMessage = error => ["permission-denied", "storage/unauthorized"].includes(error?.code)
  ? "This teacher account is not authorised to save Worked Examples."
  : error?.message || "Worked Examples could not be saved.";

function imageCard(example, index, isPending = false) {
  const source = isPending ? example.previewUrl : example.url;
  const label = example.alt || example.file?.name || `Worked example ${index + 1}`;
  return `<figure class="worked-example-thumb ${isPending ? "pending" : ""}"><img src="${esc(source)}" alt="${esc(label)}"><figcaption>${isPending ? "Ready to upload" : esc(label)}</figcaption><button type="button" data-remove-example="${esc(example.id)}" data-pending="${isPending}" aria-label="Remove ${esc(label)}">Remove</button></figure>`;
}

function render() {
  list.innerHTML = lessons.map((lesson, index) => {
    const missingSpeaking = lesson.speakingPracticeId && !speaking.some(item => item.id === lesson.speakingPracticeId);
    const savedExamples = lesson.workedExamples || [];
    const queuedExamples = pendingFor(lesson.id);
    const exampleCount = totalExamples(lesson);
    return `<article class="lesson-editor" data-index="${index}">
      <div class="lesson-top"><span class="lesson-number">${index + 1}</span><label class="title-field"><span>Lesson title</span><input data-field="title" value="${esc(lesson.title)}" maxlength="120"></label><div class="reorder"><button type="button" data-up aria-label="Move lesson up" ${index === 0 ? "disabled" : ""}>↑</button><button type="button" data-down aria-label="Move lesson down" ${index === lessons.length - 1 ? "disabled" : ""}>↓</button></div></div>
      <div class="lesson-editor-body"><div class="lesson-fields">
        <label>Learning intention<textarea data-field="learningIntention" rows="2">${esc(lesson.learningIntention)}</textarea></label>
        <label>Vocabulary<select data-field="vocabularySetId"><option value="">None</option>${vocab.map(item => `<option value="${item.id}" ${item.id === lesson.vocabularySetId ? "selected" : ""}>${esc(item.title)} · ${item.itemCount} items</option>`).join("")}</select></label>
        <label>Speaking<select data-field="speakingPracticeId"><option value="">None</option>${missingSpeaking ? `<option value="${esc(lesson.speakingPracticeId)}" selected>Unavailable · ${esc(lesson.speakingPracticeId)}</option>` : ""}${speaking.map(item => `<option value="${item.id}" ${item.id === lesson.speakingPracticeId ? "selected" : ""}>${esc(item.yearLevelLabel || item.yearLevelId)} · ${esc(item.title)}</option>`).join("")}</select>${missingSpeaking ? `<small class="warning">Speaking Practice unavailable. Select another practice or None.</small>` : ""}</label>
        <label>Activities / Notes<textarea data-field="notes" rows="3">${esc(lesson.notes)}</textarea></label>
        <label>Resources / Links<textarea data-field="resources" rows="2" placeholder="One URL or resource per line">${esc(lesson.resources)}</textarea></label>
      </div><aside class="worked-example-editor" aria-label="Worked Examples for lesson ${index + 1}">
        <div class="worked-example-heading"><div><h3>Worked Examples</h3><span>${exampleCount}/${MAX_WORKED_EXAMPLES}</span></div><p>Upload examples of completed student work.</p></div>
        <div class="worked-example-thumbs">${savedExamples.map((example, imageIndex) => imageCard(example, imageIndex)).join("")}${queuedExamples.map((example, imageIndex) => imageCard(example, savedExamples.length + imageIndex, true)).join("")}</div>
        <label class="upload-button ${exampleCount >= MAX_WORKED_EXAMPLES ? "disabled" : ""}">+ Add images<input data-images type="file" accept="image/png,image/jpeg,image/webp" multiple ${exampleCount >= MAX_WORKED_EXAMPLES ? "disabled" : ""}></label><small>PNG, JPG or WebP. Up to ${MAX_WORKED_EXAMPLES} images.</small>
      </aside></div><button type="button" class="delete" data-delete>Delete lesson</button>
    </article>`;
  }).join("") || `<p class="empty">No lessons yet. Add the first lesson.</p>`;

  list.querySelectorAll(".lesson-editor").forEach(element => {
    const index = Number(element.dataset.index);
    const lesson = lessons[index];
    element.querySelectorAll("[data-field]").forEach(field => field.oninput = () => { lesson[field.dataset.field] = field.value; });
    element.querySelector("[data-up]").onclick = () => move(index, -1);
    element.querySelector("[data-down]").onclick = () => move(index, 1);
    element.querySelector("[data-delete]").onclick = () => deleteLesson(index);
    element.querySelector("[data-images]").onchange = event => queueImages(lesson, [...event.target.files]);
    element.querySelectorAll("[data-remove-example]").forEach(button => button.onclick = () => removeExample(lesson, button.dataset.removeExample, button.dataset.pending === "true"));
  });
}

function move(index, direction) {
  const target = index + direction;
  [lessons[index], lessons[target]] = [lessons[target], lessons[index]];
  render();
}

function deleteLesson(index) {
  const lesson = lessons[index];
  (lesson.workedExamples || []).forEach(example => { if (example.storagePath) removedPaths.add(example.storagePath); });
  pendingFor(lesson.id).forEach(example => URL.revokeObjectURL(example.previewUrl));
  pending.delete(lesson.id);
  lessons.splice(index, 1);
  render();
}

async function queueImages(lesson, files) {
  const available = MAX_WORKED_EXAMPLES - totalExamples(lesson);
  const accepted = files.filter(file => file.type.startsWith("image/")).slice(0, available);
  if (!accepted.length) { status.textContent = available ? "Choose one or more image files." : `A lesson can contain up to ${MAX_WORKED_EXAMPLES} Worked Examples.`; return; }
  const queued = pendingFor(lesson.id);
  const initialCount = queued.length;
  try {
    for (const [index, file] of accepted.entries()) {
      status.textContent = `Preparing image ${index + 1} of ${accepted.length}…`;
      const blob = await prepareWorkedExample(file);
      const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2, 7)}`;
      queued.push({ id: `pending-${id}`, file, blob, previewUrl: URL.createObjectURL(blob) });
    }
  } catch (error) { queued.slice(initialCount).forEach(example => URL.revokeObjectURL(example.previewUrl)); queued.splice(initialCount); status.textContent = error.message || "An image could not be prepared."; render(); return; }
  pending.set(lesson.id, queued);
  status.textContent = files.length > accepted.length ? `${accepted.length} image${accepted.length === 1 ? "" : "s"} added; the lesson limit is ${MAX_WORKED_EXAMPLES}.` : `${accepted.length} image${accepted.length === 1 ? "" : "s"} ready to upload when you save.`;
  render();
}

function removeExample(lesson, exampleId, isPending) {
  if (isPending) {
    const queued = pendingFor(lesson.id);
    const index = queued.findIndex(example => example.id === exampleId);
    if (index >= 0) { URL.revokeObjectURL(queued[index].previewUrl); queued.splice(index, 1); }
    if (!queued.length) pending.delete(lesson.id);
  } else {
    const index = (lesson.workedExamples || []).findIndex(example => example.id === exampleId);
    if (index >= 0) { const [removed] = lesson.workedExamples.splice(index, 1); if (removed.storagePath) removedPaths.add(removed.storagePath); }
  }
  render();
}

q("#add-lesson").onclick = () => {
  lessons.push({ id: `lesson-${Date.now()}`, title: "", learningIntention: "", notes: "", vocabularySetId: "", speakingPracticeId: "", resources: "", workedExamples: [] });
  render();
};

form.onsubmit = event => event.preventDefault();
saveButton.onclick = async () => {
  if (saving || !form.reportValidity()) return;
  const englishTitle = q("#english").value.trim();
  if (!lessons.length) { status.textContent = "Add at least one lesson."; return; }
  const unitId = unit?.id || makeId(`${yearLabel(q("#year").value)}-${englishTitle}`);
  const hasImageChanges = [...pending.values()].some(items => items.length) || removedPaths.size > 0;
  const uploaded = [];
  saving = true;
  saveButton.disabled = true;
  try {
    if (hasImageChanges && !currentUser) throw new Error("Sign in with an authorised teacher account before saving Worked Examples.");
    const totalPending = [...pending.values()].reduce((sum, items) => sum + items.length, 0);
    let completed = 0;
    for (const lesson of lessons) {
      for (const queued of pendingFor(lesson.id)) {
        status.textContent = `Preparing Worked Example ${completed + 1} of ${totalPending}…`;
        const saved = await uploadWorkedExample(unitId, lesson.id, queued, progress => { status.textContent = `Uploading Worked Example ${completed + 1} of ${totalPending} · ${progress}%`; });
        lesson.workedExamples.push(saved);
        uploaded.push(saved);
        completed += 1;
      }
    }
    const clean = { id: unitId, yearLevel: Number(q("#year").value), englishTitle, chineseTitle: q("#chinese").value.trim(), lessons: lessons.map((lesson, index) => ({ ...lesson, id: lesson.id || `lesson-${index + 1}` })) };
    status.textContent = "Saving unit…";
    await saveUnit(clean, { requireCloud: hasImageChanges });
    await Promise.allSettled([...removedPaths].map(deleteWorkedExample));
    pending.forEach(items => items.forEach(example => URL.revokeObjectURL(example.previewUrl)));
    location.href = `view.html?unit=${encodeURIComponent(clean.id)}`;
  } catch (error) {
    await Promise.allSettled(uploaded.map(example => deleteWorkedExample(example.storagePath)));
    const uploadedIds = new Set(uploaded.map(example => example.id));
    lessons.forEach(lesson => { lesson.workedExamples = (lesson.workedExamples || []).filter(example => !uploadedIds.has(example.id)); });
    status.textContent = errorMessage(error);
    saving = false;
    saveButton.disabled = false;
  }
};

async function initialiseAuth() {
  try {
    const services = await getFirebaseServices();
    services.authSdk.onAuthStateChanged(services.auth, user => {
      currentUser = user;
      q("#auth-state").textContent = user ? user.email || "Teacher signed in" : "Not signed in";
      q("#sign-in").hidden = Boolean(user);
      q("#sign-out").hidden = !user;
    });
    q("#sign-in").onclick = () => services.authSdk.signInWithPopup(services.auth, new services.authSdk.GoogleAuthProvider()).catch(error => { status.textContent = error.message || "Sign in failed."; });
    q("#sign-out").onclick = () => services.authSdk.signOut(services.auth);
  } catch (error) {
    q("#auth-state").textContent = "Cloud unavailable";
    console.info("[Units] Teacher sign-in unavailable.", error);
  }
}

window.addEventListener("beforeunload", () => pending.forEach(items => items.forEach(example => URL.revokeObjectURL(example.previewUrl))));
render();
initialiseAuth();
