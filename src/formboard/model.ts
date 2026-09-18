import type {
  ConductorId,
  ConnectorOccurrenceId,
  ElectricalSpliceId,
  Millimeters,
  RouteId,
  RouteJunctionId,
  RouteSegmentId,
  StudId,
  LabelId,
  TapeWrapId,
  SleeveId,
  CatalogPartId
} from '@/harness-core';

export type Degrees = number & { readonly __brand: 'Degrees' };

export type PointMm = {
  readonly x: Millimeters;
  readonly y: Millimeters;
};

export type BoardSettings = {
  readonly widthMm: Millimeters;
  readonly heightMm: Millimeters;
  readonly origin: PointMm;
  readonly gridSpacingMm: Millimeters;
  readonly drawingMarginMm?: Millimeters;
  readonly titleBlockMarginMm?: Millimeters;
  readonly forbidGeometryOutsideBoard?: boolean;
};

export type LabelPlacement = {
  readonly anchor: PointMm;
  readonly orientationDeg?: Degrees;
};

export type ConnectorPlacement = {
  readonly connectorOccurrenceId: ConnectorOccurrenceId;
  readonly position: PointMm;
  readonly rotationDeg: Degrees;
  readonly label?: LabelPlacement;
  readonly provenance?: 'authored' | 'migrated-v0.1';
};

export type ElectricalSplicePlacement = {
  readonly electricalSpliceId: ElectricalSpliceId;
  readonly position: PointMm;
  readonly label?: LabelPlacement;
  readonly provenance?: 'authored' | 'migrated-v0.1';
};

export type RouteJunctionPlacement = {
  readonly routeJunctionId: RouteJunctionId;
  readonly position: PointMm;
  readonly label?: LabelPlacement;
  readonly provenance?: 'authored' | 'migrated-v0.1';
};

export type StudPlacement = {
  readonly studId: StudId;
  readonly position: PointMm;
  readonly label?: LabelPlacement;
};

export type PhysicalRouteNodeRef =
  | { readonly kind: 'connector'; readonly id: ConnectorOccurrenceId }
  | { readonly kind: 'splice'; readonly id: ElectricalSpliceId }
  | { readonly kind: 'junction'; readonly id: RouteJunctionId }
  | { readonly kind: 'stud'; readonly id: StudId };

export type LengthOverride = {
  readonly valueMm: Millimeters;
  readonly reason: string;
  readonly provenance: string;
};

export type RouteSegmentGeometry = {
  readonly routeSegmentId: RouteSegmentId;
  readonly from: PhysicalRouteNodeRef;
  readonly to: PhysicalRouteNodeRef;
  readonly points: readonly [PointMm, PointMm, ...PointMm[]];
  /** Smooth cubic interpolation uses the points as deterministic Catmull-Rom knots. */
  readonly geometryKind?: 'polyline' | 'cubicSpline';
  readonly bundleDiameterMm?: Millimeters;
  readonly minimumBendRadiusMm?: Millimeters;
  readonly lengthOverride?: LengthOverride;
  readonly provenance?: 'authored' | 'migrated-v0.1';
};

export type FormboardRoute = {
  readonly routeId: RouteId;
  readonly segmentIds: readonly RouteSegmentId[];
};

export type FormboardAnnotation = {
  readonly id: string;
  readonly text: string;
  readonly position: PointMm;
  readonly entity?: { readonly kind: string; readonly id: string };
};

export type LinearDimension = {
  readonly id: string;
  readonly from: PointMm;
  readonly to: PointMm;
  readonly offsetMm: Millimeters;
  readonly label?: string;
};

export type ContextRectangle = {
  readonly id: string;
  readonly kind: 'pcb' | 'chassis' | 'panel' | 'mountingRegion';
  readonly origin: PointMm;
  readonly widthMm: Millimeters;
  readonly heightMm: Millimeters;
  readonly label?: string;
};

export type BundlePackingPolicy = { readonly efficiency: number };

export type AccessoryLabelPlacement = {
  readonly kind: 'label';
  readonly id: LabelId;
  readonly routeId: RouteId;
  readonly stationMm: Millimeters;
  readonly text: string;
  readonly catalogPartId?: CatalogPartId;
  readonly calloutPosition?: PointMm;
  readonly notes?: string;
};

export type TapeWrapMode = 'spiral' | 'halfLap' | 'customOverlap';

export type TapeWrapPlacement = {
  readonly kind: 'tapeWrap';
  readonly id: TapeWrapId;
  readonly routeId: RouteId;
  readonly startStationMm: Millimeters;
  readonly endStationMm: Millimeters;
  readonly catalogPartId: CatalogPartId;
  readonly mode: TapeWrapMode;
  readonly overlapFraction: number;
  readonly wasteFactor: number;
  readonly notes?: string;
};

export type SleevePlacement = {
  readonly kind: 'sleeve';
  readonly id: SleeveId;
  readonly routeId: RouteId;
  readonly startStationMm: Millimeters;
  readonly endStationMm: Millimeters;
  readonly catalogPartId: CatalogPartId;
  readonly startAllowanceMm: Millimeters;
  readonly endAllowanceMm: Millimeters;
  readonly fitFactor?: number;
  readonly notes?: string;
};

export type AccessoryIntent = AccessoryLabelPlacement | TapeWrapPlacement | SleevePlacement;

export type FormboardDocument = {
  readonly formboardVersion: '1' | '2';
  readonly harnessId: string;
  readonly title: string;
  readonly revision?: string;
  readonly board: BoardSettings;
  readonly connectorPlacements: readonly ConnectorPlacement[];
  readonly splicePlacements: readonly ElectricalSplicePlacement[];
  readonly routeJunctionPlacements: readonly RouteJunctionPlacement[];
  readonly studPlacements: readonly StudPlacement[];
  readonly segmentGeometry: readonly RouteSegmentGeometry[];
  readonly routes: readonly FormboardRoute[];
  readonly annotations: readonly FormboardAnnotation[];
  readonly dimensions: readonly LinearDimension[];
  readonly context: readonly ContextRectangle[];
  readonly accessories?: readonly AccessoryIntent[];
  readonly bundlePackingPolicy?: BundlePackingPolicy;
  readonly exportSettings: {
    readonly scale: '1:1';
    readonly includeGrid: boolean;
    readonly calibrationLengthMm: Millimeters;
  };
};

export type TominalProject = {
  readonly harness: import('@/harness-core').HarnessIr;
  readonly formboard: FormboardDocument;
};

export type FormboardSelection =
  | { readonly kind: 'connectorOccurrence'; readonly id: ConnectorOccurrenceId }
  | { readonly kind: 'electricalSplice'; readonly id: ElectricalSpliceId }
  | { readonly kind: 'routeJunction'; readonly id: RouteJunctionId }
  | { readonly kind: 'routeSegment'; readonly id: RouteSegmentId }
  | { readonly kind: 'route'; readonly id: RouteId }
  | { readonly kind: 'conductor'; readonly id: ConductorId };


export const degrees = (value: number): Degrees => value as Degrees;

export const pointMm = (x: number, y: number): PointMm => ({
  x: x as Millimeters,
  y: y as Millimeters
});
