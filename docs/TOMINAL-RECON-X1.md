# TOMINAL-RECON-X1 — Architecture audit and 2026 refactor plan

Status: recon complete  
Repository snapshot: `main` at `30f7238` (2026-09-15)  
Scope: architecture and migration plan only; no product refactor is implemented here

## Executive verdict

**Verdict: Partial rewrite.**

TOMinaL Studio should preserve and migrate its existing domain behavior, not restart from a blank repository. The current code has good bones: a framework-independent `HarnessDocument`, immutable update functions, selectors/calculations, explicit catalog schemas, compatibility rules, deterministic TOML import/export, validation results, wire-route inference, and a one-way React Flow projection. Those are concrete assets with passing tests.

The partial rewrite is at the model boundary and product surfaces:

- replace `HarnessDocument` v0.1 with a vNext semantic harness IR plus a separate physical formboard model;
- replace signal-name-driven paired-wire generation with first-class circuits, conductors, terminations, and splice connectivity;
- replace UI-owned cut-list logic with deterministic artifact generators;
- replace the current all-in-one catalog screen and three-column prototype shell with a synchronized engineering workspace;
- add a real 1:1 formboard surface behind a Tominal-owned adapter to MachinaLayout/MachinaCanvas capabilities;
- retain React Flow, but restrict it to the logical connectivity view;
- retain the v0.1 TOML codec as an import/migration boundary, then use TOML principally for resolved artifacts and lock data.

This is not a full rewrite because the existing domain rules are independently useful and the application already has the correct dependency direction in several places. It is not merely an incremental refactor because the current `HarnessDocument` conflates logical, physical, catalog-binding, and serialization concerns, and its paired endpoint wire model cannot honestly represent splices or multi-drop circuits.

### Explicit verdicts

| Question | Verdict |
|---|---|
| Existing core or scratch? | **Partial rewrite:** migrate proven functions/rules into vNext; do not preserve the v0.1 aggregate shape as the final model. |
| Keep React Flow? | **Keep and restrict to Logical.** It remains a projection/editor for connectivity, never the harness or formboard authority. |
| TOML role? | **Compatibility import plus deterministic artifact/lockfile.** Do not make handwritten TOML the primary 2026 authoring surface. |
| Authoring frontend? | **Ordinary TypeScript plus generated typed catalog/connector declarations for the interview milestone.** Re-evaluate a narrow Copeland TS harness profile after the IR and artifacts stabilize. Do not put harness authoring into Firmament now. |
| MachinaLayout role? | **Formboard rendering/editor substrate through a thin adapter, not a domain dependency.** Reuse proven viewport, SVG, measurement, table, diagnostic, and annotation mechanisms; add the harness-specific 1:1 contract explicitly. |
| Aetheris role now? | **No runtime dependency.** Agree on stable semantic IDs and a future lowering boundary only. |
| Aetheris role later? | 3D connector occurrences, semantic paths/bundles, clips/supports/keepouts, bend/length checks, and STEP/assembly output. |

## Audit basis and current health

The audit inspected the current fetched `origin/main`, not only the older local checkout. The implementation is a small React/Vite application with a flat `src` tree rather than a monorepo. Current production dependencies include React 18, Vite, Tailwind, `@xyflow/react`, Zod, and `smol-toml` (`package.json`).

Validation performed after `npm ci`:

```text
npm test -- --reporter=dot
8 test files passed; 35 tests passed

npm run build
TypeScript build passed; Vite production build passed
```

The production bundle emitted a size warning (`533.83 kB`, `154.25 kB` gzip). This is not an architecture blocker. Lazy-loading the catalog and logical graph is a later UI-shell task, not a reason to change frameworks.

The working tree was clean before this report. `npm ci` repaired a stale local dependency install; it did not require source changes. `npm audit` reported 12 dependency findings (2 low, 3 moderate, 7 high). Dependency remediation should be a separate bounded maintenance pass because automatic major upgrades are not part of this recon.

## What exists today

### 1. Actual canonical model

`HarnessDocument` is the de facto canonical model. `App` owns one instance in React state (`src/app/App.tsx:16-29`), and `AppShell` sends all edits through domain mutation functions (`src/app/layout/AppShell.tsx:156-188`, `213-230`). React Flow nodes and edges are recomputed from the document (`src/app/layout/AppShell.tsx:128-139`). Cut lengths, selectors, validation, and TOML all read the same document.

The canonical shape is defined in `src/core/harnessModel.ts:72-83`:

- header/artifact fields: `version`, `name`, `units`, `drawingType`;
- formboard fields: `board`;
- mixed semantic/physical entities: `connectors`, `branches`, `splices`;
- physical route graph: `segments`;
- conductor records: `wires`.

This is one source of truth in storage terms, but not yet one clean semantic authority. Logical and physical concerns are colocated.

### 2. React Flow authority audit

The direction of `graphAdapter` is correct: `HarnessDocument -> Node[]/Edge[]` (`src/core/graphAdapter.ts:24-87`). React Flow types do not appear in `harnessModel`, mutations, calculations, catalog, or TOML.

There are two bounded leaks:

1. `Connector.position`, `Branch.position`, and `Splice.position` are projected directly to React Flow coordinates (`graphAdapter.ts:34`, `53`, `64`) and node drag writes those coordinates back into `HarnessDocument` (`FlowCanvas.tsx:69`; `AppShell.tsx:213-217`). The same positions are also implicitly treated as formboard coordinates. A logical layout edit therefore mutates physical-looking data without declaring which coordinate system owns it.
2. `FlowCanvas` keeps local `uiNodes` and `uiEdges` copies (`FlowCanvas.tsx:32-57`). They are transient interaction state and are resynchronized from projections, so they are not currently a second persisted harness. They are nevertheless a source of reconciliation complexity. The current branch even contains `console.count` diagnostics at `FlowCanvas.tsx:30,37`; delete those after the render-loop diagnosis is complete.

React Flow does not currently author connections through `onConnect`, and edge changes are only applied to local UI edges. That keeps it from becoming authority, but it also means the graph editor is only partly functional.

### 3. Field classification

