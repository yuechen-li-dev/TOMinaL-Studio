# TOMINAL-UI-X1 — Machina shell and performance refactor

## Executive verdict

**Accepted.** TOMinaL Studio now has a modern engineering shell whose idle behavior is appropriate for a mostly static CAD/manufacturing application. Logical, Formboard, and Catalog each settle to zero React commits, zero animation-frame callbacks, and zero timer callbacks in measured three-second idle samples. The Small Control Chassis workflow is qualified in a real Chromium browser, including cross-view conductor selection, connector and spline-knot drag, live route length, zoom/fit, resize, Catalog, and deterministic SVG download.

## Why the previous UI consumed excessive CPU

The dominant cause was not generic React Flow cost.

1. `AppShell` created a new inline `onSelectionChange` callback for `FlowCanvas` on every render.
2. React Flow's selection listener reported an empty selection through that callback.
3. `App` stored a new but semantically equal selection object, forcing another whole-shell render and another callback identity.
4. The cycle repeated without RAFs, timers, or user input. React Flow node data also contained callback collections, so each cycle traversed a larger tree.
5. The Logical tree stayed mounted inside a CSS `hidden` container. Its loop continued while Formboard and Catalog were visible, and those active workspaces rerendered along with the shell.
6. `FlowCanvas` mirrored projected nodes and edges through synchronization effects, adding commits. Catalog also synchronized its saved snapshot upward through an effect, widening state ownership, though it was not the initiating loop.

Baseline Chromium/CDP evidence for three-second idle windows:

| Workspace | React commits | AppShell renders | Active workspace renders | Script duration |
| --- | ---: | ---: | ---: | ---: |
| Logical | 7,942 | 3,971 | FlowCanvas 3,971 | 3.007 s |
| Formboard | 4,126 | 2,063 | Formboard 4,126 | 3.009 s |
| Catalog | 7,410 | 3,705 | Catalog 7,410 | 2.996 s |

All three samples recorded zero RAF, interval, and timeout callbacks. This isolates a synchronous React/state feedback loop rather than a perpetual animation loop. Baseline evidence is in `artifacts/local/ui-x1/baseline/profile.json`.

## State-flow audit before refactoring

```text
App
  HarnessDocument + selection + collapsed connector UI
           |
        AppShell
  active tab + catalog + wire report
     /         |           \
FlowCanvas  Formboard   MaterialCatalogView
local node/  own doc +   saved arrays + many
edge mirror  selection   local drafts
  ^  effects                 |
  +-- projection/callback ---+ upward catalog effect

Logical remained mounted when hidden.
```

- Engineering state: legacy `HarnessDocument` in `App`; vNext `HarnessIr` and `FormboardDocument` existed separately in the fixture.
- Session state: tab and catalog in `AppShell`; semantic selection used legacy node/segment/wire arrays.
- View-local state: React Flow mirrored nodes/edges; Formboard owned selection/document/viewport; Catalog sections owned edit drafts.
- Derived projections: legacy graph projection in `AppShell`; Formboard projection and metrics in its component.
- Broad boundary: every selection update rerendered `App`, `AppShell`, both sidebars, React Flow, and any active secondary workspace.

## Resulting UI architecture

```text
HarnessIr                 FormboardDocument
    |                            |
    +------ pure projections ----+
                  |
        app session / Selection / typed commands
                  |
       +----------+-----------+
       |          |           |
    Logical    Formboard    Catalog
  React Flow   SVG/Machina  controlled session
   adapter      viewport       state
```

`App` now owns the Small Control Chassis `HarnessIr`, `FormboardDocument`, saved catalog snapshot, active workspace, and one semantic `Selection`. Equivalent selection writes are rejected. UI edits dispatch `AppCommand` values. Logical React Flow consumes `LogicalGraphProjection` through `vnextGraphAdapter`; node and edge data are lightweight semantic view models. Inactive workspaces are unmounted and all three heavy workspaces are lazy loaded.

The shell provides dense left entity browser/search, central workspace, entity-specific inspector and diagnostics, command palette, keyboard switching, status line, bounded workspace error reporting, and future navigation labels without placeholder dashboards. Catalog saved state now lives above `MaterialCatalogView`; its category sections retain only their local drafts.

## After performance

| Workspace | React commits | Shell renders | Workspace renders | RAF / interval / timeout | Script duration |
| --- | ---: | ---: | ---: | --- | ---: |
| Logical | 0 | 0 | 0 | 0 / 0 / 0 | 0 s |
| Formboard | 0 | 0 | 0 | 0 / 0 / 0 | 0 s |
| Catalog | 0 | 0 | 0 | 0 / 0 / 0 | 0 s |

CDP task duration was 0.00061–0.00121 seconds across each three-second sample, effectively browser baseline without invented CPU percentages. Six repeated workspace switches produced 21 bounded commits and 0.0397 seconds of script time, versus 3,805 commits and 1.913 seconds before. Evidence is in `artifacts/local/ui-x1/after/profile.json`.

Structural guards now cover semantic selection equality and inactive-workspace unmounting. Production code contains no render-count logging.

## Interaction qualification

`scripts/qualify-ui.mjs` exercised real Chromium at 1600×1000 and 1280×800:

