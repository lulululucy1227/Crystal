# P2A-1R Small Real-Image Resolution Pilot Report

**Status:** passed; deterministic-only pilot complete.  No work beyond P2A-1R was performed.

## 1. Input guard

`work/p2a-pilot` contained exactly the approved ten regular PNG files before canonical writes.  The resolver rejects any missing or unexpected regular file before opening a database transaction.

## 2. Provider identity validation

Every approved filename was mapped through the supplied `google_drive` provider-file ID to exactly one existing `image_asset`, and each still had an existing reference link.  No filename was used as an identity key.

## 3–5. Runtime and libraries

Isolated runtime: Python 3.12.13.  Pillow: 12.3.0.  ImageHash: 4.3.2 (`imagehash-4.3.2-hashsize-8`).  Only ImageHash was requested; its isolated transitive dependencies were SciPy 1.18.1 and PyWavelets 1.9.0.  No global PATH, Node, npm, or system Python changes were made.

## 6–8. Resolution outcome

Requested: 10.  Successfully resolved: 10.  Failed: 0.  All decoded as PNG / `image/png`; all are 1179 × 2556 pixels.  SHA-256 was calculated over the exact local bytes.  pHash was calculated with ImageHash pHash, 8×8 hash size.

## 9–13. Deterministic metadata and hashes

See the pilot asset table below.  Decoded format, MIME, dimensions, byte size, SHA-256 and pHash are deterministic values derived from the local bytes.  No extension/content conflict occurred.

## 14. `image_perceptual_hash` records

First run: 10 records created and bound to their source SHA-256.  Second run: 10 records reused; 0 created.  No duplicate pHash rows were created.

## 15–17. Duplicate analysis

Exact-content duplicate candidates: none.  Near-duplicate candidates: none.  The only comparison domain was the approved ten files.  Distance is 64-bit pHash Hamming distance; advisory threshold is ≤6, deliberately conservative.  Candidate output is report-only and never causes a merge.

## 18–20. Asset status and canonical write scope

All ten target assets moved from `unresolved` to `available`: local decoded content and complete deterministic metadata make this transition consistent with the current asset-status semantics.  Exactly ten pre-existing `image_asset` records received MIME, dimensions, byte size and SHA-256.  No semantic record was modified.

## 21. Idempotency

The same ten-file pilot was run twice.  Run 2 created 0 image assets, 0 reference links, 0 pHash records, and made 0 asset updates; it reused all 10 pHash records and returned identical technical values.

## 22–23. Tests and regression

New resolver tests (4/4 passed) cover manifest/missing/unexpected guards, malformed images, deterministic metadata/SHA/pHash, source-SHA binding, rerun idempotency, filename-independent provider identity, exact/nearest candidate non-merging, stale-content rejection, and semantic-table preservation.  Existing regression suite passed (26/26) and database validation passed: 30/30 total tests across the two controlled commands.

## 24–25. Schema and migrations

No schema change and no migration were created.  Database remains at `007_p2a_perceptual_hash`; the existing `image_perceptual_hash` table was used.

## 26–29. Boundary verification

Google Drive accessed: **No**.  Vision/OCR/CLIP/captioning/material or aesthetic inference used: **No**.  OpenViking touched: **No**.  Boundary violations: **None**.  The remaining 56 assets, source Excel files, other repositories, reference grouping and semantic/commercial tables were not processed or changed.

## 30. New blockers

None for this ten-file deterministic pilot.  The present pHash output is only a similarity candidate signal, not an assessment of product, material, theme, role, or quality.

## 31. Recommended next action

Stop here as scoped.  Before any larger batch or semantic image work, require a separately approved phase that defines its image acquisition boundary, batch failure policy and review workflow.  Do not extrapolate this ten-file result to the remaining 56 unresolved assets.

## Pilot asset table

