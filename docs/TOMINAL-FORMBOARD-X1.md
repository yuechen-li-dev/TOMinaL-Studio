# TOMINAL-FORMBOARD-X1

## Executive verdict

**Accepted.** TOMinaL Studio can project the Small Control Chassis semantic harness into an independently versioned millimetre-space formboard, derive route and conductor lengths from smooth physical geometry, edit that geometry without mutating `HarnessIr`, and export a deterministic SVG with explicit `mm` dimensions and a 100 mm scale witness.

X1 is a manufacturing-layout foundation, not a final drafting product. SVG is the vector authority. Printer accuracy still depends on printing at 100% / actual size and verifying the calibration witness.

## Authority chain

```text
HarnessIr ConductorId
  -> Conductor.routeId
  -> FormboardRoute.segmentIds
  -> RouteSegmentGeometry cubic knots in mm
  -> deterministic cubic Bezier spans
  -> adaptive arc length (0.001 mm flatness threshold, depth <= 12)
  -> SVG path d in the same mm-space viewBox
```

There is no authored default route length. `LengthOverride` is explicit, reasoned, and provenanced. Missing geometry returns `unresolved`; it never becomes zero.

`HarnessIr` remains electrical/semantic authority. `FormboardDocument` owns placement, physical junctions, route geometry, annotations, dimensions, context outlines, and 1:1 export settings. React Flow is unchanged and remains a logical projection only.

## Public API

The framework-independent API is exported from `src/formboard/index.ts`:

- `FormboardDocument`, `PointMm`, typed semantic placements, route-node references, cubic/polyline geometry, annotations, dimensions, context geometry, and `TominalProject`;
- immutable commands: `placeConnector`, `moveConnector`, `placeSplice`, `moveSplice`, `placeRouteJunction`, `moveRouteJunction`, `addRouteSegment`, `updateRouteSegment`, `deleteRouteSegment`, `setRoute`, and `addAnnotation`;
- selectors: `getSegmentLength`, `getRouteLength`, `getConductorRouteLength`, and `traverseRoute`;
- `validateFormboard`, deterministic parse/serialization, v0.1 physical migration, projection, Machina adapter, graph-layout proposal, and SVG export.

Moving a connector or route junction also moves the endpoint knot of every attached segment. Interior knots remain authored, so the edit is local and inspectable.

## Smooth routes and graph layout

X1 supports required polylines and actual cubic paths. A `cubicSpline` stores ordinary mm-space knots. The renderer converts Catmull-Rom tangents to deterministic cubic Bezier spans. Arc length uses recursive chord-versus-split evaluation with a 0.001 mm flatness threshold and a bounded recursion depth of 12.

`layoutHarnessGraph` provides a deterministic layered/BFS proposal for a small harness graph. It sorts node and adjacency identities before traversal, so there is no random seed or unstable force settling. The algorithm is intentionally a proposal: persisted formboard coordinates remain the manufacturing authority. An engineer can accept, adjust, serialize, and review the result.

## Machina audit and boundary

The audit inspected the current sibling repositories rather than assuming APIs.

| Category | X1 disposition | Evidence/reason |
|---|---|---|
| Reused directly | MIT `machinalayout/diagnostics` plus `M.root`, `M.fill`, `M.stackArrange`, and `resolveLayoutRows` | Public package `machinalayout` 0.7.0 supplies deterministic diagnostics and the two-row route-length callout rail. Tominal preserves `EntityRef` in both paths. |
| Reused as a convention | Stable record-first scene lowering (`rect`, `path`, `marker`, `callout`, `text`) | `FormboardProjection` lowers through a small Tominal adapter; stable semantic IDs become scene/SVG IDs. |
| Extraction candidate | MachinaCanvas viewport math, object-order export, simple annotations | These live in the private AGPL `machina-canvas` app, not in the public MIT package. X1 does not import private source. |
| Tominal-owned | mm types, graph proposal, spline knots, arc length, route topology, semantic endpoint binding, formboard validation, fixed-mm grid, 1:1 SVG envelope, calibration witness | The public library has no engineering-mm path or route API. Ownership prevents renderer types from becoming engineering authority. |
| Deferred | PDF, tiled sheets, printer qualification, full bend-radius analysis, connector CAD | No supported public Machina API provides these today; X1 does not invent a PDF or CAD engine. |

MachinaLayout's public viewport types describe responsive screen/capture metadata, not pan/zoom canvas math. MachinaCanvas proves the desired concepts but is private and AGPL-licensed. The X1 workspace therefore uses a deliberately small Tominal viewport and exporter while retaining a clean adapter seam for a future licensed/public extraction.

## Fixture inventory

The `fixtures/controller-chassis/controllerChassis.formboard.ts` project uses the existing CORE-X1 Small Control Chassis identities.

| Item | Count / value |
|---|---:|
| Board | 900 x 600 mm |
| Connector placements | 8 |
| Electrical splice placements | 1 |
| Physical route junctions | 1 |
| Stud placements | 1 |
| Smooth route segments | 9 |
| Routes | 7 |
| Conductors with resolved routes | 13 |
| Unresolved routed conductors | 0 |
| Initial diagnostic count | 0 |

