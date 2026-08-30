# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1
Phase: P2A-HISTORICAL-EARLY-C-STRUCTURED-COMPLETION
Status: authorized
Model: Luna
Strength: Medium
Execution class: DATABASE_WRITE

## Why this phase exists
The authorized HIGH_RISK canonical regroup has already been completed successfully and validated to the point documented in `outputs/p2a-historical-canonical-regroup-after.json`.

Completed state that MUST be preserved:
- REF-000003 split mapping: EARLY-C01=REF-000003, EARLY-C02=REF-000027, EARLY-C03=REF-000028.
- REF-000004 split mapping: EARLY-C04=REF-000029, EARLY-C05=REF-000004, EARLY-C06=REF-000030, EARLY-C07=REF-000031.
- Exactly five authorized cross-boundary asset moves are already completed.
- 6 ambiguous legacy reference-level relations remain quarantined and MUST NOT be guessed or propagated.
- Current canonical counts after completed imports: image_visual_observation=210; synthesis assertions=82; synthesis sources=175.
- Current DB SHA after the completed correction/import checkpoint: `084d4b3e531a8f3523bfa61bed27a7f7677306a4039c53756520b261d921d7b2`.
- 94 canonical image assets exist; exactly 34 early-C assets are still missing canonical observations because the previous GPT input omitted mandatory scope/confidence/provenance fields.

GPT has now resolved that blocker by authoring:
`inputs/p2a-gpt-historical-early-c-structured-completion-20260830.json`

The original retained semantic wording remains in:
`inputs/p2a-gpt-historical-early-c-analysis-and-regroup-plan.json`

## Objective
Deterministically materialize the GPT-authored completion spec, import the remaining EARLY-C01 through EARLY-C18 image semantics and reference syntheses into the existing canonical schema, prove idempotency and full integrity, then close the image backlog if no genuine blocker remains.

## Preflight
1. Safely sync Crystal `main` and require clean worktree before writes. Do not reset/clean/discard user work.
2. Read `AGENTS.md`, latest `agent/GPT_NEXT_TASK.md`, `outputs/GPT_HANDOFF.json`, `outputs/p2a-historical-canonical-regroup-after.json`, the original early-C semantic file, and the new structured completion spec.
3. Verify canonical DB current SHA/state against the last completed checkpoint. If it differs, reconcile from Git/handoff before writing; do not overwrite unexplained work.
4. Create a fresh timestamped byte-for-byte DB backup for this additive completion and record its path/SHA.

## Semantic authority and deterministic materialization
The new structured completion spec is GPT-authored semantic authority for the missing fields. Codex may deterministically transform it into the repository's existing `P2A-GPT-SEMANTIC-BATCH-V1` / canonical importer shape.

Codex MUST NOT alter or invent:
- original observation wording in `semantic_group.observations[]`
- original `semantic_group.inference` wording
- original `semantic_group.synthesis` wording
- scope/class/confidence values supplied by the completion spec
- canonical reference mapping supplied by the completion spec
- secondary-asset coverage template supplied by the completion spec

Apply the completion spec exactly:
- each original observation string -> primary asset, `product_design`, class `observation`, confidence `high`;
- original inference -> primary asset, `product_design`, class `inference`, confidence `medium`;
- each explicitly listed secondary asset -> exactly one `alternate_view_same_reference` observation using the exact GPT template, `product_design`, class `observation`, confidence `high`;
- each group synthesis string -> exactly one reference synthesis assertion, `product_design`, class `inference`, confidence `medium`;
- synthesis provenance -> all rows materialized for that same group.

Use `canonical_reference_map_after_authorized_regroup` exactly. Do not create or renumber references for EARLY-C01..C18.

## Database scope
DATABASE_WRITE is authorized only for additive early-C image observations and reference synthesis/source rows using the existing canonical schema and deterministic plumbing needed to import them.

Not authorized:
- schema migration
- changing the completed canonical regroup
- any additional asset move
- deleting/rewriting raw evidence
- resolving the 6 quarantined relations by guess
- preference/pattern/theme mutations
- material/component/supplier/market/packaging writes
- watcher/controller/Bridge work

## Required reconciliation and validation
Before applying, reconcile exact matches so nothing already canonical is duplicated.

After apply:
- every one of the 34 previously pending early-C assets must have canonical image semantic evidence;
- all 18 EARLY-C groups must have canonical reference synthesis;
- report exact created/reused observation/assertion/source counts;
- replay the same materialized payload and prove idempotent reuse/no new rows;
- unrelated canonical fingerprints must remain unchanged;
- preserve all 6 quarantined legacy relations unchanged;
- `PRAGMA integrity_check = ok`;
- `PRAGMA foreign_key_check = 0`;
- focused tests;
- full `npm test`;
- `npm run validate`;
- `git diff --check`.

Update:
- `outputs/p2a-image-backlog-status.json`
- `outputs/p2a-image-backlog-needs-gpt-analysis.json` (must be empty/NONE if no semantic gap remains)
- `outputs/GPT_HANDOFF.json`
- archived handoff under `outputs/handoffs/`

If all 94 canonical assets are now fully processed and no GPT/provenance/ambiguity blocker remains, explicitly report image backlog completion and `USER MAY UPLOAD NEW IMAGES: YES`.

## Git
Commit/push the coherent Crystal checkpoint to `main`, then verify local HEAD == origin/main and clean worktree. Do not touch Local-Codex-Bridge.

## Stop conditions
Continue through materialization, import, replay, validation, status reconciliation, commit and push. Stop only for:
1. genuine unexplained canonical state divergence;
2. schema change requirement;
3. global integrity/test failure that cannot be safely corrected inside this additive scope;
4. inaccessible required provenance;
5. successful completion.

No user business/aesthetic decision is currently required.

## Final handoff fields
PHASE / STATUS / BACKUP / DB SHA BEFORE / DB SHA AFTER / MATERIALIZED OBSERVATION COUNT / CREATED+REUSED OBSERVATIONS / CREATED+REUSED SYNTHESIS ASSERTIONS+SOURCES / ASSETS FULLY PROCESSED / NEEDS GPT / PROVENANCE BLOCKED / AMBIGUOUS / QUARANTINED LEGACY RELATIONS UNCHANGED / INTEGRITY / TESTS / COMMIT / HEAD==ORIGIN / WORKTREE CLEAN / USER MAY UPLOAD NEW IMAGES / USER DECISION REQUIRED.
