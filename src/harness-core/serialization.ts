import { z } from 'zod';

import type { HarnessIr } from '@/harness-core/model';

const id = z.string().trim().min(1);
const finite = z.number().finite();
const gauge = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('awg'), value: z.number().int().min(0).max(60) }),
  z.object({ kind: z.literal('crossSection'), areaMm2: finite.positive() })
]);
const allowance = z.object({ minAreaMm2: finite.positive(), maxAreaMm2: finite.positive() });
const target = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('connectorCavity'), occurrenceId: id, familyId: id, cavityId: id }),
  z.object({ kind: z.literal('electricalSplicePort'), spliceId: id, portId: id }),
  z.object({ kind: z.literal('stud'), studId: id }),
  z.object({ kind: z.literal('serviceEnd'), id, deliberate: z.literal(true) })
]);
const routeEndpoint = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('connector'), id }),
  z.object({ kind: z.literal('splice'), id }),
  z.object({ kind: z.literal('junction'), id }),
  z.object({ kind: z.literal('stud'), id })
]);
const population = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('unpopulated'), reason: z.enum(['unused', 'reserved']).optional() }),
  z.object({ kind: z.literal('plugged'), plugPartId: id }),
  z.object({
    kind: z.literal('terminalPopulated'),
    terminalPartId: id,
    sealPartId: id.optional(),
    signalRole: id.optional()
  })
]);

export const harnessCatalogSnapshotSchema = z.object({
    snapshotId: id,
    snapshotHash: id,
    connectorFamilies: z.array(
      z.object({
        id,
        name: id,
        manufacturer: z.string().optional(),
        housingPartId: id.optional(),
        housingPartNumber: id.optional(),
        cavities: z.array(
          z.object({
            id,
            label: id,
            required: z.boolean().optional(),
            requiredRole: id.optional(),
            allowedTerminalIds: z.array(id),
            allowedSealIds: z.array(id).optional(),
            allowedPlugIds: z.array(id).optional()
          })
        )
      })
    ),
    terminals: z.array(
      z.object({
        id,
        manufacturer: id,
        partNumber: id,
        compatibleGauge: allowance,
        allowedSealIds: z.array(id).optional()
      })
    ),
    seals: z.array(z.object({ id, manufacturer: id, partNumber: id })),
    plugs: z.array(z.object({ id, manufacturer: id, partNumber: id })),
    ringTerminals: z.array(
      z.object({
        id,
        manufacturer: id,
        partNumber: id,
        compatibleGauge: allowance,
        compatibleStudSizes: z.array(id)
      })
    ),
    wireTypes: z.array(
      z.object({
        id,
        manufacturer: id,
        partNumber: id,
        gauge,
        insulation: id,
        allowedColors: z.array(id).optional()
      })
    ),
    studs: z.array(z.object({ id, label: id, size: id })).optional()
});

export const harnessIrSchema = z.object({
  schemaVersion: z.literal('1.0'),
  id,
  metadata: z.object({ name: id, description: z.string().optional() }),
  catalog: harnessCatalogSnapshotSchema,
  connectorOccurrences: z.array(
    z.object({
      id,
      familyId: id,
      role: id,
      cavityPopulations: z.array(z.object({ cavityId: id, population })),
      notes: z.string().optional()
    })
  ),
  circuits: z.array(
    z.object({
      id,
      signalRole: id,
      topology: z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('pointToPoint'), conductorIds: z.array(id) }),
        z.object({ kind: z.literal('spliceTree'), spliceIds: z.array(id), conductorIds: z.array(id) })
      ]),
      notes: z.string().optional()
    })
  ),
  conductors: z.array(
    z.object({
      id,
      circuitId: id,
      terminationAId: id.optional(),
      terminationBId: id.optional(),
      wireTypeId: id,
      color: id,
      slackMm: finite,
      routeId: id.optional(),
      notes: z.string().optional()
    })
  ),
  terminations: z.array(
    z.object({
      id,
      target,
      terminalPartId: id.optional(),
      sealPartId: id.optional(),
      ringTerminalPartId: id.optional(),
      processRef: id.optional(),
      stripLengthMm: finite.nonnegative().optional(),
      terminationAllowanceMm: finite.nonnegative().optional()
    })
  ),
  electricalSplices: z.array(
    z.object({ id, ports: z.array(id), splicePartId: id.optional(), processRef: id.optional(), notes: z.string().optional() })
  ),
  routeJunctions: z.array(z.object({ id, role: z.string().optional(), notes: z.string().optional() })),
  routes: z.array(z.object({ id, segmentIds: z.array(id) })),
  routeSegments: z.array(
    z.object({
      id,
      from: routeEndpoint,
      to: routeEndpoint,
      lengthOverride: z
        .object({ valueMm: finite.nonnegative(), provenance: z.literal('legacy-v0.1-nominal'), reason: id })
        .optional()
    })
  ),
  legacyPlacementProposals: z
    .array(
      z.object({
        entityKind: z.enum(['connector', 'splice', 'routeJunction']),
        entityId: id,
        positionMm: z.tuple([finite, finite]),
        provenance: z.literal('legacy-v0.1-position')
      })
    )
    .optional(),
  provenance: z
    .object({ sourceKind: z.enum(['typed-authoring', 'v0.1-migration']), sourceId: z.string().optional() })
    .optional()
});

const byId = <T extends { readonly id: string }>(values: readonly T[]): T[] =>
  [...values].sort((left, right) => left.id.localeCompare(right.id));

function orderedIr(ir: HarnessIr): HarnessIr {
  return {
    ...ir,
    catalog: {
      ...ir.catalog,
      connectorFamilies: byId(ir.catalog.connectorFamilies).map((family) => ({
        ...family,
        cavities: byId(family.cavities)
      })),
      terminals: byId(ir.catalog.terminals),
      seals: byId(ir.catalog.seals),
      plugs: byId(ir.catalog.plugs),
      ringTerminals: byId(ir.catalog.ringTerminals),
      wireTypes: byId(ir.catalog.wireTypes),
      studs: ir.catalog.studs ? byId(ir.catalog.studs) : undefined
    },
    connectorOccurrences: byId(ir.connectorOccurrences).map((occurrence) => ({
      ...occurrence,
      cavityPopulations: [...occurrence.cavityPopulations].sort((left, right) =>
        left.cavityId.localeCompare(right.cavityId)
      )
    })),
    circuits: byId(ir.circuits),
    conductors: byId(ir.conductors),
    terminations: byId(ir.terminations),
    electricalSplices: byId(ir.electricalSplices).map((splice) => ({ ...splice, ports: [...splice.ports].sort() })),
    routeJunctions: byId(ir.routeJunctions),
    routes: byId(ir.routes),
    routeSegments: byId(ir.routeSegments),
    legacyPlacementProposals: ir.legacyPlacementProposals
      ? [...ir.legacyPlacementProposals].sort((left, right) =>
          `${left.entityKind}:${left.entityId}`.localeCompare(`${right.entityKind}:${right.entityId}`)
        )
      : undefined
  };
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObjectKeys);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortObjectKeys(child)])
    );
  }
  return value;
}

export function serializeHarnessIr(ir: HarnessIr): string {
  return `${JSON.stringify(sortObjectKeys(orderedIr(ir)), null, 2)}\n`;
}

export function parseHarnessIr(text: string): HarnessIr {
  const candidate: unknown = JSON.parse(text);
  return harnessIrSchema.parse(candidate) as unknown as HarnessIr;
}
