# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1
Phase: P2E-P2H-CONTINUOUS-SOURCING-PIPELINE
Status: waiting_for_explicit_user_review_approval
Model: Terra
Strength: Medium
Execution class: DATABASE_WRITE + READ_ONLY chained phases

## Current blocker
The previous P2E attempt correctly stopped and restored the canonical DB byte-for-byte because project validation requires an explicit approved `review_decision` before creating `promotion_log`, while the task correctly prohibited fabricating a human approval.

Latest verified handoff:
`outputs/GPT_HANDOFF.json`

Approval package:
`outputs/p2e-review-approval-required-20260830.json`

Current canonical DB remains at pre-P2E SHA:
`385fe22cad0b2148f4a48a98678863c6a659bf8c49ec55915737485d942c31a7`

No P2E canonical identity/promotion writes were retained.

## Explicit user action required before execution
Do NOT execute this task until GPT records that the user explicitly approves staged records 139-144 for canonical promotion under the exact boundary below.

Approval means only:
- these six staged public-catalog claims may receive `review_decision.decision='approved'`;
- reviewer role label may be recorded exactly as `project_owner_user` with notes/source context that approval was explicitly given in ChatGPT on 2026-08-30;
- the resulting canonical identities/offers remain source-scoped and `unverified`;
- this is NOT supplier selection, purchase approval, production approval, geography selection, quality verification or gemstone authenticity verification.

The six records are:
- 139 — EDEL-SMOKY-QUARTZ-6MM-375CM
- 140 — EDEL-SMOKY-QUARTZ-10MM
- 141 — EDEL-AQUAMARINE-8MM-39CM
- 142 — EDEL-AQUAMARINE-MULTI-FACETED-7MM
- 143 — PERLES-925-CURVED-TUBE-26X3
- 144 — PERLES-925-ROUND-SPACER-113X6

Once explicit user approval is recorded by GPT, update Status to `authorized` and continue all phases below in one run. Do not stop at ordinary phase boundaries.

---

# PHASE A — P2E-R REVIEW APPROVAL + EXACT OFFER PROMOTION

Read:
- `inputs/p2e-gpt-sourcing-identity-mapping-20260830.json`
- `outputs/p2e-review-approval-required-20260830.json`
- latest P2E blocker outputs/handoff

After explicit user approval exists:
1. Create/reuse exactly six approved `review_decision` rows for staged records 139-144.
2. Reviewer field must be role label `project_owner_user`; notes must record that this is explicit user approval through the Crystal GPT control plane on 2026-08-30. Do not invent a personal name.
3. Rerun the P2E exact identity enrichment using the existing schema and authoritative GPT mapping.
4. Promote exactly the six P2E offers to `supplier_offer` if all target/source/price fields reconcile.
5. All offers remain `verification_status='unverified'` and notes must preserve public-catalog benchmark/VAT boundary.
6. Create/reuse promotion_log through normal project mechanics.
7. Prove replay/idempotency and full integrity.

Preserve all original P2E boundaries: no schema migration, no fuzzy matching, no supplier selection, no purchase, no packaging/product/BOM changes in this phase.

---

# PHASE B — P2F EUROPE PACKAGING BENCHMARK INTAKE

Authoritative GPT input:
`inputs/p2f-gpt-packaging-catalog-benchmark-20260830.json`

Objective:
1. Reconcile existing canonical Laval Europe supplier/source.
2. Stage all four exact packaging catalog offers with full provenance and price tiers.
3. Preserve excl-VAT basis exactly; do not convert VAT or landed cost.
4. Deterministically compare against existing `packaging_option` identities.
5. Create canonical `packaging_supplier_offer` only when an existing packaging_option is an exact conflict-free match.
6. If no exact match, leave staged/review_required. Do not create a new packaging_option merely to force promotion.
7. Produce `outputs/p2f-packaging-matchability-audit.json` with exact/no_match/ambiguous counts and packaging cost benchmark ranges.

No packaging style selection is authorized.

---

# PHASE C — P2G CORE MATERIAL CATALOG BENCHMARK INTAKE

Authoritative GPT input:
`inputs/p2g-gpt-core-material-catalog-benchmark-20260830.json`

