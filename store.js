import { getFirebaseServices } from "./firebase.js";
import { listVocabularySets } from "./vocabulary-client.js";

const STORAGE_KEY = "mandarin-room-units-v0.1";
const COLLECTION = "units";
const clone = value => JSON.parse(JSON.stringify(value));
export const yearLabel = year => Number(year) === 0 ? "Prep" : `Year ${year}`;
export const sampleUnit = { id: "year4-australian-states-territories", yearLevel: 4, englishTitle: "Australian States and Territories", chineseTitle: "澳大利亚各州和直辖区", lessons: [
  { id: "introduction", title: "Introduction to Australian States", learningIntention: "Recognise the names of Australian states in Mandarin.", notes: "", vocabularySetId: "year4-australian-states", speakingPracticeId: "", resources: "" },
  { id: "where-have-you-been", title: "Where have you been?", learningIntention: "Ask and answer where someone has been.", notes: "Model the question and response, then practise with a partner.", vocabularySetId: "year4-australian-states", speakingPracticeId: "year4-australian-states-territories", resources: "" },
  { id: "speaking-practice", title: "Speaking practice", learningIntention: "Use state names confidently in a short exchange.", notes: "", vocabularySetId: "", speakingPracticeId: "year4-australian-states-territories", resources: "" },
  { id: "review-assessment", title: "Review and assessment", learningIntention: "Review and demonstrate the unit language.", notes: "", vocabularySetId: "", speakingPracticeId: "", resources: "" }
] };

const LEGACY_SPEAKING_REFERENCES = {
  "year-2:core": "year2-how-are-you", "year-2:challenge": "year2-how-are-you",
  "year-3:core": "year3-describing-age", "year-3:challenge": "year3-describing-age",
  "year-4:core": "year4-australian-states-territories", "year-4:challenge": "year4-australian-states-territories",
  "year-5:core": "year5-where-is", "year-5:challenge": "year5-where-is",
  "year-6:core": "year6-birthday", "year-6:challenge": "year6-birthday"
};
function normalizeLesson(lesson) { const { speakingActivityId, ...rest } = lesson; return { ...rest, speakingPracticeId: String(lesson.speakingPracticeId || LEGACY_SPEAKING_REFERENCES[speakingActivityId] || "") }; }
function normalizeUnit(unit) { return { ...unit, lessons: (unit.lessons || []).map(normalizeLesson) }; }

function localUnits() { try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY)); return Array.isArray(value) ? value : [clone(sampleUnit)]; } catch { return [clone(sampleUnit)]; } }
function cache(units) { localStorage.setItem(STORAGE_KEY, JSON.stringify(units)); }
const withTimeout = (promise, milliseconds) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out")), milliseconds))]);
export async function getUnits() { const local = localUnits().map(normalizeUnit); try { const s = await withTimeout(getFirebaseServices(), 800); const snap = await withTimeout(s.firestoreSdk.getDocs(s.firestoreSdk.collection(s.db, COLLECTION)), 800); const cloud = snap.docs.map(d => normalizeUnit(d.data())).filter(x => !x.deleted); if (cloud.length) return cloud; } catch (e) { console.info("[Units] Local preview mode.", e); } return local; }
export async function getUnit(id) { return (await getUnits()).find(unit => unit.id === id) || null; }
export async function saveUnit(unit) { const clean = normalizeUnit(clone(unit)); const units = localUnits().map(normalizeUnit); const i = units.findIndex(x => x.id === clean.id); if (i < 0) units.push(clean); else units[i] = clean; cache(units); try { const s = await getFirebaseServices(); if (s.auth.currentUser) await s.firestoreSdk.setDoc(s.firestoreSdk.doc(s.db, COLLECTION, clean.id), { ...clean, updatedAt: s.firestoreSdk.serverTimestamp(), updatedBy: s.auth.currentUser.uid }); } catch (e) { console.info("[Units] Saved locally; cloud save unavailable.", e); } return clean; }
export async function getVocabularySets() { return withTimeout(listVocabularySets(), 3000); }
export const vocabularyUrl = id => `https://themandarinroom.github.io/vocabularylibrary/?set=${encodeURIComponent(id)}`;
export const speakingUrl = id => `https://themandarinroom.github.io/speaking/student.html?practice=${encodeURIComponent(id)}`;
export async function getSpeakingPractices() { const s = await withTimeout(getFirebaseServices(), 3000); const snap = await withTimeout(s.firestoreSdk.getDocs(s.firestoreSdk.collection(s.db, "speakingPractices")), 3000); return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(item => item.deleted !== true).sort((a,b) => Number(a.yearLevelId?.replace(/\D/g,"")) - Number(b.yearLevelId?.replace(/\D/g,"")) || String(a.title).localeCompare(String(b.title))); }
export async function getSpeakingPractice(id) { if(!id)return null; try { const s=await withTimeout(getFirebaseServices(),3000); const snap=await withTimeout(s.firestoreSdk.getDoc(s.firestoreSdk.doc(s.db,"speakingPractices",id)),3000); return snap.exists()&&snap.data().deleted!==true?{id:snap.id,...snap.data()}:null; } catch(error){ console.info("[Units] Speaking Practice unavailable.",error); return null; } }
export function makeId(value) { return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || `unit-${Date.now()}`; }
