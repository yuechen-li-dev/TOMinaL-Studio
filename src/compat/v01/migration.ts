import { withCatalogHash } from '@/harness-core/catalogHash';
import type { Diagnostic } from '@/harness-core/diagnostics';
import {
  catalogPartId,
  cavityId,
  circuitId,
  conductorId,
  connectorFamilyId,
  connectorOccurrenceId,
  electricalSpliceId,
  harnessId,
  mm,
  mm2,
  routeId,
  routeJunctionId,
  routeSegmentId,
  signalRoleId,
  terminationId,
  wireTypeId
} from '@/harness-core/ids';
import type { HarnessDocument } from '@/core/harnessModel';
import type {
  ConnectorFamilyDefinition,
  HarnessIr,
  LegacyPlacementProposal,
  RouteEndpoint,
  WireTypeDefinition
} from '@/harness-core/model';

export type MigrationResult = {
  readonly ir: HarnessIr;
  readonly diagnostics: readonly Diagnostic[];
};

function safeId(value: string): string {
  return value.replace(/[^A-Za-z0-9_.-]+/g, '_');
}

function routeEndpoint(document: HarnessDocument, nodeId: string): RouteEndpoint {
  if (document.connectors[nodeId]) return { kind: 'connector', id: connectorOccurrenceId(nodeId) };
  if (document.splices[nodeId]) return { kind: 'splice', id: electricalSpliceId(nodeId) };
  return { kind: 'junction', id: routeJunctionId(nodeId) };
}

function legacyWireType(wireTypeKey: string, gauge: string | undefined, material: string | undefined): WireTypeDefinition {
  const metric = gauge ? /^\s*(\d+(?:\.\d+)?)\s*mm²\s*$/i.exec(gauge) : null;
  const awgMatch = gauge ? /^\s*(\d+)\s*AWG\s*$/i.exec(gauge) : null;
  const parsedGauge = metric
    ? ({ kind: 'crossSection' as const, areaMm2: mm2(Number(metric[1])) })
    : awgMatch
      ? ({ kind: 'awg' as const, value: Number(awgMatch[1]) })
      : ({ kind: 'crossSection' as const, areaMm2: mm2(0.5) });
  return {
    id: wireTypeId(wireTypeKey),
    manufacturer: 'Legacy import',
    partNumber: wireTypeKey,
    gauge: parsedGauge,
    insulation: material ?? 'unspecified'
  };
}

