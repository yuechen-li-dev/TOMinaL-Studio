import { controllerChassisHarness } from './controllerChassis.harness';

import {
  connectorOccurrenceId,
  electricalSpliceId,
  mm,
  routeId,
  routeJunctionId,
  routeSegmentId,
  studId,
  type HarnessIr,
  type RouteEndpoint
} from '@/harness-core';
import { degrees, pointMm, type FormboardDocument, type PhysicalRouteNodeRef, type TominalProject } from '@/formboard';

const connector = (id: string): PhysicalRouteNodeRef => ({ kind: 'connector', id: connectorOccurrenceId(id) });
const splice = (id: string): PhysicalRouteNodeRef => ({ kind: 'splice', id: electricalSpliceId(id) });
const junction = (id: string): PhysicalRouteNodeRef => ({ kind: 'junction', id: routeJunctionId(id) });
const stud = (id: string): PhysicalRouteNodeRef => ({ kind: 'stud', id: studId(id) });

const definitions = [
  ['SEG_POWER_IN', connector('PCB_POWER'), junction('JUNCTION_PANEL_FANOUT'), [pointMm(260, 240), pointMm(430, 225), pointMm(600, 260)]],
  ['SEG_POWER_OUT', junction('JUNCTION_PANEL_FANOUT'), connector('PANEL_POWER'), [pointMm(600, 260), pointMm(430, 140), pointMm(85, 120)]],
  ['SEG_MOTOR_IN', connector('PCB_MOTOR'), junction('JUNCTION_PANEL_FANOUT'), [pointMm(350, 235), pointMm(470, 235), pointMm(600, 260)]],
  ['SEG_MOTOR_OUT', junction('JUNCTION_PANEL_FANOUT'), connector('PANEL_MOTOR'), [pointMm(600, 260), pointMm(710, 220), pointMm(820, 190)]],
  ['SEG_SENSOR', connector('PCB_SENSOR'), connector('PANEL_SENSOR'), [pointMm(350, 330), pointMm(560, 350), pointMm(820, 330)]],
  ['SEG_SERVICE', connector('PCB_SERVICE'), connector('PANEL_SERVICE'), [pointMm(260, 370), pointMm(500, 430), pointMm(820, 450)]],
  ['SEG_GROUND_PCB', connector('PCB_POWER'), splice('SPLICE_GROUND'), [pointMm(260, 240), pointMm(220, 360), pointMm(165, 455)]],
  ['SEG_GROUND_PANEL', connector('PANEL_POWER'), splice('SPLICE_GROUND'), [pointMm(85, 120), pointMm(110, 300), pointMm(165, 455)]],
  ['SEG_GROUND_STUD', splice('SPLICE_GROUND'), stud('CHASSIS_STUD'), [pointMm(165, 455), pointMm(120, 490), pointMm(80, 510)]]
] as const;

const routeSegments = definitions.map(([id, from, to]) => ({
  id: routeSegmentId(id),
  from: from as RouteEndpoint,
  to: to as RouteEndpoint
}));

const routes = [
  { id: routeId('ROUTE_POWER'), segmentIds: [routeSegmentId('SEG_POWER_IN'), routeSegmentId('SEG_POWER_OUT')] },
  { id: routeId('ROUTE_MOTOR'), segmentIds: [routeSegmentId('SEG_MOTOR_IN'), routeSegmentId('SEG_MOTOR_OUT')] },
  { id: routeId('ROUTE_SENSOR'), segmentIds: [routeSegmentId('SEG_SENSOR')] },
  { id: routeId('ROUTE_SERVICE'), segmentIds: [routeSegmentId('SEG_SERVICE')] },
  { id: routeId('ROUTE_GROUND_PCB'), segmentIds: [routeSegmentId('SEG_GROUND_PCB')] },
  { id: routeId('ROUTE_GROUND_PANEL'), segmentIds: [routeSegmentId('SEG_GROUND_PANEL')] },
  { id: routeId('ROUTE_GROUND_STUD'), segmentIds: [routeSegmentId('SEG_GROUND_STUD')] }
];

const conductorRoute = new Map<string, ReturnType<typeof routeId>>([
  ['WIRE_VIN_POS', routeId('ROUTE_POWER')],
  ['WIRE_VIN_NEG', routeId('ROUTE_POWER')],
  ['WIRE_MOTOR_POS', routeId('ROUTE_MOTOR')],
  ['WIRE_MOTOR_NEG', routeId('ROUTE_MOTOR')],
  ['WIRE_MOTOR_ENABLE', routeId('ROUTE_MOTOR')],
  ['WIRE_ENCODER_A', routeId('ROUTE_SENSOR')],
  ['WIRE_ENCODER_B', routeId('ROUTE_SENSOR')],
  ['WIRE_TEMPERATURE', routeId('ROUTE_SENSOR')],
  ['WIRE_SERVICE_TX', routeId('ROUTE_SERVICE')],
  ['WIRE_SERVICE_RX', routeId('ROUTE_SERVICE')],
  ['WIRE_GROUND_PCB', routeId('ROUTE_GROUND_PCB')],
  ['WIRE_GROUND_PANEL', routeId('ROUTE_GROUND_PANEL')],
  ['WIRE_GROUND_STUD', routeId('ROUTE_GROUND_STUD')]
]);

