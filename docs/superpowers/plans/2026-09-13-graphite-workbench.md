# Graphite Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Preserve the in-place feature checkout and user files; no Git mutation this run.

**Goal:** Deliver the user's approved B / 石墨灰 UI and translucent bead assets as a functional three-state private workbench.

**Architecture:** Keep Fabric 7.4 and existing bracelet command/state/history. Replace the application shell and Studio markup/styles; add persistent guide rendering and finish projection as view behavior. Generated assets have a small display-only resolver, never a database import.

**Tech Stack:** Existing Node 24, vanilla ES modules, Fabric.js, Sharp; existing Playwright/Chrome for QA. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-13-graphite-workbench-design.md`

## Global Constraints

- No canonical SQLite writes. Baseline SHA256: `8fe0ca49229808d3f737d14f0a4b5698b971827bfec11e05e4ffcae2a3b85dc6`.
- No changes to user exports/drafts, protected P4R reports, watcher/Bridge or procurement. Preserve all previous uncommitted work.
- No Git commit/push/reset/clean/stash/rebase. Remain on current feature branch; use before-file snapshots for review instead of a false committed diff.
- User-pinned B comp supersedes prior warm UI; no another direction round. Plain Chinese first, neutral UI, generated images labelled AI效果图 / 非实拍.

### Task 1: Complete coherent Graphite application

**Files:** Modify `workbench/index.html`, `workbench/app.js`, `workbench/studio-view.mjs`, `workbench/studio.css`, `workbench/bracelet-canvas.mjs`, `workbench/studio-layout.mjs`. Create `workbench/graphite.css`. Add `test/graphite-workbench.test.mjs` and focused renderer/layout tests as appropriate. Parent asset production owns `workbench/generated-bead-assets.mjs`, `workbench/assets/catalog/generated/translucent-v1/*`, `scripts/prepare-generated-beads.mjs` and asset tests; do not edit those concurrently.

**Interfaces:** Keep `renderStudio({host, initialDraft, materials, resolveMaterial, onDraft, setStatus})`; return controller may add explicit `present()`, `save()` or view callback for global header. Keep `createBraceletCanvas` reducer callback. Consume `resolveGeneratedBead(name)` from `./generated-bead-assets.mjs`: returns undefined or an image descriptor `{imageUrl, assetRef, assetKey, provenanceClass, subjectBounds, displayNameZh, displayNameEn}`; never override an existing instance's explicit source image/asset key. Parent prepares 6 exact catalogue mappings plus generic Moonstone as a display candidate, not a verified subtype.

- [ ] Read current target modules and approved comp. Capture before snapshots of files to be changed under `work/graphite/before/`.
- [ ] TDD: empty linear projection has persistent guide count equal to wraps; sample assertion `assert.equal(layoutStudio(createBraceletState({version:4,trayMode:'linear',wrapCount:2,instances:[]}),900,500).guides.length,2)` adapted to existing projection shape. Test selection renderer creates no ring overlay and retains keyboard selection. Test initialization navigation waits/recovers without reading undefined data. Observe RED before fixes.
- [ ] Replace old header/side rails with one global navigation and responsive body. Catalogue card hierarchy matches comp with individual images, Chinese title, supporting English, quantity actions and bottom summary; move secondary legacy affordances into a coherent secondary row or details.
- [ ] Restructure Studio left materials / center tray / right inspector, retaining existing data attributes where practical. Add true selection/placed/remaining counts, wrist/wrap controls, undo/redo and secondary settings. Share neutral tokens across catalogue and design. Do not show fixed example counts/name/save-time.
- [ ] Implement persistent straight rails and truthful scales in empty/loose/strung modes. Use same coordinate system as insertion hit testing. Selection uses offset shadow and inspector only. Preserve identity/order/BOM through every projection/filter.
- [ ] Implement editable strung state in BOTH trays, immediate collect preserving current order, selection never unstrings and drag reorders independently. Remove the occluding preview overlay. Keep finished presentation a separate explicit action with reversible return retaining the latest source editing state; export actual canvas and label any tilted projection honestly. Wire global navigation without discarding unsaved state or history.
- [ ] Integrate approved generated descriptors for new ordinary material selections; preserve existing source-specific instances and local library. Handle missing files as truthful fallback, never an unlabelled empty slot.
- [ ] Run focused tests and relevant regressions; self-review and report precise changed paths, tests, concerns to task report. Do not commit. Parent will arrange independent review.

### Task 2: Browser acceptance, independent review and documentation

**Files:** Create `scripts/qa-graphite-workbench.mjs`, `outputs/graphite-workbench-validation.json`, runtime screenshots under ignored `work/graphite/visual/`. Update `DESIGN.md`, `PRODUCT.md`, relevant `.impeccable` surface record, and `workbench/STUDIO.md` only after final code. Do not overwrite prior-phase handoffs.

**Interfaces:** Exercise actual local server with Playwright. Intercept draft writes or use test storage; never touch user exports. Verify instances from canvas data hooks and saved payloads, not a manifest-only claim.

- [ ] Review task-1 diff and test evidence for spec compliance and quality. Any implementation fix goes back to its author, followed by scoped re-review.
- [ ] Browser test: wait for real ready signal, then catalogue select multiple items without navigation, enter Studio, place/move/insert beads at different locations, swap and undo/redo. Compare instance IDs/BOM before/after round↔linear and presentation↔edit.
- [ ] Assert empty linear 1/2/3 rail presence, actual image loads and absence of selection outline, all generated PNG alpha validated separately, saved/reloaded payload unchanged. Test immediate navigation while API responses are delayed; pageerror count must be zero.
- [ ] Capture real catalogue, linear, circular and finished states at 1536×960 and 1280×960 and one narrow viewport. Open screenshots, compare approved comp at readable size. Batch defects once, then confirm fixes. Do not infer visual pass from tests alone.
- [ ] Run focused tests, `npm test`, `npm run validate`, `git diff --check`. Report fresh counts and pre-existing failures, not old results.
- [ ] Independent final code/visual review, bounded fix/verdict, then document the built system and asset provenance. Preserve generated images and user files; no workspace deletion required because there is no committed historical record this run.
- [ ] Verify protected SHA256 values and actual running workbench in a new tab. Return functional result, known visual/physics limits, no false main push/acceptance claims.

## Bounded correction batch — latest user feedback and independent review

Reopen Task 1 with the same author, no additional feature scope:

- Actual user screenshot: blocking order preview + clicking appears to release + no reorder in collected round/straight. Follow amended spec; TDD the state transitions and real drag sequence changes.
- R1: global Save from catalogue must sync latest selected quantities with detached Studio before saving; cover add/decrease/clear while preserving instances/history.
- R2: gap insertion uses the same authoritative placement descriptor as plus/drag; chosen 14 mm must not become display-default 8 mm, including non-seven-generated and local-source materials.
- R3: active material must agree across row selection, plus, drag and gap insert; adding Amethyst after Smoky Quartz cannot leave Smoky as the hidden active gap material.
- Fresh independent code re-review + actual browser regression after the batch. Pre-fix 15/15 browser groups do not certify these newly exposed paths.
