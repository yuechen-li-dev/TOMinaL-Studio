# TOMINAL-ACCESSORIES-X1

## Executive verdict

**Accepted.** TOMinaL derives piecewise bundle geometry from logical conductor route membership plus physical spline routing, then uses that derived state for route-station labels, tape wraps, sleeves, bare-ring heat shrink, BOM, quote, accessory schedules, and the 1:1 manufacturing SVG. Accessory intent is serialized; bundle sections remain recomputable projection state.

## Authority and bundle model

- `HarnessIr` owns conductor identity, wire catalog OD, terminations, and route membership.
- `FormboardDocument` v2 owns spline geometry, deterministic route orientation, packing policy, and accessory intent.
- A conductor contributes once to every physical segment traversed by its bound route. Shared segment identity—not electrical adjacency—determines shared bundle membership.
- Route station zero is the ordered route's stable first endpoint. Station grows by cubic-spline arc length.
- For multiple conductors, `Ai = π × ODi² / 4` and `Dcore = 2 × sqrt((ΣAi / 0.60) / π)`. A single conductor retains its insulated OD. Missing OD fails closed.
- Applied layers are ordered core → tape → sleeve. Core and finished OD remain distinct. Tape effective radial thickness is the catalog thickness scaled conservatively by `(1 + overlap)`; sleeve uses catalog wall thickness. This is explicitly estimated geometry.

The motor fixture proves a physical branch. From station `0` to `252.527 mm`, the shared trunk contains `WIRE_MOTOR_ENABLE`, `WIRE_MOTOR_NEG`, and `WIRE_MOTOR_POS`, with core OD `4.692 mm`. After the branch, the main motor route contains the two power conductors, with core OD `4.382 mm`. Accessory boundaries further split the same deterministic sections without changing conductor authority.

## Accessory evidence

### Tape

`TAPE_MOTOR` spans station `100–360 mm`. It uses 19 mm tape, half-lap overlap `0.50`, and waste factor `1.15`. The span crosses the `252.527 mm` diameter breakpoint, so the helical formula is accumulated separately over both bundle ODs. Estimated material is `541.398 mm` for a `260 mm` physical span; prior-layer OD ranges from `4.382` to `4.692 mm`.

### Sleeve

`SLEEVE_MOTOR` spans `40–220 mm` and adds 10 mm allowance at each end. Cut length is `200 mm`. Maximum prior-layer bundle OD is `5.082 mm`; the 1.10 generic fit factor requires `5.590 mm` ID. Catalog `DEMO-SLEEVE-8` admits 3–7 mm bundles and validates.

### Heat shrink

Bare ring terminal `WIRE_GROUND_STUD:B` carries explicit policy requiring `HEATSHRINK_5_1P5`. The maximum pre-shrink substrate is the 3.8 mm barrel; tubing supplied ID is 5 mm and recovered ID is 1.5 mm against 2.4 mm wire OD. The derived cut is `8 + 6 - 1 = 13 mm`. BOM receives one piece totaling `0.013 m`, traceable to `HS:WIRE_GROUND_STUD:B`.

### Label

`LABEL_MOTOR` binds to `ROUTE_MOTOR` station `300 mm`. Its initial derived formboard position is `(644.427, 243.268) mm`; its callout position is presentation state. The manufacturing schedule records ID, text, route, station, and material binding.

## BOM, quote, and artifacts

Accessory BOM demand is aggregated by catalog identity with placement traceability:

- `DEMO-LABEL-12`: 1 ea
- `DEMO-TAPE-PVC-19`: 0.541398 m
- `DEMO-SLEEVE-8`: 0.2 m
- `DEMO-HS-5-1P5`: 0.013 m

These rows flow through the existing quote provider abstraction. The fixture quote is `$35.05`; no supplier API was added. The release package adds deterministic `controller-chassis.accessories.csv` and `.json` files, while the conductor cut list remains conductor-only. SVG uses restrained tape, sleeve, label/leader, and heat-shrink drafting marks rather than simulated helixes or braid.

## PANEL_MOTOR +80 mm regression

- Harness SHA-256 before/after: `982963c47ed8ae125c48b6c04ba0c3b7d10bf4d59ab02c4a970ece65143ece1d` (unchanged).
- Formboard hash changes from `5f9bb454…` to `975c3f13…`.
- Motor route/cut geometry changes from `483.615950` to `562.139397 mm`.
- The 300 mm label remains at the same semantic station but moves from `(644.427, 243.268)` to `(643.771, 241.622) mm`.
- Fixed numeric tape/sleeve spans remain fixed by design; their demand is unaffected. Motor wire demand changes, the quote identity changes, and fixture subtotal changes from `$35.05` to `$35.17`. Non-wire accessory quantities remain unchanged.

## Validation and performance

- Vitest: 19 files / 111 tests, including hand-calculated bundle/tape cases, branch membership, station queries, invalid overlap, sleeve fit, label propagation, heat-shrink fit, BOM aggregation, deterministic serialization, and browser accessory creation.
- TypeScript/Vite production build: passed.
- Headless artifact build and Chromium UI qualification: passed.
- Idle frontend profile: zero React commits in each idle workspace after initial load; no accessory polling loop was introduced.
- 1,000-run fixture measurement: bundle derivation averaged approximately `0.023 ms`; combined tape/sleeve/heat-shrink recalculation averaged approximately `0.029 ms` on the qualification host. These are observations, not an SLA.

Reproduce numeric evidence with `npm run accessories:qualify`. The measurements and hashes above are tied to this fixture revision.

## Bounded limitations

Bundle OD and tape consumption are planning estimates. X1 does not solve exact circle packing, compression, detailed layer stacking, literal tape helices, sleeve mechanics, heat recovery, supplier selection, or 3D harness geometry. Accessory span endpoint dragging and layer toggles remain optional UI follow-ups; numeric station editing is authoritative and complete.
