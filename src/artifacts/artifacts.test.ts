import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { buildLocalQuoteSnapshot, buildManufacturingPackage, bomCsv, cutListCsv, deriveManufacturingArtifacts, LocalQuoteProvider, naturalCompare, sha256, stableJson } from '@/artifacts';
import { moveConnector, pointMm } from '@/formboard';
import { connectorOccurrenceId, mm, serializeHarnessIr } from '@/harness-core';
import { controllerChassisProject } from '../../fixtures/controller-chassis/controllerChassis.formboard';
import { controllerChassisLocalQuoteData, controllerChassisQuoteTimestamp } from '../../fixtures/controller-chassis/localQuoteData';

const quote = (project = controllerChassisProject) => {
  const projection = deriveManufacturingArtifacts(project);
  return buildLocalQuoteSnapshot(projection.bom, new LocalQuoteProvider(controllerChassisLocalQuoteData), controllerChassisQuoteTimestamp);
};

describe('TOMINAL-ARTIFACTS-X1', () => {
  it('derives 13 traceable cut rows with geometry, slack, allowance, stable order, and valid SHA-256', () => {
    const result = deriveManufacturingArtifacts(controllerChassisProject);
    expect(result.diagnostics).toEqual([]);
    expect(result.cutList).toHaveLength(13);
    expect(result.cutList.map((row) => row.wireId)).toEqual([...result.cutList.map((row) => row.wireId)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
    expect(result.cutList.every((row) => Math.abs(row.cutLengthMm - (row.routeLengthMm + row.slackMm + row.terminationAllowanceMm)) < 0.000001)).toBe(true);
    expect(result.cutList.every((row) => row.terminationIds.length === 2 && row.routeId)).toBe(true);
    expect(naturalCompare('W2', 'W10')).toBeLessThan(0);
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('adds explicitly modeled allowances from both terminations without hiding them in route length', () => {
    const harness = { ...controllerChassisProject.harness, terminations: controllerChassisProject.harness.terminations.map((termination) => termination.id === 'WIRE_MOTOR_POS:A' ? { ...termination, terminationAllowanceMm: mm(7.5) } : termination.id === 'WIRE_MOTOR_POS:B' ? { ...termination, terminationAllowanceMm: mm(12.5) } : termination) };
    const row = deriveManufacturingArtifacts({ ...controllerChassisProject, harness }).cutList.find((item) => item.wireId === 'WIRE_MOTOR_POS')!;
    expect(row.terminationAllowanceMm).toBe(20);
    expect(row.routeLengthMm).toBe(483.61595);
    expect(row.cutLengthMm).toBe(523.61595);
  });

  it('fails a missing route rather than fabricating zero and preserves explicit override provenance', () => {
    const missing = { ...controllerChassisProject, harness: { ...controllerChassisProject.harness, conductors: controllerChassisProject.harness.conductors.map((row) => row.id === 'WIRE_VIN_POS' ? { ...row, routeId: undefined } : row) } };
    const missingResult = deriveManufacturingArtifacts(missing);
    expect(missingResult.cutList.find((row) => row.wireId === 'WIRE_VIN_POS')).toBeUndefined();
    expect(missingResult.diagnostics.map((item) => item.rule)).toContain('artifact.route.unresolved');
    const overridden = { ...controllerChassisProject, formboard: { ...controllerChassisProject.formboard, segmentGeometry: controllerChassisProject.formboard.segmentGeometry.map((segment) => segment.routeSegmentId === 'SEG_SENSOR' ? { ...segment, lengthOverride: { valueMm: mm(700), reason: 'qualified bench length', provenance: 'test' } } : segment) } };
    const row = deriveManufacturingArtifacts(overridden).cutList.find((item) => item.wireId === 'WIRE_ENCODER_A');
    expect(row).toMatchObject({ routeLengthMm: 700, lengthProvenance: 'override' });
    expect(row?.notes).toContain('override');
  });

  it('escapes CSV and derives housing, termination, plug, ring, and wire consumption without double counting', () => {
    expect(cutListCsv([{ ...deriveManufacturingArtifacts(controllerChassisProject).cutList[0], notes: 'comma, quote " and\nnewline' }])).toContain('"comma, quote "" and\nnewline"');
    const bom = deriveManufacturingArtifacts(controllerChassisProject).bom;
    expect(bom.filter((row) => row.category === 'connector-housing').reduce((sum, row) => sum + row.quantity, 0)).toBe(8);
    expect(bom.filter((row) => row.category === 'terminal').reduce((sum, row) => sum + row.quantity, 0)).toBe(22);
    expect(bom.filter((row) => row.category === 'seal').reduce((sum, row) => sum + row.quantity, 0)).toBe(22);
    expect(bom.filter((row) => row.category === 'plug').reduce((sum, row) => sum + row.quantity, 0)).toBe(1);
    expect(bom.filter((row) => row.category === 'ring-terminal').reduce((sum, row) => sum + row.quantity, 0)).toBe(1);
    expect(bom.filter((row) => row.category === 'splice')).toHaveLength(0);
    expect(bomCsv(bom)).toBe(bomCsv(bom));
  });

  it('quotes exact parts, MOQ, price breaks, unit-correct wire, unavailable and provider errors deterministically', () => {
    const projection = deriveManufacturingArtifacts(controllerChassisProject);
    const first = quote();
    expect(stableJson(quote())).toBe(stableJson(first));
    expect(first.timestamp).toBe(controllerChassisQuoteTimestamp);
    expect(first.subtotal).toBeGreaterThan(0);
    const terminal = first.lines.find((line) => line.partNumber === 'DEMO-TERM-PWR');
    expect(terminal?.quotedPurchaseQuantity).toBeGreaterThanOrEqual(terminal?.requiredQuantity ?? 0);
    const wire = first.lines.find((line) => line.partNumber === 'DEMO-WIRE-1.0');
    expect(wire?.unit).toBe('m');
    expect(wire?.requiredQuantity).toBe(projection.bom.find((row) => row.partNumber === 'DEMO-WIRE-1.0')?.quantity);
    const special = new LocalQuoteProvider([{ manufacturer: 'X', partNumber: 'ERR', unit: 'ea', currency: 'USD', moq: 1, priceBreaks: [], error: 'fixture failure' }]);
    expect(special.quote({ bomRowId: 'x', manufacturer: 'X', partNumber: 'ERR', requiredQuantity: 1, unit: 'ea', category: 'terminal' }).status).toBe('error');
    expect(special.quote({ bomRowId: 'y', manufacturer: 'X', partNumber: 'MISSING', requiredQuantity: 1, unit: 'ea', category: 'terminal' }).status).toBe('unavailable');
  });

  it('emits deterministic lockfile, manifest, hashes, versions, quote identity, and no absolute paths', async () => {
    const declarations = await readFile(fileURLToPath(new URL('../../fixtures/controller-chassis/connectorFamilies.generated.ts', import.meta.url)), 'utf8');
    const first = buildManufacturingPackage(controllerChassisProject, quote(), declarations);
    const second = buildManufacturingPackage(controllerChassisProject, quote(), declarations);
    expect(second.artifacts).toEqual(first.artifacts);
    const lock = first.artifacts.find((item) => item.file === 'tominal.lock.toml')?.content ?? '';
    expect(lock).toContain('harness_ir_schema_version = "1.0"');
    expect(lock).toContain('formboard_document_schema_version = "1"');
    expect(lock).toContain('quote_snapshot_identity');
    expect(lock).not.toMatch(/[A-Z]:\\/i);
    for (const item of first.artifacts) expect(item.sha256).toBe(sha256(item.content));
  });

  it('changes only geometry-dependent manufacturing output for the +80 mm PANEL_MOTOR variation', async () => {
    const movedBoard = moveConnector(controllerChassisProject.formboard, connectorOccurrenceId('PANEL_MOTOR'), pointMm(900, 190)).document;
    const moved = { ...controllerChassisProject, formboard: movedBoard };
    const before = deriveManufacturingArtifacts(controllerChassisProject);
    const after = deriveManufacturingArtifacts(moved);
    expect(serializeHarnessIr(moved.harness)).toBe(serializeHarnessIr(controllerChassisProject.harness));
    const beforeMotor = before.cutList.find((row) => row.wireId === 'WIRE_MOTOR_POS')!;
    const afterMotor = after.cutList.find((row) => row.wireId === 'WIRE_MOTOR_POS')!;
    expect(afterMotor.routeLengthMm).toBeGreaterThan(beforeMotor.routeLengthMm);
    expect(afterMotor.cutLengthMm - beforeMotor.cutLengthMm).toBeCloseTo(afterMotor.routeLengthMm - beforeMotor.routeLengthMm, 5);
    const nonWire = (rows: typeof before.bom) => rows.filter((row) => row.category !== 'wire').map(({ sourceEntities: _source, ...row }) => row);
    expect(nonWire(after.bom)).toEqual(nonWire(before.bom));
    expect(after.bom.filter((row) => row.category === 'wire')).not.toEqual(before.bom.filter((row) => row.category === 'wire'));
    const beforeQuote = quote(controllerChassisProject);
    const afterQuote = quote(moved);
    expect(afterQuote.subtotal).toBeGreaterThan(beforeQuote.subtotal);
    expect(afterQuote.lines.filter((line) => line.category !== 'wire')).toEqual(beforeQuote.lines.filter((line) => line.category !== 'wire'));
    const declarations = await readFile(fileURLToPath(new URL('../../fixtures/controller-chassis/connectorFamilies.generated.ts', import.meta.url)), 'utf8');
    const beforePackage = buildManufacturingPackage(controllerChassisProject, beforeQuote, declarations);
    const afterPackage = buildManufacturingPackage(moved, afterQuote, declarations);
    const hash = (result: typeof beforePackage, file: string) => result.artifacts.find((item) => item.file === file)?.sha256;
    for (const file of ['controller-chassis.formboard.svg', 'controller-chassis.cutlist.csv', 'controller-chassis.bom.csv', 'controller-chassis.quote.json', 'tominal.lock.toml', 'artifact-manifest.json']) {
      expect(hash(afterPackage, file), file).not.toBe(hash(beforePackage, file));
    }
  });
});
