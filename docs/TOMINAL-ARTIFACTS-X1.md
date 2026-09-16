# TOMINAL-ARTIFACTS-X1 — Manufacturing outputs

## Executive verdict

**Accepted.** TOMinaL Studio can derive a complete deterministic manufacturing artifact package from semantic harness intent plus physical formboard geometry. The canonical Small Control Chassis produces 13 resolved cut-list rows, 19 grouped BOM rows, zero unresolved items, an offline demo quote, a traceable lockfile/manifest, and the existing deterministic 1:1 SVG.

## Authority chain

```text
HarnessIr + FormboardDocument + Catalog Snapshot
                    ↓ validation gate
               Cut List / BOM
                    ↓
               Quote Snapshot
                    ↓
              Lockfile / Manifest
```

HarnessIr owns electrical and manufacturing intent. FormboardDocument owns physical 2D geometry. The catalog snapshot owns approved manufacturer-part bindings. The UI and all artifact files are projections only.

## Artifact inventory

Canonical fixed quote time: `2026-09-15T12:00:00.000Z`. Local fixture subtotal: **USD 31.65**. BOM required quantities are **54 ea** plus **6.715716 m** of wire; unlike units are intentionally not combined.

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `controller-chassis.formboard.svg` | 12,711 | `028b493579c495db1c644eab331215db714e7bb212ab95f63dea673d6c0334ba` |
| `controller-chassis.cutlist.csv` | 2,457 | `398241e592f3f6984d7366bb94484a2fee279a6cb5d391b8e773359ce79ad049` |
| `controller-chassis.cutlist.json` | 9,731 | `e7b70bad537f1f27822685f9679b0735c81e04b0b1c0c51b0f9b74d1c27611bf` |
| `controller-chassis.bom.csv` | 3,428 | `57958d4c2cedfe053d957c50dd9a4eea3bed2da85d8d5be93994203e3b24054a` |
| `controller-chassis.bom.json` | 12,203 | `75fa1e668ad2388431b4cd686e39feffd82c871c2c367a7ed6a696415fb3c96c` |
| `controller-chassis.quote.json` | 13,103 | `0f116eb1204048291cbea9af4e7dcca38f3cdd3e15b475398612a84876f5f7c9` |
| `tominal.lock.toml` | 2,268 | `371d2280b8ae690791dc46e3fe375f97aed3ab2272257bbac9a41984ef0aee3e` |
| `artifact-manifest.json` | 2,456 | `3cfce414afef33458c4654259c2a93cebccceba5b40da3edb238068a344cfbbd` |

Wire totals by catalog part/color are: DEMO-WIRE-0.22 BU 0.486945 m, GY 0.583324 m, VT 0.486945 m, WH 1.070269 m, YE 0.498616 m; DEMO-WIRE-1.0 BK 1.424990 m, GN 0.739637 m, RD 1.424990 m.

## PANEL_MOTOR +80 mm regression

| Evidence | Baseline | +80 mm | Result |
|---|---:|---:|---|
| HarnessIr SHA-256 | `feaac3b0…8e371` | `feaac3b0…8e371` | unchanged |
| ROUTE_MOTOR length | 483.615950 mm | 562.139397 mm | +78.523447 mm |
| motor POS / NEG cut length | 503.615950 mm | 582.139397 mm | +78.523447 mm |
| motor ENABLE cut length | 498.615950 mm | 577.139397 mm | +78.523447 mm |
| total wire BOM | 6.715716 m | 6.951285 m | +0.235569 m (3 conductors) |
| connector housings | 8 ea | 8 ea | unchanged |
| terminals | 22 ea | 22 ea | unchanged |
| quote subtotal | USD 31.65 | USD 31.77 | +USD 0.12, wire only |

The connector moved 80 mm, while the cubic route grew 78.523447 mm. All three conductors bound to ROUTE_MOTOR inherit that geometry delta. Non-wire BOM rows and non-wire quote lines remain byte-equivalent.

## Quote boundary

The visible label is **Demo Estimate / Local Fixture Pricing**. Pricing comes from committed fictional fixture data; there is no live supplier integration. The provider boundary is replaceable, receives normalized BOM requests only, and cannot mutate engineering authority. Required quantity remains separate from MOQ-driven quoted purchase quantity. Shipping, tax, labor, tooling, scrap, overhead, and margin are not invented.

## UI evidence

The UI-X1 shell now activates Wires, BOM, Quote, and Manufacturing workspaces without introducing a second selection model. A wire row writes the shared semantic conductor selection used by Logical, Formboard, and the inspector. BOM rows can navigate to contributing semantic entities. Quote refresh advances only snapshot identity/time. Manufacturing exports each artifact or the full set through browser download adapters.

Browser screenshots are stored in ignored local evidence under `artifacts/local/TOMINAL-ARTIFACTS-X1/browser/`:

- `wires.png`
- `bom.png`
- `quote.png`
- `selected-conductor-formboard.png`

![Wires workspace](../artifacts/local/TOMINAL-ARTIFACTS-X1/browser/wires.png)

![BOM workspace](../artifacts/local/TOMINAL-ARTIFACTS-X1/browser/bom.png)

![Quote workspace](../artifacts/local/TOMINAL-ARTIFACTS-X1/browser/quote.png)

![Selected conductor in Formboard](../artifacts/local/TOMINAL-ARTIFACTS-X1/browser/selected-conductor-formboard.png)

## Validation

- Full Vitest suite: 16 files, 93 tests passed.
- TypeScript project build and Vite production build: passed.
- Headless artifact generation: 8 artifacts, 13 cut rows, 19 BOM rows, zero unresolved; about 35 ms in the recorded run.
- Repeated package generation and SHA-256 verification: passed.
- Mandatory +80 mm cross-artifact regression: passed.
- CSV quoting, missing-route refusal, override provenance, BOM rules, quote MOQ/break/error/unit behavior, lockfile traceability, selection synchronization, refresh, and export tests: passed.
- Browser qualification passed in Chromium: shared conductor selection, Formboard highlight, BOM count, demo quote/subtotal, quote refresh, Manufacturing inventory, and cut-list CSV download. Wires, BOM, Quote, and Manufacturing each recorded zero idle React commits, RAF callbacks, interval callbacks, and timeout callbacks over three seconds.
- Fresh-agent 1 generated all eight files twice through the documented command: 13 cut rows, 19 BOM rows, 19/19 quote lines available, zero diagnostics, identical repeat hashes.
- Fresh-agent 2 used public APIs for the +80 mm variation, generated before/after packages, reproduced the exact matrix above, retained 16 identical BOM/quote rows, and repeated the varied package byte-stably.

## Scope and limitations

No 3D harnessing, live supplier API, credentials, ERP/procurement, labor/tooling/shipping/tax calculation, editable artifact authority, or UI shell redesign was added. An electrical splice contributes a BOM row only when its splice/process part is explicitly authored; the canonical fixture has an electrical splice but no authored splice consumable, so none is invented.
