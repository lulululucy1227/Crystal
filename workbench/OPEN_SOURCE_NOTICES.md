# Open-source notices

## Fabric.js 7.4.0

- Project: https://github.com/fabricjs/fabric.js
- Licence: MIT
- Use in Crystal Workbench: local browser canvas, selectable bead objects, pointer movement, and canvas serialization primitives.
- The dependency is installed from npm and served by the local Workbench server. No CDN is used at runtime.
- Dual-mode Studio reuses image objects and decoded sources, draws only on changes and finite transitions, and exports the actual canvas to PNG. State and layout are independent of Fabric.

## Renderer comparison (development only, 2026-09-13)

- PixiJS 8.16.0, MIT, https://github.com/pixijs/pixijs, was installed only under ignored `work/dual-mode/benchmark-deps` for a throwaway browser comparison. It is not a production dependency or served by the Workbench.
- Windows / Node 24.19 / Chrome 152, 100 reused mixed-size sprites from 20 real source PNGs: Fabric median 0.5 ms and P95 1.0 ms; Pixi median 0.2 ms and P95 0.4 ms (CPU update + submission, not GPU completion). Initialization was 87.4 ms versus 280.6 ms; installed package bytes 22,222,881 versus 69,930,736 excluding transitive dependencies.
- Retained Fabric: both fit a 16.7 ms frame budget; the small observed submission-time saving did not justify a second runtime, slower startup, and additional integration surface. No Matter.js dependency was added; loose collision settlement is bounded and deterministic.

## Perler Beads Generator

- Project: https://github.com/Jett-Wu/Perler_Beads_Generator
- Licence: MIT
- Use in Crystal Workbench: interaction research for bounded history, usage counting, local project persistence, and export-oriented editor state. No source file, MARD palette, or visual asset is copied into Crystal Workbench.

## Behavioural references that are not treated as open source

“灵感实验室”, Crystal Weave, MYASTRIS, and Vantony are used only as product-interaction references. Their code, images, catalogues, names, and brand styling are not included in Crystal Workbench.
