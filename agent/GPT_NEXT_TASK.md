# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1
Phase: P2A-IMAGE-BACKLOG-CONTINUOUS-COMPLETION
Status: authorized
Model: Terra
Strength: Medium

## Objective
Continue the crystal/design-reference image mainline without stopping after each small phase. Finish all images currently present in the Google Drive Inbox/backlog until there are no remaining images requiring analysis or P2A upgrade. Only then stop and report that GPT may ask the user to upload new images.

The user explicitly authorized continuous completion of the existing image backlog. Do not require a new user decision between routine deterministic substeps.

## Starting state / known facts
- Previous Inbox audit reconciled 85/85 images: 10 fully_processed, 56 historical_needs_p2a_upgrade, 19 unprocessed, 0 ambiguous.
- Historical B01 IMG_7712..7716 has completed asset resolution and 22 canonical observations; its reference synthesis still needs completion.
- New reference REF-000026 / `白垩纪的海岸碎片` has ASSET-000067..069 and 13 canonical observations; its evidence-map/reference synthesis still needs completion.
- Current canonical image_visual_observation total should be 80 at task start.
- Current synthesis baseline should be 19 assertions / 37 sources at task start.
- Existing GitHub artifacts, DB mappings, prior handoffs, historical P1C reference relationships, and GPT-authored semantic inputs are authoritative evidence. Preserve them.

## Continuous execution rule
Execute all routine safe substeps needed to exhaust the current image backlog in one continuous task framework. Do not stop merely because one batch/phase completed.

For each remaining historical or new image/reference, as applicable:
1. inventory/reconcile exact file -> canonical asset -> reference mapping;
2. resolve verified asset identity/SHA using already available trusted manifests/source metadata and existing project tooling;
3. preserve/reuse existing reference grouping and historical semantic work where present;
4. import GPT-authored image observations when an authoritative semantic input already exists;
5. export exact evidence maps needed for synthesis;
6. import GPT-authored reference synthesis when an authoritative synthesis input already exists;
7. validate replay/idempotency and invariants;
8. continue to the next batch.

IMPORTANT semantic boundary: Codex is a deterministic executor, not the visual-semantic author. Codex MUST NOT invent visual observations, reference synthesis, material identification, user preference, pattern/theme judgments, or promotional analysis that GPT has not authored. If a remaining image/reference genuinely requires new GPT visual analysis and no authoritative GPT semantic artifact exists, record it in a machine-readable `outputs/p2a-image-backlog-needs-gpt-analysis.json` with exact file/asset/reference/provenance information, continue all other safely executable backlog work, and only stop when every remaining unresolved item requires GPT semantic analysis or an actual blocker.

## Existing unresolved backlog
Use the canonical audit artifact from P2A-3S2 as the primary backlog inventory. Reconcile it against the current DB and current Drive identities. Do not assume an item remains unresolved if subsequent commits completed it.

Prioritize:
A. finish pending deterministic closure for REF-000026 and historical B01 where authoritative semantic inputs/evidence already exist;
B. process the remaining historical_needs_p2a_upgrade items, reusing historical analysis/grouping and producing a precise GPT-analysis queue only where semantic authoring is still missing;
C. reconcile and prepare the 19 previously unprocessed images similarly;
D. ensure no current Inbox image is omitted.

## Asset provenance
Never fabricate SHA-256, pHash, provider IDs, dimensions, or file metadata.
- Use exact existing verified source metadata where available.
- pHash may remain deferred if verified local bytes are unavailable.
- Conflicts in provider identity/hash/reference mapping are blockers for that item only: record the item and continue other safe work.

## Data safety
No schema migration unless absolutely required by an existing canonical contract; default is NO migration.
Do not rewrite existing observations/synthesis merely to normalize wording.
Do not promote seller/source labels into confirmed mineral facts.
Do not treat narrative names as geological/material facts.
Do not modify material/component/supplier/market/packaging data as part of this task.
Do not modify watcher/controller infrastructure.
Do not move/delete/rename Drive files.
Do not change established pattern/theme/preference relationships unless an already-authored authoritative GPT artifact explicitly requires it.

## Reuse existing tooling
Prefer the existing generalized asset-resolution, image-observation importer, evidence-map, synthesis importer, validation and replay tooling. Do not create parallel pipelines when current tooling can be safely generalized.

## Batch sizing
Use practical batches (roughly 5-15 images / coherent references) to keep validation clear, but continue automatically from one batch to the next. A batch boundary is not a stop condition.

## Testing / validation after each canonical-write batch
- exact input/file/reference counts
- deterministic replay/idempotency
- preserve previous canonical observation/synthesis fingerprints except intentional additions
- PRAGMA integrity_check = ok
- PRAGMA foreign_key_check = 0
- focused tests where relevant
- npm test
- npm run validate
- git diff --check

## Blocker handling
A blocker affecting one item/batch does NOT stop the entire task. Record it and continue all other independent safe work.
Stop only when:
1. all current Inbox/backlog images are fully processed, OR
2. every remaining item requires GPT visual-semantic authoring/user clarification/source access that Codex cannot safely provide, OR
3. a global integrity/safety issue makes further writes unsafe.

## Required backlog state artifact
Maintain/update `outputs/p2a-image-backlog-status.json` with one row per current Inbox image and at least:
- filename
- provider_file_id if known
- asset_key if known
- reference_key if known
- status: fully_processed / needs_gpt_analysis / provenance_blocked / ambiguous
- has_verified_sha
- has_image_observations
- has_reference_synthesis
- blocker_or_next_action

Also maintain `outputs/p2a-image-backlog-needs-gpt-analysis.json` containing only items/references requiring GPT semantic analysis, grouped by reference where possible, with all deterministic provenance/mapping information already prepared.

## Definition of fully processed for this task
An image is `fully_processed` when its canonical asset/reference linkage and verified provenance required by the current pipeline are complete, its required image-level semantic evidence is canonical, and its reference has canonical reference-level synthesis where appropriate. Deferred pHash alone does not prevent fully_processed status.

## Git behavior
Commit/push coherent checkpoints as normal. Keep worktree clean between checkpoints when practical. GitHub `agent/GPT_NEXT_TASK.md` remains sole task authority. Do not self-authorize unrelated business phases.

## Final response
Return one concise final report only when a stop condition above is reached:

PHASE:
P2A-IMAGE-BACKLOG-CONTINUOUS-COMPLETION

STATUS:
COMPLETED / NEEDS_GPT_ANALYSIS / BLOCKED

INBOX TOTAL:
<count>

FULLY PROCESSED:
<count>

NEEDS GPT ANALYSIS:
<count images / count references>

PROVENANCE BLOCKED:
<count>

AMBIGUOUS:
<count>

IMAGE OBSERVATIONS TOTAL:
<count>

SYNTHESIS ASSERTIONS / SOURCES:
<count / count>

BACKLOG STATUS ARTIFACT:
<path>

GPT ANALYSIS QUEUE:
<path or NONE>

TESTS / INTEGRITY:
<summary>

COMMITS:
<checkpoint SHAs>

WORKTREE CLEAN:
YES / NO

USER MAY UPLOAD NEW IMAGES:
YES only if FULLY PROCESSED = INBOX TOTAL and all other remaining counts are zero; otherwise NO

BLOCKER:
NONE or concise remaining blocker summary