| Current field | Current meaning | 2026 classification |
|---|---|---|
| `version` | v0.1 document discriminator | Serialization/migration envelope; not harness engineering intent. |
| `name` | Harness name | Engineering metadata; keep. |
| `units: 'mm'` | Document unit declaration | Artifact/physical-layout metadata. Normalize the semantic IR to mm internally. |
| `drawingType: 'formboard'` | Format discriminator | Obsolete once formboard is one projection; remove from semantic IR. |
| `board.width/height/origin/grid` | Drawing surface and editor grid | Formboard document/view settings, not logical harness semantics. |
| Connector `id` | Occurrence identity | Engineering identity; keep as a stable typed ID. |
| Connector `kind`, `partNumber`, `housingId`, `description` | Mixed occurrence/category/catalog binding | Keep occurrence identity and catalog binding; derive manufacturer part number/description from the resolved catalog snapshot. Replace free `kind` with a bounded role if needed. |
| Connector `position`, `rotationDeg`, `side` | Placement | Physical formboard occurrence placement. Move out of logical connector occurrence. `side` needs a named bounded meaning or deletion. |
| `pins: Record<string, ConnectorPin>` | Cavity population plus signal and terminal | Engineering semantics, but incorrectly collapsed. Split physical cavity, optional population, signal assignment, and termination. |
| Branch `id`, `kind`, `position` | Physical route junction | Physical formboard semantics. Keep identity/position; replace free `kind` with derived degree or a bounded presentation/style hint. It is not electrical connectivity. |
| Splice `id`, `kind`, `partNumber`, `position` | Thin mixed electrical/physical entity | Keep stable identity. Split electrical join/process/catalog binding from physical placement. Expand semantics. |
| Segment `id`, `from`, `to`, `path`, `geometry`, `bundleDiameterMm` | Route topology and geometry | Physical formboard semantics. Keep after typed references and geometry cleanup. |
| Segment `nominalLengthMm` | Authored route length authority | Replace with geometry-derived length plus an explicit, auditable override. |
| Wire `id`, `from`, `to` | One physical conductor with two connector-pin ends | Keep conductor identity but generalize endpoints to first-class terminations and allow splice ends. |
| Wire `route` | Ordered segment references | Keep as a typed physical route reference; validate continuity and direction. |
| `wireTypeId`, `slackMm`, `color`, `notes` | Conductor/catalog/manufacturing properties | Keep, with catalog-derived gauge/material/color where applicable and explicit override semantics. |
| Wire `gauge`, `material` | Duplicate denormalized catalog data | Remove from canonical conductor when `wireTypeId` is resolved; retain only in compatibility import/snapshot output. |
| Wire `terminalPartNumber` | One terminal for an entire two-ended wire | Delete from vNext. Terminal/seal/ring lug belong to each endpoint termination. |

### 4. Current TOML contract

`tomlCodec` encodes the entire mixed v0.1 document, including board dimensions, positions, paths, nominal lengths, connector-pin signals/terminals, paired wire endpoints in `CONNECTOR:PIN` strings, routes, and denormalized wire fields (`src/core/tomlCodec.ts:301-388`). Import performs structural parsing and reference validation (`tomlCodec.ts:258-299`, `391-414`).

This should remain valuable as:

- a v0.1 compatibility/import format;
- a deterministic debugging snapshot;
- a source for migration fixtures;
- eventually, the syntax of `tominal.lock.toml` and other generated metadata.

It should not remain primary source authoring. Its parser casts arbitrary strings to literal types at `tomlCodec.ts:399-403`, so unsupported `version`, `units`, or `drawing_type` values can enter with compile-time-looking types. v0.1 migration must validate those exact literals before constructing a document.

### 5. Domain rules worth preserving

- Global node IDs must be unique across connectors, branches, and splices (`harnessMutations.ts:97-168`).
- Segment endpoints must exist (`harnessMutations.ts:164-193`; `tomlCodec.ts:267-274`).
- Wire connector/pin references and route segment references must exist (`harnessMutations.ts:62-79`, `444-494`; `tomlCodec.ts:276-297`).
- Deleting nodes/segments removes dependent wires instead of leaving broken references (`harnessMutations.ts:239-288`). Preserve the invariant, but make destructive cascades explicit in UI commands/diagnostics.
- Pin-count reduction removes wires attached to removed pins (`harnessMutations.ts:370-408`). In vNext the housing defines cavities, so arbitrary pin-count editing should disappear.
- Route inference uses deterministic BFS over the segment graph (`wireGeneration.ts:47-108`). Preserve it as an optional route proposal, not engineering truth.
- Generated wire IDs are deterministic and collision-safe within the document (`wireGeneration.ts:124-142`). Preserve deterministic ID allocation, preferably from semantic source identities.
- Housing binding, wire-type binding, terminal membership, and wire-gauge/terminal compatibility already return inspectable results (`graphValidation.ts:33-216`). Preserve these rules and normalize them into one diagnostic type.
- Gauge compatibility returns explicit reasons and handles exact/range AWG syntax deterministically (`catalog/compatibility.ts:22-114`). Preserve behavior during a typed gauge migration.
- Wire cut length is route length plus slack (`harnessCalculations.ts:10-27`). Preserve the formula while changing route-length authority.
- Catalog import is additive and avoids destructive overwrite, with tests. Preserve as an import policy option.

### 6. Stringly typed areas

The main stringly seams are not merely aesthetic:

- all entity IDs and cross-references are plain `string`;
- pin/cavity IDs are arbitrary record keys;
- endpoint serialization combines two identities as `CONNECTOR:PIN` (`tomlCodec.ts:69-82`);
- `signal`, connector/branch/splice `kind`, connector `side`, wire `color`, `gauge`, and `material` are free strings;
- routes are `string[]` with existence checks but no compile-time continuity;
- terminal part numbers appear both on connector pins and the wire;
- catalog gauges are strings parsed with a narrow AWG regex, while the sample harness uses metric text such as `0.35 mm²` and `0.5 mm²`; those are two incompatible representations;
- the cut-list route editor accepts comma-separated segment IDs (`RightInspector.tsx:29-33`, `195-200`);
- selection is three arrays of strings rather than one typed entity reference (`App.tsx:6-14`).

Highest-value compile-time typing is at authoring time: connector family/cavity IDs, connector occurrence IDs, endpoint references, wire/circuit IDs, catalog bindings, signal roles, route IDs, and mapping completeness. Runtime import still needs validation because no TypeScript type can make external TOML trustworthy.

## Keep / refactor / rewrite / delete / move

“Keep” means preserve behavior and tests, not freeze the current file unchanged.

