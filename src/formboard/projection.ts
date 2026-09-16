import type { EntityRef, HarnessIr } from '@/harness-core';
import type { FormboardDocument, PointMm } from './model';
import { layoutRouteLengthCallouts } from './labelLayout';
import { cubicSpans } from './metrics';

export type FormboardProjectionRecord =
  | { readonly kind: 'contextRect'; readonly id: string; readonly origin: PointMm; readonly widthMm: number; readonly heightMm: number; readonly label?: string }
  | { readonly kind: 'connector'; readonly id: string; readonly position: PointMm; readonly rotationDeg: number; readonly label: string; readonly entity: EntityRef }
  | { readonly kind: 'splice'; readonly id: string; readonly position: PointMm; readonly label: string; readonly entity: EntityRef }
  | { readonly kind: 'junction'; readonly id: string; readonly position: PointMm; readonly label: string; readonly entity: EntityRef }
  | { readonly kind: 'stud'; readonly id: string; readonly position: PointMm; readonly label: string; readonly entity: EntityRef }
  | { readonly kind: 'path'; readonly id: string; readonly points: readonly PointMm[]; readonly geometryKind: 'polyline' | 'cubicSpline'; readonly widthMm: number; readonly entity: EntityRef }
  | { readonly kind: 'routeCallout'; readonly id: string; readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly text: string; readonly entity: EntityRef }
  | { readonly kind: 'label'; readonly id: string; readonly position: PointMm; readonly text: string; readonly entity?: EntityRef };

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
  | { readonly type: 'callout'; readonly id: string; readonly entityId: string; readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly text: string; readonly role: string }
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
    if (record.kind === 'routeCallout') return { type: 'callout', id: record.id, entityId: record.entity.id, x: record.x, y: record.y, width: record.width, height: record.height, text: record.text, role: 'routeLength' };
    if (record.kind === 'label') return { type: 'text', id: record.id, x: Number(record.position.x), y: Number(record.position.y), text: record.text };
    return { type: 'marker', id: record.id, x: Number(record.position.x), y: Number(record.position.y), marker: record.kind, role: record.entity.kind };
  });
}
