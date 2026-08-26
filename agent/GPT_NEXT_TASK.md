# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1

Phase: P2A-NEW-REFERENCE-CRETACEOUS-COAST-FRAGMENTS-IMAGE-OBSERVATION-IMPORT
Status: authorized
Model: Terra
Strength: Medium

## Objective
Import the GPT-authored image-level observations for the newly created design reference `REF-000026` / user concept `白垩纪的海岸碎片` into canonical `image_visual_observation`, using the already verified source identities for ASSET-000067..069. Perform one canonical apply, replay for idempotency, validate invariants, and STOP.

Do not author or modify semantic content in Codex.

## Why Terra / Medium
This phase writes canonical semantic evidence rows. The exact assets, hashes and observation text are fixed by GPT, but provenance and replay must remain strict.

## Authoritative input
Read exactly:
- `inputs/p2a-new-reference-cretaceous-coast-fragments-image-observations.json`

Exact mapping:
- ASSET-000067 / IMG_7812.PNG / REF-000026
- ASSET-000068 / IMG_7813.PNG / REF-000026
- ASSET-000069 / IMG_7814.PNG / REF-000026

Expected totals from the authoritative input (corrected to match the actual authored rows):
- 3 assets
- 13 image-level rows
- 11 observation / 2 inference
- 10 product_design / 3 promotional_visual

The user concept name `白垩纪的海岸碎片` is design/narrative semantics only. It must not be treated as geological provenance or material fact.
Seller/source material labels remain source-stated claims only.

## Mandatory preflight
Reject the entire batch if any check fails:
1. protocol_version exactly `AGENT-HANDOFF-V1`
2. phase exactly `P2A-NEW-REFERENCE-CRETACEOUS-COAST-FRAGMENTS-IMAGE-OBSERVATIONS`
3. producer_type = `assistant_model`
4. producer_id = `gpt-5.6-sol`
5. analysis_version = `p2a-vision-v1`
6. reference_key exactly `REF-000026`
7. exactly 3 unique assets and exactly 13 rows
8. asset set exactly ASSET-000067..069
9. all three canonical provider/provider_file_id/source SHA values match the input exactly
10. all three assets link exactly to REF-000026
11. canonical asset_status is available
12. observation enum/text/confidence values satisfy migration 008 constraints
13. before first apply, these three assets have zero image_visual_observation rows unless this is an exact replay
14. current total image_visual_observation baseline is 67 before first apply
15. current synthesis baseline remains 19 assertions / 37 sources
16. integrity_check ok and FK check zero

No partial import.

## Apply behavior
Reuse the generalized existing image-observation importer created for B01. Do not create a second semantic importer unless strictly necessary; prefer a minimal extension of its accepted contract.

Insert exact GPT-authored rows only:
- canonical image_asset_id
- exact source_content_sha256
- exact observation_scope
- exact assertion_class
- exact observation_type
- exact observed_value
- exact confidence
- producer_type / producer_id / analysis_version

Do not:
- rewrite or summarize observations
- infer materials
- promote seller claims
- create source claims in this phase
- create reference synthesis
- modify pattern/theme/preference
- alter asset identity or pHash

## Replay / idempotency
Immediately replay the same input.
Required:
- first apply: 13 created / 0 reused unless exact valid rows already exist
- replay: 0 created / 13 reused
- no duplicates

## Post-apply invariants
Verify:
- REF-000026's three assets contain exactly 13 current rows from this input
- class counts = 11 observation / 2 inference
- scope counts = 10 product_design / 3 promotional_visual
- total canonical image_visual_observation count becomes 80 (67 + 13)
- prior 67 observations remain unchanged
- synthesis remains 19 / 37
- image_asset identity remains unchanged
- pHash remains deferred/unchanged for these three assets
- no material/component/supplier/market/packaging writes
- no reference regrouping or pattern/theme/preference change
- integrity_check ok; FK violations 0

## Tests
Add only minimal focused tests required to support this exact contract while preserving previous pilot/B01 compatibility.
Run:
- focused importer tests
- `npm test`
- `npm run validate`
- `git diff --check`
- `PRAGMA integrity_check`
- `PRAGMA foreign_key_check`

## Allowed changes
- minimal safe generalization of existing observation importer/tests if required
- canonical image_visual_observation rows for ASSET-000067..069 only
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/P2A-NEW-REFERENCE-CRETACEOUS-COAST-FRAGMENTS-IMAGE-OBSERVATION-IMPORT.json`

## Forbidden
- edits to GPT-authored semantics
- reference synthesis rows
- confirmed material facts/source-claim promotion
- migrations
- new assets/reference links
- source identity changes
- pHash creation/fabrication
- pattern/theme/preference changes
- supplier/market/packaging work
- watcher/controller work
- new dependencies/frameworks

## Git behavior
If commit/push works normally, commit/push. If Git metadata is blocked, finish the authorized DB work/tests and return exact safe manual-finalize commands. Do not repair watcher/sandbox.

## Final response
PHASE:
P2A-NEW-REFERENCE-CRETACEOUS-COAST-FRAGMENTS-IMAGE-OBSERVATION-IMPORT

STATUS:
COMPLETED / READY_FOR_MANUAL_FINALIZE / BLOCKED

PREFLIGHT:
PASS / FAIL

INPUT ASSETS / ROWS:
<count> / <count>

FIRST APPLY CREATED / REUSED:
<created> / <reused>

REPLAY CREATED / REUSED:
<created> / <reused>

BATCH CLASS COUNTS:
<observation> / <inference>

BATCH SCOPE COUNTS:
<product_design> / <promotional_visual>

TOTAL IMAGE OBSERVATIONS:
<count>

SYNTHESIS ASSERTIONS / SOURCES:
<count> / <count>

INVARIANTS:
PASS / FAIL

TESTS:
<result>

GPT MAY AUTHOR REFERENCE SYNTHESIS NEXT:
YES / NO

COMMIT:
<sha or NONE>

WORKTREE CLEAN:
YES / NO

BLOCKER:
NONE or exact reason
