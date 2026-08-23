# QUEUED TASK

Protocol: AGENT-HANDOFF-V1

Phase: P2A-2R
Status: queued
Model: Terra
Strength: Medium

This task is preserved while AGENT-WATCHER-V1 is bootstrapped. After watcher bootstrap passes, GPT will restore this task to `agent/GPT_NEXT_TASK.md` with `Status: authorized`.

## Objective
Import the GPT-produced image-level visual observations for the same approved 10-image pilot into `image_visual_observation`, with strict validation and idempotency. Do not perform any new Vision analysis in Codex.

## Authoritative GPT input
Read exactly:
`inputs/p2a-2r-vision-observations.json`

## Preflight
Before canonical writes:
1. Verify local canonical DB is migrated through `008_p2a_visual_observation`. If not, apply existing migration 008 only.
2. Verify all 10 `asset_key` values exist exactly once.
3. Verify each asset's current `image_hash` case-insensitively equals the input `source_content_sha256`.
4. Verify each input `reference_key` matches the asset's existing `design_reference_image` linkage.
5. Verify producer metadata is exactly `assistant_model` / `gpt-5.6-sol` / `p2a-vision-v1`.
6. Validate every row against migration 008 constraints before writes.

If any identity/SHA/reference mismatch occurs, stop before semantic writes.

## Import behavior
Use the smallest deterministic importer needed for this pilot. Read the JSON input, resolve by `asset_key`, insert only into `image_visual_observation`, rely on DB constraints, preserve GPT wording, remain idempotent, and perform no reference-level synthesis.

## Allowed canonical writes
- `schema_migration` only if migration 008 must be applied locally
- `image_visual_observation` rows from the approved input

## Forbidden
No new Vision/OCR; no material/component/reference assessment/preference/theme/pattern/principle/market/supplier/packaging writes; no image/pHash mutation; no remaining-56 processing; no migration 009; no schema redesign; no OpenViking/FiftyOne/vector DB/embeddings.

## Validation
Prove manifest/identity/SHA/reference/producer validation, first-run import, second-run idempotency, no confirmed facts, no unrelated semantic table changes, and all regressions pass.

## Reporting
Update `outputs/GPT_HANDOFF.json` and `outputs/handoffs/P2A-2R.json`, then stop.