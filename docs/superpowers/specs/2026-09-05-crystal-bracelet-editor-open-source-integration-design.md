# Crystal Bracelet Editor Open-Source Integration Design

Date: 2026-09-05  
Status: approved direction, pending implementation-plan approval

## Decision

Extend the existing Crystal Workbench rather than replacing it. Use Fabric.js as a pinned, local MIT-licensed interaction dependency for the circular bracelet canvas. Reuse established editor patterns from MIT-licensed bead editors for undo/redo, usage counting, local persistence, and export, while retaining Crystal's existing material data, bilingual naming, wrist-size calculations, and local server.

The commercial application referred to as “灵感实验室” is a behavioral benchmark only. No public source repository or reusable asset licence has been confirmed for it, so its code and images are outside the reuse set.

## Goal

Create one continuous design environment in which the user can browse materials, see a live circular bracelet, place multiple instances of the same material in unrelated positions, and understand selected/placed/remaining quantities without page navigation.

## Non-goals

- No public storefront, ordering, payment, sharing, account, or healing-score workflow.
- No canonical SQLite writes or schema changes.
- No migration to React, Next.js, Electron, a web server framework, or a 3D product stack.
- No copying of commercial application code, screenshots, product photographs, or brand styling.
- No automatic mineral identification or promotion of image captions into confirmed material facts.
- No deletion, modification, or staging of `workbench/exports/`.

## Open-source inputs

### Fabric.js

- Source: `fabricjs/fabric.js`
- Licence: MIT.
- Use: selectable image objects, pointer dragging, movement constraints, canvas rendering, and serialization support.
- Integration: pin an exact version in `package.json`; serve its browser module locally through the existing Workbench server. The Workbench must not depend on a CDN or network access at runtime.

### Perler Beads Generator

- Source: `Jett-Wu/Perler_Beads_Generator`
- Licence: MIT.
- Reuse boundary: study and adapt the project-state, undo/redo, usage-counting, local-save, and export patterns. Do not import its MARD palette or visual assets as crystal materials.

### Other public bracelet applications

Crystal Weave, MYASTRIS, Vantony, and “灵感实验室” may inform interaction acceptance criteria such as continuous circular preview, direct placement, reordering, removal, and live size feedback. They are not treated as open-source dependencies and their assets are not copied.

## Experience structure

At desktop size, the primary work surface has three persistent regions:

1. **Material library** — searchable/filterable material list with Chinese-first bilingual names, real/placeholder provenance, size choice, and available quantity.
2. **Circular bracelet canvas** — the visual and interaction centre. It stays visible while the user browses, and uses the selected wrist size and bead diameters to calculate and draw the working ring.
3. **Design ledger** — selected types, selected quantity, placed quantity, remaining quantity, capacity/length status, and undo/redo/save/export actions.

The current catalogue and design-board routes may remain for navigation compatibility, but selecting or arranging beads occurs inside the same design context. A catalogue click changes the active material; it never navigates and never silently decides quantity or position.

## Interaction model

### Material selection

- Clicking a material selects it and exposes its available sizes.
- Clicking the selected material again does not create a second hidden action.
- The user may add an explicit quantity to the design ledger or drag/click individual instances directly onto the bracelet.
- The live ring and ledger remain visible during selection.

### Placement

- Each placed bead receives a stable `instanceId`; two Tahitian pearls are two independent objects even though they share a material key.
- Clicking an empty target while a material is active places one instance there.
- Dragging a material thumbnail to the ring places it at the nearest valid angular position.
- Dragging a bead around the ring moves that instance. A move to an occupied target swaps positions rather than merging quantities.
- Dragging a bead outside a defined removal radius removes only that instance and restores it to the available count.
- Beads can be distributed at arbitrary positions. There is no automatic adjacency rule for matching materials.
- Optional “均匀初排” remains a reversible starting action, never the underlying storage model.

### Ring and physical model

- Wrist choices initially preserve the existing 17/18/19 cm options and may later expand without changing the state schema.
- Capacity uses actual per-instance bead diameter wherever known. A reference diameter is only the fallback for items without a specific size.
- The canvas reports estimated used circumference, target circumference, remaining space, and overflow.
- A visual ring is a planning aid, not a claim of manufacturing-perfect fit; export retains the existing physical-fit warning.

### History and persistence

- Undo/redo covers placement, movement, swap, replacement, removal, clear, and automatic initial layout.
- History is bounded to avoid unbounded memory growth.
- Drafts serialize the instance layout, sizes, active wrist, notes, and provenance-bearing asset references.
- Existing drafts containing the earlier string-array layout are upgraded in memory through a deterministic compatibility adapter. Original draft files are not overwritten until the user explicitly saves.

