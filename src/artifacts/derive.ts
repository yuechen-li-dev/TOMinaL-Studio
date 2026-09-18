import { accessoryPosition, deriveHeatShrinkPlacements, estimateTapeWrap, getConductorRouteLength, validateSleeveFit, type TominalProject } from '@/formboard';
import { sortDiagnostics, type Diagnostic, type EntityRef, type Gauge, type HarnessCatalogSnapshot, type Termination } from '@/harness-core';
import type { AccessoryScheduleRow, ArtifactProjection, BomCategory, BomRow, CutListRow } from './model';
import { naturalCompare, round } from './stable';

const ref = (kind: EntityRef['kind'], id: string): EntityRef => ({ kind, id });
const diag = (rule: string, entity: EntityRef, message: string): Diagnostic => ({ id: `${rule}:${entity.kind}:${entity.id}`, severity: 'error', rule, entity, message });
const gaugeText = (gauge: Gauge): string => gauge.kind === 'awg' ? `${gauge.value} AWG` : `${Number(gauge.areaMm2)} mm²`;

function endpointLabel(termination: Termination | undefined): readonly [string, string] {
  if (!termination) return ['', ''];
  switch (termination.target.kind) {
    case 'connectorCavity': {
      const parts = termination.target.cavityId.split('.');
      return [termination.target.occurrenceId, parts[parts.length - 1] ?? termination.target.cavityId];
    }
    case 'electricalSplicePort': return ['', `${termination.target.spliceId}:${termination.target.portId}`];
    case 'stud': return ['', `Stud ${termination.target.studId}`];
    case 'serviceEnd': return ['', `Service end ${termination.target.id}`];
  }
}

export function deriveCutList(project: TominalProject): { rows: CutListRow[]; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const rows: CutListRow[] = [];
  for (const conductor of [...project.harness.conductors].sort((a, b) => naturalCompare(a.id, b.id))) {
    const entity = ref('conductor', conductor.id);
    const circuit = project.harness.circuits.find((item) => item.id === conductor.circuitId);
    const wire = project.harness.catalog.wireTypes.find((item) => item.id === conductor.wireTypeId);
    const a = project.harness.terminations.find((item) => item.id === conductor.terminationAId);
    const b = project.harness.terminations.find((item) => item.id === conductor.terminationBId);
    const length = getConductorRouteLength(project.harness, project.formboard, conductor.id);
    if (!wire) diagnostics.push(diag('artifact.wire-type.unresolved', entity, `Conductor ${conductor.id} has no resolved wire type ${conductor.wireTypeId}.`));
    if (length.status === 'unresolved') {
      diagnostics.push(diag('artifact.route.unresolved', entity, length.reason));
      continue;
    }
    const allowance = Number(a?.terminationAllowanceMm ?? 0) + Number(b?.terminationAllowanceMm ?? 0);
    const cutLength = Number(length.valueMm) + Number(conductor.slackMm) + allowance;
    if (cutLength < 0) {
      diagnostics.push(diag('artifact.cut-length.negative', entity, `Conductor ${conductor.id} produced negative cut length ${cutLength}.`));
      continue;
    }
    const [fromConnector, fromTarget] = endpointLabel(a);
    const [toConnector, toTarget] = endpointLabel(b);
    rows.push({
      wireId: conductor.id, circuit: circuit?.signalRole ?? conductor.circuitId,
      fromConnector, fromCavity: fromTarget, toConnector, toCavitySpliceStud: toTarget,
      wireType: wire?.partNumber ?? conductor.wireTypeId, gauge: wire ? gaugeText(wire.gauge) : '', color: conductor.color,
      routeLengthMm: round(Number(length.valueMm)), slackMm: Number(conductor.slackMm), terminationAllowanceMm: allowance,
      cutLengthMm: round(cutLength), terminalA: a?.terminalPartId ?? '', sealOrRingA: a?.sealPartId ?? a?.ringTerminalPartId ?? '',
      terminalB: b?.terminalPartId ?? '', sealOrRingB: b?.sealPartId ?? b?.ringTerminalPartId ?? '', routeId: conductor.routeId ?? '',
      terminationIds: [a?.id, b?.id].filter(Boolean) as string[], lengthProvenance: length.source,
      notes: [conductor.notes, length.source === 'override' ? 'Explicit route length override used.' : undefined].filter(Boolean).join(' ')
    });
  }
  return { rows, diagnostics };
}

type Atomic = { category: BomCategory; manufacturer: string; partNumber: string; description: string; quantity: number; unit: 'ea' | 'm'; source: EntityRef; conductor?: string; pieceCount?: number };

function catalogPart(catalog: HarnessCatalogSnapshot, id: string): { manufacturer: string; partNumber: string; description: string } | undefined {
  const candidates = [...catalog.terminals, ...catalog.seals, ...catalog.plugs, ...catalog.ringTerminals];
  const part = candidates.find((item) => item.id === id);
  return part ? { manufacturer: part.manufacturer, partNumber: part.partNumber, description: id } : undefined;
}

