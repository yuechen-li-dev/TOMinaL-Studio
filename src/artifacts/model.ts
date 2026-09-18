import type { Diagnostic, EntityRef } from '@/harness-core';

export type ArtifactUnit = 'ea' | 'm';

export type CutListRow = {
  readonly wireId: string;
  readonly circuit: string;
  readonly fromConnector: string;
  readonly fromCavity: string;
  readonly toConnector: string;
  readonly toCavitySpliceStud: string;
  readonly wireType: string;
  readonly gauge: string;
  readonly color: string;
  readonly routeLengthMm: number;
  readonly slackMm: number;
  readonly terminationAllowanceMm: number;
  readonly cutLengthMm: number;
  readonly terminalA: string;
  readonly sealOrRingA: string;
  readonly terminalB: string;
  readonly sealOrRingB: string;
  readonly routeId: string;
  readonly terminationIds: readonly string[];
  readonly lengthProvenance: 'geometry' | 'override';
  readonly notes: string;
};

export type BomCategory = 'connector-housing' | 'terminal' | 'seal' | 'plug' | 'ring-terminal' | 'splice' | 'process' | 'wire' | 'label' | 'tape' | 'sleeve' | 'heat-shrink';

export type BomRow = {
  readonly id: string;
  readonly category: BomCategory;
  readonly manufacturer: string;
  readonly partNumber: string;
  readonly description: string;
  readonly quantity: number;
  readonly unit: ArtifactUnit;
  readonly conductorCount?: number;
  readonly pieceCount?: number;
  readonly sourceEntities: readonly EntityRef[];
};

export type ArtifactProjection = {
  readonly cutList: readonly CutListRow[];
  readonly bom: readonly BomRow[];
  readonly accessorySchedule: readonly AccessoryScheduleRow[];
  readonly diagnostics: readonly Diagnostic[];
};

export type AccessoryScheduleRow =
  | { readonly kind: 'label'; readonly accessoryId: string; readonly routeId: string; readonly stationMm: number; readonly text: string; readonly xMm: number; readonly yMm: number; readonly catalogPartId: string; readonly notes: string }
  | { readonly kind: 'tapeWrap'; readonly accessoryId: string; readonly routeId: string; readonly startStationMm: number; readonly endStationMm: number; readonly spanLengthMm: number; readonly bundleDiameterMinMm: number; readonly bundleDiameterMaxMm: number; readonly tapeWidthMm: number; readonly overlapFraction: number; readonly wasteFactor: number; readonly estimatedTapeLengthMm: number; readonly catalogPartId: string; readonly notes: string }
  | { readonly kind: 'sleeve'; readonly accessoryId: string; readonly routeId: string; readonly startStationMm: number; readonly endStationMm: number; readonly spanLengthMm: number; readonly cutLengthMm: number; readonly maxBundleDiameterMm: number; readonly requiredInnerDiameterMm: number; readonly catalogPartId: string; readonly notes: string }
  | { readonly kind: 'heatShrink'; readonly accessoryId: string; readonly terminationId: string; readonly conductorId: string; readonly pieceQuantity: 1; readonly wireOuterDiameterMm: number; readonly substrateMaxDiameterMm: number; readonly suppliedInnerDiameterMm: number; readonly recoveredInnerDiameterMm: number; readonly cutLengthMm: number; readonly catalogPartId: string; readonly notes: string };

export type QuoteRequest = {
  readonly bomRowId: string;
  readonly manufacturer: string;
  readonly partNumber: string;
  readonly requiredQuantity: number;
  readonly unit: ArtifactUnit;
  readonly category: BomCategory;
};

export type PriceBreak = { readonly minimumQuantity: number; readonly unitPrice: number };

export type QuoteLine = QuoteRequest & {
  readonly status: 'available' | 'unavailable' | 'error';
  readonly quotedPurchaseQuantity: number;
  readonly currency: string;
  readonly unitPrice?: number;
  readonly extendedPrice?: number;
  readonly moq?: number;
  readonly priceBreaks: readonly PriceBreak[];
  readonly provider: string;
  readonly leadTimeDays?: number;
  readonly notes?: string;
  readonly error?: string;
};

export type QuoteSnapshot = {
  readonly schemaVersion: '1';
  readonly identity: string;
  readonly label: 'Demo Estimate / Local Fixture Pricing';
  readonly provider: string;
  readonly timestamp: string;
  readonly currency: string;
  readonly lines: readonly QuoteLine[];
  readonly subtotal: number;
  readonly unavailableLineCount: number;
};

export type GeneratedArtifact = {
  readonly file: string;
  readonly artifactType: string;
  readonly schemaVersion: string;
  readonly content: string;
  readonly sha256: string;
  readonly sourceDependencies: readonly string[];
};

export type ArtifactManifest = {
  readonly schemaVersion: '1';
  readonly projectId: string;
  readonly generatedBy: string;
  readonly diagnostics: readonly Diagnostic[];
  readonly artifacts: readonly Omit<GeneratedArtifact, 'content'>[];
};

export type ManufacturingArtifactPackage = {
  readonly projection: ArtifactProjection;
  readonly quote: QuoteSnapshot;
  readonly artifacts: readonly GeneratedArtifact[];
  readonly manifest: ArtifactManifest;
};
