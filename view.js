import { getUnit, getVocabularySets, getSpeakingPractice, vocabularyUrl, speakingUrl, yearLabel } from "./store.js";

const app = document.querySelector("#app");
const id = new URLSearchParams(location.search).get("unit");
const unit = await getUnit(id);
let vocab = [];
try { vocab = await getVocabularySets(); } catch (error) { console.info("[Units] Vocabulary Library unavailable.", error); }
const speakingIds = [...new Set((unit?.lessons || []).map(lesson => lesson.speakingPracticeId).filter(Boolean))];
const speakingEntries = await Promise.all(speakingIds.map(async practiceId => [practiceId, await getSpeakingPractice(practiceId)]));
const speaking = new Map(speakingEntries);
const esc = (value = "") => { const element = document.createElement("div"); element.textContent = value; return element.innerHTML; };
const resources = value => String(value || "").split("\n").filter(Boolean).map(line => /^https?:\/\//i.test(line.trim()) ? `<a href="${esc(line.trim())}" target="_blank" rel="noopener">${esc(line.trim())} →</a>` : esc(line)).join("<br>");

if (!unit) {
  app.innerHTML = `<a class="back-link" href="./">← All units</a><section class="empty"><h1>Unit not found</h1></section>`;
} else {
  document.title = `${unit.englishTitle} · Unit Library`;
  app.innerHTML = `<a class="back-link" href="./">← All units</a><section class="unit-header"><div><p class="eyebrow">${yearLabel(unit.yearLevel)}</p><h1>${esc(unit.englishTitle)}</h1><p class="unit-chinese" lang="zh-Hans">${esc(unit.chineseTitle)}</p></div><div><strong>${unit.lessons.length} Lessons</strong><a class="button secondary" href="edit.html?unit=${encodeURIComponent(unit.id)}">Edit unit</a></div></section><section class="lesson-list">${unit.lessons.map((lesson, index) => {
    const vocabulary = vocab.find(item => item.id === lesson.vocabularySetId);
    const speakingPractice = speaking.get(lesson.speakingPracticeId);
    const speakingMarkup = speakingPractice
      ? `<a href="${speakingUrl(speakingPractice.id)}">${esc(speakingPractice.title)} →</a>`
      : lesson.speakingPracticeId
        ? `<p class="warning">Speaking Practice unavailable. <a href="edit.html?unit=${encodeURIComponent(unit.id)}">Edit unit</a></p>`
        : `<p class="muted">Not linked</p>`;
    return `<article class="lesson"><p class="eyebrow">Lesson ${index + 1}</p><h2>${esc(lesson.title || `Lesson ${index + 1}`)}</h2>${lesson.learningIntention ? `<div><h3>Learning intention</h3><p>${esc(lesson.learningIntention)}</p></div>` : ""}<div class="resource-grid"><div><h3>Vocabulary</h3>${vocabulary ? `<a href="${vocabularyUrl(vocabulary.id)}">${esc(vocabulary.title)} · ${vocabulary.itemCount} items →</a>` : `<p class="muted">Not linked</p>`}</div><div><h3>Speaking</h3>${speakingMarkup}</div></div>${lesson.notes ? `<div><h3>Activities / Notes</h3><p class="preline">${esc(lesson.notes)}</p></div>` : ""}${lesson.resources ? `<div><h3>Resources</h3><p class="links">${resources(lesson.resources)}</p></div>` : ""}</article>`;
  }).join("")}</section>`;
}
