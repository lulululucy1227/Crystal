# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1
Phase: P2M-P2Q-GLACIER-SIGNATURE-PROTOTYPE-PLANNING
Status: authorized
Model: Terra
Strength: Medium
Execution class: DATABASE_WRITE + READ_ONLY chained phases

## Authorization basis
The user explicitly selected option A for the first prototype.

Read as authoritative user decision:
`inputs/p2m-user-prototype-decision-glacier-signature-20260830.json`

Read as GPT semantic/design authority:
`inputs/p2m-gpt-glacier-signature-prototype-brief-20260830.json`

The selected route is:
- Glacier theme;
- Signature / high-end validation prototype positioning;
- Europe-local ease/speed for first-prototype planning;
- exact staged public-catalog benchmarks may be used for planning and conservative cost envelopes;
- no supplier selection, purchase, order, production commitment or final packaging lock is authorized.

Execute Phases A → B → C → D → E continuously in one run. Do not stop at ordinary phase boundaries.

## Verified starting state
Latest completed P2I-P2L handoff reports:
- classification `READY_FOR_USER_PROTOTYPE_DECISION`;
- exact public price identities across 7 canonical material categories;
- 2 exact 925 hardware benchmark components;
- 4 exact Laval packaging source products;
- 6 promoted offers plus 10 exact staged-only offers;
- DB SHA `89d31eacbab93d8baac83b999e201120043e578cb48316b19a2ee1651c85b184`;
- no schema/integrity blockers.

Preflight must explicitly verify current worktree safety and run `git diff --check` because the prior handoff listed that check as PENDING.

---

# PHASE A — P2M RECORD PROTOTYPE DECISION + PRODUCT CONCEPT

Using existing schema only:
1. Safely sync main and require clean worktree. Never reset/clean/discard user work.
2. Create timestamped byte-for-byte DB backup and record pre-write SHA.
3. Create/reuse one canonical `product_concept` only:
   - name: `Glacier Signature Prototype 01`
   - theme: `Glacier`
   - version_label: `v0`
   - status: `research`
   - intent/notes: preserve the user-decision and GPT prototype brief boundaries.
4. Do NOT create canonical BOM rows in this phase unless every line can be represented with deterministic component identity and honest unit cost without inferring per-bead cost. Default is no canonical BOM yet.
5. Do not mutate preference/pattern/theme/reference history.

Produce:
`outputs/p2m-glacier-signature-product-concept.json`

Report product_concept ID, exact decision provenance, and whether canonical BOM creation was safely deferred.

---

# PHASE B — P2N DESIGN STRUCTURE + EXACT SOURCING MAP — READ ONLY EXCEPT OUTPUTS

Create:
`outputs/p2n-glacier-p01-design-structure.json`

Materialize the GPT brief exactly, without inventing new aesthetic semantics:
- P01-A recommended variant;
- P01-B fallback variant;
- anchor/atmosphere, light, hero, transition and hardware roles exactly as authored;
- structural rules exactly as authored.

For every material/hardware role, resolve and report:
- canonical material/material_variant/component IDs;
- source/supplier identity;
- offer state: promoted / exact staged-only / unavailable;
- price/currency/unit/VAT basis where stored;
- whether bead count is explicitly sourced;
- whether per-bead cost may or may not be calculated.

Do NOT create new source-product identities merely for aesthetic convenience.
Do NOT infer bracelet bead quantities or finished length.

---

# PHASE C — P2O CONSERVATIVE PROTOTYPE PROCUREMENT COST ENVELOPE

Create:
`outputs/p2o-glacier-p01-prototype-cost-envelope.json`

Build factual planning baskets for P01-A and P01-B using the selected planning policy.

Rules:
- staged exact benchmarks ARE allowed for planning because the user selected Route A;
- staged status must remain visible and must not be represented as approved purchase data;
- where a strand has no explicit bead count, use the full strand purchase price only as a conservative first-sample procurement cost / ceiling; never invent per-bead cost;
- hardware may use exact per-piece catalog price where stored;
- packaging must remain a separate shortlisted benchmark and must not be treated as selected;
- keep VAT-included, VAT-excluded and source-stated/unknown VAT bases separated rather than silently summing incompatible bases;
- shipping, payment fees, customs, returns, wastage, tooling and assembly labor remain unknown unless already sourced.

For each prototype variant report:
- exact items required for one first sample procurement basket;
- known catalog spend by VAT basis/currency;
- optional Larimar hero incremental basket cost for P01-A;
- cost items still unknown;
- whether a rough sample-budget approval can be requested without inventing data.

