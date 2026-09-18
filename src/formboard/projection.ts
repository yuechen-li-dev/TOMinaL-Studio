import type { EntityRef, HarnessIr } from '@/harness-core';
import type { FormboardDocument, PointMm } from './model';
import { layoutRouteLengthCallouts } from './labelLayout';
import { cubicSpans } from './metrics';
import { getRouteSpanPolyline, getRouteStationPoint } from './metrics';
import { deriveHeatShrinkPlacements } from './accessories';

export type FormboardProjectionRecord =
  | { readonly kind: 'contextRect'; readonly id: string; readonly origin: PointMm; readonly widthMm: number; readonly heightMm: number; readonly label?: string }
  | { readonly kind: 'connector'; readonly id: string; readonly position: PointMm; readonly rotationDeg: number; readonly label: string; readonly entity: EntityRef }
  | { readonly kind: 'splice'; readonly id: string; readonly position: PointMm; readonly label: string; readonly entity: EntityRef }
  | { readonly kind: 'junction'; readonly id: string; readonly position: PointMm; readonly label: string; readonly entity: EntityRef }
  | { readonly kind: 'stud'; readonly id: string; readonly position: PointMm; readonly label: string; readonly entity: EntityRef }
  | { readonly kind: 'path'; readonly id: string; readonly points: readonly PointMm[]; readonly geometryKind: 'polyline' | 'cubicSpline'; readonly widthMm: number; readonly entity: EntityRef }
  | { readonly kind: 'routeCallout'; readonly id: string; readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly text: string; readonly entity: EntityRef }
  | { readonly kind: 'label'; readonly id: string; readonly position: PointMm; readonly text: string; readonly entity?: EntityRef }
  | { readonly kind: 'accessorySpan'; readonly id: string; readonly points: readonly PointMm[]; readonly widthMm: number; readonly accessoryKind: 'tapeWrap' | 'sleeve'; readonly text: string; readonly entity: EntityRef }
  | { readonly kind: 'accessoryCallout'; readonly id: string; readonly anchor: PointMm; readonly position: PointMm; readonly text: string; readonly entity: EntityRef }
  | { readonly kind: 'heatShrink'; readonly id: string; readonly position: PointMm; readonly text: string; readonly entity: EntityRef };

export type FormboardProjection = {
  readonly board: FormboardDocument['board'];
  readonly records: readonly FormboardProjectionRecord[];
};

export function projectFormboard(harness: HarnessIr, document: FormboardDocument): FormboardProjection {
  const connectorLabels = new Map(harness.connectorOccurrences.map((item) => [item.id, item.role]));
  const junctionLabels = new Map(harness.routeJunctions.map((item) => [item.id, item.role ?? item.id]));
  const records: FormboardProjectionRecord[] = [];
  records.push(...document.context.map((item) => ({ kind: 'contextRect' as const, id: item.id, origin: item.origin, widthMm: Number(item.widthMm), heightMm: Number(item.heightMm), label: item.label })));
  records.push(...document.segmentGeometry.map((item) => ({ kind: 'path' as const, id: item.routeSegmentId, points: item.points, geometryKind: item.geometryKind ?? 'polyline', widthMm: Number(item.bundleDiameterMm ?? 4), entity: { kind: 'routeSegment' as const, id: item.routeSegmentId } })));
  records.push(...document.connectorPlacements.map((item) => ({ kind: 'connector' as const, id: item.connectorOccurrenceId, position: item.position, rotationDeg: Number(item.rotationDeg), label: connectorLabels.get(item.connectorOccurrenceId) ?? item.connectorOccurrenceId, entity: { kind: 'connectorOccurrence' as const, id: item.connectorOccurrenceId } })));
  records.push(...document.splicePlacements.map((item) => ({ kind: 'splice' as const, id: item.electricalSpliceId, position: item.position, label: item.electricalSpliceId, entity: { kind: 'electricalSplice' as const, id: item.electricalSpliceId } })));
  records.push(...document.routeJunctionPlacements.map((item) => ({ kind: 'junction' as const, id: item.routeJunctionId, position: item.position, label: junctionLabels.get(item.routeJunctionId) ?? item.routeJunctionId, entity: { kind: 'routeJunction' as const, id: item.routeJunctionId } })));
  records.push(...document.studPlacements.map((item) => ({ kind: 'stud' as const, id: item.studId, position: item.position, label: item.studId, entity: { kind: 'catalogPart' as const, id: item.studId } })));
  records.push(...document.annotations.map((item) => ({ kind: 'label' as const, id: item.id, position: item.position, text: item.text, entity: item.entity as EntityRef | undefined })));
  for (const accessory of document.accessories ?? []) {
    if (accessory.kind === 'label') {
      const anchor = getRouteStationPoint(document, accessory.routeId, Number(accessory.stationMm));
      if (anchor) records.push({ kind: 'accessoryCallout', id: accessory.id, anchor, position: accessory.calloutPosition ?? { x: anchor.x, y: (Number(anchor.y) - 18) as PointMm['y'] }, text: `${accessory.id} · ${accessory.text} · ${Number(accessory.stationMm)} mm`, entity: { kind: 'label', id: accessory.id } });
    } else {
      const points = getRouteSpanPolyline(document, accessory.routeId, Number(accessory.startStationMm), Number(accessory.endStationMm));
      if (points.length >= 2) records.push({ kind: 'accessorySpan', id: accessory.id, points, widthMm: accessory.kind === 'tapeWrap' ? 8 : 11, accessoryKind: accessory.kind, text: accessory.id, entity: { kind: accessory.kind === 'tapeWrap' ? 'tapeWrap' : 'sleeve', id: accessory.id } });
    }
  }
  const endpointPosition = (terminationId: string): PointMm | undefined => {
    const termination = harness.terminations.find((item) => item.id === terminationId);
    if (!termination) return undefined;
    if (termination.target.kind === 'connectorCavity') {
      const id = termination.target.occurrenceId;
      return document.connectorPlacements.find((item) => item.connectorOccurrenceId === id)?.position;
    }
    if (termination.target.kind === 'electricalSplicePort') {
      const id = termination.target.spliceId;
      return document.splicePlacements.find((item) => item.electricalSpliceId === id)?.position;
    }
    if (termination.target.kind === 'stud') {
      const id = termination.target.studId;
      return document.studPlacements.find((item) => item.studId === id)?.position;
    }
    return undefined;
  };
  for (const placement of deriveHeatShrinkPlacements({ harness, formboard: document }).placements) {
    const position = endpointPosition(placement.terminationId);
    if (position) records.push({ kind: 'heatShrink', id: placement.id, position, text: `${placement.id} · ${Number(placement.cutLengthMm)} mm`, entity: { kind: 'heatShrinkPlacement', id: placement.id } });
  }
  records.push(...layoutRouteLengthCallouts(document).map((item) => ({
    kind: 'routeCallout' as const,
    id: `route-label:${item.routeId}`,
    x: item.rect.x,
    y: item.rect.y,
    width: item.rect.width,
    height: item.rect.height,
    text: item.text,
    entity: { kind: 'route' as const, id: item.routeId }
  })));
  return { board: document.board, records };
}

