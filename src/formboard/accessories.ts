import {
  heatShrinkPlacementId,
  mm,
  sortDiagnostics,
  type AccessoryCatalogDefinition,
  type CatalogPartId,
  type ConductorId,
  type Diagnostic,
  type EntityRef,
  type HarnessIr,
  type HeatShrinkPlacementId,
  type Millimeters,
  type RouteId,
  type Termination
} from '@/harness-core';
import type {
  AccessoryIntent,
  FormboardDocument,
  SleevePlacement,
  TapeWrapPlacement,
  TominalProject
} from './model';
import { getPathLength, getRouteStationPoint, traverseRoute } from './metrics';

export const DEFAULT_BUNDLE_PACKING_EFFICIENCY = 0.6;
export const DEFAULT_TAPE_WASTE_FACTOR = 1.15;
export const DEFAULT_SLEEVE_FIT_FACTOR = 1.1;

export type AppliedBundleLayer = {
  readonly accessoryId: string;
  readonly kind: 'tapeWrap' | 'sleeve';
  readonly thicknessMm?: Millimeters;
  readonly priorDiameterMm?: Millimeters;
  readonly finishedDiameterMm?: Millimeters;
};

export type BundleSection = {
  readonly routeId: RouteId;
  readonly startStationMm: Millimeters;
  readonly endStationMm: Millimeters;
  readonly conductorIds: readonly ConductorId[];
  readonly coreAreaMm2?: number;
  readonly coreDiameterMm?: Millimeters;
  readonly appliedLayers: readonly AppliedBundleLayer[];
  readonly finishedDiameterMm?: Millimeters;
  readonly estimate: true;
  readonly packingEfficiency: number;
};

export type BundleDerivation = {
  readonly sections: readonly BundleSection[];
  readonly diagnostics: readonly Diagnostic[];
};

export type TapeEstimate = {
  readonly spanLengthMm: number;
  readonly bundleDiameterMinMm: number;
  readonly bundleDiameterMaxMm: number;
  readonly estimatedTapeLengthMm: number;
  readonly estimate: true;
};

export type SleeveQualification = {
  readonly spanLengthMm: number;
  readonly cutLengthMm: number;
  readonly maxBundleDiameterMm?: number;
  readonly requiredInnerDiameterMm?: number;
  readonly valid: boolean;
};

export type DerivedHeatShrinkPlacement = {
  readonly id: HeatShrinkPlacementId;
  readonly terminationId: string;
  readonly conductorId: ConductorId;
  readonly catalogPartId: CatalogPartId;
  readonly wireOuterDiameterMm: Millimeters;
  readonly substrateMaxDiameterMm: Millimeters;
  readonly suppliedInnerDiameterMm: Millimeters;
  readonly recoveredInnerDiameterMm: Millimeters;
  readonly cutLengthMm: Millimeters;
  readonly valid: boolean;
};

const ref = (kind: EntityRef['kind'], id: string): EntityRef => ({ kind, id });
const issue = (severity: Diagnostic['severity'], rule: string, entity: EntityRef, message: string): Diagnostic => ({
  id: `${rule}:${entity.kind}:${entity.id}`,
  severity,
  rule,
  entity,
  message
});

function catalogAccessory(harness: HarnessIr, id: string): AccessoryCatalogDefinition | undefined {
  return harness.catalog.accessoryMaterials?.find((item) => item.id === id);
}

function routeSegmentIntervals(formboard: FormboardDocument, routeId: RouteId) {
  const traversal = traverseRoute(formboard, routeId);
  if (traversal.status === 'unresolved') return traversal;
  let station = 0;
  return {
    status: 'resolved' as const,
    intervals: traversal.segments.map((segment) => {
      const start = station;
      station += Number(getPathLength(segment.geometry.points, segment.geometry.geometryKind));
      return { segmentId: segment.geometry.routeSegmentId, start, end: station };
    }),
    lengthMm: station
  };
}

