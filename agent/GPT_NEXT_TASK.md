# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1

Phase: P2A-2F1
Status: authorized
Model: Terra
Strength: Medium

## Objective
Implement the minimal schema foundation required for image-level Vision observations, based on the completed P2A-2F0 gap check. Do not run Vision in this phase.

## Approved design
Create exactly one new table for image-level visual observations. Preferred name: `image_visual_observation`.

The table must keep these semantics separate:
- direct visible evidence = `observation`
- appearance-based interpretation = `inference`
- confirmed fact = NOT stored here; confirmed facts remain separate and evidence-backed
- product-design observation vs promotional-visual observation
- image-level data vs later reference-level synthesis

## Minimum fields
Implement the smallest auditable structure containing:
- `id` primary key
- `image_asset_id` FK to `image_asset`
- `source_content_sha256` (64 hex chars)
- `observation_scope` CHECK: `product_design | promotional_visual`
- `assertion_class` CHECK: `observation | inference`
- `observation_type` nonblank TEXT
- `observed_value` nonblank TEXT
- `confidence` CHECK: `low | medium | high`
- `producer_type` CHECK: `assistant_model | human`
- `producer_id` nonblank TEXT
- `analysis_version` nonblank TEXT
- `supersedes_observation_id` nullable self-FK
- `created_at` default CURRENT_TIMESTAMP
- `notes` nullable

Do not add a wide set of fixed columns for color, lighting, symmetry, etc.

## Observation type vocabulary
Do NOT hard-code a large permanent CHECK vocabulary in migration 008. Keep `observation_type` as nonblank text so the schema remains extensible.

For later importers/tests, define a small application-level initial vocabulary only when needed for the 10-image pilot. Do not implement the Vision importer in this phase.

## Analysis version convention
Use a single opaque nonblank `analysis_version` string in the schema. Do not split prompt/model/schema versions into multiple columns yet.

The later Vision pipeline may use values such as `p2a-vision-v1`; exact runtime naming belongs to the later pilot, not this migration.

## Source SHA enforcement
The observation must be bound to the exact image bytes that were analyzed.

Add database enforcement so INSERT/UPDATE is rejected when:
- the referenced `image_asset.image_hash` is NULL, or
- `source_content_sha256` does not case-insensitively equal the referenced asset's current `image_hash`.

SQLite CHECK constraints cannot safely query another table, so use the smallest clear BEFORE INSERT / BEFORE UPDATE trigger(s) if needed.

Do not redesign `image_asset`.

## Append-only correction semantics
Corrections must preserve original AI rows.

- A later human or assistant correction is a new row.
- It may point to the prior row through `supersedes_observation_id`.
- Do not implement destructive overwrite semantics.
- Do not add a full review/workflow table.

Add a guard preventing a row from superseding itself. If a simple constraint can also prevent obvious invalid cross-asset superseding without overengineering, do so; otherwise document that importer validation will enforce same-asset lineage later.

## Idempotency
Add a uniqueness rule sufficient to prevent duplicate insertion of the same observation result for the same content/version/producer.

Preferred conceptual key:
`image_asset_id + source_content_sha256 + observation_scope + assertion_class + observation_type + observed_value + producer_type + producer_id + analysis_version`

Do not include `confidence`, `notes`, or `supersedes_observation_id` in the identity key.

## Migration
Create:
`migrations/008_p2a_visual_observation.sql`

Do not modify migrations 001–007.

Update `docs/schema.md` only as needed to document the new table and semantic boundary.

## Tests
Add focused tests proving at minimum:
1. clean migration through 008 passes
2. valid observation row inserts for an asset with matching SHA
3. NULL asset SHA blocks observation insert
4. mismatched source SHA blocks insert/update
5. observation and inference are both allowed
6. confirmed-fact class is impossible in this table
7. product_design and promotional_visual scopes are distinct
8. duplicate idempotency key is rejected
9. same observed_value may exist for different assets/content/versions
10. correction can append a new row referencing an older row
11. self-supersede is rejected
12. existing image/reference/material/market/supplier semantics remain unchanged
13. all existing regression tests pass

## Boundaries
Allowed:
- migration 008
- focused schema tests
- minimal schema documentation updates
- required AGENT-HANDOFF files

Forbidden:
- Vision/OCR/image analysis
- new observation data from the 10 pilot images
- material inference writes
- reference-level synthesis writes
- new review workflow
- new dependencies
- OpenViking/FiftyOne/vector DB/embeddings
- processing the remaining 56 assets
- unrelated schema changes

## Required handoff
Update `outputs/GPT_HANDOFF.json` and archive `outputs/handoffs/P2A-2F1.json`.

Keep the handoff concise and delta-only. Include:
- migration/table added
- exact constraints/triggers
- test results
- any deviation from approved design
- blockers/risks
- next minimum action

After push, stop. Do not run Vision or proceed to P2A-2R automatically.
