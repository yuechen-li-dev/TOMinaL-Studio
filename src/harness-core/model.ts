import type {
  CatalogPartId,
  CavityId,
  CircuitId,
  ConductorId,
  ConnectorFamilyId,
  ConnectorOccurrenceId,
  ElectricalSpliceId,
  HarnessId,
  Millimeters,
  RouteId,
  RouteJunctionId,
  RouteSegmentId,
  SignalRoleId,
  SplicePortId,
  SquareMillimeters,
  StudId,
  TerminationId,
  WireTypeId
} from '@/harness-core/ids';

export type Gauge =
  | { readonly kind: 'awg'; readonly value: number }
  | { readonly kind: 'crossSection'; readonly areaMm2: SquareMillimeters };

export type GaugeAllowance = {
  readonly minAreaMm2: SquareMillimeters;
  readonly maxAreaMm2: SquareMillimeters;
};

export type TerminalDefinition = {
  readonly id: CatalogPartId;
  readonly manufacturer: string;
  readonly partNumber: string;
  readonly compatibleGauge: GaugeAllowance;
  readonly allowedSealIds?: readonly CatalogPartId[];
};

export type SealDefinition = {
  readonly id: CatalogPartId;
  readonly manufacturer: string;
  readonly partNumber: string;
};

export type PlugDefinition = {
  readonly id: CatalogPartId;
  readonly manufacturer: string;
  readonly partNumber: string;
};

export type RingTerminalDefinition = {
  readonly id: CatalogPartId;
  readonly manufacturer: string;
  readonly partNumber: string;
  readonly compatibleGauge: GaugeAllowance;
  readonly compatibleStudSizes: readonly string[];
};

export type WireTypeDefinition = {
  readonly id: WireTypeId;
  readonly manufacturer: string;
  readonly partNumber: string;
  readonly gauge: Gauge;
  readonly insulation: string;
  readonly allowedColors?: readonly string[];
};

export type StudDefinition = {
  readonly id: StudId;
  readonly label: string;
  readonly size: string;
};

export type CavityDefinition = {
  readonly id: CavityId;
  readonly label: string;
  readonly required?: boolean;
  readonly requiredRole?: SignalRoleId;
  readonly allowedTerminalIds: readonly CatalogPartId[];
  readonly allowedSealIds?: readonly CatalogPartId[];
  readonly allowedPlugIds?: readonly CatalogPartId[];
};

export type ConnectorFamilyDefinition = {
  readonly id: ConnectorFamilyId;
  readonly name: string;
  readonly manufacturer?: string;
  readonly housingPartId?: CatalogPartId;
  readonly housingPartNumber?: string;
  readonly cavities: readonly CavityDefinition[];
};

export type HarnessCatalogSnapshot = {
  readonly snapshotId: string;
  readonly snapshotHash: string;
  readonly connectorFamilies: readonly ConnectorFamilyDefinition[];
  readonly terminals: readonly TerminalDefinition[];
  readonly seals: readonly SealDefinition[];
  readonly plugs: readonly PlugDefinition[];
  readonly ringTerminals: readonly RingTerminalDefinition[];
  readonly wireTypes: readonly WireTypeDefinition[];
  readonly studs?: readonly StudDefinition[];
};

export type CavityPopulation =
  | { readonly kind: 'unpopulated'; readonly reason?: 'unused' | 'reserved' }
  | { readonly kind: 'plugged'; readonly plugPartId: CatalogPartId }
  | {
      readonly kind: 'terminalPopulated';
      readonly terminalPartId: CatalogPartId;
      readonly sealPartId?: CatalogPartId;
      readonly signalRole?: SignalRoleId;
    };

export type CavityPopulationEntry = {
  readonly cavityId: CavityId;
  readonly population: CavityPopulation;
};

export type ConnectorOccurrence = {
  readonly id: ConnectorOccurrenceId;
  readonly familyId: ConnectorFamilyId;
  readonly role: string;
  readonly cavityPopulations: readonly CavityPopulationEntry[];
  readonly notes?: string;
};

export type ConnectorCavityTarget = {
  readonly kind: 'connectorCavity';
  readonly occurrenceId: ConnectorOccurrenceId;
  readonly familyId: ConnectorFamilyId;
  readonly cavityId: CavityId;
};