export function deriveBom(project: TominalProject, cutList: readonly CutListRow[]): { rows: BomRow[]; diagnostics: Diagnostic[] } {
  const atomic: Atomic[] = [];
  const diagnostics: Diagnostic[] = [];
  const addPart = (category: BomCategory, partId: string, source: EntityRef) => {
    const part = catalogPart(project.harness.catalog, partId);
    if (!part) diagnostics.push(diag('artifact.catalog-binding.unresolved', ref('catalogPart', partId), `No stable manufacturer part binding exists for ${partId}.`));
    else atomic.push({ category, ...part, quantity: 1, unit: 'ea', source });
  };
  for (const occurrence of project.harness.connectorOccurrences) {
    const family = project.harness.catalog.connectorFamilies.find((item) => item.id === occurrence.familyId);
    if (!family?.manufacturer || !family.housingPartNumber) diagnostics.push(diag('artifact.housing-binding.unresolved', ref('connectorOccurrence', occurrence.id), `Connector ${occurrence.id} has no stable housing manufacturer/part number.`));
    else atomic.push({ category: 'connector-housing', manufacturer: family.manufacturer, partNumber: family.housingPartNumber, description: `${family.name} housing`, quantity: 1, unit: 'ea', source: ref('connectorOccurrence', occurrence.id) });
    for (const population of occurrence.cavityPopulations) if (population.population.kind === 'plugged') addPart('plug', population.population.plugPartId, ref('connectorOccurrence', occurrence.id));
  }
  for (const termination of project.harness.terminations) {
    const source = ref('termination', termination.id);
    if (termination.terminalPartId) addPart('terminal', termination.terminalPartId, source);
    if (termination.sealPartId) addPart('seal', termination.sealPartId, source);
    if (termination.ringTerminalPartId) addPart('ring-terminal', termination.ringTerminalPartId, source);
    if (termination.processRef) addPart('process', termination.processRef, source);
  }
  for (const splice of project.harness.electricalSplices) {
    if (splice.splicePartId) addPart('splice', splice.splicePartId, ref('electricalSplice', splice.id));
    if (splice.processRef) addPart('process', splice.processRef, ref('electricalSplice', splice.id));
  }
  for (const row of cutList) {
    const conductor = project.harness.conductors.find((item) => item.id === row.wireId);
    const wire = conductor && project.harness.catalog.wireTypes.find((item) => item.id === conductor.wireTypeId);
    if (wire) atomic.push({ category: 'wire', manufacturer: wire.manufacturer, partNumber: wire.partNumber, description: `${wire.insulation}, ${gaugeText(wire.gauge)}, ${row.color}`, quantity: row.cutLengthMm / 1000, unit: 'm', source: ref('conductor', row.wireId), conductor: row.wireId });
  }
  const accessoryById = new Map((project.harness.catalog.accessoryMaterials ?? []).map((item) => [item.id, item]));
  for (const accessory of project.formboard.accessories ?? []) {
    const material = accessory.catalogPartId && accessoryById.get(accessory.catalogPartId);
    if (!material) continue;
    if (accessory.kind === 'label') atomic.push({ category: 'label', manufacturer: material.manufacturer, partNumber: material.partNumber, description: material.description, quantity: 1, unit: 'ea', source: ref('label', accessory.id) });
    else if (accessory.kind === 'tapeWrap') {
      const result = estimateTapeWrap(project, accessory);
      diagnostics.push(...result.diagnostics);
      if (result.estimate) atomic.push({ category: 'tape', manufacturer: material.manufacturer, partNumber: material.partNumber, description: material.description, quantity: result.estimate.estimatedTapeLengthMm / 1000, unit: 'm', source: ref('tapeWrap', accessory.id) });
    } else {
      const result = validateSleeveFit(project, accessory);
      diagnostics.push(...result.diagnostics);
      if (result.qualification.valid) atomic.push({ category: 'sleeve', manufacturer: material.manufacturer, partNumber: material.partNumber, description: material.description, quantity: result.qualification.cutLengthMm / 1000, unit: 'm', source: ref('sleeve', accessory.id) });
    }
  }
  const heatShrink = deriveHeatShrinkPlacements(project);
  diagnostics.push(...heatShrink.diagnostics);
  for (const placement of heatShrink.placements.filter((item) => item.valid)) {
    const material = accessoryById.get(placement.catalogPartId);
    if (material) atomic.push({ category: 'heat-shrink', manufacturer: material.manufacturer, partNumber: material.partNumber, description: material.description, quantity: Number(placement.cutLengthMm) / 1000, unit: 'm', source: ref('heatShrinkPlacement', placement.id), pieceCount: 1 });
  }
  const groups = new Map<string, Atomic[]>();
  for (const item of atomic) {
    const key = [item.category, item.manufacturer, item.partNumber, item.unit, item.category === 'wire' ? item.description : ''].join('|');
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const rows = [...groups.entries()].sort(([a], [b]) => naturalCompare(a, b)).map(([id, items]) => ({
    id, category: items[0].category, manufacturer: items[0].manufacturer, partNumber: items[0].partNumber,
    description: items[0].description, quantity: round(items.reduce((sum, item) => sum + item.quantity, 0)), unit: items[0].unit,
    conductorCount: items[0].category === 'wire' ? new Set(items.map((item) => item.conductor)).size : undefined,
    pieceCount: items.some((item) => item.pieceCount !== undefined) ? items.reduce((sum, item) => sum + (item.pieceCount ?? 0), 0) : undefined,
    sourceEntities: items.map((item) => item.source).sort((a, b) => naturalCompare(`${a.kind}:${a.id}`, `${b.kind}:${b.id}`))
  }));
  return { rows, diagnostics };
}

export function deriveAccessorySchedule(project: TominalProject): { rows: AccessoryScheduleRow[]; diagnostics: Diagnostic[] } {
  const rows: AccessoryScheduleRow[] = [];
  const diagnostics: Diagnostic[] = [];
  const catalog = new Map((project.harness.catalog.accessoryMaterials ?? []).map((item) => [item.id, item]));
  for (const accessory of [...(project.formboard.accessories ?? [])].sort((a, b) => naturalCompare(a.id, b.id))) {
    if (accessory.kind === 'label') {
      const position = accessoryPosition(project.formboard, accessory);
      if (!position) continue;
      rows.push({ kind: 'label', accessoryId: accessory.id, routeId: accessory.routeId, stationMm: Number(accessory.stationMm), text: accessory.text, xMm: Number(position.x), yMm: Number(position.y), catalogPartId: accessory.catalogPartId ?? '', notes: accessory.notes ?? '' });
    } else if (accessory.kind === 'tapeWrap') {
      const result = estimateTapeWrap(project, accessory);
      diagnostics.push(...result.diagnostics);
      const material = catalog.get(accessory.catalogPartId);
      if (result.estimate && material?.kind === 'tape') rows.push({ kind: 'tapeWrap', accessoryId: accessory.id, routeId: accessory.routeId, startStationMm: Number(accessory.startStationMm), endStationMm: Number(accessory.endStationMm), ...result.estimate, tapeWidthMm: Number(material.widthMm), overlapFraction: accessory.overlapFraction, wasteFactor: accessory.wasteFactor, catalogPartId: accessory.catalogPartId, notes: accessory.notes ?? '' });
    } else {
      const result = validateSleeveFit(project, accessory);
      diagnostics.push(...result.diagnostics);
      if (result.qualification.maxBundleDiameterMm !== undefined && result.qualification.requiredInnerDiameterMm !== undefined) rows.push({ kind: 'sleeve', accessoryId: accessory.id, routeId: accessory.routeId, startStationMm: Number(accessory.startStationMm), endStationMm: Number(accessory.endStationMm), spanLengthMm: result.qualification.spanLengthMm, cutLengthMm: result.qualification.cutLengthMm, maxBundleDiameterMm: result.qualification.maxBundleDiameterMm, requiredInnerDiameterMm: result.qualification.requiredInnerDiameterMm, catalogPartId: accessory.catalogPartId, notes: accessory.notes ?? '' });
    }
  }
  const heatShrink = deriveHeatShrinkPlacements(project);
  diagnostics.push(...heatShrink.diagnostics);
  rows.push(...heatShrink.placements.map((item) => ({ kind: 'heatShrink' as const, accessoryId: item.id, terminationId: item.terminationId, conductorId: item.conductorId, pieceQuantity: 1 as const, wireOuterDiameterMm: Number(item.wireOuterDiameterMm), substrateMaxDiameterMm: Number(item.substrateMaxDiameterMm), suppliedInnerDiameterMm: Number(item.suppliedInnerDiameterMm), recoveredInnerDiameterMm: Number(item.recoveredInnerDiameterMm), cutLengthMm: Number(item.cutLengthMm), catalogPartId: item.catalogPartId, notes: item.valid ? 'Fit validated.' : 'INVALID FIT' })));
  return { rows, diagnostics };
}

export function deriveManufacturingArtifacts(project: TominalProject): ArtifactProjection {
  const cut = deriveCutList(project);
  const bom = deriveBom(project, cut.rows);
  const accessories = deriveAccessorySchedule(project);
  return { cutList: cut.rows, bom: bom.rows, accessorySchedule: accessories.rows, diagnostics: sortDiagnostics([...cut.diagnostics, ...bom.diagnostics, ...accessories.diagnostics]) };
}
