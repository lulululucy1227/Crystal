# Crystal Graphite Workbench — approved design

Authority: user explicitly selected the supplied B / 石墨灰 comp and asked to change the UI to it, following approval of its translucent single-bead visual style. This supersedes the warm Studio visual identity only, not data/provenance safeguards. The comp is `C:/Users/luo_d/AppData/Local/Temp/codex-clipboard-406f1ed2-18da-412d-8e88-232d875cbcec.png`.

## Outcome

One cohesive desktop application: 选品库 → 设计台 → 成品展示. The three panels in the approved image depict three routes/states, not three applications simultaneously squeezed onto one page. Reproduce its light graphite/silver fields, charcoal controls, thin neutral separators, readable Chinese-first typography, soft inset neutral tray, left material picker and right selected-bead/usage inspector. No orange, green or blue UI accent; natural bead colors remain unchanged. Keep Crystal wordmark, no legacy Windows title/menu/toolbar chrome.

## Interaction contract

- Library remains visible while editing; material selection does not navigate. Quantity is actual selection/placed/remaining, never the image's invented values.
- Circular and straight projections reuse existing Fabric and stable per-bead state. Straight mode always shows one preset threading rail per wrap (1/2/3), including empty state, with front/back regions and truthful mm markers. No bead need exist to make a rail visible.
- Insert and move individual beads, displacement/swap, wrist/allowance, undo/redo and source-specific saved identities remain functional. Reuse existing command reducers.
- Selection has no rectangular/circular halo around the bead; indicate it in the inspector/material row and a modest offset shadow. Preserve visible keyboard focus on the canvas/control, not a geometric bead outline.
- 收拢成串 enters an EDITABLE strung arrangement in the current round or straight tray. It preserves current order and must not automatically navigate to read-only presentation. Clicking/selecting a bead never releases the string; only explicit 解除成串 returns to loose mode. Dragging individual beads reorders a strung bracelet in BOTH tray modes, retaining identity, source, quantity, sizes and undo/redo.
- The finished presentation is a separate explicit navigation/action showing the actual circular bead arrangement. Returning preserves the source tray, strung/loose state and latest order. It includes real export, zoom and return; a tilted 2D view must be labelled 斜视示意, not a true 3D reconstruction. No large preview/order panel may overlap the bracelet. Explanatory/order details belong in the inspector or below the stage, without click-away cancellation of committed state.
- All displayed navigation/actions work, or are absent. Preserve access to reference library, drafts, BOM/export, local material library and portfolio via appropriately secondary controls.
- Initialization must not throw if a user navigates before APIs finish. Loading/error states are explicit.

## Generated single beads

Produce seven independent illustrations from the approved style: Clear Quartz, Aquamarine, Labradorite, White Phantom Quartz, Tahitian Pearl, Amethyst, generic Moonstone. Preserve differences: not every material becomes clear glass. Generated images are always labelled AI效果图 / 非实拍, never physical mineral/grade/spec facts. Keep source cutouts available and do not replace image identities embedded in existing drafts. New ordinary display candidates may use the approved generated assets. Generic Moonstone is not silently substituted as verified Rainbow Moonstone.

Use transparent production PNGs, not a crop of the UI. Inspect actual alpha and material edges. Preserve original generation, exact prompts and processing provenance. Do not count a baked checkerboard as transparency. No public upload or new dependency required.

## Boundaries

- Continue in current `codex/studio-dual-mode-20260913` checkout; preserve all existing changes. No reset/clean/stash/rebase/commit/push in this task without a new explicit Git instruction.
- No canonical SQLite writes. Baseline SHA256: `8fe0ca49229808d3f737d14f0a4b5698b971827bfec11e05e4ffcae2a3b85dc6`.
- Do not alter `workbench/exports/`, user drafts, protected P4R reports, Drive source files, watcher/Bridge, procurement or databases.
- No engine replacement, dependency upgrade or invented side-view photography. No design plan screenshot passed off as runtime.
- Existing user browser tabs may contain unsaved work: test in a new isolated QA browser profile and deliver a new tab without refreshing those tabs.

## Acceptance

