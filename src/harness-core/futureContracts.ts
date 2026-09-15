import type {
  CircuitId,
  ConductorId,
  ConnectorOccurrenceId,
  ElectricalSpliceId,
  RouteId,
  RouteJunctionId
} from '@/harness-core/ids';
import type { HarnessIr } from '@/harness-core/model';

export type FormboardInput = Pick<
  HarnessIr,
  'connectorOccurrences' | 'electricalSplices' | 'routeJunctions' | 'routes' | 'routeSegments' | 'conductors'
>;

export type FutureArtifactInput = Pick<
  HarnessIr,
  'metadata' | 'catalog' | 'circuits' | 'conductors' | 'terminations' | 'connectorOccurrences'
>;

export type AetherisHarnessInputV1 = {
  readonly version: '1';
  readonly connectorOccurrenceIds: readonly ConnectorOccurrenceId[];
  readonly conductorIds: readonly ConductorId[];
  readonly circuitIds: readonly CircuitId[];
  readonly electricalSpliceIds: readonly ElectricalSpliceId[];
  readonly routeJunctionIds: readonly RouteJunctionId[];
  readonly routeIds: readonly RouteId[];
};

