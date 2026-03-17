import { describe, expect, it } from 'vitest';

import {
  getConnectorHousingBindingStatuses,
  getGraphCatalogBindingSummary,
  getWireTypeBindingStatuses,
  resolveBindingStatus
} from '@/core/bindingStatus';
import { createSampleHarnessDocument } from '@/core/harnessModel';

const sample = createSampleHarnessDocument();

describe('resolveBindingStatus', () => {
  it('returns unbound when reference id is missing', () => {
    expect(resolveBindingStatus(undefined, ['A'])).toEqual({ status: 'unbound' });
  });

  it('returns valid when id exists in catalog ids', () => {
    expect(resolveBindingStatus('WIRE_TXL', ['WIRE_TXL', 'WIRE_GXL'])).toEqual({
      status: 'valid',
      referenceId: 'WIRE_TXL'
    });
  });

  it('returns invalid when id does not exist in catalog ids', () => {
    expect(resolveBindingStatus('WIRE_TXL', ['WIRE_GXL'])).toEqual({
      status: 'invalid',
      referenceId: 'WIRE_TXL'
    });
  });
});

describe('graph soft binding helpers', () => {
  it('treats absent connector and wire bindings as unbound', () => {
    expect(getConnectorHousingBindingStatuses(sample, ['H-001']).ECU_C1).toEqual({ status: 'unbound' });
    expect(getWireTypeBindingStatuses(sample, ['WIRE-TXL']).W_CAN_H).toEqual({ status: 'unbound' });
  });

  it('produces valid and invalid statuses when optional ids are present', () => {
    const document = {
      ...sample,
      connectors: {
        ...sample.connectors,
        ECU_C1: { ...sample.connectors.ECU_C1, housingId: 'H-100' },
        CLUSTER_C1: { ...sample.connectors.CLUSTER_C1, housingId: 'H-404' }
      },
      wires: {
        ...sample.wires,
        W_CAN_H: { ...sample.wires.W_CAN_H, wireTypeId: 'WIRE-TXL' },
        W_CAN_L: { ...sample.wires.W_CAN_L, wireTypeId: 'WIRE-NOT-FOUND' }
      }
    };

    const summary = getGraphCatalogBindingSummary(document, {
      connectorHousingIds: ['H-100'],
      wireTypeIds: ['WIRE-TXL']
    });

    expect(summary.connectorHousing.ECU_C1.status).toBe('valid');
    expect(summary.connectorHousing.CLUSTER_C1.status).toBe('invalid');
    expect(summary.wireType.W_CAN_H.status).toBe('valid');
    expect(summary.wireType.W_CAN_L.status).toBe('invalid');
  });
});
