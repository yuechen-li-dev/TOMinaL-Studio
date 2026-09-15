# TOMINAL-CORE-X1 — Harness IR vNext and typed authoring

Status: complete  
Repository baseline: `main` at `30f7238`  
Scope: semantic core, typed authoring, migration, validation, projections, and fixture only

## Executive verdict

**Accepted.**

TOMinaL Studio now has a clean, framework-independent semantic `HarnessIr` and a bounded ordinary-TypeScript authoring model capable of representing real point-to-point and splice-based harness connectivity without relying on signal-name pairing.

The new core explicitly separates circuits from physical conductors, endpoint terminations from cavity population, electrical splices from physical route junctions, and semantic connector occurrences from future logical/formboard placement. The valid chassis fixture exercises both supported topologies and produces zero error diagnostics. React, React Flow, MachinaLayout, and Aetheris are absent from `src/harness-core` and `src/harness-authoring`.

The existing product UI intentionally remains on the v0.1 compatibility model during CORE-X1. A pure vNext logical projection and separate callback-free React Flow adapter now exist, so a later bounded application-session migration does not require React Flow to become authority. No UI redesign was performed.

## Delivered architecture

```text
generated connector-family declarations + typed TypeScript source
                              |
                              v
                         HarnessIr 1.0
                              |
             +----------------+----------------+
             |                                 |
      validation diagnostics          deterministic JSON
             |
      LogicalGraphProjection
             |
      React Flow adapter

Future only: FormboardInput / ArtifactInput / AetherisHarnessInputV1
```

Key implementation areas:

- `src/harness-core/ids.ts`: branded stable IDs and unit brands;
- `src/harness-core/model.ts`: canonical IR and finite semantic variants;
- `src/harness-core/validation.ts`: shared diagnostics and manufacturability validation;
- `src/harness-core/serialization.ts`: Zod boundary and deterministic JSON;
- `src/harness-core/logicalProjection.ts`: framework-free graph projection;
- `src/flow/vnextGraphAdapter.ts`: projection-to-React-Flow adapter only;
- `src/harness-authoring`: finite connector family and harness builders plus declaration generator;
- `src/compat/v01`: frozen compatibility surface and migration;
- `fixtures/controller-chassis`: generated family declarations, fictional catalog, and typed fixture.

## Model deltas

| HarnessDocument v0.1 | HarnessIr vNext |
|---|---|
| One document mixes semantic entities, board data, positions, routes, and serialization envelope | Semantic IR contains engineering intent; future physical/formboard inputs are separate contracts |
| Connector pins are `Record<string, ConnectorPin>` | Reusable family defines finite cavities; occurrence owns explicit population entries |
| `signal?: string` on each pin drives pair generation | Circuit owns bounded signal identity and explicit topology |
| Wire contains one `from`, one `to`, and one terminal part number | Conductor is two-ended and references two first-class endpoint terminations |
| Gauge/material duplicated on wire | Conductor binds one catalog wire type with normalized gauge/insulation |
| Thin splice has ID/kind/part/position but no connectivity | Electrical splice owns finite ports; terminations target those ports |
| Branch can look like graph connectivity | Route junction is physical only and never electrically joins conductors |
| `position` is ambiguous logical/formboard state | No placement in connector occurrence; legacy positions become provisional proposals |
| Segment nominal length is authority | Legacy nominal length becomes an explicit provenance-bearing override; future formboard geometry is final authority |
| All references are plain strings | Branded IDs prevent category interchange at compile time; serialized values remain stable strings |
| TOML parser casts envelope strings to literal types | v0.1 parser checks exact version/units/drawing type; vNext JSON is Zod-validated |

## Domain rules and diagnostics

The shared validator returns stable `Diagnostic` records. Implemented checks include:

- stale catalog hash and unknown catalog/family/wire/terminal/seal/plug/ring bindings;
- duplicate IDs globally and within entity collections;
- illegal or duplicate cavity populations;
- required cavity not terminal-populated;
- terminal not allowed by cavity;
- seal incompatible with cavity or terminal;
- illegal cavity plug;
- connector-cavity termination inconsistent with its population;
- impossible connector/splice/stud target;
- missing conductor endpoint;
- wire gauge incompatible with terminal or ring terminal;
- ring terminal incompatible with stud size;
- invalid or multiply/un-populated splice ports;
- conductor assigned to missing/foreign circuit;
- disconnected circuit topology;
- missing route/segment/endpoint references;
- negative slack.

Destructive vNext editing does not inherit the old silent cascade law. `planConnectorRemoval` returns affected terminations, conductors, circuits, and a confirmation diagnostic; it does not mutate the IR.

## Typed authoring example

This complete compact example uses the actual generated demo declarations and catalog. The qualifying fixture expands the same pattern across motor, sensor, and service connectors.

