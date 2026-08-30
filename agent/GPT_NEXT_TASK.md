# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1
Phase: P2E-SOURCING-IDENTITY-ENRICHMENT-AND-OFFER-PROMOTION
Status: authorized
Model: Terra
Strength: Medium
Execution class: DATABASE_WRITE

## Authorization basis
The user instructed GPT to continue advancing the Crystal project autonomously until a genuinely important business/aesthetic decision requires user intervention. P2D found no schema blocker and no business choice; the missing step is bounded canonical identity enrichment required to connect six already-staged public catalog offers to exact source-scoped targets.

GPT has authored the exact semantic mapping:
`inputs/p2e-gpt-sourcing-identity-mapping-20260830.json`

This phase does NOT choose a production supplier, sourcing geography, quality tier, purchase quantity or product design.

## Verified starting state
P2D completed read-only with DB SHA unchanged:
`385fe22cad0b2148f4a48a98678863c6a659bf8c49ec55915737485d942c31a7`

P2D facts:
- six P2C offers remain staged/review_required;
- four gemstone offers need exact source-scoped variant identities;
- two silver hardware offers need exact component identities;
- existing schema can represent the required source/provenance/unverified boundaries without migration;
- no exact canonical supplier_offer was created in P2C;
- P2D audit incorrectly classified seller spelling `Smokey Quartz` as parent_material_missing even though canonical `Smoky Quartz` already exists. GPT mapping explicitly resolves this as an alias to the existing parent, not a new parent material.

Read before work:
- `AGENTS.md`
- latest `agent/GPT_NEXT_TASK.md`
- latest `outputs/GPT_HANDOFF.json`
- `outputs/p2d-sourcing-identity-gap-audit.json`
- `inputs/p2c-gpt-sourcing-discovery-20260830.json`
- `inputs/p2e-gpt-sourcing-identity-mapping-20260830.json`

## Objective
Using the existing schema only:
1. create/reconcile the exact GPT-authored material/category identities needed for these six offers;
2. create/reconcile the exact GPT-authored source-scoped unverified material variants/components;
3. promote all six staged offers to canonical `supplier_offer` only after their exact targets exist and all source/price fields reconcile;
4. preserve the seller-claim/unverified boundary;
5. prove replay/idempotency, integrity and unchanged unrelated project state;
6. produce a post-phase sourcing readiness artifact for GPT.

## Mandatory safety preflight
1. Safely sync Crystal `main`; require clean worktree before writes. Never reset/clean/discard user work.
2. Verify current canonical DB state against the P2D handoff and reconcile any legitimate later checkpoint before writing.
3. Create a timestamped byte-for-byte backup and record pre-write SHA-256.
4. Build an exact before manifest for the affected material/material_alias/material_variant/component/supplier_offer/staging/promotion rows.
5. Do not write until the input mapping can be represented exactly using current schema.

## Semantic mapping — authoritative
Treat `inputs/p2e-gpt-sourcing-identity-mapping-20260830.json` as the semantic authority.

### Smoky Quartz
- Reuse existing canonical material `Smoky Quartz`.
- Do NOT create a second parent material.
- Add/reuse source-scoped reviewed alias `Smokey Quartz` exactly as authored if absent.
- Create/reuse exactly the two authored source-scoped unverified variants:
  - `SRC-EDEL-SMOKY-QTZ-RND-6MM`
  - `SRC-EDEL-SMOKY-QTZ-RND-10MM`

### Aquamarine
Create canonical parent material `Aquamarine` only if absent, exactly with the authored family/natural-status/description boundary. This is a canonical category identity, NOT verification that the seller's products are authentic aquamarine.

Create/reuse exactly:
- `SRC-EDEL-AQUAMARINE-RND-8MM`
- `SRC-EDEL-AQUAMARINE-MULTI-FACETED-7MM`

### Sterling Silver hardware
Create canonical parent `Sterling Silver` only if absent, then create/reuse source-scoped unverified variant:
- `SRC-PERLES-STERLING-SILVER-925`

Create/reuse exactly two components:
- `SRC-PERLES-925-CURVED-TUBE-26X3`
- `SRC-PERLES-925-ROUND-SPACER-113X6`

Use all fields exactly as authored. Do not infer finish, hole spec, certification, purity verification or other missing facts.