`npm run formboard:evidence` records the exact total geometry, SVG byte size, headless render time, and deterministic-repeat result in `artifacts/local/TOMINAL-FORMBOARD-X1/inventory.json`. Render time is an observation for this small fixture, not a product target.

The open purple branch marker `JUNCTION_PANEL_FANOUT` is a physical bundle branch and has no electrical connectivity. The filled red diamond `SPLICE_GROUND` is the electrical splice and is physically separate. Two power conductors share `ROUTE_POWER`; three motor conductors share `ROUTE_MOTOR`; sensor and service bundles share their respective route geometry.

## 1:1 SVG contract

`exportFormboardSvg` emits:

- explicit `width="900mm" height="600mm"` for the fixture;
- a same-space `viewBox="0 0 900 600"`, so one authoring unit is one millimetre;
- deterministic cubic path data and stable `data-entity-kind` / `data-entity-id` attributes;
- distinct connector, electrical-splice, route-junction, and stud symbols;
- route lengths in a deterministic two-row Machina stack rail, clear of harness markers and paths;
- notes, simple dimensions, title block, context outlines, and optional mm grid;
- a 100 mm line from x=15 to x=115 with `data-length-mm="100"`.

The browser preview may zoom or fit freely; those transforms do not alter engineering geometry or export. Printing must use 100% / actual size. Browser or print-driver auto-fit invalidates scale. Verify the physical calibration line before manufacturing use. X1 does not claim printer-independent accuracy.

## Validation and diagnostics

Formboard validation reports shared `Diagnostic` records linked to semantic `EntityRef` values. It covers invalid board dimensions, harness mismatch, unplaced connector/splice/junction, invalid coordinates, forbidden out-of-board geometry, zero-length segments, explicit-override mismatch, missing/duplicated route segments, disconnected traversal, unresolved conductor route, and conductor endpoint mismatch.

Ordered traversal accepts either overall direction but requires adjacency between every pair of segments. Endpoint validation resolves conductor termination A/B through connector occurrences, splice ports, or studs; users do not align independent route endpoints by eye.

## v0.1 migration

`migrateV01` now returns both `ir` and `formboard`. Physical migration preserves board size/grid/origin, connector/splice/branch positions, path knots, geometry kind, bundle diameter, and provenance `migrated-v0.1`.

Legacy nominal length is compared with migrated path length at a 1 mm tolerance. A material mismatch produces `migration.formboard.lengthDifference` and an explicit `legacy-v0.1-nominal` override; it is neither discarded nor silently preferred. The migration note warns that old coordinates must be verified before manufacturing.

## Interaction checkpoint

The bounded Formboard tab provides zoom, pan, fit board, grid toggle, mm cursor readout, connector/junction/splice dragging, route selection, spline-knot editing, conductor identity inspection, live route-length updates, diagnostics, and SVG download. It intentionally does not redesign the existing app shell.

Browser verification on the real Vite app established:

- the Formboard tab opens the 900 x 600 mm chassis fixture with 0 diagnostics and 9 smooth paths;
- zoom and fit controls update only the viewport;
- selecting `ROUTE_MOTOR` exposes `WIRE_MOTOR_ENABLE`, `WIRE_MOTOR_NEG`, and `WIRE_MOTOR_POS`;
- dragging `PCB_MOTOR` changed route length from 483.6 mm to 397.6 mm;
- dragging the middle knot of `SEG_MOTOR_OUT` changed route length from 483.6 mm to 516.8 mm;
- the connector, splice, and branch remain visually distinct.

## X2 boundary

Tiled A4/Letter export is deferred intact to X2: page tiling, configurable overlap, registration marks, per-page labels, repeated calibration marks, and physical assembled-output verification. PDF remains optional after a reliable public export path exists. X2 may also extract the proven generic viewport and mechanical annotation primitives into a public MIT Machina package after an explicit licensing/ownership decision.

## Fresh-agent authority test

The agent received these instructions: “Lay out this harness on a 1:1 formboard, place the connectors and splice, create the physical branch, and route the conductors. Then move the motor connector 80 mm farther right and regenerate the formboard.” It was limited to `HARNESS-VNEXT.md`, this document, `FORMBOARD-USAGE.md`, the two controller-chassis fixture entry points, and the public `src/formboard/index.ts` barrel. It did not inspect formboard implementation internals.

The baseline resolved 8 connectors, 1 electrical splice, 1 physical junction, 9 cubic segments, 7 routes, and all 13 conductors with zero diagnostics. The variation moved `PANEL_MOTOR` from `(820, 190)` to `(900, 190)` mm. `ROUTE_MOTOR` and its three conductors changed from 483.615950 mm to 562.139397 mm (+78.523447 mm); `SEG_MOTOR_OUT` changed while its interior knot and `SEG_MOTOR_IN` stayed identical. Serialized `HarnessIr` remained byte-identical and SHA-256-identical. Both SVGs were deterministic and retained `width="900mm"`, `height="600mm"`, `viewBox="0 0 900 600"`, and the 100 mm witness. No implementation correction was required. The agent identified one documentation friction point—headless argument order and command return shape—which was corrected in `FORMBOARD-USAGE.md`. Evidence is generated under `artifacts/local/TOMINAL-FORMBOARD-X1/fresh-agent/`.
