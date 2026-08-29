# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1
Phase: P2A-IMAGE-BACKLOG-CONTINUOUS-COMPLETION
Status: authorized
Model: Terra
Strength: Medium
Execution class: DATABASE_WRITE

## Objective
Continue the Crystal image-analysis mainline until the current Google Drive Inbox/backlog is exhausted. Do not stop after routine batch boundaries. Codex is the deterministic execution plane; GPT is the visual/design semantic authority.

## Verified baseline before this resumed backlog execution
- Crystal canonical image_visual_observation baseline: 80.
- Crystal canonical synthesis baseline: 19 assertions / 37 sources.
- Canonical DB SHA-256 after Bridge recovery verification: `9321567717F7AB32505A0D873DD2527270C6E3F7651820E66949291D794F9DD2`.
- REF-000026 / `白垩纪的海岸碎片`: 13 canonical image observations already exist; reference synthesis remains pending.
- Historical B01 REF-000017 / REF-000018, IMG_7712..7716: asset resolution and 22 canonical image observations already exist; reference synthesis remains pending.
- Previous audit `outputs/p2a-3s2-inbox-status-audit.json`: 85 images = 10 fully processed + 56 historical needs P2A upgrade + 19 unprocessed.
- Subsequent Inbox additions include IMG_7812..7814 and IMG_7864..IMG_7867. A fresh Drive metadata inventory on 2026-08-29 exposed 92 current images total at that read. Reconcile against Drive again at execution time; do not hard-code 92 if the folder changed later.

## New authoritative GPT semantic batch
GPT has completed visual-semantic analysis for all 19 images that were previously in the `unprocessed` bucket plus four newly discovered images IMG_7864..IMG_7867.

Authoritative input:
`inputs/p2a-gpt-unprocessed-plus-new-20260829-a.json`

Input facts:
- 23 image assets
- 12 reference groups
- 76 GPT-authored image-level semantic rows
- 29 GPT-authored reference-synthesis drafts
- exact Google Drive provider IDs, SHA-256, MIME type, dimensions and byte size for all 23 assets
- no explicit USER SIGNAL inferred from mere Inbox presence
- no mineral/geological/authenticity claims promoted from seller text
- no proposed pattern/theme/preference changes

The synthesis drafts use `source_observation_selectors` because canonical observation IDs do not exist yet for these new groups. Codex may deterministically resolve each selector to the newly imported canonical observation row and transform the draft into the existing `P2A-REFERENCE-SYNTHESIS-V1` input contract. This selector resolution is deterministic plumbing, not semantic authoring. Codex MUST preserve GPT wording/class/scope/confidence and MUST NOT add new synthesis claims.

## Required execution order
1. Safely sync Crystal main and confirm clean preflight.
2. Reconcile the current Drive Inbox against canonical DB and previous audit, including IMG_7812..7814 and IMG_7864..7867.
3. Close pending REF-000026 synthesis and historical B01 synthesis wherever authoritative GPT semantic evidence already exists.
4. Import `inputs/p2a-gpt-unprocessed-plus-new-20260829-a.json`:
   - create/link canonical assets and design references for its 12 reference groups using exact supplied provenance;
   - preserve the grouping supplied by GPT;
   - import exactly the 76 semantic rows;
   - replay and prove idempotency;
   - deterministically resolve synthesis selectors to canonical observation IDs;
   - import exactly the authored synthesis drafts after contract transformation;
   - do not infer USER SIGNAL from these images.
5. Continue through the remaining historical_needs_p2a_upgrade references in coherent groups, reusing historical grouping/analysis. Where new GPT visual-semantic authoring is still genuinely missing, prepare exact deterministic provenance/mapping and add it to `outputs/p2a-image-backlog-needs-gpt-analysis.json`; continue all other safe items.
6. Ensure every current Inbox image appears in the final status artifact.

## Semantic boundary — strict
Codex MUST NOT invent or independently decide:
- image observations
- reference synthesis wording
- mineral/material identity
- user preference
- pattern/theme changes
- design judgments
- promotional-visual interpretation

Seller/source labels remain source claims only. Narrative names are not geological facts.

## Database authorization
DATABASE_WRITE is authorized only for the existing image-analysis pipeline and existing canonical schema.

Allowed:
- verified image asset provenance/linkage
- design reference creation/linkage deterministically supported by GPT grouping or existing historical grouping
- GPT-authored `image_visual_observation` rows
- GPT-authored reference synthesis assertions/sources after deterministic selector-to-ID resolution

Not authorized:
- schema migration
- deletion/rewrite of existing canonical semantic rows
- material/component/supplier/market/packaging writes
- broad pattern/theme/preference transformations
- watcher/controller work
- Bridge infrastructure work

If a schema migration is genuinely required, record only that sub-item as HIGH_RISK blocked and continue independent safe work.

## Provenance
Never fabricate SHA-256, provider IDs, dimensions, MIME type, pHash or file metadata. Deferred pHash alone does not block fully_processed. Provider/hash/reference conflicts are item-local blockers unless they reveal global integrity failure.

## Required status artifacts
Maintain:
- `outputs/p2a-image-backlog-status.json`
- `outputs/p2a-image-backlog-needs-gpt-analysis.json`

Status must include one row per current Inbox image with filename, provider_file_id, asset_key, reference_key, status, verified SHA flag, observation flag, synthesis flag, and blocker/next action.

Allowed status values:
- fully_processed
- needs_gpt_analysis
- provenance_blocked
- ambiguous

## Fully processed definition
An image is fully_processed when canonical asset/reference linkage and required provenance are complete, required image semantic evidence is canonical, and its linked reference has canonical reference-level synthesis where appropriate. Deferred pHash alone is acceptable.

## Validation after every canonical-write batch
- exact input/file/reference counts
- first apply and replay reuse counts
- prior canonical fingerprints unchanged except intentional additions
- `PRAGMA integrity_check = ok`
- `PRAGMA foreign_key_check = 0`
- focused tests
- `npm test`
- `npm run validate`
- `git diff --check`

Do not alter production DB merely to run tests unless the tests are isolated.

## Continuous execution / stop conditions
A normal batch completion is NOT a stop condition. Record item-local blockers and continue.

Stop only when:
1. every current Inbox image is fully_processed; OR
2. every remaining unresolved image/reference has been deterministically prepared and now genuinely requires new GPT semantic analysis, user business/aesthetic judgment, inaccessible source bytes, or new HIGH_RISK permission; OR
3. a global integrity/safety problem makes further writes unsafe.

## Git behavior
Commit/push coherent Crystal checkpoints. Keep main synchronized safely. Do not work on or publish the Local-Codex-Bridge repo in this task.

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