## Offer promotion
Promote exactly these six staged P2C offers after exact identity reconciliation:
- `EDEL-SMOKY-QUARTZ-6MM-375CM`
- `EDEL-SMOKY-QUARTZ-10MM`
- `EDEL-AQUAMARINE-8MM-39CM`
- `EDEL-AQUAMARINE-MULTI-FACETED-7MM`
- `PERLES-925-CURVED-TUBE-26X3`
- `PERLES-925-ROUND-SPACER-113X6`

Rules:
- use the exact target mapping, currency, unit_price_minor, unit_label, MOQ/null, grade claim, quoted date, verification status and notes from GPT input;
- keep all canonical supplier_offer rows `unverified`;
- public catalog prices are benchmark prices, not negotiated/landed production cost;
- do not convert VAT treatment;
- do not infer per-bead cost or strand bead count;
- mark the corresponding staged record `promoted` only after canonical supplier_offer succeeds;
- create/reuse `promotion_log` using normal project mechanics;
- do NOT fabricate a human `review_decision`. If current project mechanics strictly require human review_decision for promotion, stop that promotion sub-item and report the process blocker rather than inventing a reviewer.

Do NOT copy supplier_offer price into `material_variant.indicative_price_minor`.

## Database scope
Allowed additive/reconciliation writes only, using existing schema:
- material
- material_alias
- material_variant
- component
- supplier_offer
- staged_record/staged_field status only as needed to reflect successful promotion
- promotion_log

Not authorized:
- schema migration
- changing unrelated canonical material/component identities
- fuzzy matching or extra offers
- source/supplier identity changes except deterministic reuse needed by the authored mapping
- packaging writes
- product concept/BOM writes
- design-reference/image/preference/pattern/theme changes
- resolving the six quarantined P2A legacy relations
- supplier outreach, quote requests, orders or production selection
- Bridge/watcher work

## Validation
After apply:
- exact created/reused counts by table;
- exact six offer -> target mapping;
- supplier_offer created/reused count must reconcile to six authored offers;
- replay same import and prove exact reuse/no duplicates;
- the six staged records must have the correct final status if promotion succeeded;
- promotion_log linkage must be complete if schema/process allows promotion;
- unrelated P2A/P2B/P2C fingerprints unchanged;
- `PRAGMA integrity_check = ok`;
- `PRAGMA foreign_key_check = 0`;
- focused P2E tests;
- full `npm test`;
- `npm run validate`;
- `git diff --check`;
- post-write DB SHA-256.

## Required outputs
Create/update:
- `outputs/p2e-sourcing-identity-and-offer-promotion.json`
- `outputs/p2e-sourcing-readiness-after-promotion.json`
- `outputs/GPT_HANDOFF.json`
- archived handoff `outputs/handoffs/P2E-SOURCING-IDENTITY-ENRICHMENT-AND-OFFER-PROMOTION.json`

Post-readiness artifact should report factual counts only, including:
- materials / material_variants / components;
- suppliers / supplier_offers;
- supplier offers usable as exact catalog BOM benchmarks;
- staged supplier-offer records remaining review_required;
- packaging supplier offers;
- whether any remaining blocker now requires a genuine business choice rather than ordinary data work.

## Git
Commit/push coherent Crystal checkpoint to `main`; verify local HEAD == origin/main and clean worktree. Do not touch Local-Codex-Bridge.

## Stop conditions
Continue through identity enrichment, exact promotion, replay, validation, readiness audit, commit and push. Stop only for:
1. unexpected schema/process blocker such as mandatory human review that cannot be represented honestly;
2. unexplained canonical state divergence;
3. integrity/test failure that cannot be safely resolved within this bounded scope;
4. successful completion.

No user business/aesthetic decision is currently required.

## Final handoff fields
PHASE / STATUS / BACKUP / DB SHA BEFORE+AFTER / MATERIAL CREATED+REUSED / ALIAS CREATED+REUSED / VARIANTS CREATED+REUSED / COMPONENTS CREATED+REUSED / SIX OFFER TARGET MAPPINGS / SUPPLIER_OFFERS CREATED+REUSED / STAGED RECORD FINAL STATUS / PROMOTION_LOG CREATED+REUSED / REPLAY / READINESS COUNTS / INTEGRITY / TESTS / COMMIT / HEAD==ORIGIN / WORKTREE CLEAN / USER DECISION REQUIRED.