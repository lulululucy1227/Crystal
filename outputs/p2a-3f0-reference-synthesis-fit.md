# P2A-3F0 reference-synthesis schema fit

## Decision

**B — an additive minimal migration is required before persistence.** GPT can safely author a structured four-reference synthesis input after this phase, but that input must remain an external, reviewable artifact until the migration and importer are separately authorized. The current tables cannot preserve producer/version identity, row-level image-observation provenance, append-only correction history, and idempotency together.

This follows conventions already present in migration 008 and common append-only history designs: immutable assertion rows, explicit producer/version fields, a self-referencing supersession link, a deterministic uniqueness key, and a separate many-to-many source-link table. No framework or dependency is needed.

## Canonical pilot grouping

Resolved from `design_reference_image` in `data/crystal-design.sqlite`; filenames were selectors only, not grouping logic.

| Reference | Assets (canonical display order) | Count |
|---|---|---:|
| `REF-000002` (id 2) | `ASSET-000001` / IMG_7633.PNG; `ASSET-000002` / IMG_7634.PNG | 2 |
| `REF-000006` (id 6) | `ASSET-000015` / IMG_7668.PNG; `ASSET-000016` / IMG_7669.PNG | 2 |
| `REF-000019` (id 19) | `ASSET-000046` / IMG_7717.PNG; `ASSET-000047` / IMG_7718.PNG; `ASSET-000048` / IMG_7719.PNG | 3 |
| `REF-000025` (id 25) | `ASSET-000064` / IMG_7746.PNG; `ASSET-000065` / IMG_7747.PNG; `ASSET-000066` / IMG_7748.PNG | 3 |

Total: 4 references, 10 assets, 45 `image_visual_observation` rows (40 observations and 5 inferences; 35 product-design and 10 promotional-visual assertions). All use producer `assistant_model` / `gpt-5.6-sol`, analysis version `p2a-vision-v1`.

## Current-table fit

PASS means natively safe; PARTIAL means a related field exists but the contract is incomplete; FAIL means the capability cannot be represented safely.

| Required capability | `design_reference_observation` | `design_assessment` | `visual_communication_reference` |
|---|---|---|---|
| Reference target and domain-appropriate content | PASS | PASS | PASS |
| Producer type/id | FAIL | FAIL | FAIL |
| Analysis version | FAIL | FAIL | FAIL |
| Source `image_visual_observation` provenance | FAIL | FAIL | FAIL |
| Append-only correction/supersession | FAIL | FAIL | FAIL |
| Observation vs inference distinction | PARTIAL — `identification_status` concerns identification certainty, not assertion class | FAIL | FAIL |
| Confidence | PASS | FAIL | PARTIAL — premium score is not assertion confidence |
| Idempotency | FAIL — no semantic uniqueness key | FAIL — reference uniqueness blocks versions, not duplicate replay | FAIL — reference uniqueness blocks versions, not duplicate replay |
| Non-destructive version coexistence | PARTIAL — multiple rows are possible, but indistinguishable by run/lineage | FAIL — `UNIQUE(design_reference_id)` | FAIL — `UNIQUE(design_reference_id)` |

Exact gaps:

- `design_reference_observation` has constrained observation types, value, identification status, and confidence, but no producer, version, scope, assertion class, created lineage, supersession, stable assertion key, or source-observation links. Its material-identification check must not be repurposed as a general observation/inference distinction.
- `design_assessment` is one row per reference and has no provenance, confidence, producer, version, timestamps, assertion granularity, or supersession. A new assistant result could only be rejected or destructively overwrite the historical P1C assessment.
- `visual_communication_reference` is also one row per reference and has no provenance, confidence, producer, version, assertion class, timestamps, or supersession. Updating it would conflate a new model synthesis with any historical promotional analysis.
- Free text in `notes` or assessment fields is not an acceptable substitute: it is unenforced, not queryable as row-level provenance, and cannot guarantee idempotency or valid source identity.

## Existing P1C relationships to reuse

Do not duplicate these links in synthesis output or importer writes:

- `REF-000002`: themes Forest (strong), Mountain (moderate).
- `REF-000006`: themes Glacier and Starlight (strong); patterns Framed Mineral and Orbital Structure (strong).
- `REF-000019`: theme Mountain (strong); pattern Asymmetric Balance (strong).
- `REF-000025`: pattern Atmospheric Spacing (strong).

