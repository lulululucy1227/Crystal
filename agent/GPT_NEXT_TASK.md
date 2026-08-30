# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1
Phase: P2A-HISTORICAL-CANONICAL-REGROUP-CORRECTION
Status: authorized
Model: Terra
Strength: High
Execution class: HIGH_RISK

## Explicit user authorization
The user chose Option A on 2026-08-30 and explicitly authorized the historical canonical regroup correction.

Authorization record:
`inputs/p2a-historical-canonical-regroup-user-authorization-20260830.json`

Decision pack:
`outputs/p2a-historical-canonical-regroup-decision-pack-20260830.json`

Detailed GPT evidence:
`inputs/p2a-gpt-historical-early-c-analysis-and-regroup-plan.json`

## Objective
Correct the known historical canonical Design Reference grouping defects safely, then continue the already-authorized image-analysis mainline by importing all pending GPT-authored additive semantics and validating the canonical database end to end.

## Current GPT-side state
- Google Drive Inbox image count: 0.
- All 94 currently known project images have completed GPT visual analysis and are in `Reviewed`.
- `Reviewed` means GPT visual analysis complete; it does not by itself mean canonical SQLite ingestion complete.
- Last verified canonical DB baseline before pending imports: 80 image observations, 19 synthesis assertions / 37 synthesis sources, SHA-256 `9321567717F7AB32505A0D873DD2527270C6E3F7651820E66949291D794F9DD2`.

## Authorized canonical corrections
### Split bundled references
- REF-000003 currently bundles IMG_7654 / IMG_7655 / IMG_7656. Split into three distinct design references corresponding to EARLY-C01 / EARLY-C02 / EARLY-C03.
- REF-000004 currently bundles IMG_7661 / IMG_7662 / IMG_7663 / IMG_7664. Split into four distinct design references corresponding to EARLY-C04 / EARLY-C05 / EARLY-C06 / EARLY-C07.

Preserve an existing reference key for one surviving child where semantically least disruptive; create new stable reference keys for additional children. Do not renumber unaffected references.

### Move exactly these five high-confidence boundary assets
- IMG_7678: REF-000008 → REF-000009
- IMG_7688: REF-000011 → REF-000012
- IMG_7690: REF-000012 → REF-000013
- IMG_7696: REF-000014 → REF-000015
- IMG_7698: REF-000015 → REF-000016

Do not expand the move set without a new GPT/user authorization.

## Mandatory pre-write phase
Before any canonical mutation:
1. Safely sync Crystal main and require a clean worktree.
2. Create a timestamped byte-for-byte backup of the canonical SQLite DB.
3. Record pre-write DB SHA-256 and exact affected-row manifest.
4. Run a read-only impact audit across all tables related to affected references/assets, including at minimum:
   - design_reference
   - design_reference_image
   - image_asset
   - image_visual_observation
   - design_reference_synthesis_assertion
   - design_reference_synthesis_source
   - preference evidence tables
   - design assessment tables
   - reference-pattern relations
   - reference-theme relations
   - source/provenance relations
5. Produce a deterministic reassignment plan before opening the write transaction.

## Mutation rules
- Execute transactionally.
- Preserve raw source evidence, image assets, image observations, provenance and user-signal history.
- Never copy an ambiguous old reference-level preference/pattern/theme/assessment/synthesis relation onto every split child.
- When an old reference-level relation cannot be assigned unambiguously from existing evidence, preserve its provenance and quarantine/flag it for review rather than guessing.
- Reassign only relations whose target child is deterministically supported by existing source/image evidence.
- No schema migration unless execution proves one is strictly necessary; if so, stop that sub-item and report HIGH_RISK schema blocker rather than improvising.
- No material/component/supplier/market/packaging writes.
- No watcher/controller or Bridge infrastructure work.

## Pending additive GPT semantic inputs
After the regroup correction is validated, import all still-pending authoritative GPT semantic batches using the existing schema and deterministic selector resolution only. At minimum reconcile these inputs against canonical state before applying:
- `inputs/p2a-gpt-unprocessed-plus-new-20260829-a.json`
- `inputs/p2a-gpt-historical-late-b.json`
- `inputs/p2a-gpt-historical-early-c-analysis-and-regroup-plan.json`
- `inputs/p2a-gpt-new-reference-gray-fog-wood-anchor-20260830.json`
- existing pending REF-000017 / REF-000018 synthesis
- existing pending REF-000026 synthesis

Do not duplicate rows already canonical. Preserve GPT wording, assertion class, scope and confidence exactly. Codex must not author new visual/design semantics.

## Required validation
After correction and after each coherent additive import batch:
- exact before/after row counts and key manifests
- replay/idempotency proof
- prior unrelated canonical fingerprints unchanged
- `PRAGMA integrity_check = ok`
- `PRAGMA foreign_key_check = 0`
- focused regroup/import tests
- full `npm test`
- `npm run validate`
- `git diff --check`
- post-write DB SHA-256

## Required outputs
Create/update:
- `outputs/p2a-historical-canonical-regroup-before.json`
- `outputs/p2a-historical-canonical-regroup-after.json`
- `outputs/p2a-image-backlog-status.json`
- `outputs/p2a-image-backlog-needs-gpt-analysis.json` only if any semantic gap genuinely remains
- `outputs/GPT_HANDOFF.json`
- archived phase handoff under `outputs/handoffs/`

Final handoff must include:
- phase/status
- backup path
- DB SHA before/after
- exact split/new reference mapping
- exact five asset moves
- quarantined/ambiguous relation count and identities
- additive semantic import counts
- final image observation total
- final synthesis assertion/source totals
- integrity/FK/test/validate results
- commits
- worktree cleanliness
- whether any user decision is still required

## Stop condition
Continue automatically through correction, additive semantic import, status reconciliation and validation. Stop only for:
1. a genuinely ambiguous business/aesthetic attribution that requires user judgment;
2. a new HIGH_RISK scope not covered by this authorization;
3. inaccessible required bytes/provenance;
4. global integrity/safety failure.

Do not stop merely because one normal batch completed.
