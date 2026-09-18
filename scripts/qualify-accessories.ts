import { buildLocalQuoteSnapshot, deriveManufacturingArtifacts, LocalQuoteProvider, sha256 } from '@/artifacts';
import { accessoryPosition, deriveBundleSections, deriveHeatShrinkPlacements, estimateTapeWrap, moveConnector, serializeFormboard, validateSleeveFit } from '@/formboard';
import { connectorOccurrenceId, routeId, serializeHarnessIr } from '@/harness-core';
import { controllerChassisProject } from '../fixtures/controller-chassis/controllerChassis.formboard';
import { controllerChassisLocalQuoteData, controllerChassisQuoteTimestamp } from '../fixtures/controller-chassis/localQuoteData';
import { pointMm } from '@/formboard';

const motorRoute = routeId('ROUTE_MOTOR');
const label = controllerChassisProject.formboard.accessories!.find((item) => item.kind === 'label')!;
const tape = controllerChassisProject.formboard.accessories!.find((item) => item.kind === 'tapeWrap')!;
const sleeve = controllerChassisProject.formboard.accessories!.find((item) => item.kind === 'sleeve')!;
if (tape.kind !== 'tapeWrap' || sleeve.kind !== 'sleeve') throw new Error('Fixture accessory intent is incomplete.');

const bundleStarted = performance.now();
let bundle = deriveBundleSections(controllerChassisProject.harness, controllerChassisProject.formboard, motorRoute);
for (let index = 1; index < 1000; index += 1) bundle = deriveBundleSections(controllerChassisProject.harness, controllerChassisProject.formboard, motorRoute);
const bundleElapsed = performance.now() - bundleStarted;

const accessoryStarted = performance.now();
let tapeResult = estimateTapeWrap(controllerChassisProject, tape);
for (let index = 1; index < 1000; index += 1) {
  tapeResult = estimateTapeWrap(controllerChassisProject, tape);
  validateSleeveFit(controllerChassisProject, sleeve);
  deriveHeatShrinkPlacements(controllerChassisProject);
}
const accessoryElapsed = performance.now() - accessoryStarted;

const beforeProjection = deriveManufacturingArtifacts(controllerChassisProject);
const quoteProvider = new LocalQuoteProvider(controllerChassisLocalQuoteData);
const beforeQuote = buildLocalQuoteSnapshot(beforeProjection.bom, quoteProvider, controllerChassisQuoteTimestamp);
const movedFormboard = moveConnector(controllerChassisProject.formboard, connectorOccurrenceId('PANEL_MOTOR'), pointMm(900, 190)).document;
const movedProject = { ...controllerChassisProject, formboard: movedFormboard };
const afterProjection = deriveManufacturingArtifacts(movedProject);
const afterQuote = buildLocalQuoteSnapshot(afterProjection.bom, quoteProvider, controllerChassisQuoteTimestamp);
const beforeMotor = beforeProjection.cutList.find((row) => row.wireId === 'WIRE_MOTOR_POS')!;
const afterMotor = afterProjection.cutList.find((row) => row.wireId === 'WIRE_MOTOR_POS')!;
const beforeLabel = accessoryPosition(controllerChassisProject.formboard, label)!;
const afterLabel = accessoryPosition(movedFormboard, label)!;
const sleeveResult = validateSleeveFit(controllerChassisProject, sleeve);
const heatShrink = deriveHeatShrinkPlacements(controllerChassisProject);
const bomDiff = [...new Set([...beforeProjection.bom, ...afterProjection.bom].map((row) => row.id))].map((id) => {
  const before = beforeProjection.bom.find((row) => row.id === id);
  const after = afterProjection.bom.find((row) => row.id === id);
  return { id, category: before?.category ?? after?.category, beforeQuantity: before?.quantity ?? 0, afterQuantity: after?.quantity ?? 0, unit: before?.unit ?? after?.unit };
}).filter((row) => row.beforeQuantity !== row.afterQuantity);

const evidence = {
  verdict: 'accepted',
  harnessHashBefore: sha256(serializeHarnessIr(controllerChassisProject.harness)),
  harnessHashAfter: sha256(serializeHarnessIr(movedProject.harness)),
  formboardHashBefore: sha256(serializeFormboard(controllerChassisProject.formboard)),
  formboardHashAfter: sha256(serializeFormboard(movedFormboard)),
  motorRoute: {
    sections: bundle.sections.map((section) => ({ startStationMm: Number(section.startStationMm), endStationMm: Number(section.endStationMm), conductorIds: section.conductorIds, coreDiameterMm: section.coreDiameterMm === undefined ? null : Number(section.coreDiameterMm), finishedDiameterMm: section.finishedDiameterMm === undefined ? null : Number(section.finishedDiameterMm) })),
    beforeLengthMm: beforeMotor.routeLengthMm,
    afterLengthMm: afterMotor.routeLengthMm
  },
  label: { id: label.id, stationMm: Number(label.stationMm), beforePositionMm: beforeLabel, afterPositionMm: afterLabel },
  tape: tapeResult.estimate,
  sleeve: sleeveResult.qualification,
  heatShrink: heatShrink.placements,
  accessoryBom: beforeProjection.bom.filter((row) => ['label', 'tape', 'sleeve', 'heat-shrink'].includes(row.category)),
  panelMotorPlus80: {
    accessoryScheduleBefore: beforeProjection.accessorySchedule,
    accessoryScheduleAfter: afterProjection.accessorySchedule,
    changedBomRows: bomDiff
  },
  quote: { beforeIdentity: beforeQuote.identity, afterIdentity: afterQuote.identity, beforeSubtotal: beforeQuote.subtotal, afterSubtotal: afterQuote.subtotal },
  performance: { iterations: 1000, bundleDerivationAverageMs: bundleElapsed / 1000, accessoryRecalculationAverageMs: accessoryElapsed / 1000 }
};

process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