```ts
import { defineHarness } from '@/harness-authoring';
import { catalogPartId, signalRoleId, wireTypeId } from '@/harness-core';
import { controllerChassisCatalog } from './catalog';
import { Power3Family } from './connectorFamilies.generated';

export const powerHarness = defineHarness(
  'small-controller-power',
  { name: 'Small Controller Power Harness', catalog: controllerChassisCatalog },
  ({ connector, populate, splice, stud, circuit }) => {
    const pcb = connector('PCB_POWER', Power3Family, { role: 'PCB power header' });
    const panel = connector('PANEL_POWER', Power3Family, { role: 'Panel power input' });

    for (const [left, right, role, terminal] of [
      [pcb.cavity.VIN_POS, panel.cavity.VIN_POS, 'VIN_POS', 'TERM_POWER'],
      [pcb.cavity.VIN_NEG, panel.cavity.VIN_NEG, 'VIN_NEG', 'TERM_POWER'],
      [pcb.cavity.CHASSIS_GROUND, panel.cavity.CHASSIS_GROUND, 'CHASSIS_GROUND', 'TERM_GROUND'],
    ] as const) {
      for (const target of [left, right]) {
        populate(target, {
          kind: 'terminalPopulated',
          terminalPartId: catalogPartId(terminal),
          sealPartId: catalogPartId('SEAL_POWER'),
          signalRole: signalRoleId(role),
        });
      }
    }

    const endpoint = (target: typeof pcb.cavity.VIN_POS) => ({
      target,
      terminalPartId: catalogPartId('TERM_POWER'),
      sealPartId: catalogPartId('SEAL_POWER'),
    });

    circuit.pointToPoint({
      id: 'CIRCUIT_VIN_POS',
      signalRole: 'VIN_POS',
      conductor: {
        id: 'WIRE_VIN_POS',
        from: endpoint(pcb.cavity.VIN_POS),
        to: endpoint(panel.cavity.VIN_POS),
        wireTypeId: wireTypeId('WIRE_POWER_1MM2'),
        color: 'RD',
        slackMm: 20,
      },
    });

    circuit.pointToPoint({
      id: 'CIRCUIT_VIN_NEG',
      signalRole: 'VIN_NEG',
      conductor: {
        id: 'WIRE_VIN_NEG',
        from: endpoint(pcb.cavity.VIN_NEG),
        to: endpoint(panel.cavity.VIN_NEG),
        wireTypeId: wireTypeId('WIRE_POWER_1MM2'),
        color: 'BK',
        slackMm: 20,
      },
    });

    const ground = splice('GROUND_SPLICE', { ports: ['pcb', 'panel', 'stud'] as const });
    circuit.spliceTree({
      id: 'CIRCUIT_GROUND',
      signalRole: 'CHASSIS_GROUND',
      splices: [ground],
      conductors: [
        {
          id: 'GROUND_PCB',
          from: { ...endpoint(pcb.cavity.CHASSIS_GROUND), terminalPartId: catalogPartId('TERM_GROUND') },
          to: { target: ground.port.pcb },
          wireTypeId: wireTypeId('WIRE_POWER_1MM2'), color: 'GN', slackMm: 15,
        },
        {
          id: 'GROUND_PANEL',
          from: { ...endpoint(panel.cavity.CHASSIS_GROUND), terminalPartId: catalogPartId('TERM_GROUND') },
          to: { target: ground.port.panel },
          wireTypeId: wireTypeId('WIRE_POWER_1MM2'), color: 'GN', slackMm: 15,
        },
        {
          id: 'GROUND_STUD',
          from: { target: ground.port.stud },
          to: { target: stud('CHASSIS_STUD'), ringTerminalPartId: catalogPartId('RING_M4') },
          wireTypeId: wireTypeId('WIRE_POWER_1MM2'), color: 'GN', slackMm: 15,
        },
      ],
    });
  },
);
```

Compile-time proofs are retained in `fixtures/controller-chassis/typed-authoring.negative.ts` using `@ts-expect-error`:

```ts
power.cavity.VIN_POS;       // valid
power.cavity.VIN_POZ;       // compile error: nonexistent cavity
motor.cavity.VIN_POS;       // compile error: wrong family cavity

const bad: WireTypeId = conductorId('WIRE'); // compile error: wrong ID category
```

The production build runs these negative assertions through `tsc`; an unused `@ts-expect-error` would fail the build.

## Generated declarations and catalog authority

`generateConnectorDeclarations(snapshot)` sorts families and cavities and emits byte-stable TypeScript with no timestamp. The checked-in file is compared byte-for-byte against regenerated output in tests.

The demo declaration header records:

```text
Catalog snapshot: controller-chassis-demo-v1
Catalog hash: fnv1a32:0593e61e
```

`HarnessIr` carries the same snapshot identity/hash. Validation recomputes the hash and reports `catalog.hash.stale` if declarations/source are paired with modified catalog data.

## v0.1 migration

The old implementation remains available. `src/compat/v01` exposes:

```text
parseV01
validateV01
serializeV01
migrateV01
```

Example migration of the existing `Tominal Demo`:

