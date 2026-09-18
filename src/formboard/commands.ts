import type {
  ConnectorOccurrenceId,
  ElectricalSpliceId,
  RouteId,
  RouteJunctionId,
  RouteSegmentId
} from '@/harness-core';
import type { Diagnostic } from '@/harness-core';
import type {
  ConnectorPlacement,
  ElectricalSplicePlacement,
  FormboardAnnotation,
  FormboardDocument,
  FormboardRoute,
  PointMm,
  RouteJunctionPlacement,
  RouteSegmentGeometry
} from './model';

export type FormboardCommandResult = {
  readonly document: FormboardDocument;
  readonly diagnostics: readonly Diagnostic[];
};

const ok = (document: FormboardDocument): FormboardCommandResult => ({ document, diagnostics: [] });

function moveEndpointPoints(
  segment: RouteSegmentGeometry,
  kind: 'connector' | 'splice' | 'junction',
  id: string,
  position: PointMm
): RouteSegmentGeometry {
  const points = [...segment.points];
  if (segment.from.kind === kind && segment.from.id === id) points[0] = position;
  if (segment.to.kind === kind && segment.to.id === id) points[points.length - 1] = position;
  return { ...segment, points: points as [PointMm, PointMm, ...PointMm[]] };
}

export function placeConnector(document: FormboardDocument, placement: ConnectorPlacement): FormboardCommandResult {
  return ok({
    ...document,
    connectorPlacements: [
      ...document.connectorPlacements.filter((item) => item.connectorOccurrenceId !== placement.connectorOccurrenceId),
      placement
    ]
  });
}

export function moveConnector(
  document: FormboardDocument,
  id: ConnectorOccurrenceId,
  position: PointMm
): FormboardCommandResult {
  return ok({
    ...document,
    connectorPlacements: document.connectorPlacements.map((item) =>
      item.connectorOccurrenceId === id ? { ...item, position } : item
    ),
    segmentGeometry: document.segmentGeometry.map((segment) => moveEndpointPoints(segment, 'connector', id, position))
  });
}

export function placeSplice(document: FormboardDocument, placement: ElectricalSplicePlacement): FormboardCommandResult {
  return ok({
    ...document,
    splicePlacements: [
      ...document.splicePlacements.filter((item) => item.electricalSpliceId !== placement.electricalSpliceId),
      placement
    ]
  });
}

export function placeRouteJunction(
  document: FormboardDocument,
  placement: RouteJunctionPlacement
): FormboardCommandResult {
  return ok({
    ...document,
    routeJunctionPlacements: [
      ...document.routeJunctionPlacements.filter((item) => item.routeJunctionId !== placement.routeJunctionId),
      placement
    ]
  });
}

export function moveRouteJunction(
  document: FormboardDocument,
  id: RouteJunctionId,
  position: PointMm
): FormboardCommandResult {
  return ok({
    ...document,
    routeJunctionPlacements: document.routeJunctionPlacements.map((item) =>
      item.routeJunctionId === id ? { ...item, position } : item
    ),
    segmentGeometry: document.segmentGeometry.map((segment) => moveEndpointPoints(segment, 'junction', id, position))
  });
}

export function addRouteSegment(document: FormboardDocument, segment: RouteSegmentGeometry): FormboardCommandResult {
  return ok({
    ...document,
    segmentGeometry: [...document.segmentGeometry.filter((item) => item.routeSegmentId !== segment.routeSegmentId), segment]
  });
}

export function updateRouteSegment(
  document: FormboardDocument,
  id: RouteSegmentId,
  patch: Partial<Omit<RouteSegmentGeometry, 'routeSegmentId'>>
): FormboardCommandResult {
  return ok({
    ...document,
    segmentGeometry: document.segmentGeometry.map((segment) =>
      segment.routeSegmentId === id ? { ...segment, ...patch } : segment
    )
  });
}

export function deleteRouteSegment(document: FormboardDocument, id: RouteSegmentId): FormboardCommandResult {
  return ok({
    ...document,
    segmentGeometry: document.segmentGeometry.filter((segment) => segment.routeSegmentId !== id),
    routes: document.routes.map((route) => ({
      ...route,
      segmentIds: route.segmentIds.filter((segmentId) => segmentId !== id)
    }))
  });
}

export function setRoute(document: FormboardDocument, route: FormboardRoute): FormboardCommandResult {
  return ok({ ...document, routes: [...document.routes.filter((item) => item.routeId !== route.routeId), route] });
}

export function addAnnotation(document: FormboardDocument, annotation: FormboardAnnotation): FormboardCommandResult {
  return ok({ ...document, annotations: [...document.annotations.filter((item) => item.id !== annotation.id), annotation] });
}

export function routeRelatedConductors(harness: import('@/harness-core').HarnessIr, routeId: RouteId) {
  const route = harness.routes.find((item) => item.id === routeId);
  const segments = new Set(route?.segmentIds ?? []);
  return harness.conductors.filter((conductor) => {
    if (!conductor.routeId) return false;
    const bound = harness.routes.find((item) => item.id === conductor.routeId);
    return bound?.segmentIds.some((segmentId) => segments.has(segmentId)) ?? false;
  }).map((conductor) => conductor.id);
}

export function moveSplice(
  document: FormboardDocument,
  id: ElectricalSpliceId,
  position: PointMm
): FormboardCommandResult {
  return ok({
    ...document,
    splicePlacements: document.splicePlacements.map((item) =>
      item.electricalSpliceId === id ? { ...item, position } : item
    ),
    segmentGeometry: document.segmentGeometry.map((segment) => moveEndpointPoints(segment, 'splice', id, position))
  });
}
