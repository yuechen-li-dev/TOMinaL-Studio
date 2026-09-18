import type { ConductorId, HarnessIr, Millimeters, RouteId, RouteSegmentId } from '@/harness-core';
import type { FormboardDocument, PhysicalRouteNodeRef, PointMm, RouteSegmentGeometry } from './model';

export type ResolvedLength =
  | { readonly status: 'resolved'; readonly valueMm: Millimeters; readonly source: 'geometry' | 'override' }
  | { readonly status: 'unresolved'; readonly reason: string };

export function pointDistanceMm(left: PointMm, right: PointMm): Millimeters {
  return Math.hypot(Number(right.x) - Number(left.x), Number(right.y) - Number(left.y)) as Millimeters;
}

export type CubicSpan = readonly [PointMm, PointMm, PointMm, PointMm];

const coordinate = (value: number) => value as Millimeters;

/** Converts Catmull-Rom knots to cubic Bezier spans with a fixed 1/6 tangent scale. */
export function cubicSpans(points: readonly PointMm[]): readonly CubicSpan[] {
  const spans: CubicSpan[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[Math.max(0, index - 1)];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[Math.min(points.length - 1, index + 2)];
    spans.push([
      p1,
      { x: coordinate(Number(p1.x) + (Number(p2.x) - Number(p0.x)) / 6), y: coordinate(Number(p1.y) + (Number(p2.y) - Number(p0.y)) / 6) },
      { x: coordinate(Number(p2.x) - (Number(p3.x) - Number(p1.x)) / 6), y: coordinate(Number(p2.y) - (Number(p3.y) - Number(p1.y)) / 6) },
      p2
    ]);
  }
  return spans;
}

function cubicPoint(span: CubicSpan, t: number): PointMm {
  const u = 1 - t;
  const weights = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return {
    x: coordinate(span.reduce((sum, point, index) => sum + Number(point.x) * weights[index], 0)),
    y: coordinate(span.reduce((sum, point, index) => sum + Number(point.y) * weights[index], 0))
  };
}

function flattenCubic(span: CubicSpan): PointMm[] {
  const points: PointMm[] = [span[0]];
  const recurse = (from: number, to: number, a: PointMm, b: PointMm, depth: number) => {
    const mid = (from + to) / 2;
    const m = cubicPoint(span, mid);
    const chord = Number(pointDistanceMm(a, b));
    const split = Number(pointDistanceMm(a, m)) + Number(pointDistanceMm(m, b));
    if (depth >= 12 || split - chord <= 0.001) {
      points.push(b);
      return;
    }
    recurse(from, mid, a, m, depth + 1);
    recurse(mid, to, m, b, depth + 1);
  };
  recurse(0, 1, span[0], span[3], 0);
  return points;
}

export function pathPolyline(
  points: readonly [PointMm, PointMm, ...PointMm[]],
  geometryKind: 'polyline' | 'cubicSpline' = 'polyline'
): readonly PointMm[] {
  if (geometryKind === 'polyline') return points;
  return cubicSpans(points).flatMap((span, index) => flattenCubic(span).slice(index === 0 ? 0 : 1));
}

export function pointAtPathStation(
  points: readonly [PointMm, PointMm, ...PointMm[]],
  stationMm: number,
  geometryKind: 'polyline' | 'cubicSpline' = 'polyline'
): PointMm | undefined {
  const flattened = pathPolyline(points, geometryKind);
  const total = Number(getPathLength(points, geometryKind));
  if (!Number.isFinite(stationMm) || stationMm < 0 || stationMm > total + 1e-6) return undefined;
  if (stationMm <= 0) return flattened[0];
  let traversed = 0;
  for (let index = 1; index < flattened.length; index += 1) {
    const length = Number(pointDistanceMm(flattened[index - 1], flattened[index]));
    if (traversed + length >= stationMm || index === flattened.length - 1) {
      const ratio = length === 0 ? 0 : Math.min(1, Math.max(0, (stationMm - traversed) / length));
      return {
        x: coordinate(Number(flattened[index - 1].x) + (Number(flattened[index].x) - Number(flattened[index - 1].x)) * ratio),
        y: coordinate(Number(flattened[index - 1].y) + (Number(flattened[index].y) - Number(flattened[index - 1].y)) * ratio)
      };
    }
    traversed += length;
  }
  return flattened[flattened.length - 1];
}

function cubicArcLength(span: CubicSpan): number {
  const recurse = (from: number, to: number, a: PointMm, b: PointMm, depth: number): number => {
    const mid = (from + to) / 2;
    const m = cubicPoint(span, mid);
    const chord = Number(pointDistanceMm(a, b));
    const split = Number(pointDistanceMm(a, m)) + Number(pointDistanceMm(m, b));
    if (depth >= 12 || split - chord <= 0.001) return split;
    return recurse(from, mid, a, m, depth + 1) + recurse(mid, to, m, b, depth + 1);
  };
  return recurse(0, 1, span[0], span[3], 0);
}

export function getPathLength(
  points: readonly [PointMm, PointMm, ...PointMm[]],
  geometryKind: 'polyline' | 'cubicSpline' = 'polyline'
): Millimeters {
  if (geometryKind === 'cubicSpline') {
    return cubicSpans(points).reduce((sum, span) => sum + cubicArcLength(span), 0) as Millimeters;
  }
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Number(pointDistanceMm(points[index - 1], points[index]));
  }
  return length as Millimeters;
}