## State model

The pure domain layer remains separate from Fabric.js:

```js
{
  wristCm: 17,
  targetCircumferenceMm: 175,
  instances: [
    {
      instanceId: "bead-...",
      materialName: "Tahitian Pearl",
      sizeMm: 10,
      angle: 42.5,
      assetRef: "...",
      provenanceClass: "user_owned"
    }
  ]
}
```

The domain layer owns capacity, circumference, collision/swap decisions, serialization, and history commands. The canvas adapter only translates pointer events and state into Fabric objects. This keeps calculations testable without a browser and prevents Fabric.js from becoming the data model.

## Material asset policy

Every displayed asset resolves through a manifest entry containing:

- material key and Chinese/English names;
- source path;
- provenance class: `user_owned`, `supplier_authorized`, `open_licensed`, or `generated_from_evidence`;
- original URL or source note where applicable;
- licence/attribution when open licensed;
- crop, scale, and object-position parameters;
- display role: catalogue, bracelet bead, comparison, or reference only.

User-owned and authorized product imagery has priority. Openverse/other open-license sources may fill gaps only after per-file licence verification. Generated assets remain visibly identified as reference imagery. No external image is fetched during normal Workbench use.

## Error and fallback behaviour

- A missing image renders an explicit, named placeholder without changing the material identity.
- A failed Fabric.js load falls back to the current DOM ring in read-only mode and displays a concise recovery message.
- An invalid or unknown draft entry is preserved in the design ledger and excluded from placement until resolved; it is not silently deleted.
- Overflow prevents additional placement but does not discard existing design state.
- Local save/export failure keeps the draft on screen and explains the corrective action.

## Implementation boundaries

Expected additions or focused changes:

- `package.json` and lockfile: pinned Fabric.js dependency.
- `workbench/server.mjs`: local, allow-listed Fabric browser-module route.
- `workbench/bracelet-state.mjs`: instance state, commands, history, compatibility adapter.
- `workbench/bracelet-canvas.mjs`: Fabric.js rendering and pointer adapter.
- `workbench/app.js`: catalogue/canvas/ledger orchestration without navigation on selection.
- `workbench/index.html` and `workbench/style.css`: continuous three-region operating layout.
- focused tests under `test/`.
- a small open-source attribution record shipped with the Workbench.

The existing `design-tray.mjs` algorithms are retained where correct and migrated behind the new instance-based API. Existing generated-asset mapping work remains intact until real material assets replace individual entries.

## Verification

Implementation is complete only when all of the following hold in the actual running Workbench:

- Selecting a material does not navigate or place an unspecified bead.
- The material list, circular bracelet, and design ledger are visible together at 1280×960.
- Two identical beads can be placed, moved, and removed independently at non-adjacent positions.
- Dragging to an occupied position swaps; dragging outside removes.
- 17/18/19 cm changes update the ring and physical capacity without losing valid placements.
- Selected, placed, remaining, estimated circumference, and overflow values stay synchronized.
- Undo/redo restores the exact prior arrangement.
- Saving and reopening preserves instance positions and asset provenance.
- Missing/broken assets fail visibly and do not produce a false material mapping.
- Chinese names remain primary and English names remain subordinate.
- The Workbench starts and operates without internet access.
- Canonical SQLite SHA remains unchanged.
- Existing exports remain untouched.
- Focused tests, the full test suite, validation, and `git diff --check` pass or any unrelated historical failure is clearly separated.

## Risks and controls

- **Transparent crystal cutouts may look poor.** Validate a small real-asset sample before bulk processing; keep per-material crop overrides.
- **Canvas state can become coupled to rendering.** Keep instance commands and serialization in a pure module with focused tests.
- **A new dependency can make offline startup fragile.** Pin the version and serve it locally; never use a floating CDN URL.
- **The current worktree already contains ongoing Workbench changes.** Preserve and classify them before implementation; never reset, clean, or touch user exports.
- **Current GitHub authorization is scoped to P3S-R1 runtime asset repair.** The user's explicit approval of this design establishes product intent, but implementation must remain isolated from canonical data and must not be reported as completion of the narrower P3S-R1 phase unless that phase's acceptance criteria are independently satisfied.

## Acceptance decision

The approved direction is selective open-source integration. A whole-project transplant is rejected because it would replace the current data contracts and local workflow; a 3D-first implementation is deferred because it raises complexity before the real-image pipeline and 2D composition workflow are reliable.

