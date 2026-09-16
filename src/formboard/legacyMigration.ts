import type { Diagnostic, HarnessIr, Millimeters } from '@/harness-core';
import { mm, routeSegmentId } from '@/harness-core';
import type { HarnessDocument } from '@/core/harnessModel';
import type { FormboardDocument, PointMm } from './model';
import { degrees, pointMm } from './model';
import { getPathLength } from './metrics';

export type FormboardMigrationResult = {
  readonly formboard: FormboardDocument;
  readonly diagnostics: readonly Diagnostic[];
};

export function migrateV01Formboard(document: HarnessDocument, harness: HarnessIr): FormboardMigrationResult {
  const diagnostics: Diagnostic[] = [];
  const semanticSegments = new Map(harness.routeSegments.map((segment) => [segment.id, segment]));
  const segmentGeometry: FormboardDocument['segmentGeometry'][number][] = [];
  for (const segment of Object.values(document.segments).sort((left, right) => left.id.localeCompare(right.id))) {
    const semantic = semanticSegments.get(routeSegmentId(segment.id));
    if (!semantic || segment.path.length < 2) continue;
    const points = segment.path.map(([x, y]) => pointMm(x, y)) as [PointMm, PointMm, ...PointMm[]];
    const geometryKind = segment.geometry === 'spline' ? 'cubicSpline' : 'polyline';
    const derived = Number(getPathLength(points, geometryKind));
    const difference = segment.nominalLengthMm === undefined ? 0 : Math.abs(segment.nominalLengthMm - derived);
    if (segment.nominalLengthMm !== undefined && difference > 1) {
      diagnostics.push({
        id: `migration.formboard.lengthDifference:routeSegment:${segment.id}`,
        severity: 'warning',
        rule: 'migration.formboard.lengthDifference',
        entity: { kind: 'routeSegment', id: segment.id },
        message: `Legacy nominal length ${segment.nominalLengthMm} mm differs from migrated geometry ${derived.toFixed(3)} mm by ${difference.toFixed(3)} mm.`
      });
    }
    segmentGeometry.push({
      routeSegmentId: semantic.id,
      from: semantic.from,
      to: semantic.to,
      points,
      geometryKind,
      bundleDiameterMm: segment.bundleDiameterMm === undefined ? undefined : mm(segment.bundleDiameterMm),
      lengthOverride: segment.nominalLengthMm !== undefined && difference > 1
        ? { valueMm: mm(segment.nominalLengthMm), reason: 'Legacy nominal length materially differed from migrated path geometry.', provenance: 'legacy-v0.1-nominal' }
        : undefined,
      provenance: 'migrated-v0.1'
    });
  }

  return {
    formboard: {
      formboardVersion: '1',
      harnessId: harness.id,
      title: document.name,
      board: {
        widthMm: mm(document.board.width),
        heightMm: mm(document.board.height),
        origin: pointMm(document.board.origin[0], document.board.origin[1]),
        gridSpacingMm: mm(document.board.grid),
        forbidGeometryOutsideBoard: false
      },
      connectorPlacements: Object.values(document.connectors).sort((a, b) => a.id.localeCompare(b.id)).map((item) => ({ connectorOccurrenceId: item.id as FormboardDocument['connectorPlacements'][number]['connectorOccurrenceId'], position: pointMm(item.position[0], item.position[1]), rotationDeg: degrees(item.rotationDeg ?? 0), provenance: 'migrated-v0.1' })),
      splicePlacements: Object.values(document.splices).sort((a, b) => a.id.localeCompare(b.id)).map((item) => ({ electricalSpliceId: item.id as FormboardDocument['splicePlacements'][number]['electricalSpliceId'], position: pointMm(item.position[0], item.position[1]), provenance: 'migrated-v0.1' })),
      routeJunctionPlacements: Object.values(document.branches).sort((a, b) => a.id.localeCompare(b.id)).map((item) => ({ routeJunctionId: item.id as FormboardDocument['routeJunctionPlacements'][number]['routeJunctionId'], position: pointMm(item.position[0], item.position[1]), provenance: 'migrated-v0.1' })),
      studPlacements: [],
      segmentGeometry,
      routes: harness.routes.map((route) => ({ routeId: route.id, segmentIds: route.segmentIds })),
      annotations: [{ id: 'migration-note', text: 'MIGRATED V0.1 LAYOUT — VERIFY PHYSICAL COORDINATES BEFORE MANUFACTURING', position: pointMm(20, 30) }],
      dimensions: [],
      context: [],
      exportSettings: { scale: '1:1', includeGrid: true, calibrationLengthMm: 100 as Millimeters }
    },
    diagnostics
  };
}