Objective:
1. Reconcile existing Gemstone Wholesale / edelsteine.de supplier/source.
2. Stage all six exact catalog offers.
3. Where `canonical_parent_mapping` is explicitly supplied and conflict-free, create/reuse source-scoped unverified material_variant identity if required to represent the exact seller product.
4. Do not overwrite general/non-source-scoped existing variants.
5. Promote to supplier_offer only where exact target identity exists and the normal review/promotion process is honestly satisfied.
6. For `EDEL-RUTILATED-QUARTZ-MULTI-8MM-40CM`, keep staged only because GPT intentionally did not map the parent to Gold or Black Rutilated Quartz.
7. For Labradorite faceted AAA offer, preserve source title/description size conflict exactly and do not normalize to one exact size; if that prevents exact variant identity, leave staged/review_required.
8. Do not infer seller quality claims as verified quality.
9. Produce `outputs/p2g-core-material-matchability-audit.json`.

No quality-tier or supplier-selection decision is authorized.

---

# PHASE D — P2H SOURCING / COST READINESS MATRIX — READ ONLY

After phases A-C, run a read-only project readiness synthesis from canonical/staged data.

Create:
`outputs/p2h-sourcing-cost-readiness-matrix.json`

Report factual and deterministic metrics only:
- materials and source-scoped material variants with exact catalog benchmark offers;
- components with exact catalog benchmark offers;
- packaging options with exact/staged benchmark offers;
- supplier count and supplier_offer count by verification status;
- catalog benchmarks usable for BOM costing vs staged-only evidence;
- broad cost ranges by material/component/packaging offer without pretending retail catalog prices are landed production costs;
- which canonical materials/components/themes currently have sufficient sourcing evidence to support a prototype cost estimate;
- which are blocked only by missing data;
- which would require a genuine user business decision.

You may cross-reference existing design-reference synthesis and existing canonical theme/pattern data READ ONLY to identify sourcing coverage. Do not create or mutate preference, pattern, theme or product concepts.

Do NOT create a product_concept or BOM in P2H unless every required component identity and cost basis is already deterministic AND doing so does not implicitly choose a theme/quality/supplier route. The default is READ ONLY readiness analysis.

The P2H output must classify the next step as exactly one of:
- `CONTINUE_ORDINARY_DATA_WORK`
- `READY_FOR_USER_PROTOTYPE_DECISION`
- `NEEDS_GPT_SEMANTIC_MAPPING`
- `SCHEMA_BLOCKER`

Use `READY_FOR_USER_PROTOTYPE_DECISION` only if the ordinary data work is sufficiently complete that the next meaningful action is choosing first prototype theme/design/quality/sourcing route.

---

# CONTINUOUS EXECUTION RULE

Once explicit approval is present, execute Phases A → B → C → D continuously in one Codex run.

Do NOT stop because:
- P2E promotion completed;
- P2F finished staging;
- P2G finished staging;
- one audit completed.

Stop only for:
1. new HIGH_RISK scope outside these explicit boundaries;
2. schema/process blocker that cannot be handled honestly;
3. unexplained canonical divergence or integrity failure;
4. a genuine user business decision is reached;
5. all four phases complete.

## Safety / validation
Before each write phase:
- clean worktree and safe sync;
- byte-for-byte DB backup;
- pre-write SHA and affected manifest.

After each coherent write phase:
- created/reused counts;
- replay/idempotency;
- unrelated fingerprints unchanged;
- `PRAGMA integrity_check = ok`;
- `PRAGMA foreign_key_check = 0`;
- focused tests;
- full `npm test`;
- `npm run validate`;
- `git diff --check`.

No schema migration, supplier outreach, quote request, order, purchase, production commitment, or Bridge/watcher work.

## Required final handoff
Update `outputs/GPT_HANDOFF.json` and archive a handoff for `P2E-P2H-CONTINUOUS-SOURCING-PIPELINE` including:
- explicit user review approval evidence status;
- six P2E review/promotion results;
- P2F packaging stage/promotion counts;
- P2G material stage/variant/promotion counts;
- P2H readiness classification;
- DB SHA sequence/backups;
- integrity/tests;
- commits;
- HEAD==origin/main;
- worktree clean;
- `USER DECISION REQUIRED` with exact decision only if genuinely consequential.
