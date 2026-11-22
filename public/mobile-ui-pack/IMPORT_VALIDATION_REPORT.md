# Nexa AI v5.0 import validation

Validation completed: 2026-11-10

## Imported MCPTOP data

- Source row occurrences: **12,629**
- Unique stable record IDs in the searchable catalogue: **12,618**
- Exact stable IDs occurring in more than one dated snapshot: **11** (their dated source-row values are retained in each record's `snapshots[].sourceRecordFields`).
- Listing kinds: **11,316 apps**, **1,263 plugins**, **39 connectors**.
- Source categories: **15** MCPTOP category labels.
- Capability families: **12** Nexa families (inferred mapping, not official source taxonomy).
- Snapshot parts: **7** source PDF parts with separate date/page/source URL/coverage metadata.
- Partial extraction rows: **36**.
- Records whose extracted name is missing: **17**.

## Status vocabulary

- Activity/progress entries: **422**, all with unique IDs and mapped family/capability/workflow or cross-family state.
- Status: **generated-proposed-draft**. The original proposed 422-item source wording was not present in the supplied archive; this is the generated proposed draft retained from the previous build.

## State safeguards

- `available-to-connect`: 39 source rows classified as connector listings; live availability was not tested.
- `catalogue-only`: 12,579 records.
- `connected`: 0. `disconnected`: 12,618. No external authentication was attempted.
- `verified`: 0. The source `isVerified` field is null for all supplied rows.
- `unavailable` and `unsupported`: no record-level source evidence; filters are present but do not fabricate examples.
- No record is marked installed based solely on appearing in the directory.

## UI and package checks

- JavaScript syntax: `app.js`, `plugin_catalogue.js` and `catalogue-ui.js` passed Node syntax checks.
- ZIP archive integrity: passed CRC test.
- Browser harness: opened app, opened Plugins and searchable catalogue, searched by app name and capability keyword, opened a detail page, expanded dated source-version fields, filtered by listing type and connection availability, opened all 12 family cards and the 422-status library. No JavaScript runtime errors were reported.
- Listing type filter results: plugin 1,263; connector 39; app 11,316.

## Sources still missing

- The supplied archive contains only page 1 (2,000 of 12,404 header-count rows) from the November 9, 2026 MCPTOP snapshot, plus pages 2–7 (10,629 rows) from a separate November 10, 2026 snapshot. It does not contain the remaining six pages of the November 9 snapshot or page 1 of the November 10 snapshot. No claim of a complete single-date 12,404-row snapshot is made.
- The OpenApps November 8, 2026 record file was not in the uploaded archive. Its expected summary count of 6 families and 13 categories is recorded, but names and individual records remain not supplied / not verified.
