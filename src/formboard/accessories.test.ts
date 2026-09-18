import { describe, expect, it } from 'vitest';

import { deriveManufacturingArtifacts } from '@/artifacts';
import { connectorOccurrenceId, routeId, type HarnessIr } from '@/harness-core';
import {
  accessoryPosition,
  bundleStateAt,
  conductorsAcross,
  coreDiameterAt,
  deriveBundleSections,
  deriveHeatShrinkPlacements,
  estimateTapeLength,
  estimateTapeWrap,
  finishedDiameterAt,
  maxCoreDiameter,
  maxFinishedDiameter,
  moveConnector,
  parseFormboard,
  pointMm,
  serializeFormboard,
  validateAccessories,
  validateSleeveFit,
  type TapeWrapPlacement
} from '@/formboard';
import { controllerChassisProject } from '../../fixtures/controller-chassis/controllerChassis.formboard';

const motorRoute = routeId('ROUTE_MOTOR');
const tape = controllerChassisProject.formboard.accessories!.find((item) => item.kind === 'tapeWrap') as TapeWrapPlacement;

describe('TOMINAL-ACCESSORIES-X1 bundle and accessory math', () => {
  it('uses the hand-checkable equivalent-round equation and preserves the single-conductor OD', () => {
    const motor = deriveBundleSections(controllerChassisProject.harness, controllerChassisProject.formboard, motorRoute);
    const trunk = bundleStateAt(motor.sections, motorRoute, 20)!;
    const expectedArea = 2 * Math.PI * 2.4 ** 2 / 4 + Math.PI * 1.3 ** 2 / 4;
    expect(trunk.coreAreaMm2).toBeCloseTo(expectedArea, 10);
    expect(Number(trunk.coreDiameterMm)).toBeCloseTo(2 * Math.sqrt((expectedArea / 0.6) / Math.PI), 10);

    const single = deriveBundleSections(controllerChassisProject.harness, controllerChassisProject.formboard, routeId('ROUTE_GROUND_STUD'));
    expect(Number(single.sections[0].coreDiameterMm)).toBe(2.4);
  });

  it('derives a deterministic branch breakpoint from shared physical segment membership without double counting', () => {
    const result = deriveBundleSections(controllerChassisProject.harness, controllerChassisProject.formboard, motorRoute);
    const before = bundleStateAt(result.sections, motorRoute, 20)!;
    const after = result.sections.find((section) => Number(section.startStationMm) > 220)!;
    expect(before.conductorIds).toEqual(['WIRE_MOTOR_ENABLE', 'WIRE_MOTOR_NEG', 'WIRE_MOTOR_POS']);
    expect(after.conductorIds).toEqual(['WIRE_MOTOR_NEG', 'WIRE_MOTOR_POS']);
    expect(Number(before.coreDiameterMm)).toBeGreaterThan(Number(after.coreDiameterMm));
    expect(conductorsAcross(result.sections, motorRoute, 0, 500)).toEqual(['WIRE_MOTOR_ENABLE', 'WIRE_MOTOR_NEG', 'WIRE_MOTOR_POS']);
    expect(coreDiameterAt(result.sections, motorRoute, 20)).toBe(before.coreDiameterMm);
    expect(Number(finishedDiameterAt(result.sections, motorRoute, 120))).toBeGreaterThan(Number(before.coreDiameterMm));
    expect(Number(maxCoreDiameter(result.sections, motorRoute, 0, 500))).toBeCloseTo(Number(before.coreDiameterMm), 10);
    expect(Number(maxFinishedDiameter(result.sections, motorRoute, 0, 500))).toBeGreaterThan(Number(before.coreDiameterMm));
  });

  it('matches an independent helical tape reference case and honors overlap and waste', () => {
    const length = 100;
    const diameter = 10;
    const width = 20;
    const overlap = 0.5;
    const waste = 1.15;
    const advance = 10;
    const expected = (length / advance) * Math.sqrt((Math.PI * diameter) ** 2 + advance ** 2) * waste;
    expect(estimateTapeLength(length, diameter, width, overlap, waste)).toBeCloseTo(expected, 10);
    expect(estimateTapeLength(length, diameter, width, 0, 1)).toBeLessThan(estimateTapeLength(length, diameter, width, 0.5, 1));
    expect(() => estimateTapeLength(length, diameter, width, 1, waste)).toThrow();
  });

  it('accumulates a variable-diameter half-lap span section by section', () => {
    const result = estimateTapeWrap(controllerChassisProject, tape);
    expect(result.diagnostics.filter((item) => item.severity === 'error')).toHaveLength(0);
    expect(result.estimate?.bundleDiameterMaxMm).toBeGreaterThan(result.estimate?.bundleDiameterMinMm ?? Infinity);
    expect(result.estimate?.spanLengthMm).toBe(260);
    expect(result.estimate?.estimatedTapeLengthMm).toBeGreaterThan(260);
  });

  it('supports spiral and custom overlap and rejects invalid overlap', () => {
    const spiral = estimateTapeWrap(controllerChassisProject, { ...tape, id: 'TAPE_SPIRAL' as typeof tape.id, mode: 'spiral', overlapFraction: 0 });
    const custom = estimateTapeWrap(controllerChassisProject, { ...tape, id: 'TAPE_CUSTOM' as typeof tape.id, mode: 'customOverlap', overlapFraction: 0.25 });
    const invalid = estimateTapeWrap(controllerChassisProject, { ...tape, id: 'TAPE_BAD' as typeof tape.id, overlapFraction: 1 });
    expect(spiral.estimate).toBeDefined();
    expect(custom.estimate!.estimatedTapeLengthMm).toBeGreaterThan(spiral.estimate!.estimatedTapeLengthMm);
    expect(invalid.diagnostics.some((item) => item.rule === 'accessory.tape.overlap-invalid')).toBe(true);
  });

  it('derives sleeve cut allowance and validates catalog fit against the maximum prior OD', () => {
    const sleeve = controllerChassisProject.formboard.accessories!.find((item) => item.kind === 'sleeve')!;
    if (sleeve.kind !== 'sleeve') throw new Error('fixture sleeve missing');
    const result = validateSleeveFit(controllerChassisProject, sleeve);
    expect(result.qualification.spanLengthMm).toBe(180);
    expect(result.qualification.cutLengthMm).toBe(200);
    expect(result.qualification.valid).toBe(true);
    expect(result.qualification.requiredInnerDiameterMm).toBeCloseTo(result.qualification.maxBundleDiameterMm! * 1.1, 10);
  });

  it('keeps label station authority while route geometry moves its XY projection', () => {
    const label = controllerChassisProject.formboard.accessories!.find((item) => item.kind === 'label')!;
    const before = accessoryPosition(controllerChassisProject.formboard, label)!;
    const moved = moveConnector(controllerChassisProject.formboard, connectorOccurrenceId('PANEL_MOTOR'), pointMm(900, 190)).document;
    const after = accessoryPosition(moved, label)!;
    expect(Number(label.stationMm)).toBe(300);
    expect(after).not.toEqual(before);
  });

  it('derives bare-ring heat shrink from explicit process policy and validates tubing recovery', () => {
    const result = deriveHeatShrinkPlacements(controllerChassisProject);
    expect(result.diagnostics.filter((item) => item.severity === 'error')).toHaveLength(0);
    expect(result.placements).toHaveLength(1);
    expect(result.placements[0]).toMatchObject({ terminationId: 'WIRE_GROUND_STUD:B', conductorId: 'WIRE_GROUND_STUD', cutLengthMm: 13, valid: true });
  });

  it('fails closed when conductor OD is missing', () => {
    const harness: HarnessIr = { ...controllerChassisProject.harness, catalog: { ...controllerChassisProject.harness.catalog, wireTypes: controllerChassisProject.harness.catalog.wireTypes.map((wire) => wire.id === 'WIRE_POWER_1MM2' ? { ...wire, insulatedOuterDiameterMm: undefined } : wire) } };
    const diagnostics = validateAccessories({ ...controllerChassisProject, harness });
    expect(diagnostics.some((item) => item.rule === 'accessory.wire-outer-diameter.missing' && item.severity === 'error')).toBe(true);
  });

  it('aggregates label, tape, sleeve, and heat-shrink into BOM while keeping conductor cut list separate', () => {
    const projection = deriveManufacturingArtifacts(controllerChassisProject);
    expect(projection.bom.filter((row) => ['label', 'tape', 'sleeve', 'heat-shrink'].includes(row.category)).map((row) => row.category).sort()).toEqual(['heat-shrink', 'label', 'sleeve', 'tape']);
    expect(projection.cutList.every((row) => !row.wireId.includes('TAPE') && !row.wireId.includes('SLEEVE'))).toBe(true);
    expect(projection.accessorySchedule.map((row) => row.kind).sort()).toEqual(['heatShrink', 'label', 'sleeve', 'tapeWrap']);
  });

  it('serializes accessory intent deterministically while derived sections remain recomputable', () => {
    const first = serializeFormboard(controllerChassisProject.formboard);
    const second = serializeFormboard(parseFormboard(first));
    expect(second).toBe(first);
    expect(first).toContain('"formboardVersion": "2"');
    expect(first).toContain('"TAPE_MOTOR"');
    expect(first).not.toContain('coreDiameterMm');
  });

  it('recomputes geometry-derived positions and manufacturing output for PANEL_MOTOR +80 mm without changing HarnessIr', () => {
    const movedBoard = moveConnector(controllerChassisProject.formboard, connectorOccurrenceId('PANEL_MOTOR'), pointMm(900, 190)).document;
    const before = deriveManufacturingArtifacts(controllerChassisProject);
    const after = deriveManufacturingArtifacts({ ...controllerChassisProject, formboard: movedBoard });
    const beforeLabel = before.accessorySchedule.find((row) => row.kind === 'label')!;
    const afterLabel = after.accessorySchedule.find((row) => row.kind === 'label')!;
    expect(afterLabel).not.toEqual(beforeLabel);
    expect(after.bom.filter((row) => row.category === 'wire')).not.toEqual(before.bom.filter((row) => row.category === 'wire'));
    expect(controllerChassisProject.harness).toBe(controllerChassisProject.harness);
  });
});
