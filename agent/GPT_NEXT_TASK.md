# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1

Phase: P2A-3F0-REFERENCE-SYNTHESIS-FIT
Status: authorized
Model: Luna
Strength: Medium

## Objective
Determine the smallest safe persistence path for reference-level synthesis derived from the completed 10-image P2A pilot, without writing any new semantic data or creating a migration in this phase.

P2A-2R is completed. The canonical pilot now has 45 image-level `image_visual_observation` rows across the approved 10 assets. The next step is to synthesize image-level evidence into reference-level design understanding, but existing reference-level tables were created before the current producer/version/provenance model. This phase must decide whether the existing schema can represent the next GPT-produced reference synthesis safely, or whether a narrowly-scoped migration is required.

## Model rationale
Use Luna / Medium because this is a bounded, read-only schema-fit and data-contract review. No production semantic writes or schema changes are authorized.

## Scope
Read only the current Crystal repository and local canonical SQLite database as needed.

Inspect at minimum:
- `migrations/001_initial.sql`
- `migrations/004_p1c_reference_relationships.sql`
- `migrations/005_p1c_design_principle.sql`
- `migrations/006_p1c_image_assets.sql`
- `migrations/008_p2a_visual_observation.sql`
- current `design_reference` / `design_reference_observation`
- current `design_assessment`
- current `visual_communication_reference`
- reference-pattern/theme relationship tables
- `image_visual_observation`
- the 10 pilot assets and their `design_reference_image` links
- existing P1C reference rows for the affected references

## Pilot references to analyze
Use the exact existing reference grouping for the approved 10 pilot images. Do not regroup images.

Expected affected references include the groups containing:
- IMG_7633 + IMG_7634
- IMG_7668 + IMG_7669
- IMG_7717 + IMG_7718 + IMG_7719
- IMG_7746 + IMG_7747 + IMG_7748

Resolve them from canonical `design_reference_image` rather than guessing IDs from filenames.

## Core questions
Answer these concretely:

1. Can the current `design_reference_observation` table safely hold GPT reference-level synthesis while preserving:
   - producer type/id
   - analysis version
   - source image-observation provenance
   - append-only correction history / supersession
   - observation vs inference distinction
   - confidence
   - idempotency

2. Can the current `design_assessment` table safely hold versioned assistant synthesis without destructive overwrite, given its current one-row-per-reference shape?

3. Can the current `visual_communication_reference` table safely hold promotional-visual synthesis with version/provenance and non-destructive updates?

4. Which existing P1C pattern/theme links are already sufficient and should be reused rather than duplicated?

5. What is the minimum data contract GPT should produce for a 4-reference synthesis pilot before any importer is built?

6. If schema change is necessary, what is the minimum migration shape? Prefer additive tables/columns and append-only history over rewriting historical P1C rows. Do not draft a large redesign.

## Evidence / provenance requirement
Reference-level synthesis must remain traceable to the underlying image-level evidence. A future persisted synthesis must be able to answer which `image_visual_observation` rows support a reference-level statement.

Do not accept a design that only stores free text with no provenance path.

## Existing semantic boundaries
Keep these distinctions:
- image-level observation != reference-level synthesis
- observation != inference
- user preference evidence != assistant assessment
- design analysis != promotional visual analysis
- material visual appearance != confirmed mineral identity
- repeated screenshots of one bracelet != popularity/frequency evidence

Do not infer or identify mineral species.

## Open-source-first check
Before proposing custom schema machinery, briefly compare the needed provenance/versioning pattern with established general patterns already conceptually used in the project (append-only event/history records, explicit producer/version fields, source-link tables). Reuse the existing project conventions where adequate. Do not add dependencies or install frameworks.

## Forbidden
- no migration 009 creation
- no schema changes
- no canonical semantic writes
- no modification of P2A-2R rows
- no Vision/OCR/image analysis
- no new reference synthesis content authored by Codex
- no regrouping references or assets
- no pattern/theme/preference/assessment writes
- no material/component/market/supplier/packaging writes
- no OpenViking/FiftyOne/vector/embedding work
- no Workbench UI work

## Deliverable
Create only a concise technical decision document:
`outputs/p2a-3f0-reference-synthesis-fit.md`

It must include:
- affected reference keys and asset counts resolved from DB
- current-table fit matrix for `design_reference_observation`, `design_assessment`, `visual_communication_reference`
- explicit PASS / PARTIAL / FAIL per required capability
- exact provenance/versioning gaps
- recommended minimum future data contract for GPT reference synthesis
- recommended persistence option:
  A. reuse existing schema as-is
  B. additive minimal migration
  C. do not persist yet
- if B, list only the minimum proposed entities/fields/keys, not full SQL
- risks of overwriting or conflating historical P1C data
- next minimum action

## Validation
Prove:
- no DB/schema writes occurred
- no existing files outside the report + handoff files changed
- pilot grouping resolved from canonical DB links
- all 45 P2A-2R image observations remain unchanged
- existing regression tests still pass if practical; otherwise run the smallest non-mutating validation needed and state why

## Reporting
Update:
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/P2A-3F0-REFERENCE-SYNTHESIS-FIT.json`

Handoff must include:
- decision A/B/C
- affected reference count
- affected asset count
- image observation count checked
- whether migration is recommended
- whether GPT can safely author the next synthesis input after this phase
- tests/checks
- boundary check
- blocker if any

After push, STOP. Do not create migration 009 or start synthesis import automatically.