| Subsystem | Current responsibility | Keep | Refactor / rewrite / delete / move | Reason tied to code |
|---|---|---|---|---|
| `core/harnessModel.ts` / `HarnessDocument` | Entire semantic, physical, and serialized model plus demo | Entity ideas, stable IDs, route/wire concepts | **Rewrite model boundary** into vNext semantic IR + formboard; move demo to fixtures; delete `drawingType` and duplicate wire catalog fields | Lines 3-83 mix board, positions, connectivity, and artifact envelope. Pair-only wires and thin splices cannot model requested behavior. |
| `core/graphAdapter.ts` | Projects document to React Flow | **Keep direction and pure projection** | Refactor input to logical projection; callbacks belong in the React adapter, not projected node data | Lines 24-87 are correctly one-way, but domain data and UI callbacks are combined in `TominalNodeData`. |
| `flow/FlowCanvas.tsx` | Interactive React Flow canvas and transient state | Keep for Logical view | Restrict to logical positions; simplify controlled/transient state; implement domain commands for authored links; delete debug `console.count` | Lines 32-57 duplicate projection state; line 69 writes mixed coordinates back. |
| `flow/flowTypes.ts` | React Flow node/edge payloads | Keep adapter-local types | Refactor to explicit logical node/edge view models and typed entity refs | Current line 5 union is useful, but callbacks and domain pin objects leak into renderer payload. |
| `flow/nodeTypes.tsx` | Connector/branch/splice node rendering and inline editing | Keep connector-pin inspection interaction | Refactor into logical node views; move catalog and detailed termination editing to inspector/table; branch is physical and should not masquerade as electrical join | The 150-line file embeds editable catalog/pin forms in nodes, which scales poorly. |
| `core/harnessMutations.ts` | Immutable CRUD plus reference assertions/cascades | **Keep immutable functional style and invariants** | Refactor as explicit commands/results over vNext; split semantic from formboard edits; add diagnostic outcomes; remove arbitrary pin-count mutation | 517 lines are cohesive by domain today but combine all entities and silently cascade deletion. |
| `core/harnessSelectors.ts` | Lookup/count/format and metrics facade | Keep pure selectors | Split semantic, physical, and artifact selectors; replace `formatPinRef` as identity encoding | Lines 6-83 are useful thin reads, but formatted strings must not be identifiers. |
| `core/graphValidation.ts` | Catalog bindings and manufacturability checks | **Keep rules and tests** | Refactor to shared `Diagnostic`; add structural/connectivity/route/termination rules; rename away from “graph” | It already checks four real compatibility rules but does not validate duplicate populations, route continuity, or disconnected circuits. |
| `core/wireGeneration.ts` | Pairs equal signal strings and BFS-routes wires | Keep BFS as a route proposal utility and deterministic reporting style | **Rewrite semantic generation** around authored circuits/conductors; delete the assumption that every signal has exactly two pins | Lines 159-163 explicitly skip any signal with endpoint count other than two. |
| `core/harnessCalculations.ts` | Sums authored segment nominal lengths and slack | Keep cut-length formula and pure functions | Rewrite route length from geometry; add explicit override provenance and deterministic rounding | Line 11 treats missing/nominal values as zero and never measures `path`. |
| `core/tomlCodec.ts` | Full v0.1 import/export and reference checks | **Keep frozen compatibility reader and fixture writer** | Move under `compat/v01`; add literal/version validation and `migrateV01`; create separate generated artifact/lock codecs | 414 lines are valuable migration code but mirror the obsolete aggregate exactly. |
| `catalog/schemas.ts` | Zod schemas and inferred types | **Keep Zod and existing categories** | Refactor incrementally: typed gauge, housing cavities/keying/mating metadata, terminal/seal compatibility, process references, pricing excluded | The schemas already cover housings, terminals, seals, plugs, ring terminals, wires, accessories; no rewrite is justified. |
| `catalog/compatibility.ts` | Gauge, terminal/housing, wire/terminal compatibility | **Keep tested functions** | Generalize gauge units and explicit compatibility IDs; add seal/plug/cavity and ring/stud rules | Current logic covers only AWG text and containment of terminal IDs. |
| `catalog/catalogManifestCodec.ts` | Catalog TOML import/export | Keep as catalog interchange | Separate catalog source/snapshot versions and deterministic ordering; retain additive import option | Existing tests prove useful non-destructive behavior. |
| `app/catalog/MaterialCatalogView.tsx` | Catalog state, forms, tables, selection, import/export | Keep domain callbacks and validation behavior | **Rewrite view composition**, not domain logic: shell, category table, inspector/editor, diagnostics, import/export; move catalog state to application store | At 1,819 lines it duplicates item/form types and holds many independent edit states (`lines 16-205`, `260-1716`). |
| `app/layout/RightInspector.tsx` | Entity editor, metrics, cut-list table and CSV download | Keep selection-driven inspector idea | Move cut-list derivation/export to artifacts; split inspectors by entity kind; replace free-text route editing | `toCutListCsv` at lines 36-63 is UI-owned business logic and lacks most required columns. |
| `app/layout/AppShell.tsx` | Application orchestration, document/catalog state, adapters, validation, commands | Keep React composition and memoized projections | Refactor into a small session/store plus workspace modules; lazy-load heavy views; centralize commands/selection/diagnostics | Lines 44-240 coordinate nearly every subsystem and will become the next monolith. |
| `app/layout/WorkspaceTabs.tsx` | Two modes: Graph and Material Catalog | Keep simple accessible tabs | Rewrite mode list to Logical, Formboard, Wires, BOM, Manufacturing, Quote; Catalog becomes a workspace/tool | Current lines 3-13 expose prototype structure rather than product workflow. |
| React/Vite/Tailwind | Browser application stack | **Keep** | Upgrade only through bounded dependency work; add code splitting when new modes land | Current build passes; no evidence supports framework replacement. |
| `flow/sampleGraph.ts` | Unused parallel sample graph shape | Nothing if unused | **Delete after confirming no imports** | A second sample graph risks teaching React Flow as source truth; `createSampleHarnessDocument` is the current app sample. |

## Canonical model doctrine for vNext

The canonical authority should be a framework-free, versioned `HarnessIr` that contains electrical intent, physical conductor identity, manufacturing selections, and stable cross-view IDs. It should not contain React Flow nodes, Machina scene objects, supplier prices, or serializer-specific envelopes.

