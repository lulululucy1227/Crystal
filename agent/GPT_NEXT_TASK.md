# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1
Phase: P2I-P2L-CONTINUOUS-IDENTITY-AND-PROTOTYPE-READINESS
Status: authorized
Model: Terra
Strength: Medium
Execution class: DATABASE_WRITE + READ_ONLY chained phases

## Authorization basis
The user explicitly asked GPT to push multiple tasks continuously and to stop only when a genuinely consequential business/aesthetic choice requires intervention. The prior P2E-P2H pipeline completed successfully and classified the next step as `CONTINUE_ORDINARY_DATA_WORK`.

This phase performs only bounded source-identity enrichment and read-only readiness analysis. It does NOT select a supplier, packaging style, quality tier, production geography, prototype design, purchase quantity, or order.

## Verified starting state
Latest `outputs/GPT_HANDOFF.json` reports P2E-P2H completed:
- P2E: 6 approved records 139-144 promoted; 6 promotion logs; all offers remain unverified.
- P2F: 4 packaging catalog offers staged; 0 promoted; 4 no_match due missing exact packaging identity/review.
- P2G: 6 material catalog offers staged; 4 source-scoped variants created; 1 Labradorite size-conflict identity unresolved; 1 Rutilated Quartz parent mapping unresolved; 0 promoted because no new human approvals were fabricated.
- P2H: classification `CONTINUE_ORDINARY_DATA_WORK`.
- DB SHA after P2H: `ea80287d36dd3fe71e25962d8b34492612c6f72c8f12c012cf334f6be086015e`.
- Latest handoff listed `git_diff_check` as PENDING, so preflight MUST explicitly verify current worktree/diff safety before any new write.

New GPT semantic authority:
- `inputs/p2i-gpt-packaging-identity-mapping-20260830.json`
- `inputs/p2j-gpt-material-gap-resolution-20260830.json`

Execute Phases A → B → C → D continuously. Do not stop at ordinary phase boundaries.

---

# PHASE A — P2I EXACT SOURCE-SCOPED PACKAGING IDENTITIES

Objective: create/reconcile exact source-product packaging identities for the four already-staged Laval Europe offers without selecting any packaging style.

Read:
- `outputs/p2f-packaging-matchability-audit.json`
- the original P2F GPT catalog input
- `inputs/p2i-gpt-packaging-identity-mapping-20260830.json`

Using existing schema only, create/reuse exactly the four GPT-authored `packaging_option` identities:
- `SRC-LAVAL-703525-KRAFT-UNIVERSAL-BOX`
- `SRC-LAVAL-703211-WHITE-SATIN-UNIVERSAL-BOX`
- `SRC-LAVAL-700290-BLACK-LEATHERETTE-BRACELET-BOX`
- `SRC-LAVAL-703705-ECO-KRAFT-BRACELET-BOX`

Rules:
- use the exact supplier/source mapping already canonical for Laval Europe;
- preserve source-stated material, dimensions, finish and source notes exactly;
- `verification_status = unverified`;
- `suitable_tier = unclassified`;
- do not map these to the older generic packaging options;
- do not retire/delete/modify old generic packaging options;
- do not create `packaging_supplier_offer` unless a valid approved review_decision already exists for the staged record. Do not fabricate new approval.

Produce/update:
- `outputs/p2i-packaging-identity-reconciliation.json`

It must report four staged offer keys -> exact packaging_option IDs/codes and whether each remains review-required.

---

# PHASE B — P2J RESOLVE REMAINING P2G MATERIAL IDENTITIES

Read:
- `outputs/p2g-core-material-matchability-audit.json`
- original P2G GPT input
- `inputs/p2j-gpt-material-gap-resolution-20260830.json`

Resolve exactly two remaining source-product identity gaps:

## Rutilated Quartz Multi
- Create/reuse generic canonical parent `Rutilated Quartz` exactly as GPT authored if absent.
- Do NOT merge it into or substitute `Gold Rutilated Quartz` or `Black Rutilated Quartz`.
- Create/reuse source-scoped unverified variant:
  `SRC-P2G-EDEL-RUTILATED-QTZ-MULTI-8MM-40CM`.

## Labradorite faceted AAA product
- Reuse canonical parent `Labradorite`.
- Create/reuse source-scoped unverified variant:
  `SRC-P2G-EDEL-LABRADORITE-FACETED-AAA-15471`.
- Preserve BOTH supplier size claims verbatim in the identity/notes: title 12-13mm and description approx. 11.5mm.
- The stable source product identity is supplier product no. `STRLABFAC125AAA-15471`; do not normalize the conflict into one exact size.

Do not promote either staged offer unless the normal review workflow is already honestly satisfied. Do not fabricate human approval.

Produce/update:
- `outputs/p2j-material-gap-resolution.json`

---

# PHASE C — P2K REVIEW-READY SOURCING RECONCILIATION — READ ONLY EXCEPT OUTPUT FILES

After A/B, audit all P2F and P2G staged catalog records.

