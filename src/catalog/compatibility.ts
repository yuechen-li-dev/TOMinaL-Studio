import type { ConnectorTerminal, RingTerminal, WireType } from '@/catalog/schemas';

type ParsedGauge =
  | { kind: 'single'; value: number }
  | { kind: 'range'; min: number; max: number };

type GaugeParseResult =
  | { success: true; parsed: ParsedGauge }
  | { success: false; reason: 'malformed_gauge' };

export type GaugeCompatibilityResult =
  | { isCompatible: true; reason: 'compatible' }
  | {
      isCompatible: false;
      reason: 'wire_gauge_malformed' | 'target_gauge_malformed' | 'gauge_mismatch';
    };

export type HousingTerminalCompatibilityResult =
  | { isCompatible: true; reason: 'terminal_found' }
  | { isCompatible: false; reason: 'terminal_not_found' };

function parseGauge(text: string): GaugeParseResult {
  const singleMatch = /^\s*(\d+)\s*AWG\s*$/i.exec(text);

  if (singleMatch) {
    return {
      success: true,
      parsed: {
        kind: 'single',
        value: Number(singleMatch[1])
      }
    };
  }

  const rangeMatch = /^\s*(\d+)\s*-\s*(\d+)\s*AWG\s*$/i.exec(text);

  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);

    return {
      success: true,
      parsed: {
        kind: 'range',
        min: Math.min(start, end),
        max: Math.max(start, end)
      }
    };
  }

  return {
    success: false,
    reason: 'malformed_gauge'
  };
}

export function isGaugeCompatible(wireGauge: string, compatibleGauge: string): GaugeCompatibilityResult {
  const parsedWireGauge = parseGauge(wireGauge);

  if (!parsedWireGauge.success || parsedWireGauge.parsed.kind !== 'single') {
    return {
      isCompatible: false,
      reason: 'wire_gauge_malformed'
    };
  }

  const parsedCompatibleGauge = parseGauge(compatibleGauge);

  if (!parsedCompatibleGauge.success) {
    return {
      isCompatible: false,
      reason: 'target_gauge_malformed'
    };
  }

  if (parsedCompatibleGauge.parsed.kind === 'single') {
    return parsedWireGauge.parsed.value === parsedCompatibleGauge.parsed.value
      ? { isCompatible: true, reason: 'compatible' }
      : { isCompatible: false, reason: 'gauge_mismatch' };
  }

  const isInRange =
    parsedWireGauge.parsed.value >= parsedCompatibleGauge.parsed.min &&
    parsedWireGauge.parsed.value <= parsedCompatibleGauge.parsed.max;

  return isInRange
    ? { isCompatible: true, reason: 'compatible' }
    : { isCompatible: false, reason: 'gauge_mismatch' };
}

export function isTerminalCompatibleWithHousing(
  housing: { terminals: Array<Pick<ConnectorTerminal, 'id'>> },
  terminalId: string
): HousingTerminalCompatibilityResult {
  const terminalExists = housing.terminals.some((terminal) => terminal.id === terminalId);

  return terminalExists
    ? { isCompatible: true, reason: 'terminal_found' }
    : { isCompatible: false, reason: 'terminal_not_found' };
}

export function isWireTypeCompatibleWithConnectorTerminal(
  wireType: Pick<WireType, 'gauge'>,
  terminal: Pick<ConnectorTerminal, 'compatibleWireGauge'>
): GaugeCompatibilityResult {
  return isGaugeCompatible(wireType.gauge, terminal.compatibleWireGauge);
}

export function isWireTypeCompatibleWithRingTerminal(
  wireType: Pick<WireType, 'gauge'>,
  ringTerminal: Pick<RingTerminal, 'compatibleWireGauge'>
): GaugeCompatibilityResult {
  return isGaugeCompatible(wireType.gauge, ringTerminal.compatibleWireGauge);
}

