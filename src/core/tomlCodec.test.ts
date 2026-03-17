import { describe, expect, it } from 'vitest';

import { createSampleHarnessDocument } from '@/core/harnessModel';
import { exportHarnessToToml, importHarnessFromToml } from '@/core/tomlCodec';

describe('toml soft binding fields', () => {
  it('round-trips optional housing and wire type ids', () => {
    const document = createSampleHarnessDocument();
    document.connectors.ECU_C1.housingId = 'H-001';
    document.wires.W_CAN_H.wireTypeId = 'WIRE-TXL-0.35';

    const imported = importHarnessFromToml(exportHarnessToToml(document));

    expect(imported.connectors.ECU_C1.housingId).toBe('H-001');
    expect(imported.wires.W_CAN_H.wireTypeId).toBe('WIRE-TXL-0.35');
  });

  it('keeps legacy documents valid when optional bindings are absent', () => {
    const imported = importHarnessFromToml(exportHarnessToToml(createSampleHarnessDocument()));

    expect(imported.connectors.ECU_C1.housingId).toBeUndefined();
    expect(imported.wires.W_CAN_H.wireTypeId).toBeUndefined();
  });
});
