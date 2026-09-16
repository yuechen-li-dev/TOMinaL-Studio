import type { LocalQuoteEntry } from '@/artifacts';

export const controllerChassisQuoteTimestamp = '2026-09-15T12:00:00.000Z';

const each = (manufacturer: string, partNumber: string, unitPrice: number, moq = 1): LocalQuoteEntry => ({ manufacturer, partNumber, unit: 'ea', currency: 'USD', moq, priceBreaks: [{ minimumQuantity: 1, unitPrice }, { minimumQuantity: 10, unitPrice: Number((unitPrice * 0.9).toFixed(4)) }], leadTimeDays: 5 });

export const controllerChassisLocalQuoteData: readonly LocalQuoteEntry[] = [
  each('Tominal Demo Parts', 'DEMO-HOUSING-MOTOR-3', 3.2),
  each('Tominal Demo Parts', 'DEMO-HOUSING-POWER-3', 2.8),
  each('Tominal Demo Parts', 'DEMO-HOUSING-SENSOR-3', 2.4),
  each('Tominal Demo Parts', 'DEMO-HOUSING-SERVICE-3', 2.1),
  each('Tominal Demo Parts', 'DEMO-TERM-PWR', 0.18, 5),
  each('Tominal Demo Parts', 'DEMO-TERM-GND', 0.2, 5),
  each('Tominal Demo Parts', 'DEMO-TERM-SIG', 0.11, 10),
  each('Tominal Demo Parts', 'DEMO-SEAL-PWR', 0.08, 5),
  each('Tominal Demo Parts', 'DEMO-SEAL-SIG', 0.06, 10),
  each('Tominal Demo Parts', 'DEMO-PLUG', 0.05),
  each('Tominal Demo Parts', 'DEMO-RING-M4', 0.31),
  { manufacturer: 'Tominal Demo Parts', partNumber: 'DEMO-WIRE-1.0', unit: 'm', currency: 'USD', moq: 1, priceBreaks: [{ minimumQuantity: 1, unitPrice: 0.82 }, { minimumQuantity: 10, unitPrice: 0.7 }], leadTimeDays: 2 },
  { manufacturer: 'Tominal Demo Parts', partNumber: 'DEMO-WIRE-0.22', unit: 'm', currency: 'USD', moq: 1, priceBreaks: [{ minimumQuantity: 1, unitPrice: 0.42 }, { minimumQuantity: 10, unitPrice: 0.35 }], leadTimeDays: 2 }
];