export const controllerChassisRoutedHarness: HarnessIr = {
  ...controllerChassisHarness,
  conductors: controllerChassisHarness.conductors.map((conductor) => ({
    ...conductor,
    routeId: conductorRoute.get(conductor.id) ?? conductor.routeId
  })),
  routes,
  routeSegments
};

const connectorPositions = new Map([
  ['PCB_POWER', pointMm(260, 240)],
  ['PANEL_POWER', pointMm(85, 120)],
  ['PCB_MOTOR', pointMm(350, 235)],
  ['PANEL_MOTOR', pointMm(820, 190)],
  ['PCB_SENSOR', pointMm(350, 330)],
  ['PANEL_SENSOR', pointMm(820, 330)],
  ['PCB_SERVICE', pointMm(260, 370)],
  ['PANEL_SERVICE', pointMm(820, 450)]
]);

export const controllerChassisFormboard: FormboardDocument = {
  formboardVersion: '1',
  harnessId: controllerChassisRoutedHarness.id,
  title: 'Small Control Chassis Harness — Manufacturing Formboard',
  revision: 'X1',
  board: {
    widthMm: mm(900),
    heightMm: mm(600),
    origin: pointMm(0, 0),
    gridSpacingMm: mm(20),
    drawingMarginMm: mm(30),
    titleBlockMarginMm: mm(30),
    forbidGeometryOutsideBoard: true
  },
  connectorPlacements: controllerChassisRoutedHarness.connectorOccurrences.map((item) => ({
    connectorOccurrenceId: item.id,
    position: connectorPositions.get(item.id) ?? pointMm(450, 300),
    rotationDeg: degrees(item.id.startsWith('PANEL') ? 180 : 0),
    provenance: 'authored'
  })),
  splicePlacements: [{ electricalSpliceId: electricalSpliceId('SPLICE_GROUND'), position: pointMm(165, 455), provenance: 'authored' }],
  routeJunctionPlacements: [{ routeJunctionId: routeJunctionId('JUNCTION_PANEL_FANOUT'), position: pointMm(600, 260), provenance: 'authored' }],
  studPlacements: [{ studId: studId('CHASSIS_STUD'), position: pointMm(80, 510) }],
  segmentGeometry: definitions.map(([id, from, to, points]) => ({
    routeSegmentId: routeSegmentId(id),
    from,
    to,
    points,
    geometryKind: 'cubicSpline',
    bundleDiameterMm: mm(id.includes('POWER') || id.includes('MOTOR') ? 6 : 4),
    minimumBendRadiusMm: mm(25),
    provenance: 'authored'
  })),
  routes: routes.map((route) => ({ routeId: route.id, segmentIds: route.segmentIds })),
  annotations: [
    { id: 'note-branch', text: 'PHYSICAL BUNDLE BRANCH — NO ELECTRICAL SPLICE', position: pointMm(570, 290), entity: { kind: 'routeJunction', id: 'JUNCTION_PANEL_FANOUT' } },
    { id: 'note-splice', text: 'ELECTRICAL SPLICE', position: pointMm(175, 445), entity: { kind: 'electricalSplice', id: 'SPLICE_GROUND' } },
    { id: 'note-print', text: 'PRINT AT 100% / ACTUAL SIZE. VERIFY CALIBRATION WITNESS.', position: pointMm(520, 570) }
  ],
  dimensions: [
    { id: 'dim-power-panel-to-pcb', from: pointMm(85, 120), to: pointMm(260, 120), offsetMm: mm(-22), label: '175 mm' },
    { id: 'dim-branch-x', from: pointMm(600, 260), to: pointMm(820, 260), offsetMm: mm(60), label: '220 mm' }
  ],
  context: [
    { id: 'chassis-outline', kind: 'chassis', origin: pointMm(45, 70), widthMm: mm(810), heightMm: mm(470), label: 'CONTROL CHASSIS' },
    { id: 'pcb-outline', kind: 'pcb', origin: pointMm(225, 195), widthMm: mm(165), heightMm: mm(220), label: 'PCB' },
    { id: 'panel-edge', kind: 'panel', origin: pointMm(790, 105), widthMm: mm(55), heightMm: mm(390), label: 'PANEL' }
  ],
  exportSettings: { scale: '1:1', includeGrid: true, calibrationLengthMm: mm(100) }
};

export const controllerChassisProject: TominalProject = {
  harness: controllerChassisRoutedHarness,
  formboard: controllerChassisFormboard
};