export type ElectricalSplicePortTarget = {
  readonly kind: 'electricalSplicePort';
  readonly spliceId: ElectricalSpliceId;
  readonly portId: SplicePortId;
};

export type StudTarget = {
  readonly kind: 'stud';
  readonly studId: StudId;
};

export type ServiceEndTarget = {
  readonly kind: 'serviceEnd';
  readonly id: string;
  readonly deliberate: true;
};

export type TerminationTarget = ConnectorCavityTarget | ElectricalSplicePortTarget | StudTarget | ServiceEndTarget;

export type Termination = {
  readonly id: TerminationId;
  readonly target: TerminationTarget;
  readonly terminalPartId?: CatalogPartId;
  readonly sealPartId?: CatalogPartId;
  readonly ringTerminalPartId?: CatalogPartId;
  readonly processRef?: CatalogPartId;
  readonly stripLengthMm?: Millimeters;
  readonly terminationAllowanceMm?: Millimeters;
};

export type Conductor = {
  readonly id: ConductorId;
  readonly circuitId: CircuitId;
  readonly terminationAId?: TerminationId;
  readonly terminationBId?: TerminationId;
  readonly wireTypeId: WireTypeId;
  readonly color: string;
  readonly slackMm: Millimeters;
  readonly routeId?: RouteId;
  readonly notes?: string;
};

export type CircuitTopology =
  | { readonly kind: 'pointToPoint'; readonly conductorIds: readonly ConductorId[] }
  | {
      readonly kind: 'spliceTree';
      readonly spliceIds: readonly ElectricalSpliceId[];
      readonly conductorIds: readonly ConductorId[];
    };

export type Circuit = {
  readonly id: CircuitId;
  readonly signalRole: SignalRoleId;
  readonly topology: CircuitTopology;
  readonly notes?: string;
};

export type ElectricalSplice = {
  readonly id: ElectricalSpliceId;
  readonly ports: readonly SplicePortId[];
  readonly splicePartId?: CatalogPartId;
  readonly processRef?: CatalogPartId;
  readonly notes?: string;
};

export type RouteJunction = {
  readonly id: RouteJunctionId;
  readonly role?: string;
  readonly notes?: string;
};

export type RouteEndpoint =
  | { readonly kind: 'connector'; readonly id: ConnectorOccurrenceId }
  | { readonly kind: 'splice'; readonly id: ElectricalSpliceId }
  | { readonly kind: 'junction'; readonly id: RouteJunctionId }
  | { readonly kind: 'stud'; readonly id: StudId };

export type LegacyLengthOverride = {
  readonly valueMm: Millimeters;
  readonly provenance: 'legacy-v0.1-nominal';
  readonly reason: string;
};

export type RouteSegment = {
  readonly id: RouteSegmentId;
  readonly from: RouteEndpoint;
  readonly to: RouteEndpoint;
  readonly lengthOverride?: LegacyLengthOverride;
};

export type Route = {
  readonly id: RouteId;
  readonly segmentIds: readonly RouteSegmentId[];
};

export type LegacyPlacementProposal = {
  readonly entityKind: 'connector' | 'splice' | 'routeJunction';
  readonly entityId: string;
  readonly positionMm: readonly [Millimeters, Millimeters];
  readonly provenance: 'legacy-v0.1-position';
};

export type HarnessIr = {
  readonly schemaVersion: '1.0';
  readonly id: HarnessId;
  readonly metadata: { readonly name: string; readonly description?: string };
  readonly catalog: HarnessCatalogSnapshot;
  readonly connectorOccurrences: readonly ConnectorOccurrence[];
  readonly circuits: readonly Circuit[];
  readonly conductors: readonly Conductor[];
  readonly terminations: readonly Termination[];
  readonly electricalSplices: readonly ElectricalSplice[];
  readonly routeJunctions: readonly RouteJunction[];
  readonly routes: readonly Route[];
  readonly routeSegments: readonly RouteSegment[];
  readonly legacyPlacementProposals?: readonly LegacyPlacementProposal[];
  readonly provenance?: { readonly sourceKind: 'typed-authoring' | 'v0.1-migration'; readonly sourceId?: string };
};
