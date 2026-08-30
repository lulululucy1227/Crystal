# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1
Phase: P3E-P3H-WORKBENCH-FUNCTIONAL-COMPLETION
Status: authorized
Model: Luna
Strength: Medium
Execution class: SAFE_WRITE + READ_ONLY_DB + sidecar user-state writes

## Why this follow-up exists

P3A assortment delivery is accepted, but GPT acceptance review found that the current Workbench is only a shell and does not yet satisfy the functional requirements originally authorized for P3B-P3D.

Read as authoritative acceptance audit:
- `inputs/p3e-gpt-workbench-acceptance-failures-20260830.json`

Read current implementation:
- `workbench/server.mjs`
- `workbench/app.js`
- `workbench/index.html`
- `workbench/style.css`
- `outputs/p3-workbench-mvp-report.json`
- `outputs/p3a-assortment-reconciliation.json`

User priority remains unchanged:
1. selection list + design workbench are the primary project output;
2. supplier progression, quote research, sourcing expansion, purchasing and P01 spend work remain paused.

This is a bounded implementation-completion phase. Architecture is already decided, so use Luna / Medium.

## Hard boundaries

- no schema migration;
- canonical SQLite must remain READ ONLY;
- no canonical product/BOM/material/component/packaging writes;
- no supplier research/contact/ranking;
- no purchase/checkout/order;
- no Bridge/watcher work;
- no React/Vue/Electron or other large framework;
- prefer Node 24 built-ins + `node:sqlite` + vanilla HTML/CSS/JS;
- allowed user-state writes only under `workbench/state/` and `workbench/exports/`;
- do not reset/clean/discard unrelated user work.

Execute P3E → P3F → P3G → P3H continuously. Do not stop after one page or feature.

---

# P3E — OVERVIEW + ASSORTMENT ACCEPTANCE COMPLETION

## Overview

Implement the originally required Overview behavior:
- assortment counts by section;
- assortment counts by priority;
- six themes: Mountain / Ocean / Forest / Sunrise / Starlight / Glacier;
- canonical DB counts for material, variant, component, packaging, design reference and image asset;
- clear navigation shortcuts to Assortment and Design Board.

Do not show sourcing KPIs, supplier dashboard or purchase CTA.

## Assortment

Implement explicit filters for:
- section/category;
- priority;
- theme;
- design role;
- form/spec keyword;
- canonical match vs candidate-only;
- free-text search.

Cards/rows must show, at minimum:
- selection name;
- priority;
- themes;
- roles;
- preferred forms/spec;
- canonical/candidate status;
- selection notes in detail/expanded view.

Supplier/price data should not dominate this page.

---

# P3F — LIBRARIES + REFERENCE GALLERY COMPLETION

## Materials Library

Read canonical SQLite only.

For each material show:
- canonical name;
- family/natural status when stored;
- whether selected in V1 assortment;
- assortment priority/themes/roles/forms overlay where selected;
- canonical material variants with useful identity fields;
- source/verification badges only where actually stored, without implying verification.

Add useful search/filter at least by:
- text;
- assortment priority;
- theme;
- selected vs non-selected.

## Accessories Library

Combine in one page while clearly labelling origin/type:
- canonical `component` rows;
- V1 `hardware_accessories` assortment candidates;
- V1 `pearls_organic` assortment candidates.

Do not collapse candidate records into canonical components. Show `canonical` / `assortment candidate` badges.

## Packaging Library

Combine:
- canonical `packaging_option` rows;
- V1 packaging assortment candidates.

Default presentation should focus on packaging type/spec/aesthetic role. Supplier offers remain secondary or hidden.

## Reference Gallery

Inspect current read-only schema and existing rows rather than guessing table names. Build the richest safe read-only view possible from existing:
- `design_reference`;
- `design_reference_image`;
- `image_asset`;
- theme/pattern relationship tables;
- synthesis/observation data already present.

Each reference card should show when available:
- title/key;
- themes;
- patterns or concise synthesis summary;
- asset count;
- one or two synthesis/observation snippets.

If an image has a resolvable local/static path or URL that can be served safely, render it. Otherwise show a clean metadata placeholder. Never render broken image elements.

No new image analysis or canonical reference writes.

---

# P3G — DESIGN BOARD + SIDECAR PERSISTENCE + EXPORTS

The Design Board must use server-side sidecar JSON as the persistent source of truth. Browser localStorage may be optional cache only, not the primary persistence mechanism.

