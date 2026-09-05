# P4 Crystal Studio Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把冻结的 P3T 手串编辑器升级为可真实设计、加载/验证 18 款自然主题首发、生成 BOM、接入真实抠图素材并完成真实浏览器验收的 Crystal Studio V1。

**Architecture:** 保留 Node 24 + 原生 JS + Fabric 7.4.0，不重写技术栈。将设计包解析/BOM/拟合/首发系列视图/本地资产映射拆成独立模块，`app.js` 只负责页面编排。canonical SQLite 始终只读，真实 Google Drive 图片默认本地处理，不因 public GitHub 而上传未授权图片。

**Tech Stack:** Node.js >=24, native ESM, node:test, Fabric.js 7.4.0, existing local HTTP server.

**Spec:** `docs/superpowers/specs/2026-09-06-crystal-studio-completion-design.md`

## Global Constraints

- Baseline engineering checkpoint: `49432faa3101d9a682ce645a2a20849f9b149b66`.
- Shared design contract: `docs/CRYSTAL_DESIGN_PACKAGE_V1.md`.
- Canonical SQLite must remain read-only and SHA before/after identical.
- Preserve `workbench/exports/`; do not delete, clean, track, or overwrite user-owned exports except new explicit export files created by this task.
- Do not resolve or fabricate the P3R SHA blocker.
- Do not add cart/order/payment/account/cloud-sync/supplier-management features.
- Third-party/private Google Drive images are local-only unless explicit publication rights are documented.
- A blocker in one task does not stop independent safe tasks.
- `COMPLETED` requires real browser runtime QA, not only unit tests.

---

### Task 1: Lock baseline and add design-package contract validator

**Files:**
- Create: `workbench/design-package.mjs`
- Create: `test/p4-design-package.test.mjs`
- Create: `test/fixtures/nature-launch-valid.json`
- Create: `test/fixtures/nature-launch-invalid.json`

**Interfaces:**
- Produces: `validateDesignPackage(pkg) -> {ok:boolean, errors:string[], warnings:string[], designs:Array}`
- Produces: `structureFingerprint(design) -> string`
- Consumes contract from `docs/CRYSTAL_DESIGN_PACKAGE_V1.md`.

- [ ] **Step 1: Add failing validator tests**

Create fixtures with six themes and exactly three designs per theme for the valid case. Each design must contain a continuous `beads[].position`, `material_id`, `spec_id`, `size_mm > 0`, and `source_status` in `APPROVED|PROPOSED|UNRESOLVED`.

Test skeleton:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateDesignPackage, structureFingerprint } from '../workbench/design-package.mjs';

const read = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));

test('accepts six themes x three designs and rejects broken bead order', () => {
  assert.equal(validateDesignPackage(read('nature-launch-valid.json')).ok, true);
  const bad = validateDesignPackage(read('nature-launch-invalid.json'));
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some((x) => x.includes('position')));
});

test('structure fingerprint is independent from color/name-only changes', () => {
  const pkg = read('nature-launch-valid.json');
  const a = pkg.designs[0];
  const b = structuredClone(a);
  b.zh_name = '改名';
  b.color_language = ['different'];
  assert.equal(structureFingerprint(a), structureFingerprint(b));
});
```

- [ ] **Step 2: Run failing test**

Run: `node --test test/p4-design-package.test.mjs`
Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement minimal validator**

Implementation requirements:

```js
export const THEMES = ['Mountain','Ocean','Forest','Sunrise','Starlight','Glacier'];
export const SOURCE_STATUSES = new Set(['APPROVED','PROPOSED','UNRESOLVED']);