function conductorsOnSegment(harness: HarnessIr, formboard: FormboardDocument, segmentId: string): ConductorId[] {
  const ids = new Set<ConductorId>();
  for (const conductor of harness.conductors) {
    if (!conductor.routeId) continue;
    const route = formboard.routes.find((item) => item.routeId === conductor.routeId);
    if (route?.segmentIds.some((id) => id === segmentId)) ids.add(conductor.id);
  }
  return [...ids].sort((a, b) => a.localeCompare(b));
}

function coreGeometry(harness: HarnessIr, conductorIds: readonly ConductorId[], efficiency: number, diagnostics: Diagnostic[], routeId: RouteId) {
  if (conductorIds.length === 0) return {};
  const diameters: number[] = [];
  for (const conductorId of conductorIds) {
    const conductor = harness.conductors.find((item) => item.id === conductorId)!;
    const wire = harness.catalog.wireTypes.find((item) => item.id === conductor.wireTypeId);
    if (!wire?.insulatedOuterDiameterMm) {
      diagnostics.push(issue('error', 'accessory.wire-outer-diameter.missing', ref('conductor', conductorId), `Conductor ${conductorId} wire ${conductor.wireTypeId} has no qualified insulated outer diameter.`));
      continue;
    }
    if (wire.outerDiameterProvenance === 'catalog-estimated') {
      diagnostics.push(issue('warning', 'accessory.wire-outer-diameter.estimated', ref('conductor', conductorId), `Conductor ${conductorId} uses catalog-estimated insulated OD ${Number(wire.insulatedOuterDiameterMm)} mm.`));
    }
    diameters.push(Number(wire.insulatedOuterDiameterMm));
  }
  if (diameters.length !== conductorIds.length) return {};
  const area = diameters.reduce((sum, diameter) => sum + Math.PI * diameter * diameter / 4, 0);
  const diameter = diameters.length === 1 ? diameters[0] : 2 * Math.sqrt((area / efficiency) / Math.PI);
  if (!Number.isFinite(diameter)) diagnostics.push(issue('error', 'accessory.bundle.invalid', ref('route', routeId), `Route ${routeId} produced an invalid bundle diameter.`));
  return { coreAreaMm2: area, coreDiameterMm: mm(diameter) };
}

function spanContains(accessory: TapeWrapPlacement | SleevePlacement, station: number): boolean {
  return Number(accessory.startStationMm) <= station && station < Number(accessory.endStationMm);
}

