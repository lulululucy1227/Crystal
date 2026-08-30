# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1
Phase: P3A-P3D-ASSORTMENT-AND-WORKBENCH-MVP
Status: authorized
Model: Terra
Strength: Medium
Execution class: SAFE_WRITE + READ_ONLY_DB + sidecar user-state writes

## User decision / priority change

The user explicitly declined purchase work for now and changed the project priority to:

1. first deliver a practical selection list covering crystals/minerals, pearls/organic materials, hardware/accessories and packaging;
2. build a usable local Crystal design workbench around the existing project data;
3. pause supplier progression, purchasing, quote requests and sourcing expansion until the user later reopens that track.

This is now the primary task. The previous P01 purchase gate is superseded as an active priority; preserve its artifacts/history but do not progress it.

Authoritative assortment source:
- `data/assortment-selection-v1.json`
- `docs/ASSORTMENT_SELECTION_V1.md`

Existing canonical database remains valuable as factual/reference data, but supplier and price fields are secondary in the V1 workbench and should not dominate the UI.

## Core execution philosophy

Keep this implementation simple and useful. Do not build infrastructure for its own sake.

- no schema migration;
- no supplier research;
- no supplier outreach;
- no purchase/checkout/order;
- no Bridge/watcher work;
- no new framework unless strictly necessary;
- prefer Node built-ins + existing `node:sqlite` + vanilla HTML/CSS/JS;
- canonical SQLite must be opened READ ONLY by the workbench;
- user annotations/design drafts must be stored in sidecar JSON files, never by silently mutating canonical DB tables;
- do not create product/BOM canonical writes in this phase.

Execute P3A → P3B → P3C → P3D continuously. Do not stop at ordinary phase boundaries.

---

# P3A — ASSORTMENT SELECTION DELIVERABLE

## Objective

Turn `data/assortment-selection-v1.json` into a clean, practical project deliverable and verify that each selected canonical material that already exists can be linked without inventing identity.

## Required outputs

Create:
- `outputs/assortment-selection-v1.csv`
- `outputs/assortment-selection-v1.json`
- `outputs/p3a-assortment-reconciliation.json`

The CSV/JSON should cover four primary sections:
1. minerals/crystals;
2. pearls & organic materials;
3. hardware/accessories;
4. packaging.

For each item preserve at minimum:
- selection name;
- priority (`A_CORE`, `B_DESIGN_EXTENSION`, `C_SIGNATURE_ONE_OF_ONE`, or reserve);
- themes;
- roles;
- preferred forms/spec;
- selection notes;
- whether the item already has a canonical DB identity or is only a workbench assortment candidate.

Do not create missing canonical identities just to make the list look complete. Report candidate-only items honestly.

Also create a compact reconciliation summary:
- selected mineral count;
- selected pearl/organic count;
- selected hardware count;
- selected packaging count;
- canonical match count vs candidate-only count;
- selected items that have known canonical variants/components/packaging options;
- no supplier recommendation.

---

# P3B — LOCAL CRYSTAL WORKBENCH MVP

## Objective

Build a local internal workbench that makes the accumulated data usable for selection and design.

Create under:
`workbench/`

Preferred architecture:
- Node 24 built-in `http` server;
- existing `node:sqlite` for READ-ONLY canonical DB access;
- vanilla HTML/CSS/JS frontend;
- no React/Vue/Electron/large framework;
- no new runtime dependency unless the current repo already has it and there is a strong reason.

Add an npm script:
`npm run workbench`

Also add a Windows launcher if practical:
`workbench/start-workbench.cmd`

Default local address may be `http://127.0.0.1:4173` or another deterministic localhost port if occupied handling is implemented safely.

## Required navigation

### 1. Overview
Show:
- selected assortment counts by category and priority;
- six project themes: Mountain / Ocean / Forest / Sunrise / Starlight / Glacier;
- canonical DB counts for materials, variants, components, packaging, design references and image assets;
- shortcuts to selected assortment and Design Board.

Do NOT show supplier dashboards, sourcing KPIs or purchasing CTAs.

### 2. Assortment
Primary user page.

Tabs or filters:
- Crystals / Minerals
- Pearls & Organic
- Hardware
- Packaging

Required filters:
- priority;
- theme;
- design role;
- form/spec keyword;
- canonical vs candidate-only.

Each card/row should show only the useful selection information first. Supplier/price/provenance may be available in a secondary detail panel only when already stored, but should not dominate.

### 3. Materials Library
Read existing canonical material + material_variant data.

