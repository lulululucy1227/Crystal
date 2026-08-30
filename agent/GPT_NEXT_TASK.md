# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1
Phase: P2B-EUROPE-MARKET-BASELINE-AND-SOURCING-READINESS
Status: authorized
Model: Luna
Strength: Medium
Execution class: DATABASE_WRITE

## Why this phase exists
The P2A image backlog is complete and validated. Current verified handoff reports:
- 94 canonical image assets fully processed;
- 308 image_visual_observation rows;
- 100 design_reference_synthesis_assertion rows;
- 273 design_reference_synthesis_source rows;
- no remaining GPT image-analysis queue;
- no provenance/image ambiguity blocker;
- the 6 intentionally quarantined legacy relations remain unchanged.

The project should now return to its business/data priority: Europe-market positioning, sourcing evidence, supplier/component readiness and eventual product/BOM development. Do not spend this phase on watcher/Bridge infrastructure or additional image-pipeline architecture.

## New authoritative GPT market input
Import/reconcile:
`inputs/p2b-gpt-europe-market-baseline-20260830.json`

This file contains current public-market evidence observed by GPT on 2026-08-30 and a separately identified assistant market assessment. Source claims remain source claims and are not independent verification of gemstone authenticity, grade, ethics, or healing properties.

## Objective
1. Safely import the supplied Europe market baseline into the existing canonical `source`, `market_evidence`, and `market_assessment` tables without schema changes or duplicate creation.
2. Prove idempotency and integrity.
3. Produce a read-only sourcing-readiness audit of the current canonical database so GPT can choose the next business/data phase.
4. Do not invent market research, supplier facts, material facts, prices, product concepts or design judgments beyond the supplied GPT input.

## Preflight
1. Safely sync Crystal `main`; require clean worktree before writes. Never reset/clean/discard user work.
2. Read `AGENTS.md`, latest `agent/GPT_NEXT_TASK.md`, `outputs/GPT_HANDOFF.json`, and `inputs/p2b-gpt-europe-market-baseline-20260830.json`.
3. Verify the P2A completed canonical state from the latest handoff before writing.
4. Create a timestamped byte-for-byte backup of the canonical SQLite DB and record pre-write SHA-256.

## Canonical import rules
### source
For every supplied `sources[]` item:
- reconcile by stable factual identity using source_type + name + URL where possible;
- reuse an existing matching source rather than duplicate it;
- preserve source claims as notes/source context, not verified facts;
- observed_on = 2026-08-30 where appropriate;
- do not upgrade verification beyond the GPT input.

### market_evidence
For every supplied `market_evidence[]` row:
- link to the reconciled canonical source;
- preserve brand/product/market/currency/price/claim/verification/evidence strength exactly;
- do not normalize a stated price range into invented midpoints;
- where the input explicitly uses a representative lower point and preserves the full range in the claim/notes, retain that convention exactly;
- make the import idempotent using deterministic matching/hash logic consistent with project patterns.

### market_assessment
Import exactly one assistant-authored assessment from `assistant_market_assessment` using the existing `market_assessment` table:
- subject_type = `other`;
- subject_id = NULL;
- target_market = `Europe / EUR-facing online market`;
- assessment_text = exact supplied assessment_text;
- analyst = `gpt-5.6-sol`;
- basis_notes = supplied basis_notes plus serialized implications without changing wording;
- assessment_date = 2026-08-30;
- confidence = supplied confidence.

Do not create preference/pattern/theme/material/supplier-offer/product-concept records from this market input.

## Sourcing-readiness audit — READ ONLY after import
Create:
`outputs/p2b-sourcing-readiness-audit.json`

Report exact canonical counts and useful gap metrics for at least:
- material
- material_variant
- component
- supplier
- supplier_offer
- packaging_option
- packaging_supplier_offer
- source, grouped by source_type and verification_status
- market_evidence
- market_assessment
- product_concept
- bom
- bom_line
- staged_record grouped by validation_status/target_entity
- staged_field grouped by field_status/target_entity
- review_decision
- promotion_log

Also report:
- material variants with/without indicative price;
- material variants by commercial_tier and reproducibility;
- supplier offers with/without MOQ, quote date and verified/partially-verified status;
- components by component_type and design_role;
- packaging options with/without supplier offers;
- market evidence price distribution by broad factual buckets only: <€100, €100–299.99, €300–699.99, €700–1999.99, >=€2000, using the stored point price only and clearly noting this is not a sales distribution;
- unresolved staged/review backlog counts;
- exact list/count of current suppliers and supplier offers, without guessing missing information.

The audit may identify missing data but must not make aesthetic/business recommendations. GPT will interpret the audit.

## Database scope
DATABASE_WRITE authorized only for the supplied P2B market baseline into existing:
- source
- market_evidence
- market_assessment

Read-only audit of all other listed tables is authorized.

Not authorized:
- schema migration
- material/material_variant/component writes
- supplier/supplier_offer writes
- packaging writes
- product concept/BOM writes
- preference/pattern/theme/reference mutations
- changes to P2A image/reference data
- resolving the 6 quarantined legacy relations
- web scraping or independent internet research by Codex
- watcher/controller/Bridge work

## Validation
After apply:
- exact created/reused source counts;
- exact created/reused market_evidence counts;
- exact created/reused market_assessment counts;
- replay/idempotency proof;
- P2A image/reference counts and fingerprints unchanged;
- `PRAGMA integrity_check = ok`;
- `PRAGMA foreign_key_check = 0`;
- focused tests for the new importer if implementation is needed;
- full `npm test`;
- `npm run validate`;
- `git diff --check`.

## Required outputs
Create/update:
- `outputs/p2b-sourcing-readiness-audit.json`
- `outputs/GPT_HANDOFF.json`
- archived handoff under `outputs/handoffs/P2B-EUROPE-MARKET-BASELINE-AND-SOURCING-READINESS.json`

## Git
Commit/push a coherent Crystal checkpoint to `main`; verify local HEAD == origin/main and worktree clean. Do not touch Local-Codex-Bridge.

## Stop conditions
Continue through import, replay, validation, audit, commit and push. Stop only for:
1. unexplained canonical state divergence;
2. schema requirement;
3. integrity/test failure that cannot be safely resolved in this additive scope;
4. successful completion.

No user business/aesthetic decision is currently required.

## Final handoff fields
PHASE / STATUS / BACKUP / DB SHA BEFORE / DB SHA AFTER / CREATED+REUSED SOURCES / CREATED+REUSED MARKET EVIDENCE / CREATED+REUSED MARKET ASSESSMENT / P2A COUNTS UNCHANGED / SOURCING READINESS AUDIT PATH / KEY TABLE COUNTS / INTEGRITY / TESTS / COMMIT / HEAD==ORIGIN / WORKTREE CLEAN / USER DECISION REQUIRED.