export function structureFingerprint(design) {
  const s = design.structure_signature || {};
  return [s.archetype,s.symmetry,s.focal_strategy,s.bead_rhythm,s.metal_level,s.negative_space,s.wear_language]
    .map((x) => String(x || '').trim().toLowerCase()).join('|');
}
```

`validateDesignPackage` must check version, theme counts, unique design IDs, continuous bead positions, positive size, material/spec identity, source status, and duplicate structure fingerprints as warnings.

- [ ] **Step 4: Run test and commit**

Run: `node --test test/p4-design-package.test.mjs`
Expected: PASS.

Commit: `feat(p4): validate Crystal design packages`

---

### Task 2: Separate fit/BOM math from the visual canvas

**Files:**
- Create: `workbench/bracelet-fit.mjs`
- Create: `workbench/bom.mjs`
- Modify: `workbench/bracelet-state.mjs`
- Create: `test/p4-fit-bom.test.mjs`

**Interfaces:**
- Produces: `fitEstimate({wristCm, instances, allowanceMm=5}) -> {targetMm, usedMm, deltaMm, status, confidence}`
- Produces: `aggregateBom(instances) -> Array<{materialId,specId,displayNameZh,displayNameEn,sizeMm,form,sourceStatus,quantity}>`
- Produces: `compareExpectedBom(actual, expected) -> {match:boolean, differences:string[]}`

- [ ] **Step 1: Write failing mixed-size tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { fitEstimate } from '../workbench/bracelet-fit.mjs';
import { aggregateBom } from '../workbench/bom.mjs';

test('mixed bead sizes use their own along-string dimensions', () => {
  const instances = [{sizeMm:8},{sizeMm:8},{sizeMm:12},{sizeMm:4}];
  const fit = fitEstimate({ wristCm: 3.0, instances, allowanceMm: 0 });
  assert.equal(fit.usedMm, 32);
  assert.equal(fit.deltaMm, 2);
  assert.equal(fit.confidence, 'approximate');
});

test('BOM groups material+spec instead of display name only', () => {
  const rows = aggregateBom([
    {materialId:'aq',specId:'aq-8',displayNameZh:'海蓝宝',sizeMm:8,sourceStatus:'APPROVED'},
    {materialId:'aq',specId:'aq-8',displayNameZh:'海蓝宝',sizeMm:8,sourceStatus:'APPROVED'},
    {materialId:'aq',specId:'aq-10',displayNameZh:'海蓝宝',sizeMm:10,sourceStatus:'PROPOSED'}
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows.find((x) => x.specId === 'aq-8').quantity, 2);
});
```

- [ ] **Step 2: Run failing test**

Run: `node --test test/p4-fit-bom.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implement modules and extend state**

Each state instance must preserve:
`materialId`, `specId`, `materialName`, `displayNameZh`, `displayNameEn`, `form`, `sizeMm`, `sourceStatus`, `assetRef`, `provenanceClass`, `instanceId`.

Do not remove legacy-name compatibility; migrate legacy instances with stable fallback slugs and mark them `PROPOSED` rather than pretending they are approved.

- [ ] **Step 4: Run tests and commit**

Run: `node --test test/p4-fit-bom.test.mjs test/p3t*.test.mjs`
If glob does not match on Windows, run the existing focused P3T tests by exact filenames discovered in `test/`.

Commit: `feat(p4): add mixed-size fit and BOM model`

---

### Task 3: Add loose-layout mode and mixed-size bracelet packing

**Files:**
- Modify: `workbench/bracelet-state.mjs`
- Modify: `workbench/bracelet-canvas.mjs`
- Create: `test/p4-studio-layout.test.mjs`

**Interfaces:**
- State field: `layoutMode: 'loose'|'bracelet'`
- Loose instance fields: `looseX`, `looseY` normalized 0..1
- Produces: `setLayoutMode(state, mode)`
- Produces: `compactToBracelet(state)` which preserves instance order and computes visual positions using cumulative half-size spacing rather than fixed capacity slots.

- [ ] **Step 1: Add tests for free placement and compaction**

Tests must prove:
- loose move changes only one instance coordinates;
- compaction keeps instance IDs and sequence;
- 6/8/12 mm instances have non-uniform angular spacing;
- switching back to loose does not delete instances.

- [ ] **Step 2: Run tests and confirm failure**

Run: `node --test test/p4-studio-layout.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implement state transitions**

Use normalized loose coordinates so resizing the canvas does not destroy layout. In bracelet mode, compute each bead center from cumulative along-string size around the ring. Keep fit status approximate.

- [ ] **Step 4: Modify Fabric canvas**

In loose mode, bead objects move freely inside the tray and persist normalized coordinates. In bracelet mode, objects snap to the computed ring position and dragging changes sequence by nearest along-ring order. Dragging outside removal threshold keeps the existing delete behavior.

- [ ] **Step 5: Run focused tests and commit**

Commit: `feat(p4): support loose design and mixed-size compaction`

---

### Task 4: Build the desktop-first Crystal Studio shell

**Files:**
- Create: `workbench/studio-view.mjs`
- Modify: `workbench/index.html`
- Modify: `workbench/style.css`
- Modify: `workbench/app.js`
- Create: `test/p4-studio-shell.test.mjs`