- selected `WIRE_MOTOR_POS` in Logical;
- switched to Formboard and verified `ROUTE_MOTOR` highlighted;
- dragged `PANEL_MOTOR` right and observed the route readout change from 483.6 mm to 561.6 mm;
- edited the second `SEG_MOTOR_OUT` spline knot and observed another length change;
- exercised zoom, Fit Board, resize, Catalog basic edit affordance, and SVG download.

The qualification result has no failures in `artifacts/local/ui-x1/qualification/qualification.json`.

## Formboard authority regression

The exact FORMBOARD-X1 proof remains valid:

- `PANEL_MOTOR`: `(820, 190)` → `(900, 190)` mm, exactly +80 mm X;
- `ROUTE_MOTOR`: 483.615950 mm → 562.139397 mm;
- route delta: +78.523447 mm from cubic geometry;
- serialized `HarnessIr`: 32,430 bytes before and after;
- Harness SHA-256 before/after: `7a0b15e8e7bf6b1fbf3323feb020f5d89771813b4cba457684f32f3a2c52a7db`;
- deterministic explicit-mm SVG retained 900 mm × 600 mm, `viewBox="0 0 900 600"`, and the 100 mm calibration witness.

Evidence is in `artifacts/local/TOMINAL-FORMBOARD-X1/fresh-agent/report.json`. The UI refactor did not change geometry/export code.

## Machina reuse and provenance

- Reused directly: public `machinalayout/diagnostics` transport already used by the Formboard adapter.
- Extracted generically: framework-neutral client-to-model conversion, centered zoom, and pan in the new `machinalayout/viewport2d` MIT package subpath, with owning-package tests and documentation.
- Retained in TOMinaL: harness projections, semantic selection, typed commands, React Flow adapter, Formboard SVG rendering, inspectors, Catalog presentation, and validation navigation.
- Studied but not copied: MachinaCanvas three-column engineering shell, event-scoped pointer handlers, visible-control/keyboard action sharing, status hierarchy, and static-on-idle SVG rendering.
- Deferred: general split-pane persistence and generic entity-tree/table React widgets. TOMinaL did not need them to solve the measured problem.

No private MachinaCanvas application internals are imported. The extracted primitive was deliberately reimplemented in the MIT MachinaLayout package and contains no harness semantics.

## Production build

Before: one 627.72 kB JS chunk (180.76 kB gzip) and Vite's >500 kB warning.

After:

| Chunk | Minified | Gzip |
| --- | ---: | ---: |
| entry | 322.78 kB | 96.68 kB |
| Logical / React Flow | 183.92 kB | 59.91 kB |
| Catalog | 68.77 kB | 11.47 kB |
| Formboard | 15.78 kB | 4.95 kB |

The chunk-size warning is gone. The build still reports the existing stale `caniuse-lite` informational warning. `npm install` reports 12 existing dependency audit findings (2 low, 3 moderate, 7 high); no unrelated major upgrade was attempted.

## Browser screenshots

- [Logical workspace](../artifacts/local/ui-x1/after/logical.png)
- [Formboard workspace](../artifacts/local/ui-x1/after/formboard.png)
- [Catalog workspace](../artifacts/local/ui-x1/qualification/catalog.png)
- [Selected conductor in Logical](../artifacts/local/ui-x1/qualification/logical-selected-conductor.png)
- [Same conductor route in Formboard](../artifacts/local/ui-x1/qualification/formboard-selected-conductor.png)

These are real browser captures, not mockups.

## Fresh-agent discoverability

### Selected-conductor route length

The fresh agent received `UI-ARCHITECTURE.md`, `HARNESS-VNEXT.md`, `FORMBOARD-USAGE.md`, and the Small Control Chassis fixture. It found that the requested compact field already existed in `WorkspaceInspector`, using shared `Selection.primary` and public `getRouteLength`. It added a focused assertion against public `getConductorRouteLength`; no MachinaCanvas internals or spline math were consulted or duplicated. Result: success.

### Fit active Formboard

The fresh agent received `UI-ARCHITECTURE.md`, `FORMBOARD-USAGE.md`, and MachinaLayout's `viewport2d.md`. It added unmodified `F` at the Formboard boundary, calling the same `fitBoard` action as the visible control and ignoring editable targets/modifier shortcuts. It added focused coverage and documentation; no DOM query/mutation or MachinaLayout implementation internals were used. Result: success. The discovered documentation friction—fit targets are semantic and therefore application-owned—was clarified in `viewport2d.md`.

## Validation

- TOMinaL TypeScript + Vite production build: pass.
- TOMinaL Vitest suite: 85/85 pass across 15 files.
- MachinaLayout full suite: 1,168/1,168 pass across 110 files; typecheck and package build pass.
- Formboard evidence generation: pass; 9 segments, 7 routes, 13 routed conductors, zero diagnostics, deterministic SVG repeat.
- Chromium idle and interaction qualification: pass.

Connector removal remains fail-closed: the inspector uses CORE-X1 `planConnectorRemoval` to show affected terminations, conductors, and circuits, and does not apply a cascade without an explicit domain command. ARTIFACTS-X1 generators, lock contract, supplier APIs, BOM, and quote work were not implemented.
