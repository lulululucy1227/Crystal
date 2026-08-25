# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1

Phase: P2A-HISTORICAL-UPGRADE-B01-ASSET-READINESS-CHECK
Status: authorized
Model: Luna
Strength: Low

## Objective
Perform a bounded read-only readiness check for historical upgrade batch 01 before any canonical write. Determine whether the five existing historical image assets can safely accept GPT-authored P2A image observations using the current P2A-2R importer path without weakening the established source-byte/hash provenance boundary.

Do not import anything in this phase.

## Why Luna / Low
This is metadata inspection only. No schema, semantic judgment, image analysis, migration, or canonical write is authorized.

## Authoritative GPT-authored input
Read:
- `inputs/p2a-historical-upgrade-b01-vision-observations.json`

Exact assets/references:
- ASSET-000041 / IMG_7712.PNG / REF-000017
- ASSET-000042 / IMG_7713.PNG / REF-000017
- ASSET-000043 / IMG_7714.PNG / REF-000018
- ASSET-000044 / IMG_7715.PNG / REF-000018
- ASSET-000045 / IMG_7716.PNG / REF-000018

The input contains GPT-reviewed Google Drive provider file IDs and SHA-256 values for the exact source bytes. Treat the semantic observations as authored content only; do not rewrite them.

## Required checks
For each of the five assets, report current canonical values from `image_asset` and related P2A tables:
- asset_key
- linked reference_key(s)
- provider
- provider_file_id
- image_hash
- asset_status
- mime_type
- width_px
- height_px
- byte_size
- count of `image_perceptual_hash` rows
- count of `image_visual_observation` rows

Compare canonical provider/file-id/hash metadata to the GPT-authored input.

Classify each asset exactly as one of:
- `ready_for_observation_import`
  - canonical provider/file-id/hash already match the GPT-authored input and asset/reference linkage is exact
- `needs_verified_asset_resolution`
  - canonical provider/file-id and/or SHA-256 is missing/unresolved, so the current observation importer cannot safely proceed without a separate verified resolution step
- `conflict_blocked`
  - canonical provider/file-id/hash conflicts with the GPT-authored source identity or reference linkage

Do not modify missing metadata merely because the GPT input contains it. This task exists specifically to preserve the previously established rule that canonical asset resolution must not silently weaken its source-byte verification boundary.

## Main artifact
Create:
`outputs/p2a-historical-upgrade-b01-asset-readiness.json`

Include:
- exact five asset rows
- per-asset classification
- summary counts by classification
- whether the current `scripts/import-p2a-2r-visual-observations.mjs` can be reused as-is for this batch
- whether a separate verified asset-resolution step is required first
- current total `image_visual_observation` count
- current synthesis assertion/source counts

## Validation
Verify:
1. all five asset keys exist exactly once
2. exact reference linkage is REF-000017 for 41-42 and REF-000018 for 43-45
3. no image observation currently exists for these five assets
4. no DB write occurs
5. existing pilot image observations remain 45
6. synthesis remains 19 assertions / 37 source links
7. `PRAGMA integrity_check` = ok
8. `PRAGMA foreign_key_check` = 0 violations
9. `git diff --check` passes

## Boundaries
Allowed:
- read-only SQLite queries
- read-only inspection of existing importer/resolver code if needed
- `outputs/p2a-historical-upgrade-b01-asset-readiness.json`
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/P2A-HISTORICAL-UPGRADE-B01-ASSET-READINESS-CHECK.json`

Forbidden:
- any DB write
- source identity updates
- image hash/pHash updates
- image observation inserts
- synthesis inserts
- migrations
- semantic edits to GPT input
- pattern/theme/preference changes
- watcher/controller work
- new dependencies

## Reporting
Report whether all five are ready, require verified resolution, or conflict. If verified resolution is required, identify the exact missing canonical fields and STOP. Do not invent a weaker resolution method.

## Final response
PHASE:
P2A-HISTORICAL-UPGRADE-B01-ASSET-READINESS-CHECK

STATUS:
COMPLETED / BLOCKED

ASSETS CHECKED:
5 / <other>

READY FOR OBSERVATION IMPORT:
<count>

NEEDS VERIFIED ASSET RESOLUTION:
<count>

CONFLICT BLOCKED:
<count>

CURRENT IMPORTER REUSABLE AS-IS:
YES / NO

DB READ-ONLY:
PASS / FAIL

INVARIANTS:
PASS / FAIL

TESTS:
<result>

NEXT SAFE ACTION:
<one sentence>

COMMIT:
<sha or NONE>

WORKTREE CLEAN:
YES / NO

BLOCKER:
NONE or exact reason
