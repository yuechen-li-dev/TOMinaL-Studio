import { describe, expect, it } from 'vitest';

import type { GraphValidationCatalog } from '@/core/graphValidation';
import { summarizeGraphValidation, validateGraphCompatibility } from '@/core/graphValidation';
import { createEmptyHarnessDocument } from '@/core/harnessModel';

function createCatalog(): GraphValidationCatalog {
  return {
    connectorHousings: [
      {
        id: 'H-100',
        partNumber: 'H100-PN',
        manufacturer: 'TE',
        description: 'Housing',
        family: 'Micro',
        cavityCount: 2,
        notes: '',
        terminals: [
          {
            id: 'T-1',
            partNumber: 'TERM-1',
            description: 'Terminal 1',
            compatibleWireGauge: '20-22 AWG',
            crimpToolPartNumber: 'TOOL-1',
            notes: ''
          }
        ],
        seals: [],
        plugs: []
      }
    ],
    wireTypes: [
      {
        id: 'W-TXL-20',
        partNumber: 'W20-PN',
        manufacturer: 'Aptiv',
        description: 'Wire',
        gauge: '20 AWG',
        insulationType: 'TXL',
        notes: ''
      },
      {
        id: 'W-TXL-24',
        partNumber: 'W24-PN',
        manufacturer: 'Aptiv',
        description: 'Wire',
        gauge: '24 AWG',
        insulationType: 'TXL',
        notes: ''
      }
    ]
  };
}

describe('validateGraphCompatibility', () => {
  it('validates connector housing binding statuses', () => {
    const doc = createEmptyHarnessDocument();
    doc.connectors = {
      C1: { id: 'C1', position: [0, 0], pins: {}, housingId: undefined },
      C2: { id: 'C2', position: [0, 0], pins: {}, housingId: 'H-MISSING' },
      C3: { id: 'C3', position: [0, 0], pins: {}, housingId: 'H-100' }
    };

    const results = validateGraphCompatibility(doc, createCatalog()).filter((result) => result.rule === 'connector-housing-binding');

    expect(results.map((result) => [result.entityId, result.status])).toEqual([
      ['C1', 'unbound'],
      ['C2', 'invalid'],
      ['C3', 'valid']
    ]);
  });

  it('validates wire type binding statuses', () => {
    const doc = createEmptyHarnessDocument();
    doc.connectors = {
      C1: { id: 'C1', position: [0, 0], pins: { '1': {} } }
    };
    doc.wires = {
      W1: { id: 'W1', from: { connectorId: 'C1', pinId: '1' }, to: { connectorId: 'C1', pinId: '1' }, route: [] },
      W2: { id: 'W2', from: { connectorId: 'C1', pinId: '1' }, to: { connectorId: 'C1', pinId: '1' }, route: [], wireTypeId: 'W-MISSING' },
      W3: { id: 'W3', from: { connectorId: 'C1', pinId: '1' }, to: { connectorId: 'C1', pinId: '1' }, route: [], wireTypeId: 'W-TXL-20' }
    };

    const results = validateGraphCompatibility(doc, createCatalog()).filter((result) => result.rule === 'wire-type-binding');

    expect(results.map((result) => [result.entityId, result.status])).toEqual([
      ['W1', 'unbound'],
      ['W2', 'invalid'],
      ['W3', 'valid']
    ]);
  });

  it('validates connector terminal membership against selected housing', () => {
    const doc = createEmptyHarnessDocument();
    doc.connectors = {
      C1: {
        id: 'C1',
        position: [0, 0],
        housingId: 'H-100',
        pins: {
          '1': { terminalPartNumber: 'TERM-1' },
          '2': { terminalPartNumber: 'TERM-404' }
        }
      },
      C2: {
        id: 'C2',
        position: [0, 0],
        pins: {
          '1': { terminalPartNumber: 'TERM-1' }
        }
      }
    };

    const results = validateGraphCompatibility(doc, createCatalog()).filter(
      (result) => result.rule === 'connector-terminal-membership'
    );

    expect(results.map((result) => [result.entityId, result.status])).toEqual([
      ['C1:1', 'valid'],
      ['C1:2', 'invalid'],
      ['C2:1', 'unbound']
    ]);
  });

  it('validates wire gauge compatibility with connector terminal where data is available', () => {
    const doc = createEmptyHarnessDocument();
    doc.connectors = {
      C1: {
        id: 'C1',
        position: [0, 0],
        housingId: 'H-100',
        pins: {
          '1': { terminalPartNumber: 'TERM-1' },
          '2': { terminalPartNumber: 'TERM-404' }
        }
      },
      C2: {
        id: 'C2',
        position: [0, 0],
        housingId: 'H-100',
        pins: {
          '1': { terminalPartNumber: 'TERM-1' }
        }
      }
    };
    doc.wires = {
      W_OK: {
        id: 'W_OK',
        from: { connectorId: 'C1', pinId: '1' },
        to: { connectorId: 'C2', pinId: '1' },
        route: [],
        wireTypeId: 'W-TXL-20'
      },
      W_BAD: {
        id: 'W_BAD',
        from: { connectorId: 'C1', pinId: '1' },
        to: { connectorId: 'C2', pinId: '1' },
        route: [],
        wireTypeId: 'W-TXL-24'
      },
      W_MISSING: {
        id: 'W_MISSING',
        from: { connectorId: 'C1', pinId: '2' },
        to: { connectorId: 'C2', pinId: '1' },
        route: []
      }
    };

    const results = validateGraphCompatibility(doc, createCatalog()).filter(
      (result) => result.rule === 'wire-gauge-terminal-compatibility'
    );

    expect(results.some((result) => result.entityId === 'W_OK:C1:1' && result.status === 'valid')).toBe(true);
    expect(results.some((result) => result.entityId === 'W_BAD:C1:1' && result.status === 'invalid')).toBe(true);
    expect(results.some((result) => result.entityId === 'W_MISSING:C1:2' && result.status === 'unbound')).toBe(true);
  });

  it('summarizes statuses', () => {
    const summary = summarizeGraphValidation([
      { status: 'valid', scope: 'wire', entityId: 'W1', rule: 'wire-type-binding', message: '' },
      { status: 'invalid', scope: 'wire', entityId: 'W2', rule: 'wire-type-binding', message: '' },
      { status: 'unbound', scope: 'wire', entityId: 'W3', rule: 'wire-type-binding', message: '' }
    ]);

    expect(summary).toEqual({ valid: 1, invalid: 1, unbound: 1 });
  });
});
