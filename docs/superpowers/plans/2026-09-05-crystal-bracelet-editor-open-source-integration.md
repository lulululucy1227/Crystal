# Crystal Bracelet Editor Open-Source Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing Workbench into one continuous, offline bracelet-design surface with independently movable bead instances, live quantity/fit feedback, and a locally served Fabric.js canvas.

**Architecture:** Keep bracelet state, commands, history, capacity, and draft compatibility in a pure JavaScript module. Add a narrow Fabric.js canvas adapter that renders state and emits semantic commands; keep data loading and orchestration in the existing app. Pin and serve Fabric.js locally so the Workbench remains offline.

**Tech Stack:** Node.js 24+, browser ES modules, Fabric.js 7.4.0, existing Node test runner, existing local Workbench server.

**Spec:** `docs/superpowers/specs/2026-09-05-crystal-bracelet-editor-open-source-integration-design.md`

## Global Constraints

- Chinese material names are primary and English names are subordinate.
- Selecting a material must not navigate or silently place a bead.
- Each bead is an independent instance; matching materials may occupy unrelated positions.
- Fabric.js is pinned and served locally; runtime must not depend on a CDN or internet access.
- Canonical SQLite is read-only and its SHA must remain unchanged.
- Existing generated-asset mapping is preserved until a real, attributable asset replaces an entry.
- `workbench/exports/` is user-owned and must not be changed, deleted, staged, or committed.
- Commercial product code and imagery, including “灵感实验室”, must not be copied without a compatible licence.

---

### Task 1: Instance-based bracelet state and history

**Files:**
- Create: `workbench/bracelet-state.mjs`
- Create: `test/p3t-bracelet-state.test.mjs`
- Modify: `workbench/design-tray.mjs`

**Interfaces:**
- Consumes: existing tray-plan calculation and legacy layouts containing material-name strings.
- Produces: `createBraceletState`, `selectMaterial`, `placeInstance`, `moveInstance`, `removeInstance`, `replaceInstance`, `setWristSize`, `createHistory`, `applyHistoryCommand`, `undoHistory`, `redoHistory`, and `serializeBraceletState`.

- [ ] **Step 1: Write failing state tests**

Add exact tests for two identical materials at unrelated positions, move-to-occupied swap, remove-one-instance, bounded undo/redo, wrist resizing, circumference, overflow, and legacy-layout compatibility.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --test test/p3t-bracelet-state.test.mjs`

Expected: FAIL because `workbench/bracelet-state.mjs` and its exports do not exist.

- [ ] **Step 3: Implement immutable state transitions**

Each instance contains `instanceId`, `materialName`, `sizeMm`, `slotIndex`, `angle`, `assetRef`, and `provenanceClass`. Generate stable unique IDs, derive angles from position/capacity, retain unresolved legacy entries, and bound history to 50 snapshots.

- [ ] **Step 4: Run focused state and existing tray tests**

Run: `node --test test/p3t-bracelet-state.test.mjs test/p3t-design-tray.test.mjs`

Expected: PASS without warnings.

### Task 2: Pinned local Fabric.js delivery and canvas adapter

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `workbench/server.mjs`
- Create: `workbench/bracelet-canvas.mjs`
- Create: `test/p3t-bracelet-canvas-contract.test.mjs`
- Create: `workbench/OPEN_SOURCE_NOTICES.md`

**Interfaces:**
- Consumes: bracelet state snapshots and a material-image resolver.
- Produces: `createBraceletCanvas({ canvasElement, state, resolveMaterial, onCommand })` returning `{ render(nextState), resize(), dispose() }`.

- [ ] **Step 1: Write failing delivery and adapter tests**

Assert the exact Fabric dependency is pinned, the server exposes only `/vendor/fabric/index.min.mjs`, the adapter exports its factory, no CDN URL ships, and the local vendor endpoint returns JavaScript with status 200.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --test test/p3t-bracelet-canvas-contract.test.mjs`

Expected: FAIL because Fabric.js, the route, and the adapter do not exist.

- [ ] **Step 3: Install and verify Fabric.js**

Run: `npm install --save-exact fabric@7.4.0`

Verify the lockfile, installed MIT licence, and browser bundle path.

- [ ] **Step 4: Add the allow-listed local vendor route**

Resolve only the exact Fabric.js browser module. Reject traversal and do not expose the rest of `node_modules`.

- [ ] **Step 5: Implement the canvas adapter**

Render the ring, bead images/fallbacks, focus, circular snapping, and removal threshold. Emit only semantic commands: `place`, `move`, `remove`, and `select-instance`. Keep Fabric objects out of draft state.

- [ ] **Step 6: Record attribution and run focused tests**

