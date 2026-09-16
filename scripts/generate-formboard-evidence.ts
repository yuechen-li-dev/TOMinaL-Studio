import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { controllerChassisProject } from '../fixtures/controller-chassis/controllerChassis.formboard';
import { exportFormboardSvg, getRouteLength, serializeFormboard, validateFormboard } from '../src/formboard';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'artifacts/local/TOMINAL-FORMBOARD-X1');
await mkdir(output, { recursive: true });

const diagnostics = validateFormboard(controllerChassisProject.harness, controllerChassisProject.formboard);
const renderStarted = performance.now();
const svg = exportFormboardSvg(controllerChassisProject.harness, controllerChassisProject.formboard);
const renderTimeMs = performance.now() - renderStarted;
const repeatSvg = exportFormboardSvg(controllerChassisProject.harness, controllerChassisProject.formboard);
const inventory = {
  board: `${controllerChassisProject.formboard.board.widthMm} x ${controllerChassisProject.formboard.board.heightMm} mm`,
  connectors: controllerChassisProject.formboard.connectorPlacements.length,
  splices: controllerChassisProject.formboard.splicePlacements.length,
  physicalBranches: controllerChassisProject.formboard.routeJunctionPlacements.length,
  segments: controllerChassisProject.formboard.segmentGeometry.length,
  routes: controllerChassisProject.formboard.routes.length,
  routedConductors: controllerChassisProject.harness.conductors.filter((item) => item.routeId).length,
  unresolvedRoutes: controllerChassisProject.formboard.routes.filter((route) => getRouteLength(controllerChassisProject.formboard, route.routeId).status === 'unresolved').length,
  totalRouteGeometryLengthMm: Number(controllerChassisProject.formboard.routes.reduce((sum, route) => {
    const length = getRouteLength(controllerChassisProject.formboard, route.routeId);
    return sum + (length.status === 'resolved' ? Number(length.valueMm) : 0);
  }, 0).toFixed(3)),
  svgBytes: Buffer.byteLength(svg, 'utf8'),
  renderTimeMs: Number(renderTimeMs.toFixed(3)),
  deterministicRepeat: repeatSvg === svg,
  diagnostics
};

await writeFile(resolve(output, 'controller-chassis.formboard.json'), serializeFormboard(controllerChassisProject.formboard));
await writeFile(resolve(output, 'controller-chassis.formboard.svg'), svg);
await writeFile(resolve(output, 'inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`);
console.log(JSON.stringify(inventory, null, 2));
