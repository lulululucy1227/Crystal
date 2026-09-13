# Dual-mode Crystal Studio — approved design

Authority: direct user approval on 2026-09-13 of the immediately preceding seven-part design proposal. This supersedes old P4R limits against architecture/UI work and the obsolete 22-source assumption. User permits use of their assets and local processing. No database writes, unrelated business work, watcher/Bridge edits, deletion of exports, or publication of private binaries.

## Product and outcome

Private Windows desktop design instrument, Chinese first. Both round tray and linear grooved tray are first-class editors of ONE design with stable instance identities. Same-material beads can occupy unrelated positions. Round/linear projection, loose/strung state, and wrap count (1/2/3) are independent. Switching does not duplicate beads, reorder silently, change BOM, or lose the saved loose arrangement. Older saved drafts must still load.

Reference: user's Drive folder 参考, 1Qxad7B9ZQATIlRE34oWE_THr0vLm6fkQ. Video 1pUjAmkX1PdodGBuVVLQpB6-aB6SVx9JJ (69.799s) shows warm ceramic tray, material picker always nearby, loose/compact transitions, changing used-material view, multiwrap and straight grooves, and clean presentation. Five stills IMG_3433–3437 show triple wrap, straight rows and design export. Reproduce the interaction logic and craft in desktop proportions; keep Crystal branding and omit storefront controls.

## Interaction contract

- Add one via + or drag a material into tray; ordinary material selection never navigates or places unspecified quantity.
- Loose beads follow pointer, settle with damped local collision/displacement, preserve their independent positions. No perpetual idle animation.
- Strung beads insert at a visible gap with deterministic local yielding. Moving reorders; swapping is an explicit separate action. No surprise random reshuffling.
- Deletion requires explicit action or a visible trash drop zone; leaving tray edge alone is not deletion.
- Round/linear change uses continuous transforms, not a clear-and-reload flash. Persistent image/object cache, stable IDs, preserve non-square shapes.
- Gentle shape-aware selection, no rectangular bounding boxes/scale handles. Pointer, touch, keyboard focus and reduced-motion behavior.
- Undo/redo covers placement, move, swap, removal, mode/wrap/size changes. Save/reload preserves exact state. Existing server draft/export protections retained.
- Explicit sequence start/direction in strung views and visible preview before committing a loose-to-string ordering change; existing sequence is default, do not infer aesthetic order.
- Show count, per-material quantities, wrist, allowance, mixed along-string size and approximate fit. Do not confuse centerline length with bracelet inner circumference. No fabricated prices/identity/quality.
- 1/2/3 wraps are one continuous ordered string, not repeated copies. Linear overflow has clear continuation and direction.
- Linear all/front/back filtering is view-only. It does not remove, duplicate, or reorder bead instances; returning to all restores the full continuous design. This implements the observed reference interaction and existing acceptance checklist.

## Desktop and imagery

Compact top bar (name, views, wrist/wrap, undo/redo/save). Large left/center tray about 65–72% and independently scrolling right material library; compact bottom readout and expandable BOM/inspector. Desktop 1280x960, 1440x900 and wide 1920x1080 must be usable, no page-wide horizontal overflow. Smaller viewport can stack deliberately. Warm light neutral ceramic surface, graphite controls, restrained sage accent, material images lead. No fake menu/window buttons. Presentation view hides editing chrome, retains useful material legend; export image is a real rendering, not AI fabrication.

User cutout archive: C:/Users/luo_d/Downloads/WORKBENCH_CUTOUTS__2026-09-13_素材批次-01__v1.zip (47968710 bytes). Actual archive has 22 source subfolders, manifest declares 257 PNGs; this is NEW cutout delivery, NOT 22 original photos. Count bytes and inspect actual alpha, no invented mappings. Source labels are display references, not mineral authentication. Normalize padding/alpha borders using existing Sharp, do not alter stone identity, hue, inclusions or quality. Keep originals and derived assets in existing private ignored areas. Surface unmapped cutouts as source-position-labeled visual samples instead of misassigning them. Label generated fallbacks honestly.

## Engineering decision

Inspect existing Fabric 7.4.0 and Sharp 0.35.4. Candidate PixiJS MIT rendering, optionally Matter.js MIT loose physics only. Benchmark identical workload on real browser before deciding; choose new renderer only for demonstrated benefit. No full 3D given only 2D source images. No new daemon/cloud/dependency merely to use it. Keep renderer distinct from deterministic state/order model. Windows + Node 24 and license/maintenance/weight recorded for adopted dependencies.

## Acceptance and safety

- Functional targeted tests + full npm test + npm run validate + git diff --check.
- Actual browser pointer scenarios: mixed sizes, two same-material independent moves, gap insertion, explicit swap/delete, loose/strung/round/line switching, wraps, undo/redo, wrist, save/reload, material sources HTTP 200, console errors.
- Repeat view switches 20 times with exact ID/sequence/BOM invariants. Benchmark 100 mixed sprites and transitions; report observed not fabricated performance.
- Actual runtime screenshots and interaction evidence compared with reference video. Inspect outputs. Independent spec/code and visual review, fix then re-test.
- Canonical DB SHA before/after must equal 8FE0CA49229808D3F737D14F0A4B5698B971827BFEC11E05E4FFCAE2A3B85DC6. Writes=0. Preserve old dirty P4R reports and workbench/exports byte-for-byte. No P3R changes.
- Deliver running local experience, exact implemented features/test results/material count/limitations, not self-declared supervisor acceptance. No new phase after this.