```text
v0.1 input
  2 connectors, 6 pins, 3 paired wires
  1 physical branch, 1 thin splice, 3 segments

migration output
  2 connector occurrences and generated legacy family definitions
  3 point-to-point circuits, conductors, and 6 terminations
  3 route identities and 3 route segments
  authored nominal lengths -> explicit legacy-v0.1 overrides
  connector/branch/splice positions -> provisional placement proposals

diagnostics
  migration.splice.connectivityUnknown for S1
```

The migration uses existing physical wires as evidence for point-to-point circuits. It does not use equal signal names to invent extra conductors. If an equal signal appears at more than two endpoints, migration emits `migration.signal.ambiguous` and omits that inferred circuit. Legacy splice identity and part number survive, but electrical ports/connectivity are not invented.

## Fixture inventory

The canonical `Small Control Chassis` fixture is fictional, illustrative, and geometry-free.

| Item | Count |
|---|---:|
| Connector families | 4 |
| Connector occurrences | 8 |
| Defined family cavities | 12 |
| Occurrence cavity populations | 24 |
| Circuits | 11 (10 point-to-point, 1 splice tree) |
| Conductors | 13 |
| Terminations | 26 |
| Electrical splices | 1 with 3 ports |
| Physical route junctions | 1, with no electrical meaning |
| Route placeholders | 3 |
| Route segments / geometry | 0 (deferred to FORMBOARD-X1) |
| Unique catalog definitions | 14 (including families and stud) |
| Validation errors | 0 |

The fixture uses 1.0 mm² power/ground conductors and 0.22 mm² signal conductors. It includes DC power, motor power/enable, encoder A/B, temperature, service TX/RX, and a chassis-ground splice tree to an M4 stud.

## Validation evidence

Implemented evidence includes:

- all original 35 tests retained;
- 10 v0.1 characterization tests covering full round-trip, exact envelope validation, invalid references, mutation/deletion laws, BFS/pair-only behavior, length calculation, graph IDs, and catalog determinism;
- vNext creation, distinction, gauge, projection/adapter, deterministic serialization/generation, destructive-edit planning, and runtime untrusted-data tests;
- invalid runtime cases for illegal/duplicate cavity, wrong terminal, incompatible gauge, missing end, invalid splice port, duplicate ID, unresolved binding, and negative slack;
- migration tests for safe preservation and ambiguous multi-endpoint signals;
- compile-time negative fixture for cavity and ID typing;
- byte-for-byte generated declaration comparison;
- clean fixture diagnostic assertion.

Final commands and results are recorded in the closing section after the fresh-agent exercise.

## Boundaries deliberately deferred

- The existing UI still edits v0.1. CORE-X1 provides the vNext projection and adapter, not a mixed temporary editor.
- Route placeholders contain no geometry and no authoritative length.
- No cut-list, BOM, quote, supplier, formboard, Machina, 3D, or Aetheris runtime implementation was added.
- The topology union is deliberately limited to point-to-point and splice tree. Multi-drop will be added only with a concrete authored/validation contract.
- Demo catalog data is not a TE/Molex/manufacturer library.

## Future handoff

`FormboardInput` supplies connector/splice/junction identities, routes, segments, and conductor references without choosing a renderer. `FutureArtifactInput` contains the semantic/catalog data required by later cut-list and BOM work. `AetherisHarnessInputV1` records only shared stable identities; it adds no Aetheris dependency.

Final length doctrine remains:

```text
formboard geometry -> route length -> conductor slack/allowance -> cut length
```

Legacy nominal values are explicit provisional overrides, not permanent authority.

## Fresh-agent result and final validation

The requested fresh-agent exercise was run twice with implementation internals
excluded. On the first pass, the agent understood the domain and finite cavity
API but could not derive exact `defineHarness`, population, circuit, or PCB-side
endpoint shapes from the public guide without guessing. That was a genuine
documentation defect, not an agent failure.

The guide was corrected in place to document the complete builder signatures,
population and endpoint variants, PCB/enclosure modeling law, stable diagnostic
rules, numeric length-literal behavior, and the fixture typecheck command. On the
second pass, the same agent used only the public barrels, guide, generated
declarations, catalog, and canonical fixture. It produced an exact compiling
authoring outline, correctly treated PCB-side endpoints as ordinary connector
occurrences, demonstrated the finite-property failure for `VIN_POZ`, and
identified `termination.gauge.incompatible` for a 1.0 mm² wire on a
0.13-0.35 mm² signal terminal. Its verdict was that the public surfaces are now
sufficient without implementation inspection or API guessing.

Final repository validation:

```text
npm test -- --reporter=dot
  11 test files passed
  65 tests passed

npm run build
  TypeScript project build passed
  Vite production build passed (1,852 modules)
```

The build retains two pre-existing maintenance warnings: stale Browserslist
data and a roughly 534 kB minified application chunk. Neither affects CORE-X1
correctness. The canonical fixture validates with zero error diagnostics, its
generated connector declaration matches byte-for-byte, and repeated vNext
serialization is byte-stable.
