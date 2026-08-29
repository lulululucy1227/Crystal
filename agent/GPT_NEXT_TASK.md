# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1
Phase: P2A-IMAGE-BACKLOG-CONTINUOUS-COMPLETION
Status: authorized
Model: Terra
Strength: Medium
Execution class: DATABASE_WRITE

## Authorization basis
The user explicitly asked to continue analyzing all previously stored Crystal images until no image remains unanalyzed. This task restores the already-authorized image backlog mainline after the temporary Git/Bridge recovery audit.

## Current verified starting state
- Crystal repo `main` was restored clean and synchronized at `b4b78cb3c8411872e6e407b83836f4d5138863c5` during the Bridge recovery/verification flow.
- Local-Codex-Bridge completed real native Codex READ_ONLY E2E validation and a negative READ_ONLY write-denial test.
- The Bridge upstream push permission issue is NOT a blocker for local Crystal execution; do not spend this task on Bridge repository publishing.
- Canonical DB SHA-256 was verified unchanged before/after Bridge recovery: `9321567717F7AB32505A0D873DD2527270C6E3F7651820E66949291D794F9DD2`.
- Canonical image_visual_observation baseline: 80.
- Canonical synthesis baseline: 19 assertions / 37 sources.
- REF-000026 / `白垩纪的海岸碎片` has 13 canonical image observations, IDs 68-80, and exact evidence map `outputs/p2a-cretaceous-coast-fragments-evidence-map.json`; reference synthesis is still pending.
- Historical B01 (REF-000017 / REF-000018, IMG_7712..7716) has completed asset resolution and 22 canonical image observations; reference synthesis is still pending.
- Previous inbox audit artifact: `outputs/p2a-3s2-inbox-status-audit.json` reported 85 images total at that time: 10 fully processed, 56 historical_needs_p2a_upgrade, 19 unprocessed, 0 ambiguous. Subsequent completed work must be reconciled before using those counts.

## Objective
Continue the Crystal design-reference image mainline without stopping after each small phase. Exhaust all images already present in the current Google Drive Inbox / historical backlog until every image is either fully processed or blocked only on genuinely missing GPT visual-semantic input that Codex must not invent.

Do not ask the user to manage intermediate Codex phases. Do not stop after a normal batch boundary.

## Semantic authority boundary
Codex is the deterministic execution plane. GPT is the visual/design semantic authority.

Codex MUST NOT invent or independently decide:
- image observations
- reference synthesis
- material/mineral identity
- user preference
- pattern/theme changes
- design judgment
- promotional-visual interpretation

Codex may only import semantic content already authored in authoritative GPT input artifacts or historical canonical analysis.

If an image/reference still requires new GPT visual analysis and no authoritative GPT semantic artifact exists, prepare all deterministic provenance/mapping first and record it in `outputs/p2a-image-backlog-needs-gpt-analysis.json`; then continue every other safe item. Do not fabricate semantic rows to force completion.

## Continuous execution sequence
For every remaining image/reference, as applicable:
1. Reconcile current Inbox files against canonical DB and the prior audit.
2. Reuse existing asset/reference grouping and historical design analysis where valid.
3. Resolve exact provider identity/SHA/dimensions using existing verified manifests or trusted source metadata; never fabricate provenance.
4. Import existing GPT-authored image observations where available.
5. Export exact evidence maps when GPT synthesis requires canonical observation IDs.
6. Import existing GPT-authored reference synthesis where available.
7. Validate deterministic replay/idempotency and preserve prior canonical fingerprints except intentional additions.
8. Continue automatically to the next coherent batch.

## Priority order
A. Close deterministic pending work for REF-000026 and historical B01 when authoritative semantic inputs/evidence already exist.
B. Process remaining `historical_needs_p2a_upgrade` references in coherent reference groups.
C. Reconcile and prepare the previously `unprocessed` images, including exact provider/file provenance and grouping where deterministically inferable from source/post continuity.
D. Ensure no current Inbox image is omitted.

## Asset provenance rules
- Never invent SHA-256, provider file IDs, dimensions, MIME type, or pHash.
- pHash may remain deferred when verified local bytes are unavailable; deferred pHash alone does not block `fully_processed`.
- Treat seller labels as source claims only, never confirmed mineral facts unless separately verified through the material pipeline.
- Treat user/source narrative names as narrative, not geological provenance.
- A conflict affecting one file/reference is item-local unless it indicates a global integrity problem.

## Database write scope
DATABASE_WRITE is authorized ONLY for this image-analysis mainline using the existing canonical schema and proven importers.

Allowed canonical additions:
- verified image asset provenance/linkage needed by the existing pipeline
- image_visual_observation rows from authoritative GPT semantic inputs
- design_reference_synthesis_assertion/source rows from authoritative GPT synthesis inputs
- required existing reference/asset linkage for previously unprocessed Inbox images when deterministically supported

Not authorized:
- schema migration
- material/component/supplier/market/packaging writes
- broad pattern/theme/preference transformations
- deletion/rewrite of existing canonical observations or synthesis
- watcher/controller work
- Bridge infrastructure work

If a schema migration becomes necessary, STOP that sub-item and record it as requiring new HIGH_RISK authorization; continue independent safe work.

## Required backlog artifacts
Maintain/update:

`outputs/p2a-image-backlog-status.json`

One row per current Inbox image with at least:
- filename
- provider_file_id if known
- asset_key if known
- reference_key if known
- status: fully_processed / needs_gpt_analysis / provenance_blocked / ambiguous
- has_verified_sha
- has_image_observations
- has_reference_synthesis
- blocker_or_next_action

And:

`outputs/p2a-image-backlog-needs-gpt-analysis.json`

Include only references/images still requiring GPT semantic authoring, grouped by reference where possible, with all available deterministic provenance/mapping and historical reference context so GPT can analyze without another discovery pass.

## Fully processed definition
An image is fully processed when:
- canonical asset/reference linkage is complete
- required verified provenance for the current pipeline is complete
- required image-level semantic evidence is canonical
- the linked reference has canonical reference-level synthesis where appropriate

Deferred pHash by itself does not block this status.

## Batch sizing / stop conditions
Use practical coherent batches, roughly 5-15 images or one/few references, but continue automatically.

A batch completion is NOT a stop condition.

Stop only when:
1. all current Inbox/backlog images are fully processed; OR
2. every remaining item is prepared as far as deterministic execution permits and now requires GPT visual-semantic authoring, user aesthetic/business judgment, inaccessible source bytes, or new explicit HIGH_RISK permission; OR
3. a global integrity/safety failure makes further writes unsafe.

## Validation after each canonical-write batch
- exact batch counts
- first apply / replay reuse counts
- prior canonical fingerprints unchanged except intended additions
- `PRAGMA integrity_check = ok`
- `PRAGMA foreign_key_check = 0`
- focused tests where relevant
- `npm test`
- `npm run validate`
- `git diff --check`

Do not modify canonical DB merely to run a test unless the test is isolated from production data.

## Git behavior
- Keep Crystal `main` synchronized safely.
- Commit/push coherent Crystal checkpoints as normal.
- Do not touch or publish the Bridge repo as part of this task.
- Do not revive the recovery audit phase after successful preflight.

## Final response
Return one concise report only at a real stop condition:

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
<Crystal checkpoint SHAs>

WORKTREE CLEAN:
YES / NO

USER MAY UPLOAD NEW IMAGES:
YES only if FULLY PROCESSED = INBOX TOTAL and all other remaining counts are zero; otherwise NO

BLOCKER:
NONE or concise remaining blocker summary
