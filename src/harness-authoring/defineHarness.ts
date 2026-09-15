import type { AuthoredCavity, TypedConnectorFamily } from '@/harness-authoring/connectorFamily';
import {
  cavityId,
  circuitId,
  conductorId,
  connectorOccurrenceId,
  electricalSpliceId,
  harnessId,
  mm,
  routeId,
  routeJunctionId,
  signalRoleId,
  splicePortId,
  studId,
  terminationId,
  type CatalogPartId,
  type CavityId,
  type CircuitId,
  type ConnectorOccurrenceId,
  type RouteId,
  type SignalRoleId,
  type WireTypeId
} from '@/harness-core/ids';
import type {
  CavityPopulation,
  Circuit,
  Conductor,
  ConnectorCavityTarget,
  ConnectorOccurrence,
  ElectricalSplice,
  ElectricalSplicePortTarget,
  HarnessCatalogSnapshot,
  HarnessIr,
  Route,
  RouteJunction,
  StudTarget,
  Termination,
  TerminationTarget
} from '@/harness-core/model';

type CavityTargets<
  TFamilyId extends string,
  TCavities extends Readonly<Record<string, AuthoredCavity>>
> = {
  readonly [TKey in keyof TCavities]: ConnectorCavityTarget & {
    readonly cavityId: CavityId<TFamilyId>;
  };
};

export type ConnectorHandle<
  TFamilyId extends string,
  TCavities extends Readonly<Record<string, AuthoredCavity>>
> = {
  readonly id: ConnectorOccurrenceId;
  readonly family: TypedConnectorFamily<TFamilyId, TCavities>;
  readonly cavity: CavityTargets<TFamilyId, TCavities>;
};

export type SpliceHandle<TPorts extends readonly string[]> = {
  readonly id: ReturnType<typeof electricalSpliceId>;
  readonly port: { readonly [TKey in TPorts[number]]: ElectricalSplicePortTarget };
};

export type EndpointManufacturing = {
  readonly terminalPartId?: CatalogPartId;
  readonly sealPartId?: CatalogPartId;
  readonly ringTerminalPartId?: CatalogPartId;
  readonly processRef?: CatalogPartId;
  readonly stripLengthMm?: number;
};

export type AuthoredEndpoint = EndpointManufacturing & {
  readonly target: TerminationTarget;
};

export type AuthoredConductor = {
  readonly id: string;
  readonly from: AuthoredEndpoint;
  readonly to: AuthoredEndpoint;
  readonly wireTypeId: WireTypeId;
  readonly color: string;
  readonly slackMm: number;
  readonly routeId?: RouteId;
  readonly notes?: string;
};

export type HarnessAuthoringApi = {
  connector<const TFamilyId extends string, const TCavities extends Readonly<Record<string, AuthoredCavity>>>(
    id: string,
    family: TypedConnectorFamily<TFamilyId, TCavities>,
    options: { readonly role: string; readonly notes?: string }
  ): ConnectorHandle<TFamilyId, TCavities>;
  populate(target: ConnectorCavityTarget, population: CavityPopulation): void;
  splice<const TPorts extends readonly string[]>(
    id: string,
    options: { readonly ports: TPorts; readonly splicePartId?: CatalogPartId; readonly processRef?: CatalogPartId }
  ): SpliceHandle<TPorts>;
  routeJunction(id: string, options?: { readonly role?: string; readonly notes?: string }): RouteJunction;
  route(id: string): RouteId;
  stud(id: string): StudTarget;
  circuit: {
    pointToPoint(options: {
      readonly id: string;
      readonly signalRole: string | SignalRoleId;
      readonly conductor: AuthoredConductor;
      readonly notes?: string;
    }): CircuitId;
    spliceTree(options: {
      readonly id: string;
      readonly signalRole: string | SignalRoleId;
      readonly splices: readonly { readonly id: ReturnType<typeof electricalSpliceId> }[];
      readonly conductors: readonly AuthoredConductor[];
      readonly notes?: string;
    }): CircuitId;
  };
};

type MutableOccurrence = {
  id: ConnectorOccurrence['id'];
  familyId: ConnectorOccurrence['familyId'];
  role: string;
  cavityPopulations: Array<ConnectorOccurrence['cavityPopulations'][number]>;
  notes?: string;
};

const byId = <T extends { readonly id: string }>(values: readonly T[]): T[] =>
  [...values].sort((left, right) => left.id.localeCompare(right.id));

function makeTermination(conductorKey: string, end: 'A' | 'B', authored: AuthoredEndpoint): Termination {
  return {
    id: terminationId(`${conductorKey}:${end}`),
    target: authored.target,
    terminalPartId: authored.terminalPartId,
    sealPartId: authored.sealPartId,
    ringTerminalPartId: authored.ringTerminalPartId,
    processRef: authored.processRef,
    stripLengthMm: authored.stripLengthMm === undefined ? undefined : mm(authored.stripLengthMm)
  };
}

