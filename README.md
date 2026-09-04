# Unit Library v0.3.0

Unit Library is an independent peer application of Vocabulary Library and Speaking.

## Run locally

From this repository root:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/`.

Production target: `https://themandarinroom.github.io/units/`.

Units contain reusable curriculum content only: stable ID, year level, English and Chinese titles, and an ordered lesson list. Lessons store stable reference IDs for Vocabulary (`vocabularySetId`) and Speaking (`speakingPracticeId`); linked content is never copied into a Unit. Dates belong to a future scheduled Unit instance and are not part of this model.

For safe preview, the sample and edits persist under the browser key `mandarin-room-units-v0.1`. When an authorised teacher already has a Firebase session on the same origin, saves are also written to the separate `units` collection. This repository does not own or deploy shared Firebase rules.

Speaking v0.9.0 stores reusable differentiated practice bundles in `speakingPractices/{practiceId}`. Unit Library reads their titles for the teacher selector and opens Student Mode with `?practice={practiceId}`. Existing temporary references such as `year-4:core` are normalised to the migrated stable practice ID when a unit is loaded or saved. Missing or deleted references are shown as unavailable and can be replaced or removed in Edit unit.

Version 0.2.0 adds these stable Speaking Practice references while preserving the existing Unit data model and the `mandarin-room-units-v0.1` browser storage key for compatibility.

Vocabulary metadata is read directly from the shared Firebase `vocabularySets` collection. Unit documents retain only the stable set ID and link to `https://themandarinroom.github.io/vocabularylibrary/`.

## Read-only integration contract

Specialist Planner reads `unit-library-index.json`, a generated metadata-only snapshot owned by Unit Library. The index contains stable Unit/Lesson IDs, titles, year levels and canonical URLs; it contains no lesson descriptions, activities or teaching resources.

Canonical deep links are:

```text
https://themandarinroom.github.io/units/view.html?unit=<unitId>
https://themandarinroom.github.io/units/view.html?unit=<unitId>&lesson=<lessonId>
```

The Lesson view scrolls to and highlights the exact linked Lesson. An unknown Lesson ID leaves the Unit readable and displays a clear unavailable message. Unit Library remains the source of truth for all teaching content.

Generate the metadata snapshot from an authorised export of the Firebase `units` collection, then review and publish it with this repository:

```sh
node scripts/generate-unit-library-index.mjs /secure/path/units-export.json
node --test tests/*.test.mjs
```

The generator deliberately allowlists only IDs, year level, titles and canonical URLs. It never copies learning intentions, notes, activities, vocabulary, speaking references or resources into the index. Regenerate whenever Unit IDs, Lesson IDs or titles change in Firebase.
