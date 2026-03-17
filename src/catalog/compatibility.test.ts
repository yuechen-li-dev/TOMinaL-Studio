import { describe, expect, it } from 'vitest';

import {
  isGaugeCompatible,
  isTerminalCompatibleWithHousing,
  isWireTypeCompatibleWithConnectorTerminal,
  isWireTypeCompatibleWithRingTerminal
} from '@/catalog/compatibility';

describe('isGaugeCompatible', () => {
  it('returns compatible for exact match', () => {
    expect(isGaugeCompatible('18 AWG', '18 AWG')).toEqual({ isCompatible: true, reason: 'compatible' });
  });

  it('returns mismatch for exact mismatch', () => {
    expect(isGaugeCompatible('18 AWG', '20 AWG')).toEqual({ isCompatible: false, reason: 'gauge_mismatch' });
  });

  it('returns compatible when range includes gauge', () => {
    expect(isGaugeCompatible('18 AWG', '16-18 AWG')).toEqual({ isCompatible: true, reason: 'compatible' });
  });

  it('returns mismatch when range excludes gauge', () => {
    expect(isGaugeCompatible('20 AWG', '16-18 AWG')).toEqual({ isCompatible: false, reason: 'gauge_mismatch' });
  });

  it('returns deterministic malformed result for invalid strings', () => {
    expect(isGaugeCompatible('not-a-gauge', '16-18 AWG')).toEqual({
      isCompatible: false,
      reason: 'wire_gauge_malformed'
    });

    expect(isGaugeCompatible('18 AWG', 'bad-range')).toEqual({
      isCompatible: false,
      reason: 'target_gauge_malformed'
    });
  });
});

describe('isTerminalCompatibleWithHousing', () => {
  const housing = {
    terminals: [
      { id: 'T-001' },
      { id: 'T-002' }
    ]
  };

  it('returns terminal_found when terminal exists in housing list', () => {
    expect(isTerminalCompatibleWithHousing(housing, 'T-001')).toEqual({
      isCompatible: true,
      reason: 'terminal_found'
    });
  });

  it('returns terminal_not_found when terminal does not exist in housing list', () => {
    expect(isTerminalCompatibleWithHousing(housing, 'T-999')).toEqual({
      isCompatible: false,
      reason: 'terminal_not_found'
    });
  });
});

describe('wire compatibility helpers', () => {
  it('validates wire type against connector terminal gauge', () => {
    expect(
      isWireTypeCompatibleWithConnectorTerminal(
        { gauge: '18 AWG' },
        { compatibleWireGauge: '16-18 AWG' }
      )
    ).toEqual({ isCompatible: true, reason: 'compatible' });

    expect(
      isWireTypeCompatibleWithConnectorTerminal(
        { gauge: '20 AWG' },
        { compatibleWireGauge: '16-18 AWG' }
      )
    ).toEqual({ isCompatible: false, reason: 'gauge_mismatch' });
  });

  it('validates wire type against ring terminal gauge', () => {
    expect(
      isWireTypeCompatibleWithRingTerminal(
        { gauge: '18 AWG' },
        { compatibleWireGauge: '18 AWG' }
      )
    ).toEqual({ isCompatible: true, reason: 'compatible' });

    expect(
      isWireTypeCompatibleWithRingTerminal(
        { gauge: '18 AWG' },
        { compatibleWireGauge: '22 AWG' }
      )
    ).toEqual({ isCompatible: false, reason: 'gauge_mismatch' });
  });
});
