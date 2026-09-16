import type { FormboardDocument } from './model';

const by = <T>(values: readonly T[], key: (value: T) => string): T[] => [...values].sort((left, right) => key(left).localeCompare(key(right)));

export function orderedFormboard(document: FormboardDocument): FormboardDocument {
  return {
    ...document,
    connectorPlacements: by(document.connectorPlacements, (item) => item.connectorOccurrenceId),
    splicePlacements: by(document.splicePlacements, (item) => item.electricalSpliceId),
    routeJunctionPlacements: by(document.routeJunctionPlacements, (item) => item.routeJunctionId),
    studPlacements: by(document.studPlacements, (item) => item.studId),
    segmentGeometry: by(document.segmentGeometry, (item) => item.routeSegmentId),
    routes: by(document.routes, (item) => item.routeId),
    annotations: by(document.annotations, (item) => item.id),
    dimensions: by(document.dimensions, (item) => item.id),
    context: by(document.context, (item) => item.id)
  };
}

export function serializeFormboard(document: FormboardDocument): string {
  return `${JSON.stringify(orderedFormboard(document), null, 2)}\n`;
}

export function parseFormboard(text: string): FormboardDocument {
  const parsed = JSON.parse(text) as Partial<FormboardDocument>;
  if (parsed.formboardVersion !== '1') throw new Error(`Unsupported formboard version ${String(parsed.formboardVersion)}.`);
  if (!parsed.board || !Array.isArray(parsed.segmentGeometry) || !Array.isArray(parsed.routes)) throw new Error('Invalid FormboardDocument.');
  return parsed as FormboardDocument;
}

