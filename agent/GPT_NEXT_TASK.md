# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1

Phase: P2A-HISTORICAL-UPGRADE-B01-ASSET-RESOLUTION
Status: authorized
Model: Terra
Strength: Medium

## Objective
Resolve the five existing historical image assets in batch 01 using the GPT-produced Google Drive connector verification manifest, so their canonical source identity is strong enough for the already-authored P2A image observations to be imported safely. Make only the minimum deterministic canonical asset metadata updates required, validate them, and STOP.

## Why Terra / Medium
This phase writes canonical source-identity fields (`image_hash` and deterministic image metadata). The scope is narrow and the exact values are fixed, but incorrect writes would weaken provenance, so use Terra / Medium.

## Authoritative manifest
Read exactly:
- `inputs/p2a-historical-upgrade-b01-asset-resolution-manifest.json`

The manifest was produced after GPT fetched the exact Google Drive objects by provider file ID through the connected Drive source, decoded those exact image bytes, and computed SHA-256, dimensions, byte size, MIME/detected format. Treat those fields as fixed source-verification data for this batch.

Also read:
- `outputs/p2a-historical-upgrade-b01-asset-readiness.json`
- `inputs/p2a-historical-upgrade-b01-vision-observations.json`
- existing `scripts/resolve-p2a-pilot.py` only as a safety-pattern reference

## Exact targets
- ASSET-000041 / IMG_7712.PNG / REF-000017 / Google Drive file `1sj4yVyrKqFaWW3De_BqOVF6LDZfrf6uW`
- ASSET-000042 / IMG_7713.PNG / REF-000017 / Google Drive file `1E0G8AwDni2flI8b7SNF00A2WH6zNiGG3`
- ASSET-000043 / IMG_7714.PNG / REF-000018 / Google Drive file `16EnrRPtS2C9DP7iJWsGCRod3gih-ret0`
- ASSET-000044 / IMG_7715.PNG / REF-000018 / Google Drive file `1mhsyhfirakXP1Pad0B9lYSQnDMW2vb3M`
- ASSET-000045 / IMG_7716.PNG / REF-000018 / Google Drive file `1jFLMGsNVTNwjx65Tfq1a2Zm3NHqvg3WC`

## Required implementation
Prefer the smallest deterministic batch resolver consistent with current project conventions. Reuse/adapt the safety pattern from `scripts/resolve-p2a-pilot.py`; do not create a framework or new dependency.

A small script such as:
`scripts/resolve-p2a-historical-assets.mjs`
or a narrowly generalized existing resolver is acceptable.

The resolver must consume the manifest and canonical DB only. Do not ask Codex to visually inspect or infer image content.

## Mandatory preflight before write
Reject the whole batch if any check fails:
1. manifest protocol/version and phase are exact and nonblank
2. exactly five unique assets are present
3. every `asset_key` exists exactly once
4. canonical provider is `google_drive`
5. canonical provider_file_id exactly matches the manifest
6. reference linkage exactly matches REF-000017 for 41-42 and REF-000018 for 43-45
7. manifest SHA-256 is exactly 64 lowercase hex chars
8. canonical `image_hash` is NULL/blank or exactly the same SHA; any different existing value = `CONTENT_CHANGED / CONFLICT_BLOCKED`
9. existing non-null MIME/width/height/byte-size fields must either match manifest exactly or cause STOP; do not overwrite conflicting metadata
10. no image_visual_observation exists yet for these five assets
11. existing pilot fingerprint remains 45 observations
12. synthesis remains 19 assertions / 37 source links
13. integrity_check ok; foreign_key_check zero

No partial write.

## Canonical write behavior
Use one transaction.

For each of the five existing assets, set only deterministic fields that are currently missing and are fixed by the manifest:
- `image_hash` = manifest SHA-256
- `mime_type`
- `width_px`
- `height_px`
- `byte_size`
- `asset_status` -> `available` only if current status is unresolved and all provenance checks pass

Do NOT alter:
- asset_key
- provider
- provider_file_id
- reference linkage
- source URLs beyond existing values
- any semantic/reference data

Do not create a new image_asset.
Do not create or modify design_reference_image linkage.

## pHash boundary
Do not fabricate or approximate pHash values from metadata alone. If the local execution does not have the verified source bytes for these five files, leave `image_perceptual_hash` unchanged. This does NOT block observation import because the current observation importer requires canonical SHA/source identity, not pHash. Report pHash rows explicitly as deferred if they remain absent.

Do not weaken any existing pHash rows or hashes.

## Replay / idempotency
Run the same resolver a second time after successful apply.
Required replay result:
- 0 conflicting rows
- 0 additional asset creation
- all five exact metadata identities reused/no-op

## Post-write readiness check
After apply, verify all five now satisfy the existing observation importer's source identity preconditions:
- canonical image_hash exactly equals the SHA in `inputs/p2a-historical-upgrade-b01-vision-observations.json`
- provider/file-id/reference mappings remain exact

Report `READY_FOR_OBSERVATION_IMPORT = 5` only if all five pass.

## Validation
Run focused resolver tests only as needed, plus:
- `npm test`
- `npm run validate`
- `git diff --check`
- `PRAGMA integrity_check`
- `PRAGMA foreign_key_check`

Verify after apply:
- pilot image observations still 45
- batch 01 observations still 0 (do not import them yet)
- synthesis remains 19 / 37
- no legacy/P1C semantic rows changed

## Allowed changes
- minimal deterministic resolver script and focused tests
- canonical deterministic metadata for ASSET-000041..045 only
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/P2A-HISTORICAL-UPGRADE-B01-ASSET-RESOLUTION.json`

## Forbidden
- image observation import
- synthesis import
- pHash fabrication
- new image assets or reference links
- migrations
- edits to GPT-authored semantic observations
- reference regrouping
- pattern/theme/preference changes
- material/component/supplier/market/packaging changes
- watcher/controller work
- new dependencies/frameworks

## Git behavior
If commit/push works normally, commit/push. If Git metadata is blocked, finish the authorized DB work/tests first and report exact safe manual finalize commands. Do not weaken permissions or resume watcher work.

## Final response
PHASE:
P2A-HISTORICAL-UPGRADE-B01-ASSET-RESOLUTION

STATUS:
COMPLETED / READY_FOR_MANUAL_FINALIZE / BLOCKED

PREFLIGHT:
PASS / FAIL

ASSETS RESOLVED:
<count>/5

SHA MATCH:
<count>/5

METADATA MATCH:
<count>/5

PHASH:
<created/reused/deferred>

REPLAY:
PASS / FAIL

READY FOR OBSERVATION IMPORT:
<count>/5

INVARIANTS:
PASS / FAIL

TESTS:
<result>

COMMIT:
<sha or NONE>

WORKTREE CLEAN:
YES / NO

BLOCKER:
NONE or exact reason