export function deriveBundleSections(harness: HarnessIr, formboard: FormboardDocument, routeId: RouteId): BundleDerivation {
  const diagnostics: Diagnostic[] = [];
  const route = routeSegmentIntervals(formboard, routeId);
  if (route.status === 'unresolved') return { sections: [], diagnostics: [issue('error', 'accessory.route.missing', ref('route', routeId), route.reason)] };
  const efficiency = formboard.bundlePackingPolicy?.efficiency ?? DEFAULT_BUNDLE_PACKING_EFFICIENCY;
  if (!(efficiency > 0 && efficiency <= 1)) return { sections: [], diagnostics: [issue('error', 'accessory.packing.invalid', ref('route', routeId), `Packing efficiency must be in (0, 1], not ${efficiency}.`)] };
  const routeAccessories = (formboard.accessories ?? []).filter((item): item is TapeWrapPlacement | SleevePlacement => item.routeId === routeId && item.kind !== 'label');
  const breakpoints = new Set([0, route.lengthMm, ...route.intervals.flatMap((item) => [item.start, item.end])]);
  for (const accessory of routeAccessories) {
    breakpoints.add(Number(accessory.startStationMm));
    breakpoints.add(Number(accessory.endStationMm));
  }
  const ordered = [...breakpoints].filter((value) => value >= 0 && value <= route.lengthMm).sort((a, b) => a - b);
  const sections: BundleSection[] = [];
  for (let index = 1; index < ordered.length; index += 1) {
    const start = ordered[index - 1];
    const end = ordered[index];
    if (end - start <= 1e-9) continue;
    const midpoint = (start + end) / 2;
    const segment = route.intervals.find((item) => item.start <= midpoint && midpoint <= item.end);
    const conductorIds = segment ? conductorsOnSegment(harness, formboard, segment.segmentId) : [];
    if (conductorIds.length === 0) diagnostics.push(issue('error', 'accessory.bundle.empty-span', ref('route', routeId), `Route ${routeId} has no conductors from ${start.toFixed(3)} to ${end.toFixed(3)} mm.`));
    const core = coreGeometry(harness, conductorIds, efficiency, diagnostics, routeId);
    let finished = core.coreDiameterMm;
    const layers: AppliedBundleLayer[] = [];
    const overlapping = routeAccessories.filter((item) => spanContains(item, midpoint)).sort((left, right) => {
      const order = (value: AccessoryIntent) => value.kind === 'tapeWrap' ? 0 : 1;
      return order(left) - order(right) || left.id.localeCompare(right.id);
    });
    for (const accessory of overlapping) {
      const material = catalogAccessory(harness, accessory.catalogPartId);
      let thickness: Millimeters | undefined;
      if (accessory.kind === 'tapeWrap' && material?.kind === 'tape' && material.thicknessMm !== undefined) thickness = mm(Number(material.thicknessMm) * (1 + accessory.overlapFraction));
      if (accessory.kind === 'sleeve' && material?.kind === 'sleeve') thickness = material.wallThicknessMm;
      const prior = finished;
      if (finished !== undefined && thickness !== undefined) finished = mm(Number(finished) + 2 * Number(thickness));
      layers.push({ accessoryId: accessory.id, kind: accessory.kind, thicknessMm: thickness, priorDiameterMm: prior, finishedDiameterMm: finished });
      if (thickness === undefined) diagnostics.push(issue('warning', 'accessory.layer-thickness.missing', ref(accessory.kind === 'tapeWrap' ? 'tapeWrap' : 'sleeve', accessory.id), `${accessory.id} has no catalog thickness; finished bundle OD remains qualified but unchanged for this layer.`));
    }
    sections.push({ routeId, startStationMm: mm(start), endStationMm: mm(end), conductorIds, ...core, appliedLayers: layers, finishedDiameterMm: finished, estimate: true, packingEfficiency: efficiency });
  }
  return { sections, diagnostics: sortDiagnostics(diagnostics) };
}

export function bundleStateAt(sections: readonly BundleSection[], routeId: RouteId, stationMm: number): BundleSection | undefined {
  const candidates = sections.filter((section) => section.routeId === routeId);
  return candidates.find((section, index) => Number(section.startStationMm) <= stationMm && (stationMm < Number(section.endStationMm) || (index === candidates.length - 1 && stationMm === Number(section.endStationMm))));
}

export const coreDiameterAt = (sections: readonly BundleSection[], routeId: RouteId, stationMm: number) => bundleStateAt(sections, routeId, stationMm)?.coreDiameterMm;
export const finishedDiameterAt = (sections: readonly BundleSection[], routeId: RouteId, stationMm: number) => bundleStateAt(sections, routeId, stationMm)?.finishedDiameterMm;
export const conductorsAt = (sections: readonly BundleSection[], routeId: RouteId, stationMm: number) => bundleStateAt(sections, routeId, stationMm)?.conductorIds ?? [];

function sectionsAcross(sections: readonly BundleSection[], routeId: RouteId, startMm: number, endMm: number) {
  return sections.filter((section) => section.routeId === routeId && Number(section.endStationMm) > startMm && Number(section.startStationMm) < endMm);
}

export function conductorsAcross(sections: readonly BundleSection[], routeId: RouteId, startMm: number, endMm: number): readonly ConductorId[] {
  return [...new Set(sectionsAcross(sections, routeId, startMm, endMm).flatMap((section) => section.conductorIds))].sort((a, b) => a.localeCompare(b));
}

