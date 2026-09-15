import {
  Motor3Family,
  Power3Family,
  Sensor3Family,
  Service3Family
} from './connectorFamilies.generated';
import { controllerChassisCatalog } from './catalog';

import { defineHarness, type AuthoredEndpoint } from '@/harness-authoring';
import { catalogPartId, signalRoleId, wireTypeId } from '@/harness-core';

const powerTermination = (target: AuthoredEndpoint['target']): AuthoredEndpoint => ({
  target,
  terminalPartId: catalogPartId('TERM_POWER'),
  sealPartId: catalogPartId('SEAL_POWER')
});

const groundTermination = (target: AuthoredEndpoint['target']): AuthoredEndpoint => ({
  target,
  terminalPartId: catalogPartId('TERM_GROUND'),
  sealPartId: catalogPartId('SEAL_POWER')
});

const signalTermination = (target: AuthoredEndpoint['target']): AuthoredEndpoint => ({
  target,
  terminalPartId: catalogPartId('TERM_SIGNAL'),
  sealPartId: catalogPartId('SEAL_SIGNAL')
});

export const controllerChassisHarness = defineHarness(
  'controller-chassis',
  {
    name: 'Small Control Chassis Harness',
    description: 'Illustrative low-voltage harness for a sheet-metal electronics enclosure.',
    catalog: controllerChassisCatalog
  },
  ({ connector, populate, splice, routeJunction, route, stud, circuit }) => {
    const pcbPower = connector('PCB_POWER', Power3Family, { role: 'PCB power header' });
    const panelPower = connector('PANEL_POWER', Power3Family, { role: 'Panel DC power input' });
    const pcbMotor = connector('PCB_MOTOR', Motor3Family, { role: 'PCB motor header' });
    const panelMotor = connector('PANEL_MOTOR', Motor3Family, { role: 'Panel motor output' });
    const pcbSensor = connector('PCB_SENSOR', Sensor3Family, { role: 'PCB sensor header' });
    const panelSensor = connector('PANEL_SENSOR', Sensor3Family, { role: 'Panel encoder and temperature port' });
    const pcbService = connector('PCB_SERVICE', Service3Family, { role: 'PCB service header' });
    const panelService = connector('PANEL_SERVICE', Service3Family, { role: 'Panel service connector' });

    for (const target of [pcbPower.cavity.VIN_POS, panelPower.cavity.VIN_POS]) {
      populate(target, {
        kind: 'terminalPopulated',
        terminalPartId: catalogPartId('TERM_POWER'),
        sealPartId: catalogPartId('SEAL_POWER'),
        signalRole: signalRoleId('VIN_POS')
      });
    }
    for (const target of [pcbPower.cavity.VIN_NEG, panelPower.cavity.VIN_NEG]) {
      populate(target, {
        kind: 'terminalPopulated',
        terminalPartId: catalogPartId('TERM_POWER'),
        sealPartId: catalogPartId('SEAL_POWER'),
        signalRole: signalRoleId('VIN_NEG')
      });
    }
    for (const target of [pcbPower.cavity.CHASSIS_GROUND, panelPower.cavity.CHASSIS_GROUND]) {
      populate(target, {
        kind: 'terminalPopulated',
        terminalPartId: catalogPartId('TERM_GROUND'),
        sealPartId: catalogPartId('SEAL_POWER'),
        signalRole: signalRoleId('CHASSIS_GROUND')
      });
    }
    for (const [left, right, role] of [
      [pcbMotor.cavity.MOTOR_POS, panelMotor.cavity.MOTOR_POS, 'MOTOR_POS'],
      [pcbMotor.cavity.MOTOR_NEG, panelMotor.cavity.MOTOR_NEG, 'MOTOR_NEG']
    ] as const) {
      for (const target of [left, right]) {
        populate(target, {
          kind: 'terminalPopulated',
          terminalPartId: catalogPartId('TERM_POWER'),
          sealPartId: catalogPartId('SEAL_POWER'),
          signalRole: signalRoleId(role)
        });
      }
    }
    for (const target of [pcbMotor.cavity.ENABLE, panelMotor.cavity.ENABLE]) {
      populate(target, {
        kind: 'terminalPopulated',
        terminalPartId: catalogPartId('TERM_SIGNAL'),
        sealPartId: catalogPartId('SEAL_SIGNAL'),
        signalRole: signalRoleId('MOTOR_ENABLE')
      });
    }
    for (const [left, right, role] of [
      [pcbSensor.cavity.ENCODER_A, panelSensor.cavity.ENCODER_A, 'ENCODER_A'],
      [pcbSensor.cavity.ENCODER_B, panelSensor.cavity.ENCODER_B, 'ENCODER_B'],
      [pcbSensor.cavity.TEMPERATURE, panelSensor.cavity.TEMPERATURE, 'TEMPERATURE'],
      [pcbService.cavity.TX, panelService.cavity.TX, 'SERVICE_TX'],
      [pcbService.cavity.RX, panelService.cavity.RX, 'SERVICE_RX']
    ] as const) {
      for (const target of [left, right]) {
        populate(target, {
          kind: 'terminalPopulated',
          terminalPartId: catalogPartId('TERM_SIGNAL'),
          sealPartId: catalogPartId('SEAL_SIGNAL'),
          signalRole: signalRoleId(role)
        });
      }
    }
    populate(pcbService.cavity.GROUND_RESERVED, { kind: 'unpopulated', reason: 'reserved' });
    populate(panelService.cavity.GROUND_RESERVED, { kind: 'plugged', plugPartId: catalogPartId('PLUG_DEMO') });

    const groundSplice = splice('SPLICE_GROUND', { ports: ['pcb', 'panel', 'stud'] as const });
    routeJunction('JUNCTION_PANEL_FANOUT', { role: 'Physical bundle fanout only; no electrical connection' });
    const powerRoute = route('ROUTE_POWER');
    const motorRoute = route('ROUTE_MOTOR');
    const signalRoute = route('ROUTE_SIGNAL');

    circuit.pointToPoint({
      id: 'CIRCUIT_VIN_POS',
      signalRole: 'VIN_POS',
      conductor: {
        id: 'WIRE_VIN_POS',
        from: powerTermination(pcbPower.cavity.VIN_POS),
        to: powerTermination(panelPower.cavity.VIN_POS),
        wireTypeId: wireTypeId('WIRE_POWER_1MM2'),
        color: 'RD',
        slackMm: 20,
        routeId: powerRoute
      }
    });
    circuit.pointToPoint({
      id: 'CIRCUIT_VIN_NEG',
      signalRole: 'VIN_NEG',
      conductor: {
        id: 'WIRE_VIN_NEG',
        from: powerTermination(pcbPower.cavity.VIN_NEG),
        to: powerTermination(panelPower.cavity.VIN_NEG),
        wireTypeId: wireTypeId('WIRE_POWER_1MM2'),
        color: 'BK',
        slackMm: 20,
        routeId: powerRoute
      }
    });

    for (const [id, role, from, to, color, routeIdValue, power] of [
      ['WIRE_MOTOR_POS', 'MOTOR_POS', pcbMotor.cavity.MOTOR_POS, panelMotor.cavity.MOTOR_POS, 'RD', motorRoute, true],
      ['WIRE_MOTOR_NEG', 'MOTOR_NEG', pcbMotor.cavity.MOTOR_NEG, panelMotor.cavity.MOTOR_NEG, 'BK', motorRoute, true],
      ['WIRE_MOTOR_ENABLE', 'MOTOR_ENABLE', pcbMotor.cavity.ENABLE, panelMotor.cavity.ENABLE, 'YE', motorRoute, false],
      ['WIRE_ENCODER_A', 'ENCODER_A', pcbSensor.cavity.ENCODER_A, panelSensor.cavity.ENCODER_A, 'WH', signalRoute, false],
      ['WIRE_ENCODER_B', 'ENCODER_B', pcbSensor.cavity.ENCODER_B, panelSensor.cavity.ENCODER_B, 'BU', signalRoute, false],
      ['WIRE_TEMPERATURE', 'TEMPERATURE', pcbSensor.cavity.TEMPERATURE, panelSensor.cavity.TEMPERATURE, 'VT', signalRoute, false],
      ['WIRE_SERVICE_TX', 'SERVICE_TX', pcbService.cavity.TX, panelService.cavity.TX, 'GY', signalRoute, false],
      ['WIRE_SERVICE_RX', 'SERVICE_RX', pcbService.cavity.RX, panelService.cavity.RX, 'WH', signalRoute, false]
    ] as const) {
      circuit.pointToPoint({
        id: `CIRCUIT_${role}`,
        signalRole: role,
        conductor: {
          id,
          from: power ? powerTermination(from) : signalTermination(from),
          to: power ? powerTermination(to) : signalTermination(to),
          wireTypeId: wireTypeId(power ? 'WIRE_POWER_1MM2' : 'WIRE_SIGNAL_022MM2'),
          color,
          slackMm: power ? 20 : 15,
          routeId: routeIdValue
        }
      });
    }

    circuit.spliceTree({
      id: 'CIRCUIT_CHASSIS_GROUND',
      signalRole: 'CHASSIS_GROUND',
      splices: [groundSplice],
      conductors: [
        {
          id: 'WIRE_GROUND_PCB',
          from: groundTermination(pcbPower.cavity.CHASSIS_GROUND),
          to: { target: groundSplice.port.pcb },
          wireTypeId: wireTypeId('WIRE_POWER_1MM2'),
          color: 'GN',
          slackMm: 20,
          routeId: powerRoute
        },
        {
          id: 'WIRE_GROUND_PANEL',
          from: groundTermination(panelPower.cavity.CHASSIS_GROUND),
          to: { target: groundSplice.port.panel },
          wireTypeId: wireTypeId('WIRE_POWER_1MM2'),
          color: 'GN',
          slackMm: 20,
          routeId: powerRoute
        },
        {
          id: 'WIRE_GROUND_STUD',
          from: { target: groundSplice.port.stud },
          to: { target: stud('CHASSIS_STUD'), ringTerminalPartId: catalogPartId('RING_M4') },
          wireTypeId: wireTypeId('WIRE_POWER_1MM2'),
          color: 'GN',
          slackMm: 15,
          routeId: powerRoute
        }
      ]
    });
  }
);
