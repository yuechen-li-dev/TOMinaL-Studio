import { describe, expect, it } from 'vitest';

import {
  controllerChassisFormboard,
  controllerChassisProject,
  controllerChassisRoutedHarness
} from '../../fixtures/controller-chassis/controllerChassis.formboard';
import { createSampleHarnessDocument } from '@/core/harnessModel';
import { migrateV01 } from '@/compat/v01';
import {
  exportFormboardSvg,
  createMachinaFormboardArtifact,
  formboardProjectionToMachinaScene,
  getConductorRouteLength,
  getRouteLength,
  getSegmentLength,
  layoutHarnessGraph,
  layoutRouteLengthCallouts,
  moveConnector,
  parseFormboard,
  pointMm,
  projectFormboard,
  serializeFormboard,
  updateRouteSegment,
  validateFormboard,
  type FormboardSurface
} from '@/formboard';
import { conductorId, connectorOccurrenceId, routeId, routeSegmentId } from '@/harness-core';

describe('FormboardDocument X1', () => {
  it('keeps physical branch and electrical splice distinct and validates the fixture', () => {
    expect(controllerChassisFormboard.routeJunctionPlacements).toHaveLength(1);
    expect(controllerChassisFormboard.splicePlacements).toHaveLength(1);
    expect(controllerChassisFormboard.routeJunctionPlacements[0].routeJunctionId).not.toBe(
      controllerChassisFormboard.splicePlacements[0].electricalSpliceId
    );
    expect(validateFormboard(controllerChassisRoutedHarness, controllerChassisFormboard)).toEqual([]);
  });

  it('derives spline segment, multi-segment route, conductor, and shared route lengths', () => {
    const segment = getSegmentLength(controllerChassisFormboard, routeSegmentId('SEG_POWER_IN'));
    const route = getRouteLength(controllerChassisFormboard, routeId('ROUTE_POWER'));
    const conductor = getConductorRouteLength(controllerChassisRoutedHarness, controllerChassisFormboard, conductorId('WIRE_VIN_POS'));
    const shared = getConductorRouteLength(controllerChassisRoutedHarness, controllerChassisFormboard, conductorId('WIRE_VIN_NEG'));
    expect(segment.status).toBe('resolved');
    expect(route.status).toBe('resolved');
    expect(conductor).toEqual(route);
    expect(shared).toEqual(route);
    if (route.status === 'resolved') expect(Number(route.valueMm)).toBeGreaterThan(500);
  });

  it('returns unresolved instead of zero for missing physical routes', () => {
    const result = getConductorRouteLength(
      { ...controllerChassisRoutedHarness, conductors: controllerChassisRoutedHarness.conductors.map((item) => item.id === 'WIRE_VIN_POS' ? { ...item, routeId: routeId('MISSING') } : item) },
      controllerChassisFormboard,
      conductorId('WIRE_VIN_POS')
    );
    expect(result.status).toBe('unresolved');
  });

  it('moves a connector and its attached spline endpoint without mutating semantic harness', () => {
    const beforeHarness = JSON.stringify(controllerChassisProject.harness);
    const before = getRouteLength(controllerChassisFormboard, routeId('ROUTE_MOTOR'));
    const moved = moveConnector(controllerChassisFormboard, connectorOccurrenceId('PANEL_MOTOR'), pointMm(900, 190)).document;
    const after = getRouteLength(moved, routeId('ROUTE_MOTOR'));
    expect(moved.connectorPlacements.find((item) => item.connectorOccurrenceId === 'PANEL_MOTOR')?.position.x).toBe(900);
    const motorPoints = moved.segmentGeometry.find((item) => item.routeSegmentId === 'SEG_MOTOR_OUT')?.points;
    expect(motorPoints?.[motorPoints.length - 1].x).toBe(900);
    expect(after).not.toEqual(before);
    expect(JSON.stringify(controllerChassisProject.harness)).toBe(beforeHarness);
  });

  it('rejects zero-length route geometry and geometry outside a closed board', () => {
    const zero = updateRouteSegment(controllerChassisFormboard, routeSegmentId('SEG_SENSOR'), {
      points: [pointMm(350, 330), pointMm(350, 330)]
    }).document;
    expect(validateFormboard(controllerChassisRoutedHarness, zero).map((item) => item.rule)).toContain('formboard.segment.zeroLength');
    const outside = moveConnector(controllerChassisFormboard, connectorOccurrenceId('PANEL_MOTOR'), pointMm(901, 190)).document;
    expect(validateFormboard(controllerChassisRoutedHarness, outside).map((item) => item.rule)).toContain('formboard.geometry.outsideBoard');
  });

  it('serializes deterministically', () => {
    const first = serializeFormboard(controllerChassisFormboard);
    const second = serializeFormboard(parseFormboard(first));
    expect(second).toBe(first);
  });

  it('exports deterministic 1:1 mm SVG with smooth cubic paths and a 100 mm witness', () => {
    const first = exportFormboardSvg(controllerChassisRoutedHarness, controllerChassisFormboard);
    const second = exportFormboardSvg(controllerChassisRoutedHarness, controllerChassisFormboard);
    expect(second).toBe(first);
    expect(first).toContain('width="900mm" height="600mm"');
    expect(first).toContain('data-scale="1:1"');
    expect(first).toContain('data-length-mm="100"');
    expect(first).toContain('M 15 582 H 115');
    expect(first).toContain(' C ');
    expect(first).toContain('data-entity-id="JUNCTION_PANEL_FANOUT"');
    expect(first).toContain('data-entity-id="SPLICE_GROUND"');
    expect(first.match(/data-role="routeLength"/g)).toHaveLength(controllerChassisFormboard.routes.length);
    expect(first).toContain('ROUTE_POWER ·');
  });

  it('uses Machina stacks to place route-length callouts in non-overlapping top-rail cells', () => {
    const first = layoutRouteLengthCallouts(controllerChassisFormboard);
    const second = layoutRouteLengthCallouts(controllerChassisFormboard);
    expect(second).toEqual(first);
    expect(first).toHaveLength(controllerChassisFormboard.routes.length);
    expect(Math.max(...first.map((item) => item.rect.y + item.rect.height))).toBeLessThan(50);
    for (let leftIndex = 0; leftIndex < first.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < first.length; rightIndex += 1) {
        const left = first[leftIndex].rect;
        const right = first[rightIndex].rect;
        const overlaps = left.x < right.x + right.width && left.x + left.width > right.x && left.y < right.y + right.height && left.y + left.height > right.y;
        expect(overlaps, `${first[leftIndex].routeId} overlaps ${first[rightIndex].routeId}`).toBe(false);
      }
    }
  });

  it('lowers through a framework-independent surface and the Machina scene adapter', () => {
    const projection = projectFormboard(controllerChassisRoutedHarness, controllerChassisFormboard);
    let received = 0;
    const fake: FormboardSurface = { render(value) { received = value.records.length; return undefined; } };
    fake.render(projection);
    const scene = formboardProjectionToMachinaScene(projection);
    const artifact = createMachinaFormboardArtifact(projection, [{ id: 'example', severity: 'warning', rule: 'formboard.example', entity: { kind: 'route', id: 'ROUTE_POWER' }, message: 'Example adapter diagnostic.' }]);
    expect(received).toBeGreaterThan(0);
    expect(scene.find((item) => item.type === 'path' && item.id === 'SEG_POWER_IN')).toMatchObject({ role: 'routeSegment' });
    expect(artifact.diagnostics[0]).toMatchObject({ code: 'formboard.example', path: 'route/ROUTE_POWER', source: 'tominal.formboard' });
  });

  it('creates a deterministic graph-layout proposal in board millimetres', () => {
    const first = layoutHarnessGraph(controllerChassisRoutedHarness, controllerChassisFormboard.board);
    const second = layoutHarnessGraph(controllerChassisRoutedHarness, controllerChassisFormboard.board);
    expect(second).toEqual(first);
    expect(first).toHaveLength(
      controllerChassisRoutedHarness.connectorOccurrences.length +
        controllerChassisRoutedHarness.electricalSplices.length +
        controllerChassisRoutedHarness.routeJunctions.length +
        (controllerChassisRoutedHarness.catalog.studs?.length ?? 0)
    );
  });

  it('migrates v0.1 positions and paths and reports nominal-versus-derived differences', () => {
    const legacy = createSampleHarnessDocument();
    const result = migrateV01(legacy);
    expect(result.formboard.connectorPlacements.find((item) => item.connectorOccurrenceId === 'ECU_C1')?.position).toEqual(pointMm(120, 220));
    expect(result.formboard.segmentGeometry.find((item) => item.routeSegmentId === 'SEG_MAIN_LEFT')?.points).toHaveLength(2);
    expect(result.diagnostics.map((item) => item.rule)).toContain('migration.formboard.lengthDifference');
    expect(result.formboard.segmentGeometry.find((item) => item.routeSegmentId === 'SEG_MAIN_LEFT')?.lengthOverride?.valueMm).toBe(320);
  });
});