export function maxCoreDiameter(sections: readonly BundleSection[], routeId: RouteId, startMm: number, endMm: number): Millimeters | undefined {
  const values = sectionsAcross(sections, routeId, startMm, endMm).map((item) => item.coreDiameterMm).filter((value): value is Millimeters => value !== undefined);
  return values.length ? mm(Math.max(...values.map(Number))) : undefined;
}

export function maxFinishedDiameter(sections: readonly BundleSection[], routeId: RouteId, startMm: number, endMm: number): Millimeters | undefined {
  const values = sectionsAcross(sections, routeId, startMm, endMm).map((item) => item.finishedDiameterMm).filter((value): value is Millimeters => value !== undefined);
  return values.length ? mm(Math.max(...values.map(Number))) : undefined;
}

export function estimateTapeLength(spanLengthMm: number, diameterMm: number, widthMm: number, overlapFraction: number, wasteFactor = DEFAULT_TAPE_WASTE_FACTOR): number {
  if (!(spanLengthMm >= 0) || !(diameterMm > 0) || !(widthMm > 0) || !(overlapFraction >= 0 && overlapFraction < 1) || !(wasteFactor > 0)) throw new Error('Invalid tape estimation inputs.');
  const advance = widthMm * (1 - overlapFraction);
  const helixPerRevolution = Math.hypot(Math.PI * diameterMm, advance);
  return (spanLengthMm / advance) * helixPerRevolution * wasteFactor;
}

export function estimateTapeWrap(project: TominalProject, tape: TapeWrapPlacement): { estimate?: TapeEstimate; diagnostics: readonly Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const entity = ref('tapeWrap', tape.id);
  const route = routeSegmentIntervals(project.formboard, tape.routeId);
  if (route.status === 'unresolved') return { diagnostics: [issue('error', 'accessory.route.missing', entity, route.reason)] };
  const start = Number(tape.startStationMm);
  const end = Number(tape.endStationMm);
  if (!(start >= 0 && end > start && end <= route.lengthMm + 1e-6)) diagnostics.push(issue('error', 'accessory.tape.span-invalid', entity, `Tape span ${start}–${end} mm is outside route length ${route.lengthMm.toFixed(3)} mm.`));
  if (!(tape.overlapFraction >= 0 && tape.overlapFraction < 1)) diagnostics.push(issue('error', 'accessory.tape.overlap-invalid', entity, `Tape overlap must be in [0, 1), not ${tape.overlapFraction}.`));
  if (!(tape.wasteFactor > 0)) diagnostics.push(issue('error', 'accessory.tape.waste-invalid', entity, `Tape waste factor must be positive, not ${tape.wasteFactor}.`));
  const material = catalogAccessory(project.harness, tape.catalogPartId);
  if (!material || material.kind !== 'tape') diagnostics.push(issue('error', 'accessory.tape.catalog-invalid', entity, `Tape ${tape.id} requires a tape catalog binding.`));
  if (diagnostics.some((item) => item.severity === 'error') || !material || material.kind !== 'tape') return { diagnostics };
  const derivation = deriveBundleSections(project.harness, project.formboard, tape.routeId);
  diagnostics.push(...derivation.diagnostics);
  let total = 0;
  const diameters: number[] = [];
  for (const section of sectionsAcross(derivation.sections, tape.routeId, start, end)) {
    const layer = section.appliedLayers.find((item) => item.accessoryId === tape.id);
    const diameter = layer?.priorDiameterMm ?? section.coreDiameterMm;
    if (diameter === undefined) continue;
    const intersection = Math.max(0, Math.min(end, Number(section.endStationMm)) - Math.max(start, Number(section.startStationMm)));
    total += estimateTapeLength(intersection, Number(diameter), Number(material.widthMm), tape.overlapFraction, tape.wasteFactor);
    diameters.push(Number(diameter));
  }
  if (!diameters.length) diagnostics.push(issue('error', 'accessory.bundle.empty-span', entity, `Tape ${tape.id} crosses no resolved bundle section.`));
  return diameters.length ? { estimate: { spanLengthMm: end - start, bundleDiameterMinMm: Math.min(...diameters), bundleDiameterMaxMm: Math.max(...diameters), estimatedTapeLengthMm: total, estimate: true }, diagnostics: sortDiagnostics(diagnostics) } : { diagnostics: sortDiagnostics(diagnostics) };
}

