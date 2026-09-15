import { mm2, type SquareMillimeters } from '@/harness-core/ids';
import type { Gauge, GaugeAllowance } from '@/harness-core/model';

export function gaugeAreaMm2(gauge: Gauge): SquareMillimeters {
  if (gauge.kind === 'crossSection') {
    return gauge.areaMm2;
  }

  const diameterInches = 0.005 * 92 ** ((36 - gauge.value) / 39);
  const diameterMm = diameterInches * 25.4;
  return mm2((Math.PI * diameterMm * diameterMm) / 4);
}

export function isGaugeAllowed(gauge: Gauge, allowance: GaugeAllowance): boolean {
  const area = gaugeAreaMm2(gauge);
  return area >= allowance.minAreaMm2 && area <= allowance.maxAreaMm2;
}

export const awg = (value: number): Gauge => ({ kind: 'awg', value });
export const crossSection = (areaMm2: number): Gauge => ({ kind: 'crossSection', areaMm2: mm2(areaMm2) });
export const gaugeAllowance = (minAreaMm2: number, maxAreaMm2 = minAreaMm2): GaugeAllowance => ({
  minAreaMm2: mm2(minAreaMm2),
  maxAreaMm2: mm2(maxAreaMm2)
});