Record Fabric.js version/repository/MIT licence and the Perler editor pattern reference without calling commercial applications open source. Run `node --test test/p3t-bracelet-canvas-contract.test.mjs` and expect PASS.

### Task 3: Continuous catalogue, ring, and design ledger

**Files:**
- Modify: `workbench/app.js`
- Modify: `workbench/index.html`
- Modify: `workbench/style.css`
- Create: `test/p3t-continuous-design-workspace.test.mjs`

**Interfaces:**
- Consumes: state/history commands, canvas adapter, existing material and draft endpoints.
- Produces: one design workspace with catalogue, canvas, and ledger visible together.

- [ ] **Step 1: Write failing source and behaviour contract tests**

Assert the app imports the canvas and history interfaces, exposes the three named regions, includes selected/placed/remaining counters, and does not navigate when a catalogue material is selected.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --test test/p3t-continuous-design-workspace.test.mjs`

Expected: FAIL because the continuous workspace is not implemented.

- [ ] **Step 3: Implement the continuous operating surface**

Keep a compact material library, dominant circular editor, and quiet design ledger mounted together in the design view. Material selection changes the active material and never places or navigates automatically.

- [ ] **Step 4: Wire commands, history, and draft compatibility**

Map semantic canvas commands into pure state transitions. Add visible undo, redo, clear, balanced initial layout, save, and export actions. Read legacy drafts through the compatibility adapter and write the instance schema only on explicit save.

- [ ] **Step 5: Preserve visual language while improving hierarchy**

Keep the Windows-workbench identity. At 1280×960 the three regions and primary ring must remain usable without horizontal scrolling. Avoid decorative card proliferation.

- [ ] **Step 6: Run focused workspace tests**

Run: `node --test test/p3t-continuous-design-workspace.test.mjs test/p3t-bracelet-state.test.mjs test/p3t-design-tray.test.mjs`

Expected: PASS.

### Task 4: Runtime interaction and asset-fidelity acceptance

**Files:**
- Modify only after reproducing a runtime defect: Workbench UI/adapter files or per-material display metadata.
- Create: `outputs/visual/p3t-open-source-bracelet-editor-1280x960.png`

**Interfaces:**
- Consumes: actual running Workbench.
- Produces: browser evidence for the shipped interactions and layout.

- [ ] **Step 1: Start the Workbench at its printed local URL**

Run: `npm run workbench`. Do not use `file:///.../index.html`.

- [ ] **Step 2: Verify the user journey in the actual UI**

Select Tahitian Pearl without navigation; place instances at slots 3 and 14; move the first to slot 5 while the second stays at 14; swap with another material; remove one by dragging outward; undo/redo; change wrist size; save/reload and verify the arrangement.

- [ ] **Step 3: Inspect asset fidelity and failure states**

Confirm provenance stays visible, broken images show named placeholders, Chinese names lead, and no commercial-app asset appears. Apply only per-material crop/scale/position fixes to reproduced problems.

- [ ] **Step 4: Capture and inspect actual runtime evidence**

Create `outputs/visual/p3t-open-source-bracelet-editor-1280x960.png` from the running Workbench with the non-adjacent Tahitian Pearl arrangement visible. Reopen it and confirm it is not blank, simulated, or atlas-only.

- [ ] **Step 5: Run the Impeccable detector once**

Run `node C:/Users/luo_d/.codex/skills/impeccable/scripts/detect.mjs --json workbench/index.html workbench/style.css workbench/app.js workbench/bracelet-canvas.mjs`, then fix only mechanical findings that conflict with the approved spec.

### Task 5: Final regression and safety proof

**Files:**
- Update handoff files only when they accurately match the current authorized phase and actual result.

**Interfaces:**
- Consumes: completed implementation and runtime evidence.
- Produces: verified test/safety result and a coherent checkpoint excluding user exports.

- [ ] **Step 1: Record canonical database SHA**

Resolve the canonical SQLite path without writing it and record its SHA-256 as the before value.

- [ ] **Step 2: Run full verification**

Run `node --test test/p3t-*.test.mjs`, `npm test`, `npm run validate`, and `git diff --check`. New focused tests must pass; unrelated historical failures must be separated with evidence.

- [ ] **Step 3: Recompute canonical database SHA**

Expected: before and after SHA values are identical.

- [ ] **Step 4: Review status and explicit file scope**

Confirm only approved Workbench, tests, documentation, dependency, evidence, and authorized handoff files are included. Confirm `workbench/exports/` remains untouched and untracked.

- [ ] **Step 5: Commit the coherent implementation**

Stage an explicit file list excluding `workbench/exports/`. Commit only after fresh verification. Push only when handoff content accurately represents the authorized task and user-approved scope.
