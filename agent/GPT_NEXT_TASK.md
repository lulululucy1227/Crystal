# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1

Phase: P2A-3F1-REFERENCE-SYNTHESIS-SCHEMA
Status: authorized
Model: Terra
Strength: Medium

## Objective
Implement the smallest additive migration needed to persist future reference-level synthesis safely, based on the completed P2A-3F0 decision B. This phase is schema foundation only: create migration 009 and focused tests. Do not author or import any new reference synthesis content.

## Why Terra / Medium
This phase changes the canonical SQLite schema and introduces provenance/history constraints. The design is already bounded by P2A-3F0, but schema mistakes would be durable, so use Terra / Medium rather than Luna.

## Authoritative design decision
Read and follow exactly:
- `outputs/p2a-3f0-reference-synthesis-fit.md`
- `outputs/handoffs/P2A-3F0-REFERENCE-SYNTHESIS-FIT.json`
- `migrations/008_p2a_visual_observation.sql`

P2A-3F0 selected option B: additive minimal migration. Preserve the legacy tables unchanged:
- `design_reference_observation`
- `design_assessment`
- `visual_communication_reference`

Do not backfill or reinterpret historical P1C rows.

## Required migration
Create exactly one new migration:
`migrations/009_p2a_reference_synthesis.sql`

Add only the minimum persistence structures described below.

### 1. `design_reference_synthesis_assertion`
Required fields:
- `id` INTEGER PRIMARY KEY
- `assertion_key` TEXT NOT NULL UNIQUE
- `design_reference_id` INTEGER NOT NULL FK -> `design_reference(id)`
- `synthesis_scope` TEXT NOT NULL, constrained to:
  - `product_design`
  - `assistant_assessment`
  - `promotional_visual`
- `assertion_class` TEXT NOT NULL, constrained to:
  - `observation`
  - `inference`
- `assertion_type` TEXT NOT NULL
- `asserted_value` TEXT NOT NULL
- `confidence` TEXT NOT NULL, constrained to:
  - `low`
  - `medium`
  - `high`