## Draft API / persistence

Implement safe local endpoints sufficient for:
- list draft names;
- create/save named draft;
- load named draft;
- overwrite/update named draft safely;
- export named/current draft.

Store only:
- `workbench/state/*.json`
- `workbench/exports/*`

Use safe filename normalization and atomic-ish temp-write + rename.

Malformed JSON behavior:
- do not delete or overwrite the malformed file automatically;
- listing/loading must return an actionable error state identifying the affected draft;
- UI must show the error and allow the user to create/load another draft.

## Design Board UI

User must be able to:
- create a named draft;
- choose one of six themes;
- browse/search assortment items and explicitly add selected items;
- remove items;
- edit role per selected item;
- edit preferred form/size/spec text per selected item;
- reorder items using simple Up/Down controls or equivalent;
- add freeform draft notes;
- save to sidecar;
- load existing drafts from a list;
- show save/error status clearly.

Do NOT auto-add arbitrary first-three items as the primary workflow.
Do NOT require quantity, supplier or price fields in V1.
Do NOT write canonical `product_concept` or BOM.

## Export

From the UI provide:
- assortment CSV export;
- assortment JSON export;
- Design Board JSON export;
- Design Board Markdown export.

Assortment export may directly serve/copy the already-generated authoritative output files.
Draft export should create or download an exact representation of the sidecar draft; Markdown should be readable with name/theme/items/roles/forms/notes.

No external network call should be required for normal use.

---

# P3H — REAL ACCEPTANCE TEST + DELIVERY

## Preflight

- safe sync `main`;
- clean worktree before implementation; if not clean, inspect and preserve user work rather than reset/clean;
- `git diff --check` PASS before and after;
- record canonical DB SHA before smoke tests.

## Functional acceptance

At minimum verify programmatically and, if browser automation is locally available, through the UI:

1. `npm run workbench` starts successfully at deterministic localhost URL.
2. Overview returns/render assortment counts and canonical counts.
3. Assortment filters work for at least priority + theme + canonical/candidate state.
4. Materials Library returns canonical material data plus assortment overlay and variant details.
5. Accessories page includes both canonical and assortment-candidate content.
6. Packaging page includes both canonical and assortment-candidate content.
7. Reference Gallery includes more than bare reference title/key where existing data supports it.
8. Create draft `acceptance-smoke` through the actual sidecar API/UI.
9. Add at least one mineral and one hardware/packaging candidate, edit role/spec, save, reload and verify equality.
10. Reorder/remove operation works.
11. Export that draft as JSON and Markdown and verify files/content.
12. Export assortment CSV and JSON from the UI/API path.
13. A deliberately malformed test-sidecar returns an actionable error and is not deleted/overwritten; remove only test artifacts explicitly after the test.
14. Canonical SQLite SHA is unchanged after all workbench smoke tests.
15. `PRAGMA integrity_check = ok` and `PRAGMA foreign_key_check = 0`.
16. focused workbench tests PASS.
17. full `npm test` PASS.
18. `npm run validate` PASS.
19. final `git diff --check` PASS.

## Delivery artifacts

Update/create:
- `outputs/p3-workbench-mvp-report.json`
- `outputs/p3-workbench-functional-acceptance.json`
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/P3E-P3H-WORKBENCH-FUNCTIONAL-COMPLETION.json`

The final report/handoff must explicitly include:
- status = completed only if all functional acceptance criteria above pass;
- assortment counts;
- implemented pages/features;
- sidecar API/state paths;
- export paths;
- exact startup command;
- exact local URL;
- canonical DB SHA before/after smoke test;
- known limitations that genuinely remain;
- focused + full test results;
- `git diff --check` result;
- commit SHA;
- HEAD == origin/main;
- worktree clean;
- supplier and purchase tracks still paused.

## Git

Commit and push the coherent completion to Crystal `main`.
Confirm local HEAD == origin/main and worktree clean.

## Stop condition

Do not stop at an ordinary UI milestone. Stop only for:
1. a schema migration becomes truly necessary;
2. canonical DB read-only safety cannot be guaranteed;
3. unexplained data/repository divergence;
4. a blocker that cannot be safely solved within vanilla local workbench scope;
5. all P3E-P3H acceptance criteria pass and the workbench is genuinely usable.

No user business/aesthetic decision is required for this completion phase.
