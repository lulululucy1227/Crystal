# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1
Phase: P2D-SOURCING-IDENTITY-GAP-AUDIT
Status: authorized
Model: Luna
Strength: Medium
Execution class: READ_ONLY

## Authorization basis
The user instructed GPT to continue advancing the Crystal project autonomously until a genuinely important business/aesthetic decision requires user intervention. P2C completed without such a decision. This phase is strictly read-only and exists to determine whether the six real supplier catalog offers can be connected to canonical materials/components safely without inventing identity.

## Verified starting state
Latest `outputs/GPT_HANDOFF.json` reports P2C completed:
- canonical suppliers = 7;
- canonical supplier_offer = 1;
- six official catalog offers are staged/review_required;
- exact matches = 0, ambiguous = 0, no_match = 6;
- no new material/component identities were created;
- marketplace discovery remains non-canonical;
- tests/integrity/idempotency passed.

Read:
- `AGENTS.md`
- latest `agent/GPT_NEXT_TASK.md`
- latest `outputs/GPT_HANDOFF.json`
- `outputs/p2c-sourcing-matchability-audit.json`
- `inputs/p2c-gpt-sourcing-discovery-20260830.json`

## Objective
Produce an exact, read-only identity-gap map for the six staged catalog offers. Determine what canonical material/material_variant/component identity already exists, what is genuinely missing, and what smallest additive identity work would be required before any offer can be safely promoted to `supplier_offer`.

This phase must NOT create or modify canonical rows.

## Required audit
Create:
`outputs/p2d-sourcing-identity-gap-audit.json`

For every one of the six offer keys:
1. Report the exact seller-stated identity fields available from P2C input:
   - seller material label
   - product label
   - shape/form
   - size/dimensions
   - unit basis
   - supplier ID/name
   - source URL
2. Query canonical `material` and report exact/normalized candidate parent material rows, including canonical name, aliases if available, natural_status and verification state where represented.
3. Query canonical `material_variant` rows under any candidate parent material and list variant_code, grade/source tier, shape/cut/size, transparency, reproducibility, source/provenance and verification status relevant to matching.
4. Query canonical `component` rows that could be candidates and report exact component_code/type/shape/size/design_role/material_variant/source.
5. Classify each offer as exactly one of:
   - `existing_exact_target`
   - `parent_material_exists_variant_missing`
   - `parent_material_missing`
   - `component_identity_missing`
   - `conflicting_or_ambiguous_identity`
6. State the minimum safe next data action for each offer, without executing it.

## Candidate identity rules
Strictly distinguish:
- a canonical material identity (e.g. a material category/name),
- a source-stated product identity,
- a material variant (size/cut/appearance/lot/verification),
- a purchasable component,
- a supplier offer.

Do NOT treat a seller material label as independent verification of naturalness, authenticity, treatment, grade or provenance.
Do NOT map `925 Sterling Silver` hardware to a generic component unless component type/shape/size are exact enough.
Do NOT treat a strand price as an indicative per-bead price unless bead count is explicitly stored.
Do NOT create a new canonical parent material just to make an offer match.

## Cross-check broader canonical readiness
Also report:
- full canonical material list (id + canonical_name + family + natural_status);
- all material aliases relevant to the six offers;
- count of material variants by parent material;
- variants currently lacking source/provenance or exact size/cut fields;
- component identities that are generic/underspecified for sourcing match purposes;
- whether current schema can represent source-scoped unverified supplier variants/components without migration;
- whether a safe additive identity phase could be done using existing schema only.

## Decision output
At the end of `outputs/p2d-sourcing-identity-gap-audit.json`, include a machine-readable recommendation:
- `SAFE_ADDITIVE_IDENTITY_ENRICHMENT` if all required missing identities can be added using existing schema while clearly preserving source-claim/unverified boundaries;
- `NEEDS_GPT_SEMANTIC_MAPPING` if GPT must author exact mappings/identity text first;
- `NEEDS_USER_BUSINESS_DECISION` only if the next step would actually choose a sourcing route, target quality tier, production geography, purchasing commitment or other consequential business preference;
- `SCHEMA_BLOCKER` only if existing schema cannot represent the minimum safe identity/provenance structure.

Do not label ordinary missing data as a user business decision.

## Database scope
READ_ONLY only.
No SQLite writes.
No migration.
No material/material_variant/component/supplier/supplier_offer/staging edits.
No product/BOM writes.
No pattern/theme/preference/reference edits.
No supplier outreach, quote request or orders.
No independent web research by Codex.
No Bridge/watcher work.

## Validation
- `PRAGMA integrity_check = ok`
- `PRAGMA foreign_key_check = 0`
- confirm DB SHA unchanged before/after
- `git diff --check`
- run existing validation/tests only if they do not mutate production DB

## Required outputs
Create/update only repository report/handoff files:
- `outputs/p2d-sourcing-identity-gap-audit.json`
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/P2D-SOURCING-IDENTITY-GAP-AUDIT.json`

## Git
Commit/push the read-only audit artifacts and handoff to Crystal `main`; verify local HEAD == origin/main and worktree clean.

## Stop condition
Complete the full read-only audit and stop. No user decision is expected unless the evidence proves a genuinely consequential business choice is now unavoidable.

## Final handoff fields
PHASE / STATUS / DB SHA BEFORE+AFTER / SIX OFFER CLASSIFICATIONS / MATERIAL+VARIANT+COMPONENT GAP SUMMARY / SCHEMA FIT / RECOMMENDATION / INTEGRITY / TESTS / COMMIT / HEAD==ORIGIN / WORKTREE CLEAN / USER DECISION REQUIRED.