| Asset Key | Reference Key | Provider File ID | Filename | Detected Format | MIME | Width | Height | Byte Size | SHA-256 | pHash | Asset Status | Exact Candidate | Near Candidate |
|---|---|---|---|---|---|---:|---:|---:|---|---|---|---|---|
| ASSET-000001 | REF-000002 | 1qS7NQNzDumzUY4AkUkG-yNZZMOJP4aAn | IMG_7633.PNG | PNG | image/png | 1179 | 2556 | 1,594,953 | 05ba38b10362bd951c93e713912c4f3a76d3e15d91f629a7c680f62257a6dcd6 | caa93556266199bb | available | None | None |
| ASSET-000002 | REF-000002 | 15J4Ez8epFIP9eUrnLRCL_is9aIwo1_18 | IMG_7634.PNG | PNG | image/png | 1179 | 2556 | 1,594,921 | 87a7cf4aef12ee8eb100eb923ada2d98d3e55e39ad091044894cdf67eb22390a | fc7d03c23c0de370 | available | None | None |
| ASSET-000015 | REF-000006 | 13g7OoySHNNqRTxDbM7C0KMQlPY4my7mr | IMG_7668.PNG | PNG | image/png | 1179 | 2556 | 1,325,133 | f47f2eee6479165038a3bdc76f621462e2045a14b8f9190b9a509f2e3ba3ab78 | ecb411c93675e915 | available | None | None |
| ASSET-000016 | REF-000006 | 1ZzYQA4n6qr8k0WIR2yERh73dB2rf0EeQ | IMG_7669.PNG | PNG | image/png | 1179 | 2556 | 1,341,008 | bafb91177301bf7dabbe5ef29a418511881a370ffd3aaf25815d59a1e7373ab8 | e9e9149d1216bd39 | available | None | None |
| ASSET-000046 | REF-000019 | 1g6yv6Us99R2cZo0LnkREVy1Ay06v2y21 | IMG_7717.PNG | PNG | image/png | 1179 | 2556 | 3,008,527 | b2008167960c87d9c8184cef9de9c52ef566c71b3738f8789e99ce562b0d02b0 | eca726ec608947d6 | available | None | None |
| ASSET-000047 | REF-000019 | 17LJ0d7HrM8q1_tZ90Tawg_d9ls0wpFcn | IMG_7718.PNG | PNG | image/png | 1179 | 2556 | 2,888,856 | 8df735481274242fb80556362679122ae360ae73587dc72d6ae278b8f0518df5 | d8e4669d4e8919d6 | available | None | None |
| ASSET-000048 | REF-000019 | 1hHNYxMLEigF5LWeRR2cr9jn4mpHfvmuC | IMG_7719.PNG | PNG | image/png | 1179 | 2556 | 1,636,419 | 70d1e4bb15a93440b8780537eaed8656acb59bbd3c99d5eecd56e5bb078fada2 | 8c8c5c9b53b353d2 | available | None | None |
| ASSET-000064 | REF-000025 | 18MJC1bptZd2zkKmQuqyrz__8dS66IUqB | IMG_7746.PNG | PNG | image/png | 1179 | 2556 | 1,696,576 | 42fd1f4ced83c8a65798f80db7e79e09e0db32edbfabe1303d21692a8eaf1115 | 852d7a6161d49eda | available | None | None |
| ASSET-000065 | REF-000025 | 1eM8jLX-2TBR_H-capyHhZwyhqcWKQVqY | IMG_7747.PNG | PNG | image/png | 1179 | 2556 | 1,789,490 | 0e7a86a50c8ef08285feb6abdbb5d00450a16a590315daa4f73c7a9e1fe4d5bd | c01d3f66fc9cc113 | available | None | None |
| ASSET-000066 | REF-000025 | 1GKxvYZThWTXNpkHEIoEzXlgiL1C6K5jQ | IMG_7748.PNG | PNG | image/png | 1179 | 2556 | 1,942,278 | 9d371da6b14dede64d09c5dfdf0180bd7cdc4b7e6fedd133e0c6916f41eb972e | f8852668d9b7e582 | available | None | None |

## No-write / boundary verification

| Check | Result |
|---|---:|
| New image assets created | 0 |
| New reference links created | 0 |
| Semantic design records modified | 0 |
| Material / market / supplier writes | 0 |
| Schema modified in this phase | No |
| Migration created in this phase | No |
| Google Drive accessed | No |
| Vision used | No |
| OpenViking touched | No |
| Other projects modified | No |

Canonical database checksum after the approved writes: `6A3B0723142E5497544BC04EF9A15052BFFF81381A3B9CEC9905150B681E4967`.
