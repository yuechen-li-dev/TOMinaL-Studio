# Harness IR vNext and typed authoring

Harness IR vNext is TOMinaL Studio's framework-independent engineering authority. It contains no React, React Flow, MachinaLayout, or Aetheris types.

## Domain distinctions

- A **connector family** defines reusable finite cavities and allowed terminal/seal/plug relationships.
- A **connector occurrence** is one use of a family. It owns a role and explicit cavity populations, but no UI or formboard position.
- A **cavity** is the physical housing location. It may be unpopulated, plugged, or terminal-populated.
- A **termination** is one manufacturing endpoint of a conductor. It targets a connector cavity, electrical splice port, stud, or deliberate service end and owns endpoint-specific terminal/seal/ring data.
- A **conductor** is one physical two-ended wire.
- A **circuit** owns intended electrical connectivity and a signal role. X1 supports point-to-point and splice-tree topology.
- An **electrical splice** joins conductor endpoints electrically.
- A **route junction** is a physical bundle branch only. It does not create electrical connectivity.
- A **route** is an identity plus ordered segment references. CORE-X1 permits unresolved route placeholders; FORMBOARD-X1 will own geometry and measured length.

## Public entry points

```ts
import { defineHarness, defineConnectorFamily } from '@/harness-authoring';
import { serializeHarnessIr, validateHarnessIr } from '@/harness-core';
```

Generated family declarations expose finite cavity properties:

```ts
const power = connector('POWER_IN', Power3Family, { role: 'Panel power input' });

power.cavity.VIN_POS; // valid
power.cavity.VIN_NEG; // valid
// power.cavity.VIN_POZ; // TypeScript error
```

The builder callback has these bounded verbs:

```ts
defineHarness(
  harnessId,
  { name, description?, catalog },
  ({ connector, populate, splice, routeJunction, route, stud, circuit }) => { ... },
);

connector(id, GeneratedFamily, { role, notes? })
populate(connector.cavity.CAVITY_NAME, CavityPopulation)
splice(id, { ports: ['in', 'out1', 'out2'] as const, splicePartId?, processRef? })
routeJunction(id, { role?, notes? })
route(id) // unresolved route identity in CORE-X1
stud(id)  // termination target for a catalog stud

circuit.pointToPoint({
  id,
  signalRole,
  conductor: { id, from, to, wireTypeId, color, slackMm, routeId?, notes? },
})

circuit.spliceTree({
  id,
  signalRole,
  splices: [spliceHandle],
  conductors: [
    { id, from, to, wireTypeId, color, slackMm, routeId?, notes? },
  ],
})
```

An authored endpoint is `{ target, terminalPartId?, sealPartId?, ringTerminalPartId?, processRef?, stripLengthMm? }`. Connector endpoints normally repeat the terminal/seal declared by their cavity population. A splice-port endpoint normally needs only `target`. A stud endpoint uses `ringTerminalPartId`.

Population variants are:

```ts
{ kind: 'unpopulated', reason?: 'unused' | 'reserved' }
{ kind: 'plugged', plugPartId }
{ kind: 'terminalPopulated', terminalPartId, sealPartId?, signalRole? }
```

CORE-X1 models the harness, not the enclosing product assembly. “PCB,” “panel,” and “chassis” appear as connector occurrence roles and stable IDs; the PCB rectangle and sheet-metal enclosure are contextual fixture metadata for future CAD/formboard work, not fake HarnessIr entities.

Use `populate` to declare physical cavity population. Use `circuit.pointToPoint` or `circuit.spliceTree` to create circuits, conductors, and endpoint terminations directly in `HarnessIr`; the builder is not a parallel model.

The complete qualifying source is in:

- `fixtures/controller-chassis/controllerChassis.harness.ts`
- `fixtures/controller-chassis/connectorFamilies.generated.ts`
- `fixtures/controller-chassis/catalog.ts`

The fixture is a generic low-voltage sheet-metal controller chassis with one conceptual PCB, panel connectors, one chassis stud, one electrical ground splice, and one separate physical route junction.

Read `controllerChassis.harness.ts` as the canonical complete example. It uses only the exports from the two public barrels and the generated fixture catalog/declarations; authoring should not import implementation files below those barrels.

## Units and catalog authority

- lengths use branded millimeters;
- metric conductor area uses branded square millimeters;
- authoring callbacks accept ordinary numeric literals for `slackMm` and other
  length fields; lowering brands them at the `HarnessIr` boundary so authors do
  not need casts;
- `Gauge` is `awg` or `crossSection`, and compatibility compares normalized area;
- conductors reference catalog `WireType`; they do not duplicate gauge or insulation;
- generated connector declarations record the catalog snapshot ID/hash;
- `validateHarnessIr` rejects a stale catalog hash.

The demo catalog is illustrative and fictional. It is not a manufacturer claim.

## Validation

`validateHarnessIr` returns stable, sorted `Diagnostic` records with severity, rule, entity, and message. It validates identities, catalog bindings, cavity populations, terminal/seal/plug rules, gauge compatibility, ring/stud compatibility, endpoint targets, splice ports, circuit connectivity, routes, and negative slack.

Common actionable rules include:

| Rule | Correction |
|---|---|
| `cavity.illegal` | Use a cavity property exposed by the occurrence's generated family. |
| `cavity.terminal.illegal` | Choose one of that cavity's `allowedTerminalIds`. |
| `termination.gauge.incompatible` | Choose a wire type inside the terminal/ring gauge allowance, or a compatible termination part. |
| `termination.cavity.populationMismatch` | Make endpoint terminal/seal match the cavity population. |
| `splice.port.invalid` / `splice.port.mismatch` | Use a declared port exactly once. |
| `catalog.wireType.unknown` | Use a wire type from the bound catalog snapshot. |
| `conductor.slack.negative` | Supply non-negative millimeters. |

External JSON is untrusted. Parse it with `parseHarnessIr`; TypeScript types do not validate files.

For a new fixture, run `npm run build` to typecheck both `src/` and `fixtures/`,
including any `@ts-expect-error` compile-time proofs, then run `npm test` for
runtime validation and serialization evidence.

## v0.1 migration

The compatibility lane is `src/compat/v01`:

```text
parseV01 -> validateV01 -> migrateV01
```

Migration preserves connector/cavity identities, safe point-to-point wires, route identities/segments, slack, notes, catalog bindings, legacy nominal lengths as explicit overrides, and legacy positions as provisional placement proposals.

Equal signal strings with more than two endpoints do not become a multi-drop circuit. Thin v0.1 splices retain identity/part metadata but receive a migration warning because electrical connectivity is unknown.

## Future boundaries

- `projectLogicalGraph` emits plain nodes/edges; `flow/vnextGraphAdapter` is the separate React Flow adapter.
- `FormboardInput` exposes semantic IDs/routes but no renderer or geometry implementation.
- `FutureArtifactInput` contains the data later cut-list/BOM work needs.
- `AetherisHarnessInputV1` documents shared identities only. No Aetheris dependency exists.

Do not add UI positions, React callbacks, formboard geometry, supplier prices, or CAD types to `HarnessIr`.
