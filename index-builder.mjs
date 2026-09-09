import { unitLibraryUrl } from "./deep-links.mjs";

export const UNIT_LIBRARY_PROVIDER = "the-mandarin-room-unit-library";

export function buildUnitLibraryIndex(units, generatedAt = new Date().toISOString()) {
  const visibleUnits = units
    .filter(unit => unit && unit.deleted !== true && String(unit.id || "").trim())
    .map(unit => ({
      id: String(unit.id),
      yearLevel: Number(unit.yearLevel),
      title: String(unit.englishTitle || unit.title || unit.id),
      url: unitLibraryUrl(unit.id),
      lessons: (Array.isArray(unit.lessons) ? unit.lessons : [])
        .filter(lesson => lesson && String(lesson.id || "").trim())
        .map(lesson => ({ id: String(lesson.id), title: String(lesson.title || lesson.id), url: unitLibraryUrl(unit.id, lesson.id) }))
    }))
    .sort((a, b) => a.yearLevel - b.yearLevel || a.title.localeCompare(b.title));

  return { schemaVersion: 1, provider: UNIT_LIBRARY_PROVIDER, generatedAt, units: visibleUnits };
}