Create:
`outputs/p2k-sourcing-review-ready-pack.json`

For every P2F/P2G offer report:
- offer_key
- staged_record_id
- exact canonical target type/id/code, if now available
- supplier/source identity
- price/currency/unit/VAT basis
- verification status
- current review_decision state
- current staged status
- classification exactly one of:
  - `EXACT_IDENTITY_REVIEW_REQUIRED`
  - `EXACT_IDENTITY_ALREADY_APPROVED`
  - `PROMOTED`
  - `IDENTITY_STILL_UNRESOLVED`
- whether the public catalog evidence is usable as a rough benchmark even if not canonical-promoted

Do NOT create review approvals in P2K.
Do NOT ask user to approve ordinary records inside Codex.
The purpose is to consolidate future review into one batch if/when it is operationally needed.

Also report:
- total exact review-ready P2F/P2G records;
- unresolved count;
- promoted count;
- all exact staged public-catalog benchmarks by material/component/packaging category.

---

# PHASE D — P2L PROTOTYPE READINESS GATE — READ ONLY

Create:
`outputs/p2l-prototype-readiness-gate.json`

Use canonical plus exact staged public-catalog evidence. Preserve the distinction:
- promoted canonical offer;
- exact staged but unapproved benchmark;
- unresolved evidence.

Do not create product_concept, BOM, theme assignment, supplier selection, or aesthetic recommendation.

## Required factual matrix
Report:
- distinct canonical material categories with exact source-product price benchmark identity;
- exact source-scoped material variants with public catalog prices;
- exact hardware components with public catalog prices;
- exact packaging source products with public catalog prices;
- number of promoted vs exact-staged-only offers;
- price ranges per currency and VAT basis;
- which prices are per piece vs per strand;
- explicit bead-count offers where per-bead arithmetic could later be deterministic;
- offers where per-bead cost MUST NOT be inferred;
- schema/integrity/process blockers if any.

## Readiness classification
Set exactly one:
- `CONTINUE_ORDINARY_DATA_WORK`
- `READY_FOR_USER_PROTOTYPE_DECISION`
- `NEEDS_GPT_SEMANTIC_MAPPING`
- `SCHEMA_BLOCKER`

Use `READY_FOR_USER_PROTOTYPE_DECISION` only if ALL are true after P2I/P2J:
1. at least 5 distinct canonical material categories have exact source-product public price benchmark identity, promoted or exact-staged;
2. at least 2 exact hardware component benchmark offers exist;
3. at least 2 exact packaging source-product benchmarks exist;
4. no unresolved schema/integrity blocker prevents a rough prototype cost envelope;
5. a rough prototype cost envelope could be built without inventing per-bead cost. Full-strand prices may be treated only as explicit strand-cost benchmarks/conservative ceilings unless bead count is source-stated.

If classification is `READY_FOR_USER_PROTOTYPE_DECISION`, report a `decision_inputs` object containing factual choices the user will need to make next, but do NOT choose for them. At minimum:
- first prototype theme/design direction;
- target prototype positioning/quality envelope;
- whether first prototype should optimize for Europe-local ease/speed or broader lower-cost sourcing exploration;
- whether staged exact benchmarks are acceptable for prototype planning before formal promotion, or only approved canonical offers may be used.

If criteria are not met, report the exact ordinary-data gaps and continue no further than this phase.

---

# CONTINUOUS EXECUTION RULE

Execute A → B → C → D in one run.
Do NOT stop merely because A, B or C completes.

Stop only for:
1. unexpected HIGH_RISK scope or schema migration requirement;
2. unexplained canonical divergence/integrity failure;
3. inability to represent GPT-authored identities without corrupting source-claim boundaries;
4. completion of P2L, especially if it reaches a genuine prototype/business decision.

## Safety / validation
Before writes:
- safe sync and clean worktree;
- explicitly run/verify `git diff --check` because the prior handoff left this check PENDING;
- byte-for-byte DB backup;
- pre-write DB SHA and affected manifest.

After each write phase:
- exact created/reused counts;
- replay/idempotency;
- unrelated fingerprints unchanged;
- `PRAGMA integrity_check = ok`;
- `PRAGMA foreign_key_check = 0`;
- focused tests;
- full `npm test`;
- `npm run validate`;
- `git diff --check`.

No supplier outreach, quote request, order, purchase, production commitment, schema migration, Bridge/watcher work, or fabricated human review approval.

## Final handoff
Update `outputs/GPT_HANDOFF.json` and archive `outputs/handoffs/P2I-P2L-CONTINUOUS-IDENTITY-AND-PROTOTYPE-READINESS.json` with:
- P2I packaging identities created/reused;
- P2J material identities created/reused;
- P2K review-ready counts;
- P2L readiness classification and decision_inputs/gaps;
- DB SHA before/after and backup;
- integrity/tests/idempotency;
- commit;
- HEAD == origin/main;
- worktree clean;
- USER DECISION REQUIRED only if P2L genuinely reaches it.