Show:
- material name;
- family/natural status when stored;
- assortment priority overlay if selected;
- selected themes/roles/forms;
- canonical variants;
- useful source/verification badges without implying verification where absent.

Allow search and filter.

### 4. Accessories Library
Combine:
- canonical `component` records;
- V1 hardware assortment overlay;
- pearl/organic selection candidates where appropriate.

Clearly distinguish canonical component vs assortment candidate.

### 5. Packaging Library
Combine:
- canonical `packaging_option` records;
- V1 packaging assortment overlay.

Default view is packaging type/spec/aesthetic role, NOT supplier offers.

### 6. Reference Gallery
Read existing `design_reference`, `design_reference_image`, `image_asset`, theme/pattern/synthesis data READ ONLY.

Show a useful grid/list with:
- reference title/key;
- themes;
- core design pattern/summary;
- asset count;
- observation/synthesis snippets.

If a local-resolvable image path/URL exists, show image. If not, render a clean metadata placeholder instead of broken images.

### 7. Design Board
This is a working draft surface, not canonical DB writing.

User must be able to:
- create a named draft;
- choose one of six themes;
- add/remove assortment items from minerals, organic, hardware and packaging;
- assign or edit a role for each selected item;
- add freeform notes;
- record preferred form/size/spec text;
- reorder items in the draft if simple to implement;
- save draft state to a sidecar JSON file under `workbench/state/`;
- load existing drafts;
- export a draft as JSON and Markdown.

Do not require quantities, suppliers or prices in V1 Design Board.
Do not create canonical product_concept/BOM rows from the UI.

## UX direction

Internal professional design tool, quiet and minimal.

- off-white / very light grey main surfaces;
- graphite text;
- restrained ice-blue/cyan accent only for selected/active states;
- compact information density without becoming spreadsheet-like;
- clear typography and generous spacing;
- avoid crystal-shop mystical visual language;
- avoid gradient-heavy, glassmorphism or decorative luxury UI;
- desktop-first but usable at narrower widths.

---

# P3C — EXPORT / USER STATE / DATA SAFETY

Implement safe local user-state handling.

Allowed writable scope:
- `workbench/state/*.json`
- user-triggered export files under `workbench/exports/`

Never write canonical DB from the workbench.

Required capabilities:
- atomic-ish sidecar save (write temp then rename if practical);
- malformed state JSON must not crash the server; show an actionable error or recover to empty state without deleting the bad file;
- export current assortment selection as CSV/JSON from the UI;
- export Design Board draft as Markdown/JSON;
- no external network calls required for normal workbench use.

---

# P3D — VALIDATION + DELIVERY

## Validation

Before coding:
- safe sync `main`;
- clean worktree;
- `git diff --check` PASS because prior handoffs sometimes left it pending;
- do not reset/clean/discard user work.

After implementation:
- workbench server starts successfully;
- homepage loads;
- assortment endpoint/view loads the authoritative V1 selection;
- canonical DB opens read-only and basic library queries work;
- Design Board save/load/export works against sidecar files;
- prove no canonical DB SHA change from merely starting/using automated workbench tests;
- `PRAGMA integrity_check = ok`;
- `PRAGMA foreign_key_check = 0`;
- focused workbench tests;
- full `npm test`;
- `npm run validate`;
- final `git diff --check`.

If browser/UI testing is available locally, exercise at least:
- Overview;
- Assortment filtering;
- Materials detail;
- Packaging view;
- create/save/reload a Design Board draft.

Do not spend time on pixel-perfect polish before functional completeness.

## Required delivery artifacts

Create/update:
- `outputs/p3-workbench-mvp-report.json`
- `outputs/GPT_HANDOFF.json`
- archived handoff `outputs/handoffs/P3A-P3D-ASSORTMENT-AND-WORKBENCH-MVP.json`

Final report must include:
- assortment counts and reconciliation;
- workbench file structure;
- exact startup command;
- local URL;
- implemented pages/features;
- read-only DB safety proof;
- tests/checks;
- known limitations;
- commit SHA;
- HEAD == origin/main;
- worktree clean;
- USER DECISION REQUIRED only if a genuinely consequential design/business choice blocks continued implementation.

## Stop conditions

Continue through all four phases. Stop only for:
1. schema migration becomes strictly necessary;
2. canonical DB safety cannot be guaranteed;
3. unexplained repository/data divergence;
4. an implementation blocker that cannot be safely solved inside this scope;
5. successful completion.

No supplier, purchase or prototype-spend decision is required in this phase.
