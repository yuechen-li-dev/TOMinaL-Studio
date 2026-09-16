# TOMinaL Studio UI architecture

TOMinaL keeps engineering authority outside React. `HarnessIr` owns electrical meaning and `FormboardDocument` owns authored physical layout. UI components consume pure projections and commit typed application commands; browser-only viewport, filter, active-workspace, and draft state are not serialized into either engineering document.

```text
HarnessIr              FormboardDocument
    |                           |
    +---- pure projections -----+
                 |
        app session and commands
        - semantic Selection
        - active workspace
        - catalog edit session
                 |
        +--------+---------+
        |        |         |
     Logical  Formboard  Catalog
```

## Public seams

- `src/app/session/appSession.ts` defines `Selection`, `AppCommand`, and `AppCommandDispatcher`. New UI actions dispatch commands rather than mutating nested engineering records.
- `src/harness-core/logicalProjection.ts` is the public Logical projection. `src/flow/vnextGraphAdapter.ts` is the React Flow adapter; React Flow node/edge objects are view models, not engineering state.
- `src/formboard/metrics.ts` owns route-length calculation. Inspectors use `getRouteLength`; they must not duplicate spline math.
- `src/app/formboard/FormboardWorkspace.tsx` consumes the public Formboard commands and the generic `machinalayout/viewport2d` coordinate/zoom/pan surface.
- `src/harness-core/diagnostics.ts`, `validation.ts`, and `src/formboard/validation.ts` provide the shared diagnostics model and validators.

## Adding an inspector field

Read `selection.primary`, resolve the semantic entity from `TominalProject`, and call public selectors such as `getRouteLength`. Put entity-specific presentation in `WorkspaceInspector`. Editable fields dispatch an `AppCommand`; they do not mutate `HarnessIr` or `FormboardDocument` directly.

## Adding a keyboard command

Global workspace commands belong in `CommandPalette`. Canvas-specific commands belong at the workspace boundary and call the same public viewport action used by visible controls. Keyboard handlers must ignore inputs, selects, textareas, and editable elements. Do not query or mutate SVG DOM to implement viewport commands.

Inactive workspaces are deliberately unmounted. This is a performance and ownership guarantee: hidden React Flow or SVG trees must not continue subscribing, projecting, or rendering.