- `notes` TEXT NULL
- `producer_type` TEXT NOT NULL, reuse the established producer convention where practical; at minimum support `assistant_model` and `human`
- `producer_id` TEXT NOT NULL
- `analysis_version` TEXT NOT NULL
- `synthesis_run_key` TEXT NOT NULL
- `supersedes_assertion_id` INTEGER NULL self-FK
- `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

Required checks:
- nonblank `assertion_key`
- nonblank `assertion_type`
- nonblank `asserted_value`
- nonblank `producer_id`
- nonblank `analysis_version`
- nonblank `synthesis_run_key`
- no self-supersession

Required deterministic replay/idempotency protection:
- preserve `assertion_key` uniqueness;
- also add a semantic replay uniqueness constraint equivalent to the P2A-3F0 recommendation over reference + scope + class + type + value + producer + version, unless a canonical content-key column is materially safer/simpler.
- Do not include mutable notes/confidence in the replay identity unless you can justify why that is necessary. Keep the mechanism minimal and deterministic.

### 2. `design_reference_synthesis_source`
Required fields:
- `synthesis_assertion_id` INTEGER NOT NULL FK -> `design_reference_synthesis_assertion(id)`
- `image_visual_observation_id` INTEGER NOT NULL FK -> `image_visual_observation(id)`
- composite PRIMARY KEY (`synthesis_assertion_id`, `image_visual_observation_id`)

Required indexes:
- index lookup by `image_visual_observation_id`
- index by `design_reference_id` / scope on assertion table if useful for normal retrieval

## Provenance / lineage enforcement
The database must prevent obviously invalid lineage where practical without overengineering.

At minimum:
- source rows must reference valid existing image observations;
- assertion/source deletion should not silently destroy evidence history; prefer restrictive semantics for evidence links;
- supersession must not cross reference or synthesis scope;
- append-only history: once a synthesis assertion exists, corrections should be represented by a new row with `supersedes_assertion_id`, not UPDATE of semantic content.

If SQLite triggers are the smallest robust way to enforce same-reference/scope supersession and append-only behavior, use narrowly scoped triggers consistent with migration 008 style.

For the source-to-reference provenance rule (source observation asset must be canonically linked to the same design reference):
- enforce in DB trigger only if it can be expressed clearly and safely with the existing `image_visual_observation -> image_asset -> design_reference_image` path;
- otherwise document that this exact rule is importer-preflight enforced in the next phase, while still keeping FK integrity in schema.

Do not add broad machinery solely to force every future importer invariant into SQL.

## Migration behavior
- additive only;
- no ALTER/rewrite of the three legacy reference semantic tables;
- no migration 010;
- no semantic data insert;
- no synthesis assertion seed rows;
- no pattern/theme/preference changes;
- preserve all P2A-2R and P2A-3F0 data unchanged.

## Tests
Add focused tests proving at minimum:
1. migration 009 applies successfully after current baseline
2. legacy semantic tables remain structurally and row-wise unchanged
3. valid assertion inserts succeed
4. invalid scope/class/confidence/blank producer/version/run key fail
5. duplicate assertion_key fails
6. semantic replay duplicate fails or deterministically reuses at importer layer if the chosen key design requires that; schema behavior must be explicit
7. valid source links succeed
8. duplicate source link fails
9. nonexistent source observation fails
10. self-supersession fails
11. supersession across design reference fails
12. supersession across synthesis scope fails
13. append-only protection prevents destructive semantic UPDATE if implemented by trigger
14. no canonical semantic assertion rows are inserted by the migration/tests into the real DB
15. existing regression tests pass
16. `PRAGMA integrity_check` and `foreign_key_check` pass

Use isolated temporary DBs for mutation tests where possible. Applying migration 009 to the canonical local DB is allowed only as schema migration validation; do not insert synthesis semantic rows into canonical DB.

## Open-source / design discipline
Reuse established project conventions from migration 008 and common append-only assertion/source-link patterns. Do not add dependencies or frameworks. No OpenViking/FiftyOne/vector/embedding work.

## Boundaries
Allowed:
- `migrations/009_p2a_reference_synthesis.sql`
- focused schema tests
- minimal validation/helper changes only if required
- canonical `schema_migration` entry for 009 if local validation applies the migration
- handoff files

Forbidden:
- any GPT/Codex reference synthesis content
- any rows in `design_reference_synthesis_assertion` or `design_reference_synthesis_source` in canonical DB
- changes to legacy P1C semantic rows
- image observation changes
- material/component/market/supplier/packaging changes
- pattern/theme/preference changes
- reference regrouping
- Workbench UI
- watcher/controller changes unless strictly required by the handoff protocol (do not use this phase to continue watcher feature work)

## Validation / invariants
Before and after canonical migration validation, record and confirm unchanged:
- 4 pilot reference groupings
- 10 pilot assets
- 45 `image_visual_observation` rows
- observation fingerprint used in P2A-3F0 (count 45; ids 1-45; id sum 1035; observed_value length sum 5479)
- existing historical P1C assessment/pattern/theme rows for the four pilot references

Canonical DB semantic row counts must not change except `schema_migration` gaining 009 and the two new tables existing empty.

## Reporting
Update:
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/P2A-3F1-REFERENCE-SYNTHESIS-SCHEMA.json`

Include:
- migration name
- exact tables/constraints/triggers added
- whether source-to-reference provenance is DB-enforced or importer-preflight deferred
- canonical new-table row counts (must both be 0)
- legacy/P2A invariant checks
- focused tests + full regressions
- integrity/foreign-key checks
- canonical tables changed
- boundary check
- blockers/risks
- whether GPT may now author the four-reference synthesis input for the next phase

After push, STOP. Do not author synthesis content and do not build the importer automatically.