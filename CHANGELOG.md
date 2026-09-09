# Changelog

## Version 0.3.1 — September 2026

- Add a right-hand Worked Examples panel to every Lesson.
- Let authorised teachers select, preview, upload and remove multiple images per Lesson.
- Optimise uploaded images to WebP and keep only image references in Unit documents.
- Stack Worked Examples below lesson content on tablet and mobile layouts.
- Verify RIFF/WebP bytes before upload and use a bundled libwebp encoder when native Canvas encoding falls back to PNG.
- Accept browser-decodable HEIC/HEIF source images without weakening the 1800px and 2 MiB limits.
- Version the editor's image-processing module URL so deployed browsers cannot reuse the pre-verification encoder from cache.

## v0.3.0 · 2026-09-04

- Added stable Unit and Lesson deep links with exact-Lesson focus and resilient missing-Lesson messaging.
- Added a generated, metadata-only integration index for Specialist Planner.
- Added contract tests proving teaching content is not copied into the index.

## Version 0.2.0 — August 2026

- Reference saved Speaking Practices by stable `speakingPracticeId`.
- Load available Speaking Practices into the Unit editor.
- Open linked practices directly in Speaking Student Mode.
- Normalise legacy temporary Speaking references where possible.
- Show clear unavailable and replacement controls for missing practices.
- Preserve the existing Unit data model and local browser storage key.

## Version 0.1.0 — August 2026

- Introduced the reusable Unit Library with ordered lesson references.
- Linked lessons to stable Vocabulary Library set IDs.
- Added local persistence with optional authorised Firebase synchronisation.