export function migrateV01(document: HarnessDocument): MigrationResult {
  const diagnostics: Diagnostic[] = [];
  const connectorFamilies: ConnectorFamilyDefinition[] = [];
  const terminalIds = new Set<string>();
  const wireTypes = new Map<string, WireTypeDefinition>();

  for (const connector of Object.values(document.connectors).sort((left, right) => left.id.localeCompare(right.id))) {
    const familyKey = `legacy.${safeId(connector.housingId ?? connector.id)}`;
    if (!connectorFamilies.some((family) => family.id === familyKey)) {
      connectorFamilies.push({
        id: connectorFamilyId(familyKey),
        name: `Legacy ${connector.housingId ?? connector.id}`,
        housingPartId: connector.housingId ? catalogPartId(connector.housingId) : undefined,
        cavities: Object.entries(connector.pins)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([pinId, pin]) => {
            if (pin.terminalPartNumber) terminalIds.add(pin.terminalPartNumber);
            return {
              id: cavityId(`${familyKey}.${pinId}`),
              label: pin.cavityLabel ?? pinId,
              allowedTerminalIds: pin.terminalPartNumber ? [catalogPartId(pin.terminalPartNumber)] : []
            };
          })
      });
    }
  }

  for (const wire of Object.values(document.wires)) {
    const key = wire.wireTypeId ?? `legacy-wire-${safeId(wire.gauge ?? wire.material ?? 'unknown')}`;
    if (!wireTypes.has(key)) wireTypes.set(key, legacyWireType(key, wire.gauge, wire.material));
  }

  const catalog = withCatalogHash({
    snapshotId: `legacy-v0.1:${safeId(document.name)}`,
    connectorFamilies,
    terminals: [...terminalIds]
      .sort()
      .map((partNumber) => ({
        id: catalogPartId(partNumber),
        manufacturer: 'Legacy import',
        partNumber,
        compatibleGauge: { minAreaMm2: mm2(0.01), maxAreaMm2: mm2(100) }
      })),
    seals: [],
    plugs: [],
    ringTerminals: [],
    wireTypes: [...wireTypes.values()].sort((left, right) => left.id.localeCompare(right.id))
  });

  const connectorOccurrences = Object.values(document.connectors)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((connector) => {
      const familyKey = `legacy.${safeId(connector.housingId ?? connector.id)}`;
      return {
        id: connectorOccurrenceId(connector.id),
        familyId: connectorFamilyId(familyKey),
        role: connector.description ?? connector.id,
        cavityPopulations: Object.entries(connector.pins)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([pinId, pin]) => ({
            cavityId: cavityId(`${familyKey}.${pinId}`),
            population: pin.terminalPartNumber
              ? ({
                  kind: 'terminalPopulated' as const,
                  terminalPartId: catalogPartId(pin.terminalPartNumber),
                  signalRole: pin.signal ? signalRoleId(pin.signal) : undefined
                } as const)
              : ({ kind: 'unpopulated' as const, reason: 'reserved' as const } as const)
          }))
      };
    });

  const electricalSplices = Object.values(document.splices)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((splice) => {
      diagnostics.push({
        id: `migration.splice.connectivityUnknown:${splice.id}`,
        severity: 'warning' as const,
        rule: 'migration.splice.connectivityUnknown',
        entity: { kind: 'migration' as const, id: splice.id },
        message: `Legacy splice ${splice.id} was preserved without inventing electrical ports or connectivity.`
      });
      return {
        id: electricalSpliceId(splice.id),
        ports: [],
        splicePartId: splice.partNumber ? catalogPartId(splice.partNumber) : undefined,
        notes: 'Migrated legacy splice; electrical connectivity requires explicit vNext authoring.'
      };
    });

  const signalEndpoints = new Map<string, number>();
  for (const connector of Object.values(document.connectors)) {
    for (const pin of Object.values(connector.pins)) {
      if (pin.signal) signalEndpoints.set(pin.signal, (signalEndpoints.get(pin.signal) ?? 0) + 1);
    }
  }
  for (const [signal, count] of [...signalEndpoints.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    if (count > 2) {
      diagnostics.push({
        id: `migration.signal.ambiguous:${signal}`,
        severity: 'warning',
        rule: 'migration.signal.ambiguous',
        entity: { kind: 'migration', id: signal },
        message: `Signal ${signal} has ${count} endpoints; no multi-drop topology was invented.`
      });
    }
  }

  const circuits = [] as HarnessIr['circuits'][number][];
  const conductors = [] as HarnessIr['conductors'][number][];
  const terminations = [] as HarnessIr['terminations'][number][];
  for (const wire of Object.values(document.wires).sort((left, right) => left.id.localeCompare(right.id))) {
    const fromConnector = document.connectors[wire.from.connectorId];
    const toConnector = document.connectors[wire.to.connectorId];
    const fromPin = fromConnector.pins[wire.from.pinId];
    const toPin = toConnector.pins[wire.to.pinId];
    const familyA = `legacy.${safeId(fromConnector.housingId ?? fromConnector.id)}`;
    const familyB = `legacy.${safeId(toConnector.housingId ?? toConnector.id)}`;
    const signal = fromPin.signal && fromPin.signal === toPin.signal ? fromPin.signal : wire.id;
    const endpointCount = signalEndpoints.get(signal) ?? 0;
    if (endpointCount > 2) continue;

    const circuit = circuitId(`CIRCUIT.${wire.id}`);
    const conductor = conductorId(wire.id);
    const a = terminationId(`${wire.id}:A`);
    const b = terminationId(`${wire.id}:B`);
    const route = wire.route.length > 0 ? routeId(`ROUTE.${wire.id}`) : undefined;
    const wireTypeKey = wire.wireTypeId ?? `legacy-wire-${safeId(wire.gauge ?? wire.material ?? 'unknown')}`;
    circuits.push({ id: circuit, signalRole: signalRoleId(signal), topology: { kind: 'pointToPoint', conductorIds: [conductor] } });
    conductors.push({
      id: conductor,
      circuitId: circuit,
      terminationAId: a,
      terminationBId: b,
      wireTypeId: wireTypeId(wireTypeKey),
      color: wire.color ?? 'unspecified',
      slackMm: mm(wire.slackMm ?? 0),
      routeId: route,
      notes: wire.notes
    });
    terminations.push(
      {
        id: a,
        target: {
          kind: 'connectorCavity',
          occurrenceId: connectorOccurrenceId(wire.from.connectorId),
          familyId: connectorFamilyId(familyA),
          cavityId: cavityId(`${familyA}.${wire.from.pinId}`)
        },
        terminalPartId: fromPin.terminalPartNumber ? catalogPartId(fromPin.terminalPartNumber) : undefined
      },
      {
        id: b,
        target: {
          kind: 'connectorCavity',
          occurrenceId: connectorOccurrenceId(wire.to.connectorId),
          familyId: connectorFamilyId(familyB),
          cavityId: cavityId(`${familyB}.${wire.to.pinId}`)
        },
        terminalPartId: toPin.terminalPartNumber ? catalogPartId(toPin.terminalPartNumber) : undefined
      }
    );
  }

  const routeSegments = Object.values(document.segments)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((segment) => ({
      id: routeSegmentId(segment.id),
      from: routeEndpoint(document, segment.from),
      to: routeEndpoint(document, segment.to),
      lengthOverride:
        segment.nominalLengthMm === undefined
          ? undefined
          : {
              valueMm: mm(segment.nominalLengthMm),
              provenance: 'legacy-v0.1-nominal' as const,
              reason: 'Preserved legacy authored nominal length until formboard geometry is available.'
            }
    }));
  const routes = Object.values(document.wires)
    .filter((wire) => wire.route.length > 0 && (signalEndpoints.get(document.connectors[wire.from.connectorId].pins[wire.from.pinId].signal ?? wire.id) ?? 0) <= 2)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((wire) => ({ id: routeId(`ROUTE.${wire.id}`), segmentIds: wire.route.map(routeSegmentId) }));

  const placements: LegacyPlacementProposal[] = [
    ...Object.values(document.connectors).map((connector) => ({
      entityKind: 'connector' as const,
      entityId: connector.id,
      positionMm: [mm(connector.position[0]), mm(connector.position[1])] as const,
      provenance: 'legacy-v0.1-position' as const
    })),
    ...Object.values(document.splices).map((splice) => ({
      entityKind: 'splice' as const,
      entityId: splice.id,
      positionMm: [mm(splice.position[0]), mm(splice.position[1])] as const,
      provenance: 'legacy-v0.1-position' as const
    })),
    ...Object.values(document.branches).map((branch) => ({
      entityKind: 'routeJunction' as const,
      entityId: branch.id,
      positionMm: [mm(branch.position[0]), mm(branch.position[1])] as const,
      provenance: 'legacy-v0.1-position' as const
    }))
  ];

  return {
    ir: {
      schemaVersion: '1.0',
      id: harnessId(`legacy.${safeId(document.name)}`),
      metadata: { name: document.name },
      catalog,
      connectorOccurrences,
      circuits,
      conductors,
      terminations,
      electricalSplices,
      routeJunctions: Object.values(document.branches).map((branch) => ({
        id: routeJunctionId(branch.id),
        role: branch.kind,
        notes: 'Migrated physical route junction; no electrical connectivity implied.'
      })),
      routes,
      routeSegments,
      legacyPlacementProposals: placements,
      provenance: { sourceKind: 'v0.1-migration', sourceId: document.name }
    },
    diagnostics
  };
}