Formboard geometry is authoritative physical layout, but it is a distinct document linked by the same semantic IDs. This is still one product source of truth: the semantic harness owns what exists; the formboard owns where the physical route is drawn; projections and artifacts never own independent copies.

### Proposed concrete deltas from `HarnessDocument`

#### Keep, with stronger identity

- harness `name`;
- connector occurrence IDs;
- branch, splice, route-segment, conductor/wire, and catalog IDs;
- mm as normalized physical unit;
- notes and deterministic ordering rules.

Use branded/generated IDs at TypeScript boundaries (`ConnectorId<'ecu'>`, `CavityId<'ecu','CAN_H'>`, `WireId`, `SegmentId`) and ordinary stable strings in serialized IR. Brands prevent accidental cross-category assignment; validation protects external data.

#### Split

- `Connector` -> `ConnectorOccurrence` + catalog `ConnectorHousingDefinition` + `CavityPopulation[]` + formboard `ConnectorPlacement`.
- `ConnectorPin` -> catalog `CavityDefinition`; optional `TerminalPopulation`; optional `SignalAssignment`; endpoint `Termination`.
- `Splice` -> semantic `ElectricalSplice` and formboard `SplicePlacement`.
- `Branch` -> formboard `RouteJunction`; never infer electrical connectivity from it.
- `Segment` -> `RouteSegment` topology/geometry plus derived measurements.
- `Wire` -> first-class `Circuit` connectivity intent, one or more two-ended physical `Conductor`s, and endpoint `Termination`s.
- `board` -> `FormboardDocument` settings.

#### Add

- `Circuit { id, signalRole, participants, topology }` for logical electrical connectivity, including point-to-point, splice tree, and multi-drop network intent;
- `Conductor { id, circuitId, ends: [TerminationRef, TerminationRef], wireTypeId, color, routeId?, slack }`;
- `Termination { id, conductorId, end, target, terminalId?, sealId?, ringTerminalId?, processRef? }` where target is a connector cavity, splice port, ring/stud, or deliberate free/service end;
- `CavityPopulation` with states such as unpopulated, plugged, or terminal-populated; do not encode absence as a missing ad hoc pin object;
- `SignalRole` separate from physical cavity and conductor;
- `Route { id, orderedSegmentIds }` with topology/continuity validation;
- `LengthOverride { valueMm, reason }` only where an authored measured value must override geometry;
- bounded manufacturing fields needed for BOM/validation: seal choice, splice part/process, optional strip length, and accessory consumption references;
- a shared diagnostic record and source/provenance metadata.

#### Rename or remove

- rename UI “pin” to **cavity** when discussing the housing location; reserve “pin” for a contact only if the catalog terminology requires it;
- remove `drawingType`;
- remove wire-level `terminalPartNumber`, `gauge`, and `material` duplication;
- remove arbitrary connector `pinCount`; cavity count and IDs come from the housing definition;
- remove free `kind`/`side` fields unless each receives a bounded documented semantic domain.

### Logical versus physical

```text
HarnessIr
  connector occurrences -- cavity populations -- terminations
  circuits -- conductors -- electrical splices
             |
             | stable IDs
             v
FormboardDocument
  connector placements -- route junctions -- route segments -- annotations
```

A physical branch changes bundle topology but not electrical connectivity. An electrical splice joins conductor ends but may be located on a straight bundle or at a physical branch. A splice can therefore reference a formboard placement without becoming the placement itself.

### Multi-drop networks

Do not model a multi-drop signal as one wire with N ends. A physical conductor remains two-ended. A `Circuit` owns the intended connectivity; a splice/bus/junction topology links multiple conductors and terminations. This supports:

- ordinary point-to-point circuits;
- one source split through a physical splice to several conductors;
- bus-like networks with multiple connector participants;
- deliberate stubs and service points;
- independent routing, terminals, gauges, colors, and cut lengths per conductor.

`generateWiresFromSignals` should become an explicit migration/helper proposal: it may propose a point-to-point circuit only for exactly two compatible assignments. It must never silently treat equal signal labels as complete design intent.

## Typed authoring study

### Candidate comparison

| Candidate | Readability / LLM authoring | Compile-time safety | Browser integration | Reuse / 3D path | Cost | Verdict |
|---|---|---|---|---|---|---|
| A. Firmament-native declarations | Strong for CAD users once a harness language exists; currently foreign to this browser product | Potentially excellent, but no current harness semantics | Requires .NET/compiler service or generated artifacts; weak immediate edit loop | Best eventual Aetheris syntax alignment | **Large** and would make interview prep depend on new language/compiler work | Do not choose now. Future Aetheris lowering may consume the IR without owning Tominal source. |
| B. Narrow Copeland TS harness profile | TypeScript-shaped; good for LLMs; real nominal records, payload enums, exhaustive `match`, and multiple backends exist | Excellent for closed-world declarations | Needs a compiler/build integration, source maps/diagnostics, artifact handoff, and browser editor workflow | Reuses Copeland compiler semantics; can emit a stable IR for any downstream consumer | **Large** for first adoption because no harness profile/package exists | Best future language experiment after vNext stabilizes; not the shortest interview path. |
| C. Ordinary TypeScript model + generated typed declarations | Familiar, concise, directly editable in the repo; excellent LLM/tool support | Strong for known connector families and IDs using literal types, branded IDs, `satisfies`, and builders; runtime validation still required | Native to existing Vite/React/tooling | IR remains language-neutral and can later lower to Aetheris or be emitted by Copeland TS | **Medium** | **Recommended now.** Build the smallest typed frontend over vNext, not a second runtime or generic DSL. |

### Authoring recommendation

Use a small ordinary-TypeScript authoring library and generate connector-family declarations from validated catalog data. The library lowers directly to `HarnessIr`; it is not another canonical model. Keep helper functions explicit and finite: define connector occurrences, assign cavity populations, define circuits/conductors, define formboard placements/routes, then validate and emit.

Representative direction (illustrative API, not an implementation commitment):

