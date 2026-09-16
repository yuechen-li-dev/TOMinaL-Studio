import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { buildLocalQuoteSnapshot, buildManufacturingPackage, deriveManufacturingArtifacts, LocalQuoteProvider } from '../src/artifacts';
import { sha256 } from '../src/artifacts';
import { moveConnector, pointMm } from '../src/formboard';
import { connectorOccurrenceId, serializeHarnessIr } from '../src/harness-core';
import { controllerChassisProject } from '../fixtures/controller-chassis/controllerChassis.formboard';
import { controllerChassisLocalQuoteData, controllerChassisQuoteTimestamp } from '../fixtures/controller-chassis/localQuoteData';

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: npm run artifacts:build -- [output-directory]\nBuilds the Small Control Chassis release-ready manufacturing package offline.');
  process.exit(0);
}
const output = resolve(process.argv[2] ?? 'artifacts/local/TOMINAL-ARTIFACTS-X1/controller-chassis');
const started = performance.now();
const projection = deriveManufacturingArtifacts(controllerChassisProject);
const quote = buildLocalQuoteSnapshot(projection.bom, new LocalQuoteProvider(controllerChassisLocalQuoteData), controllerChassisQuoteTimestamp);
const declarations = await readFile(new URL('../fixtures/controller-chassis/connectorFamilies.generated.ts', import.meta.url), 'utf8');
const result = buildManufacturingPackage(controllerChassisProject, quote, declarations);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const item of result.artifacts) await writeFile(resolve(output, item.file), item.content, 'utf8');
const movedProject = { ...controllerChassisProject, formboard: moveConnector(controllerChassisProject.formboard, connectorOccurrenceId('PANEL_MOTOR'), pointMm(900, 190)).document };
const movedProjection = deriveManufacturingArtifacts(movedProject);
const movedQuote = buildLocalQuoteSnapshot(movedProjection.bom, new LocalQuoteProvider(controllerChassisLocalQuoteData), controllerChassisQuoteTimestamp);
const beforeMotor = projection.cutList.find((row) => row.wireId === 'WIRE_MOTOR_POS')!;
const afterMotor = movedProjection.cutList.find((row) => row.wireId === 'WIRE_MOTOR_POS')!;
const wireTotals = Object.fromEntries(projection.bom.filter((row) => row.category === 'wire').map((row) => { const parts = row.description.split(', '); return [`${row.partNumber}/${parts[parts.length - 1]}`, row.quantity]; }));
console.log(JSON.stringify({ output, conductorRows: result.projection.cutList.length, bomRows: result.projection.bom.length, totalBomQuantityByUnit: { ea: result.projection.bom.filter((row) => row.unit === 'ea').reduce((sum, row) => sum + row.quantity, 0), m: result.projection.bom.filter((row) => row.unit === 'm').reduce((sum, row) => sum + row.quantity, 0) }, wireTotals, subtotal: result.quote.subtotal, unresolved: result.projection.diagnostics.length, artifactCount: result.artifacts.length, artifacts: result.artifacts.map((item) => ({ file: item.file, bytes: Buffer.byteLength(item.content), sha256: item.sha256 })), variation: { harnessHashBefore: sha256(serializeHarnessIr(controllerChassisProject.harness)), harnessHashAfter: sha256(serializeHarnessIr(movedProject.harness)), routeLengthMmBefore: beforeMotor.routeLengthMm, routeLengthMmAfter: afterMotor.routeLengthMm, cutLengthMmBefore: beforeMotor.cutLengthMm, cutLengthMmAfter: afterMotor.cutLengthMm, wireBomMBefore: projection.bom.filter((row) => row.category === 'wire').reduce((sum, row) => sum + row.quantity, 0), wireBomMAfter: movedProjection.bom.filter((row) => row.category === 'wire').reduce((sum, row) => sum + row.quantity, 0), connectorCountBefore: projection.bom.filter((row) => row.category === 'connector-housing').reduce((sum, row) => sum + row.quantity, 0), connectorCountAfter: movedProjection.bom.filter((row) => row.category === 'connector-housing').reduce((sum, row) => sum + row.quantity, 0), terminalCountBefore: projection.bom.filter((row) => row.category === 'terminal').reduce((sum, row) => sum + row.quantity, 0), terminalCountAfter: movedProjection.bom.filter((row) => row.category === 'terminal').reduce((sum, row) => sum + row.quantity, 0), quoteSubtotalBefore: quote.subtotal, quoteSubtotalAfter: movedQuote.subtotal }, elapsedMs: Number((performance.now() - started).toFixed(1)) }, null, 2));
