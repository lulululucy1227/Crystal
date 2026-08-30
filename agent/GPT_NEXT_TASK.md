# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1
Phase: P2C-SOURCING-DISCOVERY-AND-MATCHABILITY
Status: authorized
Model: Luna
Strength: Medium
Execution class: DATABASE_WRITE

## Authorization basis
The user explicitly instructed GPT to continue advancing the project autonomously until a genuinely important business/aesthetic decision requires user intervention. This phase is a bounded, recoverable sourcing-data step and does not make a supplier-selection, purchasing, outreach or production commitment.

## Why this phase exists
P2B completed successfully. Latest verified state from `outputs/GPT_HANDOFF.json`:
- source = 128
- market_evidence = 13
- market_assessment = 71
- P2A image/reference invariants unchanged
- integrity/test/idempotency passed

The P2B readiness audit shows the real bottleneck is sourcing evidence, not image/design analysis or schema:
- material_variant = 62, but only 1 has an indicative price;
- supplier = 1 and supplier_offer = 1, both effectively sample-level/unverified coverage;
- packaging_option = 9 but packaging_supplier_offer = 0;
- 57 staged records still require review.

GPT has now authored a bounded current-web sourcing discovery input:
`inputs/p2c-gpt-sourcing-discovery-20260830.json`

It contains six official supplier candidates, six exact public catalog offer claims, one clearly separated low-confidence marketplace-discovery block, and a GPT sourcing-readiness interpretation. Source claims must remain source claims.

## Objective
1. Safely create/reconcile real supplier/source identities from the official supplier candidates.
2. Stage the exact catalog price/product claims with full provenance rather than forcing uncertain canonical variant/component mappings.
3. Deterministically audit whether any staged offer has an exact existing canonical material_variant/component/packaging match.
4. Promote to canonical `supplier_offer` only where the match is exact, conflict-free and supported by existing canonical identity; otherwise leave staged/review_required.
5. Produce a concise sourcing matchability/readiness artifact for GPT to decide the next business phase.

Do not contact suppliers, request quotes, place orders, choose a production supplier, or invent missing commercial terms.

## Preflight
1. Safely sync Crystal `main`; require clean worktree before writes. Never reset/clean/discard user work.
2. Read:
   - `AGENTS.md`
   - latest `agent/GPT_NEXT_TASK.md`
   - latest `outputs/GPT_HANDOFF.json`
   - `outputs/p2b-sourcing-readiness-audit.json`
   - `inputs/p2c-gpt-sourcing-discovery-20260830.json`
3. Verify P2B completed DB state from latest handoff. Reconcile any legitimate later checkpoint before writing; do not overwrite unexplained work.
4. Create a timestamped byte-for-byte DB backup and record pre-write SHA-256.

## Supplier/source import rules
For each `supplier_candidates[]` item:
- reconcile `source` by factual identity/name/URL;
- create/reuse a canonical `supplier` only when the input explicitly has `canonical_supplier_allowed = true`;
- preserve geography, official URL, capability claims and verification status exactly;
- do not upgrade `partially_verified` to `verified`;
- do not infer trade discount, MOQ, stock, shipping, certification, ethics or quality beyond supplied claims;
- idempotent replay must reuse, not duplicate.

## Catalog offer staging rules
For every `catalog_offer_claims[]` item:
- preserve source URL, seller material label, product label, unit, price, price basis, MOQ/null, verification status and evidence strength exactly;
- create/reuse provenance-safe staged records/fields using the existing staging/review architecture;
- target entity should reflect `supplier_offer` intent without pretending the canonical target is already known;
- staged status should be `review_required` unless deterministic matching proves every required canonical identity field;
- do not convert VAT-included catalog prices into net price unless the input supplies that conversion;
- do not invent strand bead counts or per-bead cost.

## Marketplace discovery block
`marketplace_discovery_only` is discovery evidence only.
- It may be preserved as source/staged research evidence if the existing schema supports this without inventing canonical supplier identity.
- Do NOT canonicalize those marketplace suppliers or offers from this input alone.
- Do NOT normalize displayed price ranges to midpoint/single prices.
- If preserving this block would require a new schema, leave it as input-only evidence and report that fact; no migration.

