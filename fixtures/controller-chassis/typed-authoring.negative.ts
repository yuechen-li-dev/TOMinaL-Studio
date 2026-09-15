import { defineHarness } from '@/harness-authoring';
import { circuitId, conductorId, type ConnectorOccurrenceId, type WireTypeId } from '@/harness-core';
import { controllerChassisCatalog } from './catalog';
import { Motor3Family, Power3Family } from './connectorFamilies.generated';

defineHarness('compile-time-negative-proof', { name: 'Negative proof', catalog: controllerChassisCatalog }, ({ connector }) => {
  const power = connector('POWER', Power3Family, { role: 'Power' });
  const motor = connector('MOTOR', Motor3Family, { role: 'Motor' });

  void power.cavity.VIN_POS;

  // @ts-expect-error Power3 has no misspelled cavity.
  void power.cavity.VIN_POZ;

  // @ts-expect-error Motor3 cannot be addressed with a Power3 cavity name.
  void motor.cavity.VIN_POS;
});

// @ts-expect-error Circuit IDs cannot be assigned to connector occurrence IDs.
const wrongConnectorId: ConnectorOccurrenceId = circuitId('CIRCUIT');

// @ts-expect-error Conductor IDs cannot be assigned to wire type IDs.
const wrongWireTypeId: WireTypeId = conductorId('WIRE');

void wrongConnectorId;
void wrongWireTypeId;

