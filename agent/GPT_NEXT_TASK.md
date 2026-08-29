# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1
Phase: P2A-HISTORICAL-CANONICAL-REGROUP-DECISION
Status: waiting_for_user_authorization
Model: Terra
Strength: High
Execution class: HIGH_RISK

## Current verified GPT-side state
- Google Drive Inbox image count: 0.
- All 94 currently known project images have completed GPT visual analysis and were moved to the `Reviewed` folder after their analysis was safely preserved.
- `Reviewed` means GPT visual analysis complete; it does NOT by itself mean canonical SQLite ingestion complete.
- Latest new reference IMG_7869.PNG + IMG_7870.PNG has authoritative semantic input at `inputs/p2a-gpt-new-reference-gray-fog-wood-anchor-20260830.json`.
- Previously completed authoritative semantic batches remain available under `inputs/`.
- Last verified local canonical DB baseline before these pending additive imports remains 80 image observations and 19 synthesis assertions / 37 synthesis sources, SHA-256 `9321567717F7AB32505A0D873DD2527270C6E3F7651820E66949291D794F9DD2`.

## Why execution is paused
GPT discovered a real historical canonical grouping defect while completing visual review. Correcting it requires splitting existing design references and moving existing canonical asset links, so it is beyond ordinary additive DATABASE_WRITE and requires explicit HIGH_RISK authorization.

Decision pack:
`outputs/p2a-historical-canonical-regroup-decision-pack-20260830.json`

Authoritative detailed evidence:
`inputs/p2a-gpt-historical-early-c-analysis-and-regroup-plan.json`

## Proposed high-risk correction
### Split bundled references
- REF-000003 currently bundles IMG_7654 / IMG_7655 / IMG_7656, which are three different bracelet designs from one carousel. Proposed: three separate design references EARLY-C01 / C02 / C03.
- REF-000004 currently bundles IMG_7661 / IMG_7662 / IMG_7663 / IMG_7664, which are four different bracelet designs. Proposed: four separate design references EARLY-C04 / C05 / C06 / C07.

### Move five high-confidence boundary assets
- IMG_7678: REF-000008 → REF-000009
- IMG_7688: REF-000011 → REF-000012
- IMG_7690: REF-000012 → REF-000013
- IMG_7696: REF-000014 → REF-000015
- IMG_7698: REF-000015 → REF-000016

These moves are supported by source-account/product/post continuity, not image similarity alone.

## Recommendation
AUTHORIZE correction.

Reason: `Design Reference` is intended to represent one product/design composition. Leaving carousel bundling and cross-boundary mistakes in canonical data would contaminate pattern frequency, theme attribution, design assessment and future design-DNA inference.

## If user authorizes HIGH_RISK correction
Do NOT mutate immediately. First run a read-only impact audit across all tables related to affected references/assets, including at minimum:
- design_reference
- design_reference_image
- image_asset
- image_visual_observation
- design_reference_synthesis_assertion/source
- preference evidence
- design assessments
- pattern/reference relations
- theme/reference relations
- source/provenance tables

Then execute transactionally with:
1. timestamped DB backup + pre-write SHA-256;
2. exact before manifest;
3. preserve existing reference keys where least disruptive and create new keys only for split child designs;
4. move only the five exact high-confidence boundary assets above;
5. never duplicate ambiguous old reference-level relations across every child; quarantine/flag uncertain attribution rather than guessing;
6. preserve raw evidence, observations and user-signal history;
7. then import all pending additive GPT semantic inputs;
8. full integrity/FK/idempotency/tests/validate/diff checks;
9. exact after manifest + DB SHA;
10. coherent commit/push and handoff report.

## If user declines correction
Do not perform the split/moves. Continue additive semantic import only and record the canonical grouping defects as known technical debt. Future analytics must explicitly exclude or flag affected references.

## No execution authorization yet
HIGH_RISK execution is NOT authorized until the user explicitly chooses Option A.