Do not place orders.

---

# PHASE D — P2P PACKAGING SHORTLIST + PROTOTYPE EXECUTION PACK

Create:
`outputs/p2p-glacier-p01-prototype-execution-pack.json`

Packaging:
- compare the four exact Laval source-product packaging identities READ ONLY;
- rank them for Glacier prototype use by factual fit to protection, dimensions/use type, sample MOQ/price information and the GPT-authorized cool/quiet presentation direction;
- ranking is an assistant planning recommendation, NOT a user packaging selection;
- do not promote staged packaging offers and do not create review approvals.

Prototype execution pack must include:
- P01-A recommended structure;
- P01-B fallback structure;
- exact material/hardware source-product shortlist;
- exact supplier names and stored source URLs;
- full-strand/per-piece purchase units needed for a first sample basket;
- explicit unknowns that must be checked before money is spent;
- incoming-material inspection checklist limited to observable/specifiable facts (dimensions, color consistency, visible defects, source label, quantity, packaging condition); do not claim gemstone authenticity testing unless an actual verification method exists;
- assembly/sample evaluation checklist for rhythm, asymmetry, focal balance, hardware proportion and overall Glacier visual coherence.

Do NOT contact suppliers and do NOT generate an order action.

---

# PHASE E — P2Q PURCHASE-READINESS GATE — READ ONLY

Create:
`outputs/p2q-glacier-p01-purchase-readiness-gate.json`

Set exactly one classification:
- `CONTINUE_ORDINARY_DATA_WORK`
- `READY_FOR_PURCHASE_APPROVAL`
- `NEEDS_USER_DESIGN_DECISION`
- `SCHEMA_BLOCKER`

Use `READY_FOR_PURCHASE_APPROVAL` only if:
1. P01-A has exact source-product identities for every required material/hardware item;
2. a conservative first-sample procurement basket can be priced without invented per-bead arithmetic;
3. at least one packaging candidate has a factual public benchmark, even if not selected;
4. no schema/integrity blocker remains;
5. the only consequential next action is spending money / choosing exact purchase basket quantities or supplier checkout.

If P01-A fails but P01-B satisfies all criteria, report that explicitly and classify based on whether user intervention is needed to choose the fallback.

If classification is `READY_FOR_PURCHASE_APPROVAL`, provide a concise `purchase_decision_packet` containing:
- recommended prototype variant;
- exact proposed basket items and suppliers;
- known catalog cost envelope with VAT-basis boundaries;
- packaging recommendation ranked but not locked;
- all staged/unverified warnings;
- the minimum user decision required before any money is spent.

Do not execute purchase, outreach, checkout, quote request or supplier commitment.

---

# CONTINUOUS EXECUTION RULE

Execute P2M → P2N → P2O → P2P → P2Q continuously.
Do not stop after product_concept creation, structure mapping, costing or packaging ranking.

Stop only for:
1. new HIGH_RISK scope or schema migration requirement;
2. unexplained canonical divergence/integrity failure;
3. inability to preserve source-claim/unverified boundaries;
4. completion of P2Q, especially if it reaches purchase approval;
5. a genuinely new user design/business decision not already covered by Route A.

## Safety / validation
Before database writes:
- safe sync;
- clean worktree;
- `git diff --check` PASS;
- byte-for-byte DB backup;
- pre-write SHA and affected manifest.

After coherent database writes:
- exact created/reused counts;
- replay/idempotency;
- unrelated fingerprints unchanged;
- `PRAGMA integrity_check = ok`;
- `PRAGMA foreign_key_check = 0`;
- focused tests;
- full `npm test`;
- `npm run validate`;
- final `git diff --check`.

No schema migration, supplier outreach, quote request, order, purchase, production commitment, fabricated review approval, or Bridge/watcher work.

## Final handoff
Update `outputs/GPT_HANDOFF.json` and archive:
`outputs/handoffs/P2M-P2Q-GLACIER-SIGNATURE-PROTOTYPE-PLANNING.json`

Include:
- product_concept created/reused;
- canonical BOM created or safely deferred;
- P01-A/P01-B sourcing-map completeness;
- conservative cost envelopes;
- packaging shortlist;
- P2Q classification and purchase_decision_packet if applicable;
- DB SHA before/after and backup;
- integrity/tests/idempotency;
- commit;
- HEAD == origin/main;
- worktree clean;
- USER DECISION REQUIRED only if a consequential next action remains.