```ts
import { defineHarness, mm } from '@tominal/harness-authoring';
import { RobotEcu, JointActuator, Txl18 } from './generated/catalog';

export default defineHarness('robot-left-arm', ({ connector, circuit, splice, formboard }) => {
  const ecu = connector('ECU', RobotEcu, {
    CAN_H: { terminal: RobotEcu.terminals.gold18, seal: RobotEcu.seals.green },
    CAN_L: { terminal: RobotEcu.terminals.gold18, seal: RobotEcu.seals.green },
    MOTOR_PWR: { terminal: RobotEcu.terminals.power18 },
  });

  const elbow = connector('ELBOW', JointActuator, {
    CAN_H: { terminal: JointActuator.terminals.signal },
    CAN_L: { terminal: JointActuator.terminals.signal },
    MOTOR_PWR: { terminal: JointActuator.terminals.power },
  });

  circuit.pointToPoint('CAN_H', ecu.cavity.CAN_H, elbow.cavity.CAN_H, {
    wire: Txl18.green,
    slack: mm(20),
  });

  const canLow = splice('CAN_L_FANOUT', { process: 'sealed-crimp' });
  circuit.connect('CAN_L', [ecu.cavity.CAN_L, canLow.port('in')]);
  circuit.connect('CAN_L_BRANCH', [canLow.port('out1'), elbow.cavity.CAN_L]);

  formboard.place(ecu, { at: [120, 220], rotationDeg: 0 });
  formboard.place(elbow, { at: [660, 220], rotationDeg: 180 });
  formboard.route('MAIN', { through: [[120, 220], [390, 210], [660, 220]] });
});
```

Generated `RobotEcu` types make `ecu.cavity.CAN_H` legal and `ecu.cavity.CAN_X` a TypeScript error. The catalog validator still ensures generated source came from valid external data. The builder must reject duplicate population and duplicate use where the circuit policy forbids it.

### Are payload enums and exhaustive match the right mapping abstraction?

**Partly, but not as the primary pin-to-pin mapping model.**

Payload enums are good for closed alternatives such as `TerminationTarget`, `CavityPopulation`, `CircuitTopology`, or an explicit `Connected | DeliberatelyUnconnected(reason)`. Exhaustive match is good in compiler/lowering code that must handle every variant.

Physical cavities should instead be generated finite keys/nominal IDs tied to a connector family. A connector mapping is a typed relation or builder operation over those keys, because:

- unused physical cavities are normal and should not force fake mappings;
- several cavities may carry the same signal role;
- optional circuits change which subset must be connected;
- a splice or multi-drop network is not a one-to-one source/destination match;
- connector families are reused by many occurrences;
- duplicate destination use and missing required assignments are relation constraints, not enum-branch semantics.

Use exhaustiveness against a declared interface or population plan—for example, all required roles in `RobotArmInterface` must be assigned—rather than against every cavity in a physical housing. Deliberately unused cavities should be explicit when a manufacturing artifact needs plugs, but they need not appear as fake electrical connections.

## Connector and catalog authority

The existing catalog is worth preserving. Zod remains suitable for runtime/import validation and inferred TypeScript records (`catalog/schemas.ts:9-91`). Rewriting it in another validator would add risk without adding semantics.

### What exists

- connector housings with manufacturer, family, cavity count, nested allowed terminals, seals, and plugs;
- connector terminals with compatible gauge and crimp-tool part number;
- ring terminals with compatible gauge, crimp tool, and stud size;
- wire types with gauge and insulation;
- accessory materials with category;
- housing-terminal, wire-terminal, and wire-ring-terminal compatibility functions;
- additive catalog TOML import/export.

### Missing links and proposed additions

The intended compatibility graph is:

```text
Housing family / keying / mating side
  -> cavity definition
  -> allowed terminal family
  -> optional seal or cavity plug
  -> allowed wire gauge/type
  -> crimp tool / applicator / process reference

Wire type
  -> ring terminal
  -> stud size / terminal family
```

Current gaps:

- housing has only `cavityCount`, not stable cavity IDs or per-cavity constraints;
- terminal/seal/plug records are nested under housing, which is workable now but makes shared families and cross-housing reuse difficult;
- seal/plug compatibility is presence-only data, not explicit per-cavity/per-terminal rules;
- keying, mating side, connector gender/interface, and required/optional cavity metadata are absent;
- gauges are free strings and current compatibility only parses AWG;
- crimp tools are part-number strings, not catalog references, and applicators/processes are absent;
- ring-terminal stud compatibility is stored but not validated;
- no pricing belongs here; supplier quote snapshots remain separate.

For the interview milestone, add stable cavity definitions, typed gauge values, terminal/seal/plug relations, and explicit process/tool references only where they support BOM and manufacturability. Do not build a process-planning system.

## Manufacturability and diagnostics

Unify current validation results and future checks under one record:

```ts
type Diagnostic = {
  id: string;
  severity: 'error' | 'warning' | 'info';
  rule: string;
  entity: EntityRef;
  message: string;
  correction?: { commandId: string; label: string };
};
```

Required vNext rules:

- unknown catalog binding;
- terminal not allowed by housing/cavity;
- wire gauge/type incompatible with terminal;
- seal/plug incompatible or missing where required;
- duplicate cavity population;
- missing required population/terminal;
- impossible or missing conductor endpoint;
- disconnected circuit topology;
- duplicate destination use under a one-use policy;
- route references nonexistent segments;
- route segments are not continuous from end to end;
- route does not reach the physical endpoint placements;
- negative slack, invalid geometry, or impossible explicit length override;
- splice port count/process/gauge incompatibility.

Diagnostics are application-level projections, shared by every view. Clicking one dispatches `select(entity)` and activates the most useful view; the diagnostic itself does not hold a React component or React Flow ID.

## React Flow and logical view

Keep React Flow for the logical view because it already provides selection, pan/zoom, node handles, minimap, and familiar connectivity interaction. It is useful for connector/cavity inspection and logical circuit editing. MachinaLayout does not make this specialized node-link editor automatically obsolete.

Rules:

```text
HarnessIr -> LogicalProjection -> React Flow nodes/edges
React Flow events -> typed application commands -> HarnessIr
```

Never persist React Flow nodes/edges. Store logical presentation positions separately from formboard placements. If automatic layout is added, treat it as disposable UI state or an explicit logical-layout artifact.

React Flow should display connectors, circuits, electrical splices, and possibly grouped harness interfaces. Physical bundle branches and formboard route segments do not belong here unless shown as a deliberately labeled overlay.

## MachinaLayout/MachinaCanvas and the formboard

The sibling stack provides two different things:

- the MIT `machinalayout` package provides deterministic record-first layout, React rendering, tables, diagnostics, exhaustive matching, static output, and framework adapters;
- the AGPL MachinaCanvas app proves an SVG scene model, stable object IDs, viewport zoom/pan, measurement readouts, semantic drafting annotations, path rendering, mm-sized SVG output, and export validation.