**Interfaces:**
- Produces: `renderStudio({root, data, draft, onAction})`
- Events: `add-material`, `remove-material`, `layout-mode`, `wrist`, `undo`, `redo`, `clear`, `save`, `show-bom`, `export`.

- [ ] **Step 1: Write DOM/static contract test**

The test must assert generated Studio markup contains unique hooks:
`data-studio-canvas`, `data-studio-status`, `data-studio-search`, `data-studio-tabs`, `data-studio-material-grid`, `data-studio-bom`, `data-studio-launch-board`.

- [ ] **Step 2: Implement Studio view**

Do not clone the reference app. Use its interaction hierarchy only: large tray first, compact controls second, searchable material library third, launch board below/adjacent as desktop width allows.

Material cards show:
- actual/fallback thumbnail;
- Chinese name + English secondary label;
- spec/size;
- `− count +` controls;
- source status badge only when relevant.

- [ ] **Step 3: Keep auxiliary pages**

Existing overview/catalog/reference routes remain reachable. `设计板` opens Studio by default.

- [ ] **Step 4: Run test and commit**

Commit: `feat(p4): introduce Crystal Studio workspace`

---

### Task 5: Load/save real design packages and generate BOM/export

**Files:**
- Modify: `workbench/server.mjs`
- Create: `workbench/nature-launch.mjs`
- Modify: `workbench/app.js`
- Create: `test/p4-server-launch.test.mjs`

**Interfaces:**
- `GET /api/nature-launch` -> `{available, package, validation}`
- `GET /api/nature-launch/:designId` -> normalized design or 404
- Existing draft API remains user-editable local state.
- Formal `outputs/designs/nature-launch-v1.json` is read-only from Workbench.

- [ ] **Step 1: Add server tests using temp fixture root/state**

Test real HTTP responses and ensure missing design package returns:

```json
{"available":false,"reason":"DESIGN_PACKAGE_NOT_READY"}
```

not a server crash.

- [ ] **Step 2: Implement loader**

Use validator from Task 1. Formal package is never overwritten by Studio edits. Loading a formal design creates an editable local draft clone.

- [ ] **Step 3: Implement BOM/export endpoints or reuse existing draft export safely**

BOM CSV columns:
`material_id,spec_id,name_zh,name_en,form,size_mm,quantity,source_status,mapping_status`

- [ ] **Step 4: Run server tests and commit**

Commit: `feat(p4): load launch designs and export BOM`

---

### Task 6: Add 6×3 Portfolio Board and difference matrix

**Files:**
- Modify: `workbench/nature-launch.mjs`
- Modify: `workbench/studio-view.mjs`
- Modify: `workbench/style.css`
- Create: `test/p4-launch-board.test.mjs`

**Interfaces:**
- Produces: `buildLaunchBoard(packageValidation)`
- Produces: `differenceMatrix(designs)`

- [ ] **Step 1: Write tests**

Tests must assert:
- 18 cards grouped six themes × three;
- every card contains ID, zh/en name, structure archetype, core materials, wrist, material status summary, validation status;
- duplicate structure fingerprints within a theme produce warnings;
- name/color-only differences do not count as structural difference.

- [ ] **Step 2: Implement board**

Board is the primary comparison view; long prose is secondary. Clicking a card opens the design in Studio.

- [ ] **Step 3: Add preview capture hook**

Expose a stable DOM selector for browser QA to capture each design canvas. Do not generate fake screenshots offline.

- [ ] **Step 4: Test and commit**

Commit: `feat(p4): add nature launch portfolio validation`

---

### Task 7: Add rights-aware real-source cutout asset pipeline

**Files:**
- Create: `tools/process-local-assets.mjs`
- Create: `workbench/local-asset-manifest.mjs`
- Modify: `.gitignore`
- Modify: `workbench/server.mjs`
- Create: `test/p4-local-assets.test.mjs`

**Interfaces:**
- Local input default: `inputs/local-assets/`
- Local output default: `workbench/assets/local/`
- Manifest default: `workbench/state/local-asset-manifest.json`
- Produces manifest records with `material_id`, `spec_id`, `source_sha256`, `processing_method`, `representation_class`, `publication_status`, `file`.

- [ ] **Step 1: Protect private/source assets before processing**

Add to `.gitignore`:

