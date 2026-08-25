# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1

Phase: P2A-HISTORICAL-UPGRADE-B01-OBSERVATION-IMPORT
Status: authorized
Model: Terra
Strength: Medium

## Objective
Import the already GPT-authored image-level observations for historical upgrade batch 01 into the canonical `image_visual_observation` table now that ASSET-000041..045 have verified canonical SHA-256/source identity. Make the smallest safe importer adaptation required, perform one canonical apply, prove replay idempotency, validate invariants, and STOP.

## Why Terra / Medium
This phase writes canonical semantic observation rows. The semantic content and exact five assets are already fixed, but incorrect persistence or provenance handling would contaminate the evidence chain, so use Terra / Medium.

## Authoritative input
Read exactly:
- `inputs/p2a-historical-upgrade-b01-vision-observations.json`

Do not rewrite, expand, summarize, reinterpret, or improve its semantic content.

Exact assets/references:
- ASSET-000041 / IMG_7712.PNG / REF-000017
- ASSET-000042 / IMG_7713.PNG / REF-000017
- ASSET-000043 / IMG_7714.PNG / REF-000018
- ASSET-000044 / IMG_7715.PNG / REF-000018
- ASSET-000045 / IMG_7716.PNG / REF-000018

Expected input-derived totals:
- 5 assets
- 22 image-level rows
- 20 `observation`
- 2 `inference`
- 17 `product_design`
- 5 `promotional_visual`

Also read:
- `outputs/handoffs/P2A-HISTORICAL-UPGRADE-B01-ASSET-RESOLUTION.json`
- existing `scripts/import-p2a-2r-visual-observations.mjs`
- migration `008_p2a_visual_observation.sql`

## Importer adaptation boundary
The existing P2A-2R importer is pilot-specific and hardcodes phase/asset-count assumptions. Do NOT create a parallel semantic data layer.

Prefer the smallest safe generalization of the existing importer so it can accept this authorized historical-batch contract while preserving all existing safety checks. Accept either:
- a narrowly generalized `scripts/import-p2a-2r-visual-observations.mjs`, or
- one small shared/general importer plus compatibility for the original pilot.

Do not add dependencies or a framework.

The original P2A-2R pilot import and tests must remain valid.

## Mandatory preflight before write
Reject the whole batch if any check fails:
1. protocol_version exactly `AGENT-HANDOFF-V1`
2. phase exactly `P2A-HISTORICAL-UPGRADE-B01`
3. producer_type exactly `assistant_model`
4. producer_id exactly `gpt-5.6-sol`
5. analysis_version exactly `p2a-vision-v1`
6. exactly five unique assets and exactly 22 observation rows are present
7. asset set is exactly ASSET-000041..ASSET-000045
8. reference linkage is exactly REF-000017 for 41-42 and REF-000018 for 43-45
9. provider is `google_drive` and provider_file_id matches canonical image_asset exactly
10. input source_content_sha256 matches canonical image_asset.image_hash exactly for all five
11. canonical asset_status is available and deterministic image metadata remains consistent
12. every observation_scope/assertion_class/confidence value satisfies migration 008 constraints
13. observation_type and observed_value are nonblank
14. no image_visual_observation rows currently exist for these five assets before first apply; if exact semantic identities already exist because of a replay, reuse them rather than duplicate
15. no reference regrouping, pattern/theme/preference proposal, material fact, or synthesis content is introduced by the importer
16. current canonical pilot baseline before apply remains 45 image_visual_observation rows and synthesis remains 19 assertions / 37 source links
17. integrity_check ok and foreign_key_check zero

No partial import.

## Canonical apply behavior
Use one transaction.

For each exact GPT-authored row, insert into `image_visual_observation` using:
- canonical image_asset_id
- canonical/input-matching source_content_sha256
- exact observation_scope
- exact assertion_class
- exact observation_type
- exact observed_value
- exact confidence
- producer_type / producer_id / analysis_version from input

Do not add confirmed material facts.
Do not convert inference into observation.
Do not merge or rewrite rows.
Do not write reference-level synthesis in this phase.

Reuse an existing row only when the full established semantic identity matches exactly. If an existing matching identity has conflicting confidence or source SHA, STOP.

## Replay / idempotency
Immediately replay the exact same input after first successful apply.

Required:
- first apply: 22 created / 0 reused, unless exact rows already exist from an earlier valid run
- replay: 0 created / 22 reused
- no duplicate rows
- no constraint error exposed for valid replay

## Post-apply invariants
Verify:
- these five assets have exactly 22 new/current P2A image observation rows
- class counts for this batch = 20 observation / 2 inference
- scope counts for this batch = 17 product_design / 5 promotional_visual
- total canonical image_visual_observation count becomes 67 (45 prior + 22 batch 01)
- original 45-row pilot fingerprint/content remains unchanged
- synthesis remains exactly 19 assertions / 37 source links; do not synthesize REF-000017/018 yet
- no image_asset/source identity changes in this phase
- no pHash changes
- no legacy P1C/reference/pattern/theme/preference/material/component/supplier/market/packaging changes
- integrity_check ok; FK violations 0

## Focused tests
Add only the minimum tests required for the generalized importer. Cover at least:
- valid B01 input preflight
- wrong phase/asset set rejected
- SHA mismatch rejected
- reference mismatch rejected
- invalid enum/blank semantic field rejected
- first apply exact counts
- replay exact reuse/no duplicates
- original P2A-2R pilot contract still supported/regression passes

Then run:
- focused tests
- `npm test`
- `npm run validate`
- `git diff --check`
- `PRAGMA integrity_check`
- `PRAGMA foreign_key_check`

## Allowed changes
- minimal safe generalization of existing image-observation importer
- focused importer tests
- canonical `image_visual_observation` rows for ASSET-000041..045 only
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/P2A-HISTORICAL-UPGRADE-B01-OBSERVATION-IMPORT.json`

## Forbidden
- edits to GPT-authored observation semantics
- source asset metadata changes
- pHash creation/fabrication
- reference-level synthesis inserts
- migrations
- new image assets/reference links
- reference regrouping
- pattern/theme/preference changes
- material/component/supplier/market/packaging work
- watcher/controller work
- new dependencies/frameworks

## Git behavior
If commit/push works normally, commit/push. If Git metadata is blocked, finish authorized DB work/tests and report exact safe manual-finalize commands. Do not weaken sandbox or permissions.

## Final response
PHASE:
P2A-HISTORICAL-UPGRADE-B01-OBSERVATION-IMPORT

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

GPT MAY AUTHOR B01 REFERENCE SYNTHESIS:
YES / NO

COMMIT:
<sha or NONE>

WORKTREE CLEAN:
YES / NO

BLOCKER:
NONE or exact reason