export function validateSleeveFit(project: TominalProject, sleeve: SleevePlacement): { qualification: SleeveQualification; diagnostics: readonly Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const entity = ref('sleeve', sleeve.id);
  const route = routeSegmentIntervals(project.formboard, sleeve.routeId);
  const start = Number(sleeve.startStationMm);
  const end = Number(sleeve.endStationMm);
  if (route.status === 'unresolved') return { qualification: { spanLengthMm: 0, cutLengthMm: 0, valid: false }, diagnostics: [issue('error', 'accessory.route.missing', entity, route.reason)] };
  if (!(start >= 0 && end > start && end <= route.lengthMm + 1e-6)) diagnostics.push(issue('error', 'accessory.sleeve.span-invalid', entity, `Sleeve span ${start}–${end} mm is outside route length ${route.lengthMm.toFixed(3)} mm.`));
  const material = catalogAccessory(project.harness, sleeve.catalogPartId);
  if (!material || material.kind !== 'sleeve') diagnostics.push(issue('error', 'accessory.sleeve.catalog-invalid', entity, `Sleeve ${sleeve.id} requires a sleeve catalog binding.`));
  const derivation = deriveBundleSections(project.harness, project.formboard, sleeve.routeId);
  diagnostics.push(...derivation.diagnostics);
  const priorValues = sectionsAcross(derivation.sections, sleeve.routeId, start, end).map((section) => section.appliedLayers.find((layer) => layer.accessoryId === sleeve.id)?.priorDiameterMm ?? section.coreDiameterMm).filter((value): value is Millimeters => value !== undefined);
  const max = priorValues.length ? Math.max(...priorValues.map(Number)) : undefined;
  const factor = sleeve.fitFactor ?? DEFAULT_SLEEVE_FIT_FACTOR;
  const required = max === undefined ? undefined : max * factor;
  if (material?.kind === 'sleeve' && max !== undefined) {
    const admissible = material.maxBundleDiameterMm === undefined || max <= Number(material.maxBundleDiameterMm);
    const aboveMinimum = material.minBundleDiameterMm === undefined || max >= Number(material.minBundleDiameterMm);
    const nominalFit = material.maxBundleDiameterMm !== undefined || material.nominalInnerDiameterMm === undefined || required! <= Number(material.nominalInnerDiameterMm);
    if (!admissible || !aboveMinimum || !nominalFit) diagnostics.push(issue('error', 'accessory.sleeve.too-small', entity, `Sleeve ${material.partNumber} does not admit ${max.toFixed(3)} mm bundle OD (required ID ${required!.toFixed(3)} mm).`));
  }
  const qualification = { spanLengthMm: Math.max(0, end - start), cutLengthMm: Math.max(0, end - start) + Number(sleeve.startAllowanceMm) + Number(sleeve.endAllowanceMm), maxBundleDiameterMm: max, requiredInnerDiameterMm: required, valid: !diagnostics.some((item) => item.severity === 'error') };
  return { qualification, diagnostics: sortDiagnostics(diagnostics) };
}

function conductorForTermination(harness: HarnessIr, termination: Termination) {
  return harness.conductors.find((item) => item.terminationAId === termination.id || item.terminationBId === termination.id);
}

