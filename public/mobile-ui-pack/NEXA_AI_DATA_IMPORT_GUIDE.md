# Nexa AI data import and catalogue guide

## What's integrated

- `plugin_catalogue.json`: normalized searchable catalogue with 12,618 unique stable IDs and 12,629 source-row occurrences: 11,316 app listings, 1,263 plugin listings and 39 connector listings.
- `plugin_catalogue.js`: the same catalogue exposed as `window.NEXA_PLUGIN_CATALOGUE` so the app works from Android local storage without a fetch/CORS dependency.
- `catalogue-ui.js`: search, filters, per-record detail views, capability family pages, activity library and import provenance screens.
- `capability_families.json`: the 12 requested Nexa capability families. Record-to-family assignment is inferred from source categories, names, slugs and short descriptions, not an official MCPTOP field.
- `activity_status_library.json`: 422 proposed user-visible task milestones. This is a generated draft, not the original wording: the previously referenced source list was not supplied or found.
- `CATALOGUE_IMPORT_MANIFEST.json`: source, snapshot, coverage and extraction-quality information.
- `mcptop_source_record_occurrences.json.gz`: all 12,629 extracted source row occurrences, before stable-ID reconciliation.
- `OPENAPPS_SNAPSHOT_STATUS.json`: explicitly records the missing OpenApps November 8 snapshot and its user-specified 6-family / 13-category summary counts without inventing labels or records.

## Important snapshot distinction

The uploaded `Podcasts.zip` contains seven MCPTOP PDFs:

- November 9, 2026: page 1 only, header count 12,404, 2,000 supplied rows (ranks 1–2,000).
- November 10, 2026: pages 2–7, header count 12,629, 10,629 supplied rows (ranks 2,001–12,629).

Thus, 12,629 source rows were extracted in total. Exact stable IDs reconcile to 12,618 unique catalogue records, with 11 IDs present in more than one dated snapshot. Each record's `snapshots[]` retains its original date/page and complete extracted source row fields. This is not a complete November 9 snapshot of 12,404 rows, and it is not a single same-day November 10 export because that day's page 1 was not supplied.

## Search and detail

Open the app and select Plugins. The Apps & plugins page links to the complete catalogue, 12 capability families and 422 activity statuses. Search matches app name, publisher, category, family name, capability terms, slug, source tier/type and short description. Filters also include listing type, source snapshot and availability/connection/verification state. Each record opens a detail view.

Source-supplied values are distinguished from inferred or unavailable details. The exported PDFs do not supply full functions, individual tool/action definitions, API endpoints, authentication methods or permissions. A zero tool count is retained as the source's numeric value; it is not expanded into invented tool definitions. Directory entries are not marked installed. Connector listing rows are labelled `available-to-connect` as a source listing classification only; all connections remain `disconnected` until a real authenticated integration exists. No record is marked verified because the source `isVerified` field is null for all imported rows. Unavailable and unsupported are valid UI states but have no source-evidenced records in this import.

## Capability-family mapping

The 12 family labels are the Nexa taxonomy requested by the user. Their assignment to individual MCPTOP rows is heuristic/inferred. They are not represented as official source taxonomy data. Source category labels are preserved separately. The MCPTOP snapshot contains 15 distinct source categories in the supplied rows. The OpenApps taxonomy summary is not merged with them.

## Running

Extract the ZIP and open `ai_mobile_ui_pack/index.html` in a modern browser. The catalogue and 422-status library are bundled for offline operation. The source-provided icons use URLs from the dataset and therefore may require an internet connection to display; icon URLs are retained as supplied and are not independently authenticated as official.

## Security and limitations

The package is a local front-end catalogue. It does not install plugins, authenticate users, connect services, request provider permissions or call undocumented APIs. A connected state can only be justified after a real provider authorization and connection check. Avoid placing tokens, passwords or API secrets in these static files.
