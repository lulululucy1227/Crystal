# Crystal Workbench

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is the project owner, using the Workbench locally on a Windows desktop to explore and assemble crystal-bracelet designs. It is not currently intended as a public customer-facing product.

## Product Purpose

Crystal Workbench turns the project's crystal, pearl, organic-material, hardware, and packaging library into a practical bracelet-design environment. Success means the user can compare materials, compose a full bracelet at a realistic wrist size, understand exactly what has been selected, and save or export a reproducible design without leaving the design context.

## Positioning

The Workbench combines a traceable material library with a position-aware circular bracelet editor. It is a private design instrument: material fidelity and freedom of placement matter more than checkout, social sharing, generic healing scores, or public-facing merchandising.

## Operating Context

- The user designs at a desktop browser viewport, normally through the local Workbench server.
- Materials are selected repeatedly and assessed as a composition, not as isolated single-item choices.
- Wrist circumference and bead diameter determine the working capacity of the circular tray.
- The user may use the same material multiple times at unrelated positions.
- Source imagery may come from user-owned files, authorized supplier material, generated evidence assets, or explicitly open-licensed sources. These origins must remain distinguishable.
- Drafts and exports remain local. Existing files under `workbench/exports/` are user-owned and must be preserved.

## Capabilities and Constraints

- Chinese material names are primary; English names are supporting reference text.
- Selecting a material must not navigate away from the catalogue or immediately add an unspecified quantity.
- The design surface must show a circular bracelet continuously while materials are being chosen.
- Individual bead instances must support independent placement, movement, replacement, and removal.
- The editor must report selected, placed, and remaining quantities and warn about overflow.
- Existing canonical SQLite data remains read-only unless a separate task explicitly authorizes database writes.
- Open-source code may be reused only with an identified compatible license and recorded attribution.
- Images from commercial applications are interaction references, not reusable assets, unless an explicit license says otherwise.
- Generated imagery must remain labelled as generated/reference material rather than source photography.

## Brand Commitments

- Product name: Crystal Workbench / 水晶设计工作台.
- The application is an operating tool, not a storefront.
- The interface should feel cohesive and materially credible; decorative effects must not compete with the bracelet-design task.

## Evidence on Hand

- Existing Workbench catalogue and design-board implementation under `workbench/`.
- Generated evidence atlases and manifests under `workbench/assets/catalog/generated/`.
- User-owned reference and material images outside the repository, including labelled crystal-comparison images.
- A user-provided target-layout reference and repeated real-runtime screenshots identifying interaction and material-fidelity failures.
- No confirmed open-source release or reusable asset licence has been found for the product referred to as “灵感实验室”.

## Product Principles

1. Keep the bracelet visible while choosing materials.
2. Treat every bead as an independently placeable physical instance.
3. Prefer faithful, attributable material imagery over polished generic placeholders.
4. Make capacity and composition legible before saving or exporting.
5. Keep the local workflow dependable and preserve user-owned drafts and exports.
