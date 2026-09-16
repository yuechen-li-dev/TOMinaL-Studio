# Formboard usage

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