export type FormboardSurface = {
  readonly render: (projection: FormboardProjection) => unknown;
};

export type MachinaSceneRecord =
  | { readonly type: 'rect'; readonly id: string; readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly role: string }
  | { readonly type: 'path'; readonly id: string; readonly d: string; readonly strokeWidth: number; readonly role: string }
  | { readonly type: 'marker'; readonly id: string; readonly x: number; readonly y: number; readonly marker: 'connector' | 'splice' | 'junction' | 'stud'; readonly role: string }
  | { readonly type: 'callout'; readonly id: string; readonly entityId: string; readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly text: string; readonly role: string; readonly anchorX?: number; readonly anchorY?: number }
  | { readonly type: 'text'; readonly id: string; readonly x: number; readonly y: number; readonly text: string };

const pathData = (points: readonly PointMm[]) => points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${Number(point.x)} ${Number(point.y)}`).join(' ');

export function splinePathData(points: readonly PointMm[]): string {
  const spans = cubicSpans(points);
  if (spans.length === 0) return '';
  return [`M ${Number(spans[0][0].x)} ${Number(spans[0][0].y)}`, ...spans.map((span) => `C ${Number(span[1].x)} ${Number(span[1].y)} ${Number(span[2].x)} ${Number(span[2].y)} ${Number(span[3].x)} ${Number(span[3].y)}`)].join(' ');
}

export function formboardProjectionToMachinaScene(projection: FormboardProjection): readonly MachinaSceneRecord[] {
  return projection.records.map((record): MachinaSceneRecord => {
    if (record.kind === 'contextRect') return { type: 'rect', id: record.id, x: Number(record.origin.x), y: Number(record.origin.y), width: record.widthMm, height: record.heightMm, role: 'context' };
    if (record.kind === 'path') return { type: 'path', id: record.id, d: record.geometryKind === 'cubicSpline' ? splinePathData(record.points) : pathData(record.points), strokeWidth: record.widthMm, role: 'routeSegment' };
    if (record.kind === 'accessorySpan') return { type: 'path', id: record.id, d: pathData(record.points), strokeWidth: record.widthMm, role: record.accessoryKind };
    if (record.kind === 'accessoryCallout') return { type: 'callout', id: record.id, entityId: record.entity.id, x: Number(record.position.x), y: Number(record.position.y), width: Math.max(42, record.text.length * 2.2), height: 10, text: record.text, role: 'accessoryLabel', anchorX: Number(record.anchor.x), anchorY: Number(record.anchor.y) };
    if (record.kind === 'heatShrink') return { type: 'callout', id: record.id, entityId: record.entity.id, x: Number(record.position.x) + 8, y: Number(record.position.y) + 8, width: Math.max(36, record.text.length * 2.2), height: 10, text: record.text, role: 'heatShrink', anchorX: Number(record.position.x), anchorY: Number(record.position.y) };
    if (record.kind === 'routeCallout') return { type: 'callout', id: record.id, entityId: record.entity.id, x: record.x, y: record.y, width: record.width, height: record.height, text: record.text, role: 'routeLength' };
    if (record.kind === 'label') return { type: 'text', id: record.id, x: Number(record.position.x), y: Number(record.position.y), text: record.text };
    return { type: 'marker', id: record.id, x: Number(record.position.x), y: Number(record.position.y), marker: record.kind, role: record.entity.kind };
  });
}