Actual browser catalogue, straight empty/filled 1/2/3 wraps, circular mode, selection without halo, insert/move/swap, quantity continuity, undo/redo, presentation/return, draft roundtrip and download using intercepted or isolated test storage. Generated/source images HTTP200, alpha backgrounds clean at real sizes. No new console errors, including early navigation. Desktop 1536×960 and 1280×960 plus narrow responsive view. Run focused tests, full npm test, npm run validate, git diff --check; recheck protected hashes. Compare runtime screenshot to approved comp with explicit differences. Record results without self-declaring supervisor acceptance.

## User correction during implementation

The screenshot `codex-clipboard-e4dd6223-586c-48a1-bc27-f497dc690a6c.png` proves that the order-preview overlay occludes the bracelet and makes click-away appear to release it. The user explicitly requires adjustable strung order in both modes. This correction supersedes the original confirmation-to-presentation flow; retain the approved Graphite visual world. Browser verification must collect, select without release, drag an interior bead across at least two neighbours, confirm changed ordered IDs, undo/redo, switch tray and save/reload without identity/BOM loss. Also validate the independently reproduced cached-catalogue-save and exact active virtual-size gap insertion defects before completion.

## Wrist-bound and single-thread correction

The next user report identifies two additional defects: a selected 17 cm wrist is not enforced, and multiwrap is drawn as separate bracelets. The former advisory-only fit and independent-ring projection are superseded.

- Use one authoritative planning-length budget for command acceptance and displayed targets. Selected wrist, explicit per-wrap allowance and bead-thickness compensation remain distinct. A new design starts with zero allowance; an explicitly stored allowance survives and is visible. Do not treat 170 mm wrist circumference as 170 mm of bead centerline, and do not hide extra overflow behind a positive tolerance.
- Plus, drag/gap insertion, replacement/size increases and collect must enforce the budget. Rejection preserves history, all bead identities and user input, with a specific Chinese explanation. Catalogue inventory is independent and unrestricted. Existing overlength drafts load/save losslessly and remain editable for correction; they cannot be represented as fitting or finalized. Reducing wrist/wrap/allowance never deletes existing beads.
- Multiwrap is ONE thread with one ordered bead sequence, visible turn-to-turn continuation and exactly one global closure. Round projection uses same-direction continuous turns, not independently closed circles; linear mode unfolds that sequence with visible continuation. Editing across any turn/row boundary preserves order/identity/history.
- Underfilled plans expose the unused thread/unfinished span instead of shrinking each turn into a deceptively full bracelet. Any flattened spiral projection is labelled schematic; its screen radius is not claimed as a physical wrist measurement. No new 3D/physics engine.
- Fresh tests include hand-derived 17 cm / 8 mm boundaries, mixed sizes, explicit allowance, wrap counts 1/2/3, atomic rejection, historical invalid recovery, cross-turn actual drag, undo/redo, save/reload, and genuine browser screenshots of one continuous multiwrap. Prior test totals do not certify these added requirements.

## User correction: close the last sub-bead remainder

The user's latest single-loop screenshot clarifies the previous underfill rule: when the remaining budget cannot accommodate another complete bead of the current design, collection must close the composition rather than leave a visible unused terminal segment. A genuinely sparse design still retains its unfilled thread and planning-preview status.

- Determine near-completion from the existing known bead dimensions and the same recomputed fit rule used to accept another bead, not a fixed hidden millimetre tolerance. Use the smallest existing along-thread bead as the conservative reference; show which reference size was used. Missing/unknown size and overlength never qualify.
- For eligible near-complete designs, the strung projection uses the actual occupied length and closes the residual visual span, without adding/duplicating beads, changing bead dimensions, changing wrist/allowance, or relaxing the placement upper bound. Report the actual estimated inner size and remaining budget honestly; do not claim an exact 17 cm measured product.
- Single-circle last-to-first spacing should match normal neighbour spacing; no exposed unused terminal span. Multiwrap remains a single continuous global sequence and retains its explicitly schematic sole crossover/return, not separate closed bracelets.
- Round and linear projections, explicit presentation, undo/redo and saved reload consume the same completion classification. Near-complete is visibly distinguished from a genuinely sparse plan. A complete additional reference bead that exactly fits must still be allowed; at the point it no longer fits, collection closes.
- Do not trigger collection on a mere bead click. This modifies only the result of the existing explicit collect action / already-strung projection.