export function getSegmentLength(
  formboard: FormboardDocument,
  segmentId: RouteSegmentId
): ResolvedLength {
  const geometry = formboard.segmentGeometry.find((segment) => segment.routeSegmentId === segmentId);
  if (!geometry) return { status: 'unresolved', reason: `Route segment ${segmentId} has no physical geometry.` };
  if (geometry.lengthOverride) {
    return { status: 'resolved', valueMm: geometry.lengthOverride.valueMm, source: 'override' };
  }
  return { status: 'resolved', valueMm: getPathLength(geometry.points, geometry.geometryKind), source: 'geometry' };
}

function sameNode(left: PhysicalRouteNodeRef, right: PhysicalRouteNodeRef): boolean {
  return left.kind === right.kind && left.id === right.id;
}

export type TraversedSegment = {
  readonly geometry: RouteSegmentGeometry;
  readonly reversed: boolean;
};

export function traverseRoute(
  formboard: FormboardDocument,
  routeId: RouteId
): { readonly status: 'resolved'; readonly segments: readonly TraversedSegment[] } | { readonly status: 'unresolved'; readonly reason: string } {
  const route = formboard.routes.find((candidate) => candidate.routeId === routeId);
  if (!route) return { status: 'unresolved', reason: `Route ${routeId} has no formboard route.` };
  if (route.segmentIds.length === 0) return { status: 'unresolved', reason: `Route ${routeId} has no segments.` };
  const byId = new Map(formboard.segmentGeometry.map((segment) => [segment.routeSegmentId, segment]));
  const first = byId.get(route.segmentIds[0]);
  if (!first) return { status: 'unresolved', reason: `Route ${routeId} references missing segment ${route.segmentIds[0]}.` };

  const tryDirection = (reversed: boolean): TraversedSegment[] | undefined => {
    const result: TraversedSegment[] = [{ geometry: first, reversed }];
    let cursor = reversed ? first.from : first.to;
    for (const segmentId of route.segmentIds.slice(1)) {
      const segment = byId.get(segmentId);
      if (!segment) return undefined;
      if (sameNode(segment.from, cursor)) {
        result.push({ geometry: segment, reversed: false });
        cursor = segment.to;
      } else if (sameNode(segment.to, cursor)) {
        result.push({ geometry: segment, reversed: true });
        cursor = segment.from;
      } else return undefined;
    }
    return result;
  };

  const segments = tryDirection(false) ?? tryDirection(true);
  return segments
    ? { status: 'resolved', segments }
    : { status: 'unresolved', reason: `Route ${routeId} is not an endpoint-continuous ordered segment chain.` };
}

export function getRouteLength(formboard: FormboardDocument, routeId: RouteId): ResolvedLength {
  const traversal = traverseRoute(formboard, routeId);
  if (traversal.status === 'unresolved') return traversal;
  let total = 0;
  let hasOverride = false;
  for (const segment of traversal.segments) {
    const length = getSegmentLength(formboard, segment.geometry.routeSegmentId);
    if (length.status === 'unresolved') return length;
    total += Number(length.valueMm);
    hasOverride ||= length.source === 'override';
  }
  return { status: 'resolved', valueMm: total as Millimeters, source: hasOverride ? 'override' : 'geometry' };
}

export function getRouteStationPoint(formboard: FormboardDocument, routeId: RouteId, stationMm: number): PointMm | undefined {
  const traversal = traverseRoute(formboard, routeId);
  if (traversal.status === 'unresolved' || !Number.isFinite(stationMm) || stationMm < 0) return undefined;
  let cursor = 0;
  for (const segment of traversal.segments) {
    const geometry = segment.geometry;
    const points = (segment.reversed ? [...geometry.points].reverse() : geometry.points) as [PointMm, PointMm, ...PointMm[]];
    const length = Number(getPathLength(points, geometry.geometryKind));
    if (stationMm <= cursor + length + 1e-6) return pointAtPathStation(points, stationMm - cursor, geometry.geometryKind);
    cursor += length;
  }
  if (Math.abs(stationMm - cursor) > 1e-6) return undefined;
  const last = traversal.segments[traversal.segments.length - 1];
  return last.reversed ? last.geometry.points[0] : last.geometry.points[last.geometry.points.length - 1];
}

export function getRouteSpanPolyline(formboard: FormboardDocument, routeId: RouteId, startStationMm: number, endStationMm: number): readonly PointMm[] {
  if (!(endStationMm > startStationMm)) return [];
  const count = Math.max(2, Math.ceil((endStationMm - startStationMm) / 10) + 1);
  return Array.from({ length: count }, (_, index) => getRouteStationPoint(formboard, routeId, startStationMm + (endStationMm - startStationMm) * index / (count - 1))).filter((point): point is PointMm => point !== undefined);
}

export function getConductorRouteLength(
  harness: HarnessIr,
  formboard: FormboardDocument,
  conductorId: ConductorId
): ResolvedLength {
  const conductor = harness.conductors.find((candidate) => candidate.id === conductorId);
  if (!conductor) return { status: 'unresolved', reason: `Conductor ${conductorId} does not exist.` };
  if (!conductor.routeId) return { status: 'unresolved', reason: `Conductor ${conductorId} has no physical route binding.` };
  return getRouteLength(formboard, conductor.routeId);
}