The four references already have one historical `design_assessment` row each. Preserve them unchanged. `REF-000019` assessment text also records that “Anchored Asymmetry” was merged into Asymmetric Balance, and `REF-000025` says not to promote Designed Silence; new synthesis must not recreate or promote those concepts. No affected reference currently has `design_reference_observation` or `visual_communication_reference` rows.

## Minimum future GPT data contract

One document-level envelope:

- `contract_version`, `analysis_version`, `producer_type`, `producer_id`, and a stable `synthesis_run_key`.
- Exactly the canonical four `reference_key` values; each carries the expected ordered `asset_key` list so grouping drift fails preflight.
- Assertions as atomic objects with stable `assertion_key`, `reference_key`, `synthesis_scope` (`product_design`, `assistant_assessment`, or `promotional_visual`), `assertion_class` (`observation` or `inference`), nonblank `assertion_type`, nonblank `asserted_value`, `confidence`, and optional notes.
- Every assertion includes a nonempty, deduplicated `source_image_observation_ids` list. Each source row must belong through `design_reference_image` to the same reference. Product-design and promotional-visual sources must match the assertion scope; cross-scope support must be rejected unless a later contract explicitly models it.
- Optional `supersedes_assertion_key`; it must resolve to the same reference and scope. Corrections are new rows, never updates.
- Explicit empty arrays for proposed pattern/theme changes. For this pilot they must remain empty; existing P1C relationships are context to reuse, not synthesis rows to duplicate.

Importer preflight should reject unknown keys, changed asset hashes/linkage, missing or cross-reference source rows, duplicate assertion keys, invalid enums, blank values, and supersession across reference/scope. Replaying the same producer/version/assertion identity must reuse the prior row.

## Minimum additive migration shape (no SQL in this phase)

Add only:

1. `design_reference_synthesis_assertion`
   - identity and content: `id`, `assertion_key`, `design_reference_id`, `synthesis_scope`, `assertion_class`, `assertion_type`, `asserted_value`, `confidence`, `notes`
   - production/history: `producer_type`, `producer_id`, `analysis_version`, `synthesis_run_key`, `supersedes_assertion_id`, `created_at`
   - keys/checks: unique `assertion_key`; additionally a deterministic uniqueness constraint over reference, scope, class, type, value, producer, version (or an equivalent canonical content key); nonblank checks; supersession constrained by importer/trigger to the same reference and scope
2. `design_reference_synthesis_source`
   - `synthesis_assertion_id`, `image_visual_observation_id`, composite primary key
   - foreign keys with restrictive deletion for evidence; index by source observation
   - importer/trigger validation that the source observation's asset is canonically linked to the assertion's reference

Do not alter, backfill, or overwrite the three legacy semantic tables in this migration. A future reviewed projection into legacy consumer shapes, if ever required, should be a separate decision. This two-table form is the smallest safe path because provenance is many-to-many and cannot be encoded reliably in the assertion row alone.

## Risks and boundaries

- Overwriting either one-row legacy table would erase provenance and make P1C and new model output indistinguishable; this is the primary irreversible risk.
- Adding metadata columns only to legacy tables would still not solve many-to-many source provenance and would complicate historical backfill with invented producer/version values.
- Treating repeated screenshots as frequency evidence would manufacture popularity; the pilot only supports within-reference synthesis.
- Reference synthesis must retain observation/inference separation, keep user preference evidence outside assistant assessment, separate product design from promotional visuals, and describe material appearance without identifying mineral species.
- Building an importer before the contract is reviewed risks locking unstable assertion types into schema; the opportunity cost of waiting is small compared with corrupting historical semantics.

## Validation and next minimum action

Read-only canonical checks found `PRAGMA quick_check = ok`, 4 linked references, 10 linked assets, and exactly 45 pilot observations. Baseline database SHA-256 was `D55BF9CE2EBBE56C75EDFA2BB40D4A6DF916A09860933E260119B0853D00D2D9`; it must match after testing. Observation fingerprint before report creation: count 45, ids 1–45, id sum 1035, total `observed_value` length 5479.

Next minimum action: GPT reviews/accepts the proposed contract and authorizes a separate narrowly scoped migration phase. GPT may author the four-reference synthesis input now against this contract, but it cannot be persisted safely until that migration and a validated importer are authorized and completed.
