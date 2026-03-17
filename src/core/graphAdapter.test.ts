import { describe, expect, it, vi } from 'vitest';

import { toFlowNodes } from '@/core/graphAdapter';
import { createSampleHarnessDocument } from '@/core/harnessModel';

describe('toFlowNodes catalog selector data', () => {
  it('passes housing options through to connector nodes', () => {
    const document = createSampleHarnessDocument();
    const nodes = toFlowNodes(document, {
      collapsedConnectorIds: {},
      housingOptions: [{ id: 'H-100', label: '33472-0401', secondary: 'Molex' }],
      connectorCallbacks: {
        onToggleCollapse: vi.fn(),
        onPartNumberChange: vi.fn(),
        onHousingIdChange: vi.fn(),
        onPinCountChange: vi.fn(),
        onPinChange: vi.fn()
      }
    });

    const connectorNode = nodes.find((node) => node.id === 'ECU_C1');
    expect(connectorNode?.data.housingOptions).toEqual([{ id: 'H-100', label: '33472-0401', secondary: 'Molex' }]);
  });
});
