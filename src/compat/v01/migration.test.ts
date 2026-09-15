import { describe, expect, it } from 'vitest';

import { createSampleHarnessDocument } from '@/core/harnessModel';
import { migrateV01 } from '@/compat/v01';

describe('v0.1 migration', () => {
  it('preserves safe point-to-point conductors, routes, lengths, placements, and catalog bindings', () => {
    const result = migrateV01(createSampleHarnessDocument());
    expect(result.ir.connectorOccurrences).toHaveLength(2);
    expect(result.ir.circuits).toHaveLength(3);
    expect(result.ir.conductors).toHaveLength(3);
    expect(result.ir.routes).toHaveLength(3);
    expect(result.ir.routeSegments).toHaveLength(3);
    expect(result.ir.routeSegments[0].lengthOverride?.provenance).toBe('legacy-v0.1-nominal');
    expect(result.ir.legacyPlacementProposals).toHaveLength(4);
    expect(result.diagnostics.map((diagnostic) => diagnostic.rule)).toContain('migration.splice.connectivityUnknown');
  });

  it('does not invent multi-drop topology from an equal signal string', () => {
    const legacy = createSampleHarnessDocument();
    legacy.connectors.EXTRA = {
      id: 'EXTRA',
      position: [0, 0],
      pins: { '1': { signal: 'CAN_H' } }
    };
    const result = migrateV01(legacy);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ rule: 'migration.signal.ambiguous', entity: { kind: 'migration', id: 'CAN_H' } })
    );
    expect(result.ir.circuits.some((circuit) => circuit.signalRole === 'CAN_H')).toBe(false);
  });
});