export function deriveHeatShrinkPlacements(project: TominalProject): { placements: readonly DerivedHeatShrinkPlacement[]; diagnostics: readonly Diagnostic[] } {
  const placements: DerivedHeatShrinkPlacement[] = [];
  const diagnostics: Diagnostic[] = [];
  for (const termination of project.harness.terminations) {
    if (!termination.ringTerminalPartId) continue;
    const ring = project.harness.catalog.ringTerminals.find((item) => item.id === termination.ringTerminalPartId);
    const policy = ring?.heatShrinkPolicy;
    if (!policy?.requiresHeatShrink) continue;
    const entity = ref('termination', termination.id);
    const conductor = conductorForTermination(project.harness, termination);
    const wire = conductor && project.harness.catalog.wireTypes.find((item) => item.id === conductor.wireTypeId);
    const material = policy.heatShrinkCatalogPartId && catalogAccessory(project.harness, policy.heatShrinkCatalogPartId);
    if (!conductor || !wire?.insulatedOuterDiameterMm || !ring?.barrelOuterDiameterMm || !ring.barrelLengthMm || !material || material.kind !== 'heatShrink' || !policy.heatShrinkCatalogPartId) {
      diagnostics.push(issue('error', 'accessory.heat-shrink.data-missing', entity, `Termination ${termination.id} lacks qualified wire, barrel, policy, or tubing data.`));
      continue;
    }
    const substrate = Math.max(Number(wire.insulatedOuterDiameterMm), Number(ring.barrelOuterDiameterMm));
    const fitsOver = Number(material.suppliedInnerDiameterMm) >= substrate;
    const recovers = Number(material.recoveredInnerDiameterMm) <= Number(wire.insulatedOuterDiameterMm);
    if (!fitsOver) diagnostics.push(issue('error', 'accessory.heat-shrink.too-small', entity, `Tubing supplied ID ${Number(material.suppliedInnerDiameterMm)} mm cannot fit over ${substrate} mm substrate.`));
    if (!recovers) diagnostics.push(issue('error', 'accessory.heat-shrink.cannot-recover', entity, `Tubing recovered ID ${Number(material.recoveredInnerDiameterMm)} mm cannot recover onto ${Number(wire.insulatedOuterDiameterMm)} mm wire OD.`));
    const cutLength = Math.max(0, Number(ring.barrelLengthMm) + Number(policy.minWireOverlapMm ?? 0) - Number(policy.terminalClearanceMm ?? 0));
    placements.push({ id: heatShrinkPlacementId(`HS:${termination.id}`), terminationId: termination.id, conductorId: conductor.id, catalogPartId: policy.heatShrinkCatalogPartId, wireOuterDiameterMm: wire.insulatedOuterDiameterMm, substrateMaxDiameterMm: mm(substrate), suppliedInnerDiameterMm: material.suppliedInnerDiameterMm, recoveredInnerDiameterMm: material.recoveredInnerDiameterMm, cutLengthMm: mm(cutLength), valid: fitsOver && recovers });
  }
  return { placements: placements.sort((a, b) => a.id.localeCompare(b.id)), diagnostics: sortDiagnostics(diagnostics) };
}

export function accessoryPosition(formboard: FormboardDocument, accessory: AccessoryIntent) {
  if (accessory.kind === 'label') return getRouteStationPoint(formboard, accessory.routeId, Number(accessory.stationMm));
  return getRouteStationPoint(formboard, accessory.routeId, (Number(accessory.startStationMm) + Number(accessory.endStationMm)) / 2);
}

export function validateAccessories(project: TominalProject): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const accessory of project.formboard.accessories ?? []) {
    if (accessory.kind === 'label') {
      if (!getRouteStationPoint(project.formboard, accessory.routeId, Number(accessory.stationMm))) diagnostics.push(issue('error', 'accessory.label.station-out-of-range', ref('label', accessory.id), `Label ${accessory.id} station ${Number(accessory.stationMm)} mm is outside route ${accessory.routeId}.`));
      if (accessory.catalogPartId && catalogAccessory(project.harness, accessory.catalogPartId)?.kind !== 'label') diagnostics.push(issue('error', 'accessory.label.catalog-invalid', ref('label', accessory.id), `Label ${accessory.id} has an invalid catalog binding.`));
    } else if (accessory.kind === 'tapeWrap') diagnostics.push(...estimateTapeWrap(project, accessory).diagnostics);
    else diagnostics.push(...validateSleeveFit(project, accessory).diagnostics);
  }
  diagnostics.push(...deriveHeatShrinkPlacements(project).diagnostics);
  return sortDiagnostics(diagnostics);
}
