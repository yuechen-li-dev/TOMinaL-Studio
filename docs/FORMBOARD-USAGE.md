# Formboard usage

## Bundle geometry and accessories

`HarnessIr` conductor route bindings and `FormboardDocument` route geometry jointly derive bundle state. `deriveBundleSections(harness, formboard, routeId)` returns deterministic route-station intervals with conductor IDs, core area, estimated core OD, ordered applied layers, and estimated finished OD. It is a projection: serialize accessory intent, never the derived sections.

For two or more conductors, TOMinaL uses the equivalent-round planning estimate `D = 2 × sqrt((Σ(π × OD² / 4) / packingEfficiency) / π)`. The default packing efficiency is `0.60`; a single conductor retains its catalog insulated OD. Missing OD fails closed. Catalog-estimated OD is permitted only with explicit provenance and a diagnostic.

Labels bind to one route station. Tape and sleeves bind to route-station spans. Label callout position is presentation-only; route and station remain semantic authority. Tape consumption is a piecewise helical estimate across every intersected bundle section, including overlap and waste. Sleeve fit uses the maximum prior-layer bundle OD across its span. Bare-ring heat shrink is derived from explicit terminal policy and qualified against tubing supplied/recovered IDs.

Bundle OD and tape consumption are engineering estimates for planning, not exact conductor packing or process simulation. All canonical lengths are millimetres. The Formboard inspector exposes station/span values and allows numeric edits; the `+ Label`, `+ Tape`, and `+ Sleeve` controls create bounded intent on the selected route.

The same intent is available through the public typed API:

```ts
import { catalogPartId, mm, routeId, tapeWrapId } from '@/harness-core';
import { estimateTapeWrap } from '@/formboard';

const tape = {
  kind: 'tapeWrap' as const,
  id: tapeWrapId('TAPE_MOTOR'),
  routeId: routeId('ROUTE_MOTOR'),
  startStationMm: mm(100),
  endStationMm: mm(360),
  catalogPartId: catalogPartId('TAPE_PVC_19'),
  mode: 'halfLap' as const,
  overlapFraction: 0.5,
  wasteFactor: 1.15
};

const withTape = {
  ...project,
  formboard: {
    ...project.formboard,
    accessories: [...(project.formboard.accessories ?? []).filter((item) => item.id !== tape.id), tape]
  }
};

const estimate = estimateTapeWrap(withTape, tape);
```

1. Open TOMinaL Studio and choose **Formboard**.
2. Use `+`, `-`, and the target control to zoom or fit the 900 x 600 mm board. Press `F` to fit the active Formboard when focus is not in an editable control. Drag empty board space to pan. The lower-left readout is in millimetres.
3. Drag a connector, electrical splice, or purple physical branch marker. Attached route endpoints and derived lengths update immediately.
4. Choose a segment under **Spline geometry**. Drag its white/blue knots to reshape the smooth cubic wire path. The route card reports the recomputed physical length.
5. Choose a route card to see every `ConductorId` sharing that physical route.
6. Select **SVG** to export the deterministic 1:1 artifact.
7. Print at **100% / actual size**, never fit-to-page, and measure the 100 mm calibration witness before using the drawing.

The exported SVG collects geometry-derived route lengths into a two-row callout rail above the harness. The rail is laid out with Machina stacks so these labels do not compete with connector, splice, or route-junction labels.

The filled red diamond is an electrical splice. The open purple circle is a physical route junction; it does not electrically connect conductors.

For headless use, import from `@/formboard`, keep `HarnessIr` and `FormboardDocument` separate in a `TominalProject`, validate with `validateFormboard`, query length with `getConductorRouteLength`, and export with `exportFormboardSvg`.

```ts
const validation = validateFormboard(project.harness, project.formboard);
const length = getConductorRouteLength(project.harness, project.formboard, conductorId);
const moved = moveConnector(project.formboard, connectorOccurrenceId, pointMm(900, 190));
const svg = exportFormboardSvg(project.harness, moved.document);
```

Every edit command returns `{ document, diagnostics }`; it never mutates the input document. Selector argument order is semantic harness first (when required), then formboard, then the requested entity ID.