It does **not** currently provide a ready-made wire-harness formboard package. Its own documentation says mechanical mode is A4-oriented and 1:1 harness boards are out of scope. Full mechanical coordinate conversion and print/PDF review also remain incomplete. Therefore the immediate dependency must be a thin Tominal-owned boundary, not direct use of MachinaCanvas internal scene types.

Proposed boundary:

```ts
interface FormboardSurface {
  render(projection: FormboardProjection): FormboardScene;
  hitTest(pointMm: PointMm): EntityRef | undefined;
  exportSvg(scene: FormboardScene, options: ScaleExportOptions): string;
  exportTiledPdf?(scene: FormboardScene, options: TileOptions): Uint8Array;
}
```

`FormboardProjection` contains Tominal view records: mm-space connector outlines/labels, route paths, branch/splice markers, dimensions, annotations, selection, and diagnostic styling. The adapter may lower those records into public Machina APIs. Tominal core must never import Machina scene types.

### What Machina makes obsolete

- hand-built shell/layout record plumbing where `machinalayout` public layout primitives already fit;
- bespoke generic table CSV/inspection helpers where `machinalayout/table` is sufficient;
- another custom viewport/zoom/pan implementation if the proven MachinaCanvas viewport module can be extracted behind a public MIT-compatible package boundary;
- another ad hoc diagnostic presentation model;
- a one-off SVG serialization scheme if public/static APIs can be extended narrowly to cover formboard primitives.

It does not make React Flow obsolete, does not own harness semantics, and does not yet eliminate the need for a harness-specific formboard projection, real-scale print contract, route geometry, or tiled export.

### Formboard and length authority

For the interview milestone:

- use mm-space 2D points and polylines first;
- allow a bounded cubic/spline path only if its length calculation and SVG output are deterministic;
- compute each segment length from geometry;
- compute route length from an ordered continuous segment traversal;
- add per-conductor slack as either `extraMm` or a documented percentage/allowance policy;
- compute cut length as geometry route length + conductor slack + explicit termination allowance if modeled;
- keep `LengthOverride` explicit with reason/provenance for imported or measured legacy data;
- defer bundle-level slack unless a concrete demo need appears;
- record minimum bend-radius requirements and emit a warning only if deterministic bend checking is implemented; do not pretend a polyline corner proves a manufacturable bend.

`nominalLengthMm` should migrate to `LengthOverride` only when it differs materially from computed geometry or when legacy geometry is insufficient. Geometry is the default authority.

The output must encode physical size (`mm`) and support tiled printing with registration marks and scale verification. Browser print CSS alone is not sufficient evidence for 1:1 output; add a rendered-artifact test with known dimensions.

## Derived artifacts

All artifacts are pure, deterministic projections from validated IR plus an explicit catalog/quote snapshot.

```text
typed TS source or v0.1 import
  -> HarnessIr vNext
  -> validation diagnostics
  -> FormboardDocument / FormboardProjection
  -> 1:1 SVG/PDF
  -> cut-list rows -> CSV / printable table / JSON
  -> BOM rows -> CSV / printable table / JSON
  -> quote requests -> provider -> QuoteSnapshot
  -> tominal.lock.toml
```

### Cut list contract

Stable sort: natural/stable `Wire ID`, with an optional documented harness-zone prefix. Required columns:

1. Wire ID
2. From occurrence / cavity
3. To occurrence / cavity
4. Signal / circuit
5. Wire type
6. Gauge
7. Color
8. Route length (mm)
9. Slack/allowance (mm)
10. Cut length (mm)
11. Terminal A
12. Seal/ring A where applicable
13. Terminal B
14. Seal/ring B where applicable
15. Notes

CSV escaping and download belong in a browser adapter; row derivation and ordering belong in `artifacts/cutList`. The current UI CSV (`RightInspector.tsx:36-75`) becomes a regression fixture during extraction.

### BOM grouping rules

Derive atomic consumption records first, then group by `{category, manufacturer, partNumber, unit}` in a stable category/part order. Never count parts independently in a component.

- one housing per connector occurrence;
- one terminal/seal/ring terminal per populated termination as selected;
- one cavity plug per deliberately plugged cavity;
- wire quantity by wire type/color as total cut length plus only a separately declared procurement allowance; also expose conductor count;
- one splice part/process consumable per electrical splice when applicable;
- sleeving, tape, conduit, clips, labels, and accessories only from explicit route/accessory assignments or documented deterministic consumption rules;
- no inferred consumables hidden in UI code.

### Quote provider boundary

```ts
type ComponentQuoteRequest = {
  manufacturer: string;
  partNumber: string;
  quantity: number;
};

interface ComponentQuoteProvider {
  quote(requests: readonly ComponentQuoteRequest[]): Promise<QuoteSnapshot>;
}
```

`QuoteSnapshot` contains request identity, availability, currency, unit/extended price, source, timestamp, MOQ, and price breaks. Quote results are not engineering authority and must not mutate the BOM or catalog.

Implement only `LocalQuoteProvider` for the interview milestone: committed deterministic fixture prices, fixed timestamp supplied by the test, explicit “demo estimate” source, and predictable unavailable-part behavior. Real supplier APIs are deferred.

### TOML 2026 policy and migration

1. Freeze v0.1 codec behavior with broader golden fixtures.
2. Move it conceptually under `compat/v01` and reject unsupported envelope literals.
3. Implement `migrateV01(document): MigrationResult<HarnessIr, FormboardDocument>` with diagnostics for ambiguous signal/circuit/splice semantics.
4. Keep importing existing TOML through `parse v0.1 -> validate -> migrate`.
5. Do not automatically re-save as v0.1. Export canonical JSON/TSON-like IR only if a debugging artifact is needed; authoring remains typed TS plus UI commands.
6. Add generated `tominal.lock.toml` containing source hash, IR schema version, catalog snapshot hashes/versions, resolved manufacturer parts, quote snapshot identity/timestamp, generator version, and artifact hashes.
7. Make lock output deterministically ordered. Quote timestamps make snapshots intentionally different inputs; they must not be read as harness truth.

## Browser-only responsibilities

Keep these in the browser application/adapters:

- React rendering and Tailwind styling;
- React Flow interaction state;
- viewport, hover, expanded/collapsed rows, active workspace, command palette, and keyboard focus;
- synchronized selection state;
- file pickers, downloads, clipboard, local persistence, and print dialogs;
- provider credentials and network invocation UI when real quote integrations exist;
- progressive/lazy loading and visual density preferences.

Core model, validation, migration, calculations, artifact row generation, quote contracts, and local quote fixtures must run headlessly.

## UI product plan

Use a dense engineering workspace, not a card dashboard:

- primary modes: **Logical**, **Formboard**, **Wires**, **BOM**, **Manufacturing**, **Quote**;
- global project/catalog access in the shell rather than a peer mode called “Material Catalog”;
- persistent compact entity tree/search on the left;
- central mode surface;
- contextual inspector/diagnostics on the right or bottom;
- shared `Selection = EntityRef[]` and shared diagnostic store;
- command palette for navigation, validation, export, and bounded edit commands;
- keyboard navigation for tables and entity selection;
- status strip for validation counts, scale, catalog snapshot, and artifact freshness.

Selection law:

```text
select W_CAN_H anywhere
  -> logical circuit/conductor edge highlights
  -> formboard route highlights
  -> cut-list row focuses
  -> both terminations highlight in BOM
  -> related diagnostics and quote lines filter
```

Each view holds only view state. It queries projections keyed by semantic IDs.

`MaterialCatalogView` should be decomposed into:

- `CatalogWorkspace` for category/navigation and import/export;
- `CatalogCategoryTable<T>` for dense list/filter/sort;
- category-specific editors for housing, terminal, wire, ring terminal, accessory;
- `ConnectorFamilyInspector` for cavities and allowed terminal/seal/plug relations;
- `CatalogDiagnosticsPanel`;
- a catalog session/store owning saved data, drafts, and selected entity.

Do not split the current file into arbitrary line-count fragments while keeping duplicated form types. First make the Zod-inferred domain records authoritative and keep draft/form mapping explicit.

## Interview demo harness

Replace `Tominal Demo` in `harnessModel.ts:105-215` with a fixture under a repository-consistent fixture/sample folder when that folder is introduced. The current sample has two three-pin connectors, one unused physical branch, one unused splice, three point-to-point wires, no catalog bindings, and authored nominal lengths. It does not exercise the product claim.

Recommended fictional sample: **Robot Left Arm Actuator Harness**, explicitly generic and not attributed to Figure or any proprietary robot.

Keep it understandable:

- controller connector, shoulder bulkhead/service connector, elbow actuator connector, and chassis ring ground;
- motor power pair, brake, encoder/temperature signals, CAN-like differential pair, and chassis ground;
- one physical bundle branch;
- one real sealed electrical splice feeding two destinations;
- at least two wire gauges and several colors;
- populated terminals/seals plus deliberate cavity plugs;
- typed connector cavities and signal roles;
- measured formboard routes;
- derived cut list, BOM, validation results, and deterministic local quote.

Avoid EtherCAT or vendor-specific claims unless the sample actually models the required topology/parts. “CAN-like demo bus” is sufficient.

## Five-minute demo story

1. Open Robot Left Arm Harness; status shows one validated typed source and current catalog snapshot.
2. In **Logical**, select the ECU CAN-H cavity and show its typed circuit mapping and terminal population.
3. Select the CAN-H conductor; the same ID highlights in the formboard and cut list.
4. Switch to **Formboard**; move a physical branch or route control point in mm-space.
5. Show route length and cut length update without editing a nominal number.
6. Open **Wires** and show deterministic route length, slack, cut length, and both endpoint terminations.
7. Open **BOM** and show updated wire length plus terminal/seal/housing counts.
8. Open diagnostics and demonstrate one manufacturability rule tied to an entity, then restore the compatible choice.
9. Open **Quote** and show the deterministic local estimate labeled as demo data.
10. Export 1:1 formboard, cut-list CSV, BOM, and `tominal.lock.toml`.

The walkthrough explains the product without explaining React, TOML, or compiler internals.

## Tests: current inventory and required additions

Current 35 tests cover:

- catalog gauge/terminal/ring compatibility;
- catalog manifest TOML import/export, additive merge, and failed-import non-mutation;
- binding status;
- catalog-backed graph validation;
- optional binding TOML round-trip and legacy absence;
- one graph-adapter option projection;
- catalog select behavior;
- collapsed/add/edit catalog UI behavior.

Important gaps: there are no direct tests for `harnessMutations`, `harnessSelectors`, `harnessCalculations`, `wireGeneration`, the full v0.1 codec, route continuity, deletion cascades, application selection synchronization, cut-list CSV, or FlowCanvas behavior.

Before migration, add characterization tests for:

- full sample v0.1 golden round-trip and invalid envelope/reference cases;
- every mutation invariant and destructive cascade;
- BFS route inference and pair-only skip reporting;
- cut-length calculations and ordering;
- graph adapter node/edge identity/placement;
- catalog manifest deterministic output.

Then add vNext tests:

- compile-time fixtures (`tsc` positive/negative) for legal/illegal cavity references, duplicate typed mappings, and required role coverage;
- runtime import validation for untrusted data;
- circuit topology: point-to-point, splice tree, multi-drop, deliberate unconnected cavity;
- termination compatibility and BOM counts;
- formboard geometry length, route continuity, stable SVG, 1:1 physical dimensions, and tiled export registration;
- cut-list/BOM golden artifacts and stable ordering;
- local quote provider determinism and unavailable/MOQ/price-break cases;
- all views resolving one shared selection ID;
- v0.1 -> vNext migration golden fixtures.

## Repository structure recommendation

Do not introduce monorepo tooling merely to create boundaries. Start with source folders and TypeScript project/API boundaries in the existing Vite repository:

```text
src/
  harness-core/          # HarnessIr, IDs, commands, selectors, diagnostics
  harness-authoring/     # small TS builders and generated declarations
  formboard/             # physical model, projections, adapter contract
  artifacts/             # cut list, BOM, lockfile, export contracts
  catalog/               # schemas, compatibility, snapshots
  quote/                 # provider contract and local provider
  compat/v01/            # frozen model/codec/migration
  flow/                  # React Flow logical adapter
  app/                   # React session, workspace, browser adapters
fixtures/
  robot-left-arm/        # typed source and expected deterministic artifacts
```

Promote folders into packages only when a second consumer or independent build boundary exists. Likely future packages are `harness-core`, `artifacts`, and `formboard`; the app need not become a workspace first.

