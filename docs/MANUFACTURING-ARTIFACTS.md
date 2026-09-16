# Manufacturing artifact API

TOMinaL derives manufacturing outputs from engineering authority; artifact rows are never editable source state.

```text
HarnessIr + FormboardDocument + Catalog Snapshot
                    ↓ validation
             Cut List + BOM
                    ↓ normalized BOM requests
               Quote Snapshot
                    ↓
             Lockfile + Manifest
```

Use the public `@/artifacts` barrel. `deriveManufacturingArtifacts(project)` returns deterministic cut-list and BOM projections plus shared diagnostics. A missing physical route produces `artifact.route.unresolved`; it never produces a zero length. Route geometry is the default length authority. An explicit `FormboardDocument.segmentGeometry[].lengthOverride` is retained as `lengthProvenance: "override"` and reported in cut-list notes. Cut length is route length + conductor slack + the two explicitly authored termination allowances. Values are calculated in millimetres; CSV display is deterministic to at most 0.001 mm.

BOM rows are grouped by category, manufacturer, manufacturer part number, unit, and—for wire—type/color description. Connector occurrences consume one housing; explicit terminations consume their own terminal, seal, ring, and process parts; deliberate plugs consume plug parts; an electrical splice consumes only explicitly authored splice/process parts. Wire required quantity is total cut length in metres and keeps `conductorCount`. Procurement or reel rounding is not inferred.

`ComponentQuoteProvider` sees only normalized BOM requests. `LocalQuoteProvider` accepts committed fixture prices and a caller-supplied snapshot timestamp. `buildLocalQuoteSnapshot` is the synchronous deterministic path; `buildQuoteSnapshot` admits later asynchronous providers. Quote refresh creates a new snapshot and never mutates HarnessIr, FormboardDocument, the catalog, or BOM.

Generate the canonical offline package with:

```powershell
npm run artifacts:build
```

Pass an output directory after `--`, or use `npm run artifacts:build -- --help`. The +80 mm public-API flow is:

```ts
const movedFormboard = moveConnector(project.formboard, connectorOccurrenceId('PANEL_MOTOR'), pointMm(900, 190)).document;
const movedProject = { ...project, formboard: movedFormboard };
const projection = deriveManufacturingArtifacts(movedProject);
const quote = buildLocalQuoteSnapshot(projection.bom, localProvider, fixedTimestamp);
const packageResult = buildManufacturingPackage(movedProject, quote, generateConnectorDeclarations(movedProject.harness.catalog));
```

`getRouteLength` and `getConductorRouteLength` return either `{ status: "resolved", valueMm, source }` or `{ status: "unresolved", reason }`; consumers must branch on `status` and must not substitute zero.

The default ignored output is `artifacts/local/TOMINAL-ARTIFACTS-X1/controller-chassis/`. `buildManufacturingPackage` refuses release-ready output when harness, formboard, or artifact validation contains an error. It emits the 1:1 formboard SVG, cut-list CSV/JSON, BOM CSV/JSON, quote JSON, `tominal.lock.toml`, and `artifact-manifest.json`. All content and SHA-256 hashes are stable for fixed inputs, including the caller-supplied quote timestamp.

Live supplier providers are an extension point only. Future DigiKey, Mouser, TrustedParts, Arrow, Newark, or TTI adapters must remain commercial projections of BOM manufacturer part numbers and quantities. They must not become engineering authority, and credentials must never be written to project files, quote artifacts, manifests, or `tominal.lock.toml`.
