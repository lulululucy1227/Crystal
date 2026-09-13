# Dual-mode Crystal Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Follow TDD, continuous execution and independent review gates. User has approved the design; do not ask for another design round.

**Goal:** Deliver the approved dual-mode desktop beading workspace using actual user cutouts, with real browser verification.

**Architecture:** One versioned stable-instance state model, deterministic ordered layouts, persistent renderer, DOM desktop controls. Asset pipeline stays private and separate from canonical SQLite. Compare the renderer candidate with existing Fabric before final choice.

**Tech Stack:** Node 24, existing vanilla JS, Fabric 7.4.0, Sharp 0.35.4; compatible MIT renderer/physics only if evidence justifies.

**Spec:** docs/superpowers/specs/2026-09-13-dual-mode-crystal-studio.md

## Global Constraints

- No canonical SQLite writes, migrations, P3R, procurement, watcher or Bridge changes.
- Preserve existing dirty outputs/handoffs/engineering/P4R-CANVA-REAL-ASSET-INTEGRATION.json and outputs/p4-real-asset-validation.json.
- Do not touch, delete or stage workbench/exports/.
- Private cutout binaries stay ignored and local; no third-party upload is needed.
- Chinese primary; source labels are not procurement facts; unknown price is not zero.
- Work in existing requested checkout on codex/studio-dual-mode-20260913, preserving user files. Main is not modified; no public push in this continuation without explicit Git handoff decision.
- All edits use apply_patch. Production asset transformations can use Sharp scripts. No destructive cleanup or whole-repo restore.

### Task 1: Complete dual-mode editor and desktop surface

**Files:** Modify workbench/bracelet-state.mjs, bracelet-fit.mjs, bracelet-canvas.mjs, studio-view.mjs, studio.css, app.js, style.css/index.html only for Studio embedding, design-package.mjs only for draft preservation. Add workbench/studio-layout.mjs and optional renderer module if needed. Update related tests, workbench/OPEN_SOURCE_NOTICES.md, package.json/package-lock.json only for justified dependency. Add scripts/qa-dual-mode-studio.mjs and work/dual-mode renderer benchmark. Do not edit asset pipeline/server except narrowly needed vendor route coordinated with parent.

**Interfaces:** Preserve createBraceletState, serializeBraceletState, history commands and legacy APIs. Add independent trayMode ('round'|'linear'), layoutMode ('loose'|'bracelet'), wrapCount (1|2|3), allowanceMm. Preserve these in serialization; older drafts default round/1/5. Renderer createBraceletCanvas remains {render,resize,dispose}; callbacks emit commands, never mutate canonical state. Per-instance materialId/specId/imageUrl/assetRef/provenance preserved.

- [ ] Read spec and current state/canvas/view/tests. Write failing behavioral tests for mode and wrap roundtrips, insertion index, independent same-material moves, resize, fit and legacy serialization.
- [ ] Run tests RED, implement deterministic state/layout with insertion and fixed identity. Explicit swap, orientation/rotation when useful, round/linear geometry, collision-safe mixed sizes, multiwrap continuous sequence. Example invariant:
```js
const ids = ['a','b','c'];
assert.deepEqual(roundTrip.instances.map(x=>x.instanceId), ids);
assert.equal(new Set(roundTrip.instances.map(x=>x.instanceId)).size, 3);
```
- [ ] Build a throwaway real-browser benchmark of reused Fabric objects versus PixiJS identical mixed-source workload. Record license, installed bytes, Node/Windows compatibility evidence. Choose, then implement persistent objects/image cache, local movement/reorder preview, transform animation, reduced motion and no perpetual idle loop. No rectangular selection or edge-only deletion.
- [ ] Rebuild Studio layout to approved spec: large tray left, independently scrolling material library right, compact controls, both views/multiwrap, used filter, visible trash, collapsible BOM/inspector, clean presentation with actual image export. Keep old catalogue pages usable.
- [ ] Test per-instance editing, modes and multiple wraps through browser pointer interaction, store screenshots/evidence under work/dual-mode and outputs/visual/dual-mode. Use tests without touching user's exports/drafts.
- [ ] Run focused and complete regression once, record output. Commit only task-owned files if Git permitted; otherwise leave scoped changes and report. No push. Report in task-1-report.md with exact tests, RED/GREEN and renderer decision.

### Task 2: Integrate verified user cutout delivery

**Files:** scripts/import-workbench-cutout-batch.mjs; workbench/local-asset-manifest.mjs; workbench/server.mjs local asset API; workbench/studio-view.mjs material-source lookup/library integration; workbench/app.js existing catalogue hero lookup only (same sources, no layout redesign); optional small shared display resolver; test/p4-cutout-batch.test.mjs; private inputs/local-assets/20260913-cutouts/ and workbench/assets/local/; workbench/state/local-asset-manifest.json. Existing source entries preserved. Outputs report outputs/dual-mode-cutout-validation.json.

**Interfaces:** Server /api/local-assets returns safe ready files plus source/display labels, IDs, representation class. Local source samples must be available as materials even when not in original 45 catalogue. Name-based visual mapping only when label is explicit; retain PROPOSED or UNRESOLVED and no mineral facts. Use imageUrl without stretching or clearing stable instance source.

- [ ] Inventory zip path from spec using safe extraction path checks, verify 257 or record actual discrepancy; inspect representative PNGs and every asset-map. Read actual source labels from available local originals, not visual mineral guesses.
- [ ] Failing tests: path traversal rejection, duplicate handling, alpha/padding normalization preserving aspect, missing mapping remains UNRESOLVED, matching source overrides generated in both card and canvas.
- [ ] Implement local import using Sharp existing dependency; originals untouched, hash source archive/assets, record transformation and preserve unknown images with human-readable source position. Private derived copy self-contained manifest. No auto-regrading.
- [ ] Check actual images in cards/tray at actual sizes; contact sheet for all assets, choose representative quality overrides without inventing textures. Record usable/source needs work counts precisely.
- [ ] Focused tests, HTTP200 and save/reload source identity checks, report and scoped local commit if permitted; no push.

### Task 3: Final integration QA, independent review and handoff

**Files:** scripts/qa-dual-mode-studio.mjs, relevant focused regression tests; outputs/visual/dual-mode/*; outputs/dual-mode-studio-validation.json; outputs/handoffs/engineering/DUAL-MODE-STUDIO-20260913.json; DESIGN.md and Studio surface brief. No overwrite of old dirty reports.

- [ ] Reopen actual reference video at loose/compact/linear/multiwrap portions, compare actions and final UI. Record timestamps and observable differences, not assumed physics.
- [ ] Exercise real browser at 1280x960/1440x900/1920x1080 and small width. Verify 20 mode roundtrips, mixed size, independent move, insert/displacement, swap, delete zone, undo/redo, wrist/wrap, reload, image export, source runtime and console/network.
- [ ] Capture actual UI screenshots and interaction recording, observe 100-sprite performance and stable idle. No screenshot-only acceptance.
- [ ] Run focused tests, npm test, npm run validate, git diff --check. Rehash DB and user exports plus old dirty reports against preflight. Regressions diagnosed/fixed/retested within scope.
- [ ] Fresh independent task/code and visual reviewer gates. Fix actual findings; document final design from built truth, not aspiration. Final result lists genuine remaining weak assets/limitations.
- [ ] Local coherent commit only task-owned files if permitted, preserve existing dirty reports and exports, no public push. Open running Studio for user and stop, no next business task.
