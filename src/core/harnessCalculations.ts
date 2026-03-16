import type { HarnessDocument, Wire } from '@/core/harnessModel';

export type WireMetrics = {
  wireId: string;
  routeLengthMm: number;
  slackMm: number;
  cutLengthMm: number;
};

export function computeWireRouteLength(doc: HarnessDocument, wire: Wire): number {
  return wire.route.reduce((total, segmentId) => total + (doc.segments[segmentId]?.nominalLengthMm ?? 0), 0);
}

export function computeWireCutLength(doc: HarnessDocument, wire: Wire): number {
  return computeWireRouteLength(doc, wire) + (wire.slackMm ?? 0);
}

export function computeWireMetrics(doc: HarnessDocument, wire: Wire): WireMetrics {
  const routeLengthMm = computeWireRouteLength(doc, wire);
  const slackMm = wire.slackMm ?? 0;

  return {
    wireId: wire.id,
    routeLengthMm,
    slackMm,
    cutLengthMm: routeLengthMm + slackMm
  };
}

export function computeAllWireMetrics(doc: HarnessDocument): Record<string, WireMetrics> {
  return Object.fromEntries(Object.values(doc.wires).map((wire) => [wire.id, computeWireMetrics(doc, wire)]));
}