```gitignore
inputs/local-assets/
workbench/assets/local/
workbench/state/local-asset-manifest.json
```

Do not add actual Google Drive/vendor/private images to git.

- [ ] **Step 2: Implement deterministic normalization**

The script must work without inventing mineral appearance. At minimum:
- copy/convert supported PNG/JPEG/WebP inputs into a square transparent-capable output;
- normalize canvas size and object bounds when an alpha mask already exists;
- calculate SHA-256 from actual source bytes;
- preserve source color by default;
- write manifest.

If reliable automatic background removal is available in the existing local environment, use it behind a capability check. If no reliable remover exists, emit `needs_mask=true` instead of faking a cutout, continue other images, and document the blocker. Do not add a heavy ML dependency merely to satisfy this task.

- [ ] **Step 3: Support pre-cut transparent assets from Crystal｜灵感**

If Inspiration supplies transparent PNG/WebP, engineering normalizes and maps them without re-generating the mineral.

- [ ] **Step 4: Runtime asset resolver**

Workbench should prefer, in order:
`source_cutout/source_derived local asset -> tracked source asset with rights -> generated_from_evidence -> fallback`.

- [ ] **Step 5: Test manifest behavior and commit code only**

Commit: `feat(p4): add local real-source asset pipeline`

Do not commit local asset binaries.

---

### Task 8: Full regression, real-browser QA, repair loop, and final handoff

**Files:**
- Create: `outputs/handoffs/engineering/P4-CRYSTAL-STUDIO-COMPLETION.json`
- Create: `outputs/p4-crystal-studio-validation.json`
- Add browser QA evidence under `outputs/visual/p4/` only when produced by a real browser and safe to track.
- Update: `agent/tasks/engineering/STATUS.md`

**Interfaces:** none; final integration.

- [ ] **Step 1: Run automated suite**

Run:

```powershell
npm test
npm run validate
git diff --check
```

All regressions caused by P4 must be fixed before completion. Existing unrelated true blockers are documented and do not justify skipping independent checks.

- [ ] **Step 2: Verify canonical DB immutability**

Calculate SHA-256 before and after the real browser session. Expected historical baseline is `8FE0CA49229808D3F737D14F0A4B5698B971827BFEC11E05E4FFCAE2A3B85DC6`; if local canonical DB legitimately differs before work, record the actual before SHA and require before==after. Never overwrite DB to force the historical SHA.

- [ ] **Step 3: Real browser workflow**

Start `npm run workbench`, open `http://127.0.0.1:4173` in real Chrome/Chromium and execute:

1. choose a material;
2. add at least 6 beads with at least 3 sizes/forms;
3. drag in loose mode;
4. compact to bracelet;
5. reorder two beads;
6. Undo and Redo;
7. change wrist size;
8. open BOM;
9. save draft;
10. reload page and reopen draft;
11. export design + BOM;
12. verify image network requests and console.

Record results, not just screenshots.

- [ ] **Step 4: Validate nature launch package**

If `outputs/designs/nature-launch-v1.json` exists, run all 18 designs through the validator and Workbench loader, capture 6×3 board evidence, and produce `outputs/designs/nature-launch-v1-workbench-validation.json`.

If it does not exist, run the fixture to prove capability but set final status `PARTIAL_WAITING_FOR_DESIGN_PACKAGE`; do not fabricate 18 designs and do not call the entire business loop complete.

- [ ] **Step 5: Validate at least one real cutout if source bytes are locally available**

If no local authorized source file is available, mark only this asset sub-check blocked and continue all Studio checks.

- [ ] **Step 6: Repair loop**

For every failure caused by P4: diagnose root cause, add/adjust a regression test where practical, fix, rerun the failed scope, then rerun full regression. Continue until no P4-caused failures remain.

- [ ] **Step 7: Final handoff**

Handoff must contain only:
- result
- current_state
- implemented_capabilities
- design_package_status
- real_browser_QA
- test_summary
- canonical_db_sha_before_after
- real_asset_status
- risks_blockers
- decision_required
- next_action
- commit_sha

Only use `COMPLETED` if all mandatory acceptance conditions in the spec are met. Otherwise use `PARTIAL` with exact remaining blocker.

- [ ] **Step 8: Commit and push**

Commit: `feat: complete P4 Crystal Studio`

Confirm `HEAD == origin/main` and tracked worktree clean. Preserve user-owned untracked exports.