export function defineHarness(
  key: string,
  options: { readonly name: string; readonly description?: string; readonly catalog: HarnessCatalogSnapshot },
  author: (api: HarnessAuthoringApi) => void
): HarnessIr {
  const connectorOccurrences: MutableOccurrence[] = [];
  const circuits: Circuit[] = [];
  const conductors: Conductor[] = [];
  const terminations: Termination[] = [];
  const electricalSplices: ElectricalSplice[] = [];
  const routeJunctions: RouteJunction[] = [];
  const routes: Route[] = [];

  const addConductor = (authored: AuthoredConductor, owner: CircuitId) => {
    const a = makeTermination(authored.id, 'A', authored.from);
    const b = makeTermination(authored.id, 'B', authored.to);
    terminations.push(a, b);
    conductors.push({
      id: conductorId(authored.id),
      circuitId: owner,
      terminationAId: a.id,
      terminationBId: b.id,
      wireTypeId: authored.wireTypeId,
      color: authored.color,
      slackMm: mm(authored.slackMm),
      routeId: authored.routeId,
      notes: authored.notes
    });
    return conductorId(authored.id);
  };

  const api: HarnessAuthoringApi = {
    connector(idValue, family, connectorOptions) {
      const occurrenceId = connectorOccurrenceId(idValue);
      const occurrence: MutableOccurrence = {
        id: occurrenceId,
        familyId: family.definition.id,
        role: connectorOptions.role,
        cavityPopulations: [],
        notes: connectorOptions.notes
      };
      connectorOccurrences.push(occurrence);
      const cavity = Object.fromEntries(
        Object.keys(family.cavitySource).map((cavityKey) => [
          cavityKey,
          {
            kind: 'connectorCavity' as const,
            occurrenceId,
            familyId: family.definition.id,
            cavityId: cavityId<typeof family.familyKey>(`${family.familyKey}.${cavityKey}`)
          }
        ])
      ) as CavityTargets<typeof family.familyKey, typeof family.cavitySource>;
      return { id: occurrenceId, family, cavity };
    },
    populate(target, population) {
      const occurrence = connectorOccurrences.find((candidate) => candidate.id === target.occurrenceId);
      if (!occurrence) throw new Error(`Cannot populate unknown connector ${target.occurrenceId}.`);
      occurrence.cavityPopulations.push({ cavityId: target.cavityId, population });
    },
    splice(idValue, spliceOptions) {
      const id = electricalSpliceId(idValue);
      const ports = spliceOptions.ports.map((value) => splicePortId(value));
      electricalSplices.push({
        id,
        ports,
        splicePartId: spliceOptions.splicePartId,
        processRef: spliceOptions.processRef
      });
      const port = Object.fromEntries(
        spliceOptions.ports.map((value) => [
          value,
          { kind: 'electricalSplicePort' as const, spliceId: id, portId: splicePortId(value) }
        ])
      ) as SpliceHandle<typeof spliceOptions.ports>['port'];
      return { id, port };
    },
    routeJunction(idValue, junctionOptions = {}) {
      const junction: RouteJunction = { id: routeJunctionId(idValue), ...junctionOptions };
      routeJunctions.push(junction);
      return junction;
    },
    route(idValue) {
      const id = routeId(idValue);
      routes.push({ id, segmentIds: [] });
      return id;
    },
    stud(idValue) {
      return { kind: 'stud', studId: studId(idValue) };
    },
    circuit: {
      pointToPoint(circuitOptions) {
        const id = circuitId(circuitOptions.id);
        const conductor = addConductor(circuitOptions.conductor, id);
        circuits.push({
          id,
          signalRole:
            typeof circuitOptions.signalRole === 'string'
              ? signalRoleId(circuitOptions.signalRole)
              : circuitOptions.signalRole,
          topology: { kind: 'pointToPoint', conductorIds: [conductor] },
          notes: circuitOptions.notes
        });
        return id;
      },
      spliceTree(circuitOptions) {
        const id = circuitId(circuitOptions.id);
        const conductorIds = circuitOptions.conductors.map((conductor) => addConductor(conductor, id));
        circuits.push({
          id,
          signalRole:
            typeof circuitOptions.signalRole === 'string'
              ? signalRoleId(circuitOptions.signalRole)
              : circuitOptions.signalRole,
          topology: {
            kind: 'spliceTree',
            spliceIds: circuitOptions.splices.map((splice) => splice.id),
            conductorIds
          },
          notes: circuitOptions.notes
        });
        return id;
      }
    }
  };

  author(api);

  return {
    schemaVersion: '1.0',
    id: harnessId(key),
    metadata: { name: options.name, description: options.description },
    catalog: options.catalog,
    connectorOccurrences: byId(connectorOccurrences).map((occurrence) => ({
      ...occurrence,
      cavityPopulations: [...occurrence.cavityPopulations].sort((left, right) =>
        left.cavityId.localeCompare(right.cavityId)
      )
    })),
    circuits: byId(circuits),
    conductors: byId(conductors),
    terminations: byId(terminations),
    electricalSplices: byId(electricalSplices),
    routeJunctions: byId(routeJunctions),
    routes: byId(routes),
    routeSegments: [],
    provenance: { sourceKind: 'typed-authoring', sourceId: key }
  };
}
