# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1

Phase: P2A-2R
Status: authorized
Model: Terra
Strength: Medium

## Objective
Import the GPT-produced image-level visual observations for the same approved 10-image pilot into `image_visual_observation`, with strict validation and idempotency. Do not perform any new Vision analysis in Codex.

## Authoritative GPT input
Read exactly:
`inputs/p2a-2r-vision-observations.json`

This file was produced by GPT after directly reviewing the 10 approved pilot images. Treat it as the only semantic input for this phase.

## Preflight
Before canonical writes:
1. Verify local canonical DB is migrated through `008_p2a_visual_observation`. If not, apply existing migration 008 only.
2. Verify all 10 `asset_key` values exist exactly once.
3. Verify each asset's current `image_hash` case-insensitively equals the input `source_content_sha256`.
4. Verify each input `reference_key` matches the asset's existing `design_reference_image` linkage.
5. Verify producer metadata is exactly:
   - producer_type = `assistant_model`
   - producer_id = `gpt-5.6-sol`
   - analysis_version = `p2a-vision-v1`
6. Validate every row against migration 008 constraints before writes.

If any identity/SHA/reference mismatch occurs, STOP before semantic writes and report the exact mismatch.

## Import behavior
Implement the smallest deterministic importer needed for this pilot, preferably under `scripts/`, that:
- reads the JSON input;
- resolves assets by `asset_key`;
- inserts rows only into `image_visual_observation`;
- relies on DB constraints/triggers for SHA and append-only enforcement;
- is fully idempotent under the existing uniqueness rule;
- reports created vs reused rows;
- performs no reference-level synthesis.

Do not invent or rewrite GPT observation text.
Do not normalize semantic claims except whitespace-safe transport if required.
Do not promote any inference to confirmed fact.

## Allowed canonical writes
- `schema_migration` only if migration 008 must be applied locally;
- `image_visual_observation` rows from the approved input file.

## Allowed code/tests
- one minimal deterministic importer script if needed;
- focused importer/preflight/idempotency tests;
- required AGENT-HANDOFF files.

## Forbidden
- any new Vision/OCR/image analysis
- material/material_variant/component writes
- design_reference_observation/design_assessment/visual_communication_reference writes
- preference/theme/pattern/principle writes
- reference regrouping
- image asset or pHash mutation
- market/supplier/packaging writes
- processing the remaining 56 assets
- migration 009 or schema redesign
- OpenViking/FiftyOne/vector DB/embeddings

## Validation requirements
At minimum prove:
1. exact 10-asset manifest is accepted
2. unknown asset fails before writes
3. SHA mismatch fails before writes
4. reference mismatch fails before writes
5. invalid scope/class/confidence/producer metadata fails safely
6. first run imports all approved observation rows
7. second run creates 0 duplicates and reuses all rows
8. no confirmed-fact assertion is created
9. no non-`image_visual_observation` semantic tables change
10. all existing regression tests pass

## Reporting
Update:
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/P2A-2R.json`

Keep handoff concise and delta-only. Include:
- input asset count
- input observation row count
- rows created/reused
- observation vs inference counts
- product_design vs promotional_visual counts
- preflight result
- idempotency result
- tests
- canonical tables changed
- boundary check
- blockers/risks
- next minimum action

After push, STOP. Do not perform reference-level synthesis automatically.