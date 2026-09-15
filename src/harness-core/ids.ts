export type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };

export type HarnessId = Brand<string, 'HarnessId'>;
export type ConnectorFamilyId = Brand<string, 'ConnectorFamilyId'>;
export type ConnectorOccurrenceId = Brand<string, 'ConnectorOccurrenceId'>;
export type CavityId<TFamily extends string = string> = Brand<string, `CavityId:${TFamily}`>;
export type CircuitId = Brand<string, 'CircuitId'>;
export type ConductorId = Brand<string, 'ConductorId'>;
export type TerminationId = Brand<string, 'TerminationId'>;
export type ElectricalSpliceId = Brand<string, 'ElectricalSpliceId'>;
export type SplicePortId = Brand<string, 'SplicePortId'>;
export type RouteJunctionId = Brand<string, 'RouteJunctionId'>;
export type RouteId = Brand<string, 'RouteId'>;
export type RouteSegmentId = Brand<string, 'RouteSegmentId'>;
export type CatalogPartId = Brand<string, 'CatalogPartId'>;
export type WireTypeId = Brand<string, 'WireTypeId'>;
export type SignalRoleId = Brand<string, 'SignalRoleId'>;
export type StudId = Brand<string, 'StudId'>;
export type Millimeters = Brand<number, 'Millimeters'>;
export type SquareMillimeters = Brand<number, 'SquareMillimeters'>;

const id = <T extends string>(value: string): Brand<string, T> => value as Brand<string, T>;

export const harnessId = (value: string): HarnessId => id<'HarnessId'>(value);
export const connectorFamilyId = (value: string): ConnectorFamilyId => id<'ConnectorFamilyId'>(value);
export const connectorOccurrenceId = (value: string): ConnectorOccurrenceId => id<'ConnectorOccurrenceId'>(value);
export const cavityId = <TFamily extends string = string>(value: string): CavityId<TFamily> =>
  value as CavityId<TFamily>;
export const circuitId = (value: string): CircuitId => id<'CircuitId'>(value);
export const conductorId = (value: string): ConductorId => id<'ConductorId'>(value);
export const terminationId = (value: string): TerminationId => id<'TerminationId'>(value);
export const electricalSpliceId = (value: string): ElectricalSpliceId => id<'ElectricalSpliceId'>(value);
export const splicePortId = (value: string): SplicePortId => id<'SplicePortId'>(value);
export const routeJunctionId = (value: string): RouteJunctionId => id<'RouteJunctionId'>(value);
export const routeId = (value: string): RouteId => id<'RouteId'>(value);
export const routeSegmentId = (value: string): RouteSegmentId => id<'RouteSegmentId'>(value);
export const catalogPartId = (value: string): CatalogPartId => id<'CatalogPartId'>(value);
export const wireTypeId = (value: string): WireTypeId => id<'WireTypeId'>(value);
export const signalRoleId = (value: string): SignalRoleId => id<'SignalRoleId'>(value);
export const studId = (value: string): StudId => id<'StudId'>(value);
export const mm = (value: number): Millimeters => value as Millimeters;
export const mm2 = (value: number): SquareMillimeters => value as SquareMillimeters;

