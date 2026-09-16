import type { BomRow, PriceBreak, QuoteLine, QuoteRequest, QuoteSnapshot } from './model';
import { naturalCompare, round, sha256, stableJson } from './stable';

export type ComponentQuoteResult = Omit<QuoteLine, keyof QuoteRequest | 'provider'>;
export interface ComponentQuoteProvider {
  readonly name: string;
  quote(request: QuoteRequest): ComponentQuoteResult | Promise<ComponentQuoteResult>;
}

export type LocalQuoteEntry = {
  readonly manufacturer: string;
  readonly partNumber: string;
  readonly unit: 'ea' | 'm';
  readonly currency: string;
  readonly moq: number;
  readonly priceBreaks: readonly PriceBreak[];
  readonly leadTimeDays?: number;
  readonly unavailable?: boolean;
  readonly error?: string;
};

function localResult(entry: LocalQuoteEntry | undefined, request: QuoteRequest): ComponentQuoteResult {
  if (!entry) return { status: 'unavailable', quotedPurchaseQuantity: request.requiredQuantity, currency: 'USD', priceBreaks: [], notes: 'Part is not present in the local fixture.' };
  if (entry.error) return { status: 'error', quotedPurchaseQuantity: request.requiredQuantity, currency: entry.currency, priceBreaks: entry.priceBreaks, error: entry.error };
  if (entry.unavailable) return { status: 'unavailable', quotedPurchaseQuantity: request.requiredQuantity, currency: entry.currency, priceBreaks: entry.priceBreaks, moq: entry.moq, leadTimeDays: entry.leadTimeDays };
  const purchase = Math.max(request.requiredQuantity, entry.moq);
  const applicable = [...entry.priceBreaks].sort((a, b) => a.minimumQuantity - b.minimumQuantity).filter((item) => purchase >= item.minimumQuantity);
  const selected = applicable[applicable.length - 1];
  if (!selected) return { status: 'error', quotedPurchaseQuantity: purchase, currency: entry.currency, priceBreaks: entry.priceBreaks, error: 'No applicable price break.' };
  return { status: 'available', quotedPurchaseQuantity: round(purchase), currency: entry.currency, unitPrice: selected.unitPrice, extendedPrice: round(purchase * selected.unitPrice, 2), moq: entry.moq, priceBreaks: entry.priceBreaks, leadTimeDays: entry.leadTimeDays };
}

export class LocalQuoteProvider implements ComponentQuoteProvider {
  readonly name = 'LocalQuoteProvider';
  constructor(private readonly entries: readonly LocalQuoteEntry[]) {}
  quote(request: QuoteRequest): ComponentQuoteResult {
    return localResult(this.entries.find((entry) => entry.manufacturer === request.manufacturer && entry.partNumber === request.partNumber && entry.unit === request.unit), request);
  }
}

export function quoteRequestsFromBom(rows: readonly BomRow[]): QuoteRequest[] {
  return rows.map((row) => ({ bomRowId: row.id, manufacturer: row.manufacturer, partNumber: row.partNumber, requiredQuantity: row.quantity, unit: row.unit, category: row.category }));
}

function finishSnapshot(lines: readonly QuoteLine[], timestamp: string, provider: string): QuoteSnapshot {
  const sorted = [...lines].sort((a, b) => naturalCompare(a.bomRowId, b.bomRowId));
  const payload = { provider, timestamp, lines: sorted };
  return { schemaVersion: '1', identity: `sha256:${sha256(stableJson(payload))}`, label: 'Demo Estimate / Local Fixture Pricing', provider, timestamp, currency: sorted[0]?.currency ?? 'USD', lines: sorted, subtotal: round(sorted.reduce((sum, line) => sum + (line.extendedPrice ?? 0), 0), 2), unavailableLineCount: sorted.filter((line) => line.status !== 'available').length };
}

export function buildLocalQuoteSnapshot(rows: readonly BomRow[], provider: LocalQuoteProvider, timestamp: string): QuoteSnapshot {
  const lines = quoteRequestsFromBom(rows).map((request): QuoteLine => ({ ...request, ...provider.quote(request), provider: provider.name }));
  return finishSnapshot(lines, timestamp, provider.name);
}

export async function buildQuoteSnapshot(rows: readonly BomRow[], provider: ComponentQuoteProvider, timestamp: string): Promise<QuoteSnapshot> {
  const lines = await Promise.all(quoteRequestsFromBom(rows).map(async (request): Promise<QuoteLine> => ({ ...request, ...await provider.quote(request), provider: provider.name })));
  return finishSnapshot(lines, timestamp, provider.name);
}
