import { sortDiagnostics, type Diagnostic, type EntityRef, type HarnessIr } from '@/harness-core';
import type { FormboardDocument, PhysicalRouteNodeRef, PointMm } from './model';
import { getPathLength, getSegmentLength, traverseRoute } from './metrics';

const ref = (kind: EntityRef['kind'], id: string): EntityRef => ({ kind, id });

function issue(
  severity: Diagnostic['severity'],
  rule: string,
  entity: EntityRef,
  message: string
): Diagnostic {
  return { id: `${rule}:${entity.kind}:${entity.id}`, severity, rule, entity, message };
}

function validPoint(point: PointMm): boolean {
  return Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y)) && Number(point.x) >= 0 && Number(point.y) >= 0;
}

function nodeKey(node: PhysicalRouteNodeRef): string {
  return `${node.kind}:${node.id}`;
}

function endpointForTermination(harness: HarnessIr, terminationId: string | undefined): PhysicalRouteNodeRef | undefined {
  const termination = harness.terminations.find((candidate) => candidate.id === terminationId);
  if (!termination) return undefined;
  switch (termination.target.kind) {
    case 'connectorCavity':
      return { kind: 'connector', id: termination.target.occurrenceId };
    case 'electricalSplicePort':
      return { kind: 'splice', id: termination.target.spliceId };
    case 'stud':
      return { kind: 'stud', id: termination.target.studId };
    case 'serviceEnd':
      return undefined;
  }
}

function routeEnds(formboard: FormboardDocument, routeId: string): readonly [PhysicalRouteNodeRef, PhysicalRouteNodeRef] | undefined {
  const route = formboard.routes.find((candidate) => candidate.routeId === routeId);
  if (!route) return undefined;
  const traversal = traverseRoute(formboard, route.routeId);
  if (traversal.status === 'unresolved' || traversal.segments.length === 0) return undefined;
  const first = traversal.segments[0];
  const last = traversal.segments[traversal.segments.length - 1];
  return [first.reversed ? first.geometry.to : first.geometry.from, last.reversed ? last.geometry.from : last.geometry.to];
}

