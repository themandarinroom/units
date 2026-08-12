# Unit Library v0.1

Unit Library is an independent peer application of Vocabulary Library and Speaking.

## Run locally

From this repository root:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/`.

Production target: `https://themandarinroom.github.io/units/`.

Units contain reusable curriculum content only: stable ID, year level, English and Chinese titles, and an ordered lesson list. Lessons store stable reference IDs for Vocabulary (`vocabularySetId`) and Speaking (`yearLevelId:practiceId`); linked content is never copied into a Unit. Dates belong to a future scheduled Unit instance and are not part of this model.

For safe preview, the sample and edits persist under the browser key `mandarin-room-units-v0.1`. When an authorised teacher already has a Firebase session on the same origin, saves are also written to the separate `units` collection. This repository does not own or deploy shared Firebase rules.

Speaking currently publishes two practices per year-level document rather than independent activities. v0.1 therefore uses the smallest stable reference available (`year-4:core`, for example) and opens the existing Speaking teacher interface at its separate production site. A future independent Speaking activity collection can replace the resolver without changing Lesson records generally.

Vocabulary metadata is read directly from the shared Firebase `vocabularySets` collection. Unit documents retain only the stable set ID and link to `https://themandarinroom.github.io/vocabularylibrary/`.