## Deterministic matchability audit
Create:
`outputs/p2c-sourcing-matchability-audit.json`

For each of the six catalog offer claims, report:
- offer_key
- canonical supplier/source ID
- candidate target type: material_variant / component / none
- exact canonical candidate IDs considered
- match status: exact / ambiguous / no_match
- exact reason
- whether canonical supplier_offer was created/reused
- staged_record/staged_field IDs/status

Matching rules are strict:
- seller material label alone is NOT enough to match a material variant;
- size/shape/form/unit and other identity fields must not conflict;
- component matching must be exact enough to avoid substituting generic 925 hardware for a different component;
- if more than one plausible target remains, status = ambiguous and do not promote;
- no fuzzy similarity promotion.

Also report updated factual readiness counts:
- suppliers
- supplier_offers
- staged supplier/supplier_offer records by status
- material variants with indicative price
- packaging supplier offers
- exact number of sourcing offers now usable for BOM costing vs only benchmark/staged evidence.

## Canonical supplier_offer promotion authorization
DATABASE_WRITE is authorized for canonical `supplier_offer` only when the audit can prove an exact existing target identity from current canonical data.

If exact:
- preserve catalog price and currency as stated;
- quoted_on/observation date = 2026-08-30 unless the source itself gives a different quote date;
- verification_status must remain `unverified` unless supplied otherwise;
- notes must state that the value is a public catalog benchmark and whether VAT is included;
- do not represent it as negotiated/landed production cost.

If not exact:
- keep staged/review_required;
- do not create placeholder material variants/components merely to force an offer into canonical state.

## GPT assessment preservation
Preserve `gpt_phase_assessment` as an audit/report interpretation, not a user preference and not a material/market fact. If existing `market_assessment` is a clean fit, it may be imported as one assistant assessment with analyst `gpt-5.6-sol`; otherwise keep it in the output artifact. Do not modify schema to store it.

## Database scope
Allowed writes using existing schema only:
- source
- supplier
- staged_record / staged_field / review-related staging records as required
- supplier_offer only for exact deterministic matches
- one assistant market/sourcing assessment only if existing schema fits cleanly

Not authorized:
- schema migration
- new material/material_variant/component identities
- packaging option/offer creation from missing prices
- product concept/BOM writes
- preference/pattern/theme/design-reference mutations
- P2A image/reference changes
- resolving the six quarantined legacy relations
- external supplier outreach, email, quote request or order
- watcher/controller/Bridge work

## Validation
After writes:
- exact created/reused counts by table
- staged offer count/status
- exact-match promotion count
- replay/idempotency proof
- P2A and P2B unrelated canonical fingerprints unchanged
- `PRAGMA integrity_check = ok`
- `PRAGMA foreign_key_check = 0`
- focused P2C tests if importer/matcher implementation is added
- full `npm test`
- `npm run validate`
- `git diff --check`

## Required outputs
Create/update:
- `outputs/p2c-sourcing-matchability-audit.json`
- `outputs/GPT_HANDOFF.json`
- archived handoff `outputs/handoffs/P2C-SOURCING-DISCOVERY-AND-MATCHABILITY.json`

## Git
Commit/push a coherent Crystal checkpoint to `main`; verify local HEAD == origin/main and worktree clean. Do not touch Local-Codex-Bridge.

## Stop conditions
Continue through supplier/source reconciliation, offer staging, strict matchability audit, any exact-match promotion, validation, commit and push. Stop only for:
1. unexplained canonical state divergence;
2. schema requirement;
3. integrity/test failure that cannot be safely resolved within this scope;
4. successful completion.

No user decision is currently required. Do not stop merely because some offers remain ambiguous/staged.

## Final handoff fields
PHASE / STATUS / BACKUP / DB SHA BEFORE / DB SHA AFTER / CREATED+REUSED SOURCES / CREATED+REUSED SUPPLIERS / STAGED OFFER CLAIMS / EXACT MATCHES / AMBIGUOUS / NO MATCH / CANONICAL SUPPLIER OFFERS CREATED+REUSED / UPDATED READINESS COUNTS / INTEGRITY / TESTS / COMMIT / HEAD==ORIGIN / WORKTREE CLEAN / USER DECISION REQUIRED.