export function validateFormboard(harness: HarnessIr, formboard: FormboardDocument): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  if (Number(formboard.board.widthMm) <= 0 || Number(formboard.board.heightMm) <= 0) {
    diagnostics.push(issue('error', 'formboard.board.invalidDimensions', ref('harness', harness.id), 'Board width and height must be positive millimetre values.'));
  }
  if (formboard.harnessId !== harness.id) {
    diagnostics.push(issue('error', 'formboard.harness.mismatch', ref('harness', harness.id), `Formboard targets ${formboard.harnessId}, not ${harness.id}.`));
  }

  const placedConnectors = new Set(formboard.connectorPlacements.map((placement) => placement.connectorOccurrenceId));
  const placedSplices = new Set(formboard.splicePlacements.map((placement) => placement.electricalSpliceId));
  const placedJunctions = new Set(formboard.routeJunctionPlacements.map((placement) => placement.routeJunctionId));
  const placedStuds = new Set(formboard.studPlacements.map((placement) => placement.studId));
  for (const connector of harness.connectorOccurrences) {
    if (!placedConnectors.has(connector.id)) diagnostics.push(issue('warning', 'formboard.connector.unplaced', ref('connectorOccurrence', connector.id), `Connector ${connector.id} has no formboard placement.`));
  }
  for (const splice of harness.electricalSplices) {
    if (!placedSplices.has(splice.id)) diagnostics.push(issue('warning', 'formboard.splice.unplaced', ref('electricalSplice', splice.id), `Electrical splice ${splice.id} has no formboard placement.`));
  }
  for (const junction of harness.routeJunctions) {
    if (!placedJunctions.has(junction.id)) diagnostics.push(issue('warning', 'formboard.junction.unplaced', ref('routeJunction', junction.id), `Physical route junction ${junction.id} has no formboard placement.`));
  }
  for (const stud of harness.catalog.studs ?? []) {
    if (!placedStuds.has(stud.id)) diagnostics.push(issue('warning', 'formboard.stud.unplaced', ref('catalogPart', stud.id), `Stud ${stud.id} has no formboard placement.`));
  }

  const allPoints: Array<{ point: PointMm; entity: EntityRef }> = [
    ...formboard.connectorPlacements.map((placement) => ({ point: placement.position, entity: ref('connectorOccurrence', placement.connectorOccurrenceId) })),
    ...formboard.splicePlacements.map((placement) => ({ point: placement.position, entity: ref('electricalSplice', placement.electricalSpliceId) })),
    ...formboard.routeJunctionPlacements.map((placement) => ({ point: placement.position, entity: ref('routeJunction', placement.routeJunctionId) })),
    ...formboard.segmentGeometry.flatMap((segment) => segment.points.map((point) => ({ point, entity: ref('routeSegment', segment.routeSegmentId) })))
  ];
  for (const { point, entity } of allPoints) {
    if (!validPoint(point)) diagnostics.push(issue('error', 'formboard.geometry.invalidCoordinate', entity, 'Formboard coordinates must be finite and non-negative.'));
    else if (formboard.board.forbidGeometryOutsideBoard && (Number(point.x) > Number(formboard.board.widthMm) || Number(point.y) > Number(formboard.board.heightMm))) {
      diagnostics.push(issue('error', 'formboard.geometry.outsideBoard', entity, `Geometry at ${point.x},${point.y} mm lies outside the board.`));
    }
  }

  const segmentIds = new Set(formboard.segmentGeometry.map((segment) => segment.routeSegmentId));
  const nodePositions = new Map<string, PointMm>([
    ...formboard.connectorPlacements.map((item) => [`connector:${item.connectorOccurrenceId}`, item.position] as const),
    ...formboard.splicePlacements.map((item) => [`splice:${item.electricalSpliceId}`, item.position] as const),
    ...formboard.routeJunctionPlacements.map((item) => [`junction:${item.routeJunctionId}`, item.position] as const),
    ...formboard.studPlacements.map((item) => [`stud:${item.studId}`, item.position] as const)
  ]);
  for (const segment of formboard.segmentGeometry) {
    const endpointPairs = [[segment.from, segment.points[0]], [segment.to, segment.points[segment.points.length - 1]]] as const;
    for (const [endpoint, point] of endpointPairs) {
      const placement = nodePositions.get(nodeKey(endpoint));
      if (!placement) {
        diagnostics.push(issue('error', 'formboard.segment.missingEndpointPlacement', ref('routeSegment', segment.routeSegmentId), `Route segment ${segment.routeSegmentId} endpoint ${nodeKey(endpoint)} has no placement.`));
      } else if (Math.abs(Number(placement.x) - Number(point.x)) > 0.001 || Math.abs(Number(placement.y) - Number(point.y)) > 0.001) {
        diagnostics.push(issue('error', 'formboard.segment.endpointGeometryMismatch', ref('routeSegment', segment.routeSegmentId), `Route segment ${segment.routeSegmentId} geometry is not anchored to ${nodeKey(endpoint)}.`));
      }
    }
    const length = getSegmentLength(formboard, segment.routeSegmentId);
    if (length.status === 'resolved' && Number(length.valueMm) === 0) {
      diagnostics.push(issue('error', 'formboard.segment.zeroLength', ref('routeSegment', segment.routeSegmentId), `Route segment ${segment.routeSegmentId} has zero physical length.`));
    }
    if (segment.lengthOverride && length.status === 'resolved') {
      const geometric = Number(getPathLength(segment.points, segment.geometryKind));
      if (Math.abs(geometric - Number(segment.lengthOverride.valueMm)) > 1) {
        diagnostics.push(issue('warning', 'formboard.length.overrideMismatch', ref('routeSegment', segment.routeSegmentId), `Override ${segment.lengthOverride.valueMm} mm differs from geometry ${geometric.toFixed(3)} mm.`));
      }
    }
  }

  for (const route of formboard.routes) {
    const duplicates = route.segmentIds.filter((id, index) => route.segmentIds.indexOf(id) !== index);
    for (const duplicate of new Set(duplicates)) diagnostics.push(issue('error', 'formboard.route.duplicateSegment', ref('route', route.routeId), `Route ${route.routeId} uses segment ${duplicate} more than once.`));
    for (const segmentId of route.segmentIds) {
      if (!segmentIds.has(segmentId)) diagnostics.push(issue('error', 'formboard.route.missingSegment', ref('route', route.routeId), `Route ${route.routeId} references missing segment ${segmentId}.`));
    }
    const traversal = traverseRoute(formboard, route.routeId);
    if (traversal.status === 'unresolved') diagnostics.push(issue('error', 'formboard.route.disconnected', ref('route', route.routeId), traversal.reason));
  }

  for (const conductor of harness.conductors) {
    if (!conductor.routeId) continue;
    const ends = routeEnds(formboard, conductor.routeId);
    if (!ends) {
      diagnostics.push(issue('error', 'formboard.conductor.unresolvedRoute', ref('conductor', conductor.id), `Conductor ${conductor.id} route ${conductor.routeId} is unresolved.`));
      continue;
    }
    const expectedA = endpointForTermination(harness, conductor.terminationAId);
    const expectedB = endpointForTermination(harness, conductor.terminationBId);
    if (expectedA && expectedB) {
      const direct = nodeKey(ends[0]) === nodeKey(expectedA) && nodeKey(ends[1]) === nodeKey(expectedB);
      const reverse = nodeKey(ends[0]) === nodeKey(expectedB) && nodeKey(ends[1]) === nodeKey(expectedA);
      if (!direct && !reverse) diagnostics.push(issue('error', 'formboard.route.endpointMismatch', ref('conductor', conductor.id), `Route ${conductor.routeId} endpoints do not match conductor ${conductor.id} terminations.`));
    }
  }

  return sortDiagnostics(diagnostics);
}
