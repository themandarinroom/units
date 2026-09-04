import assert from "node:assert/strict";
import test from "node:test";
import { readUnitLibraryLocation, unitLibraryUrl } from "../deep-links.mjs";
import { buildUnitLibraryIndex } from "../index-builder.mjs";

test("Unit Library reads stable Unit and Lesson IDs from a deep link", () => {
  assert.deepEqual(readUnitLibraryLocation("?unit=year-5-countries&lesson=lesson-1788328454984"), { unitId: "year-5-countries", lessonId: "lesson-1788328454984" });
});

test("canonical lesson links encode both stable IDs", () => {
  assert.equal(unitLibraryUrl("unit with spaces", "lesson/4"), "https://themandarinroom.github.io/units/view.html?unit=unit+with+spaces&lesson=lesson%2F4");
});

test("metadata index is generated from source Units without teaching content", () => {
  const index = buildUnitLibraryIndex([{ id: "u-1", yearLevel: 5, englishTitle: "Nationalities", secretNotes: "do not copy", lessons: [{ id: "l-4", title: "Where are you from?", notes: "do not copy" }] }], "2026-09-04T00:00:00.000Z");
  assert.deepEqual(index.units[0], { id: "u-1", yearLevel: 5, title: "Nationalities", url: "https://themandarinroom.github.io/units/view.html?unit=u-1", lessons: [{ id: "l-4", title: "Where are you from?", url: "https://themandarinroom.github.io/units/view.html?unit=u-1&lesson=l-4" }] });
  assert.equal(JSON.stringify(index).includes("do not copy"), false);
});

test("deleted Units and Lessons without stable IDs are excluded", () => {
  const index = buildUnitLibraryIndex([{ id: "deleted", deleted: true, lessons: [] }, { id: "kept", yearLevel: 6, englishTitle: "Kept", lessons: [{ title: "No stable ID" }, { id: "stable", title: "Stable" }] }]);
  assert.deepEqual(index.units.map(unit => unit.id), ["kept"]);
  assert.deepEqual(index.units[0].lessons.map(lesson => lesson.id), ["stable"]);
});