## Incremental migration roadmap

### TOMINAL-BASELINE-X1 — freeze and expose current behavior (Small)

- add missing characterization tests;
- remove FlowCanvas debug logging after confirming the current stabilization;
- document v0.1 format and exact current limitations;
- create the robot sample as v0.1 migration input, not yet as a polished new product.

Exit: current app still runs; v0.1 behavior is reproducibly characterized.

### TOMINAL-CORE-X1 — Harness IR vNext and typed authoring (Large)

- define stable typed IDs, circuits, conductors, terminations, cavity populations, branches, splices, and catalog references;
- implement shared diagnostics and core validation;
- implement v0.1 migration adapter;
- build the bounded ordinary-TypeScript authoring frontend and generated connector declarations;
- lower the robot fixture to vNext.

Uncertainty: topology and termination details will expose the most domain decisions. Keep the first slice to point-to-point plus one explicit splice tree; do not build an electrical simulator.

### TOMINAL-ARTIFACTS-X1 — cut list, BOM, lockfile, quote (Medium)

- deterministic cut-list and BOM row generators;
- CSV/print adapters;
- local quote provider and quote snapshot;
- `tominal.lock.toml` and artifact hashes;
- remove cut-list derivation from `RightInspector`.

Uncertainty: consumable quantity policy must be explicit; do not infer tape/conduit usage without authored rules.

### TOMINAL-FORMBOARD-X1 — 1:1 physical layout (Large)

- define Tominal formboard projection and Machina adapter boundary;
- polyline-first mm geometry, viewport, connector/branch/splice placements, labels, dimensions, and build notes;
- geometry-derived route/cut lengths;
- SVG plus verified 1:1/tiled PDF or equivalent print artifact;
- synchronized selection with Logical/Wires.

Uncertainty: MachinaLayout public library does not yet expose every proven MachinaCanvas app facility, and MachinaCanvas explicitly defers harness-board printing. A narrow upstream extraction or Tominal adapter may be needed.

### TOMINAL-UI-X1 — synchronized professional workspace (Large)

- modes, shared selection, command palette, diagnostics navigation, denser inspectors/tables;
- decompose the catalog UI without rewriting its validation;
- lazy-load major modes and address bundle warning;
- run the five-minute demo end to end.

### TOMINAL-LOGICAL-X2 — React Flow decision checkpoint (Small)

After vNext and Formboard exist, measure React Flow’s value. Keep it if it remains the fastest logical circuit editor. Remove it only if the logical view becomes table-first and the graph adds no material interaction value. Do not prepay a rewrite now.

### Future: AETHERIS-HARNESS-X1 (Large, separate program)

No dependency from the interview milestones. Lower the same stable IDs and semantic IR into Aetheris when 3D harnessing is intentionally funded.

## Risks and controls

| Risk | Evidence / consequence | Control |
|---|---|---|
| vNext becomes an abstract “perfect” harness model | Current core is small; requirements can invite PLM-scale design | Implement only robot-demo semantics plus explicit extension points. No simulator/process planner. |
| Data migration invents semantics | v0.1 equal `signal` strings and thin splices do not prove circuit topology | Migration returns diagnostics/proposals; require confirmation for ambiguous multi-endpoint signals. Preserve original snapshot. |
| Two layout authorities emerge | Current `position` serves React Flow and formboard-like data | Split logical presentation layout from `FormboardDocument` before building new surface. |
| Machina integration assumes unavailable APIs | Public library and AGPL app capabilities differ; harness printing is explicitly absent | Depend on a small interface; verify public API/license placement; upstream only bounded generic primitives. |
| Typed authoring becomes another language project | Firmament/Copeland paths are attractive but costly | Ordinary TS first; direct lowering to IR; no parser or generic DSL. |
| Generated declarations drift from catalog | Catalog is mutable and currently browser-local | Hash catalog snapshot, generate deterministically, validate at build, include hash in lockfile. |
| React Flow local copies diverge | `FlowCanvas` owns `uiNodes/uiEdges` | Treat them as ephemeral gesture state; commit only typed commands; test resync and IDs. |
| Catalog UI refactor changes rules | Domain and form types are duplicated inside a 1,819-line component | Extract state and mappings first; retain existing schemas/tests; change presentation second. |
| Test suite overstates safety | 35 passing tests miss mutations, calculations, generation, and full codec | Complete BASELINE characterization before changing the model. |
| 1:1 claim lacks physical proof | SVG `mm` attributes alone do not prove printer output | Render/inspect artifacts; add scale bar and known-distance verification; document printer scaling settings. |
| Supplier data contaminates authority | Quote is time-dependent and optional | Snapshot separately; BOM inputs remain manufacturer parts and quantities; provider never mutates IR. |

## Future Aetheris handoff

The stable future flow is:

```text
Tominal HarnessIr
  connector occurrence IDs + cavity IDs
  conductor/wire IDs + circuit IDs
  branch IDs + splice IDs
  catalog bindings
        |
        v
Aetheris harness lowering boundary
  connector occurrences in assembly coordinates
  branch/splice points
  semantic Path per conductor/bundle
  WireForm / bundle envelopes
  clips, supports, keepouts
  length and bend-radius validation
  STEP / assembly / PMI outputs
```

Tominal retains harness engineering intent. Aetheris owns 3D geometric materialization and CAD/assembly artifacts. Formboard placement and 3D placement are separate projections that share identities; neither is converted into the other as canonical truth. Aetheris should not be pulled into the browser refactor for shared enums or IDs—use a versioned interchange contract when the downstream consumer exists.

## Non-goals retained

This plan does not include full 3D harnessing, real supplier integrations, a frontend framework rewrite, PLM/ERP/MES, an electrical simulator, a parametric sketch solver, production process planning, every connector family, or a flag-day rewrite. It also does not make React Flow, MachinaLayout types, TOML, quote data, or Aetheris geometry the canonical harness.

## Final doctrine

The product idea remains correct:

```text
typed engineering intent
  -> one semantic harness authority
  -> logical and physical projections
  -> validated manufacturing artifacts
```

Preserve the tested rules and deterministic boundaries. Rewrite the mixed aggregate and prototype surfaces. Keep React Flow where it is useful, give 1:1 formboard work to a purpose-built adapter over the Machina stack, keep TOML as compatibility and lock/artifact data, and postpone Aetheris 3D until the interview-ready 2D manufacturing loop is complete.
