import { addWire } from '@/core/harnessMutations';
import type { HarnessDocument, PinRef, Segment } from '@/core/harnessModel';

export type WireGenerationReport = {
  indexedSignalCount: number;
  generatedWireCount: number;
  generatedSignals: string[];
  skippedNonPairSignals: Array<{ signal: string; endpointCount: number }>;
  skippedAlreadyConnectedSignals: string[];
  skippedNoRouteSignals: string[];
  ignoredEmptySignalPins: number;
};

type AdjacencyEntry = {
  nextNodeId: string;
  segmentId: string;
};

function buildSignalIndex(doc: HarnessDocument): {
  signalIndex: Map<string, PinRef[]>;
  ignoredEmptySignalPins: number;
} {
  const signalIndex = new Map<string, PinRef[]>();

  let ignoredEmptySignalPins = 0;

  Object.values(doc.connectors).forEach((connector) => {
    Object.entries(connector.pins).forEach(([pinId, pin]) => {
      const signal = pin.signal?.trim();
      if (!signal) {
        ignoredEmptySignalPins += 1;
        return;
      }

      const pins = signalIndex.get(signal) ?? [];
      pins.push({ connectorId: connector.id, pinId });
      signalIndex.set(signal, pins);
    });
  });

  return {
    signalIndex,
    ignoredEmptySignalPins
  };
}

function createSegmentAdjacency(segments: Record<string, Segment>): Map<string, AdjacencyEntry[]> {
  const adjacency = new Map<string, AdjacencyEntry[]>();

  Object.values(segments).forEach((segment) => {
    const fromEntries = adjacency.get(segment.from) ?? [];
    fromEntries.push({ nextNodeId: segment.to, segmentId: segment.id });
    adjacency.set(segment.from, fromEntries);

    const toEntries = adjacency.get(segment.to) ?? [];
    toEntries.push({ nextNodeId: segment.from, segmentId: segment.id });
    adjacency.set(segment.to, toEntries);
  });

  return adjacency;
}

export function inferRouteBySegmentsBfs(doc: HarnessDocument, fromNodeId: string, toNodeId: string): string[] | null {
  if (fromNodeId === toNodeId) {
    return [];
  }

  const adjacency = createSegmentAdjacency(doc.segments);
  const visited = new Set<string>([fromNodeId]);
  const queue: string[] = [fromNodeId];
  const predecessors = new Map<string, { nodeId: string; segmentId: string }>();

  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;
    const neighbors = adjacency.get(currentNodeId) ?? [];

    for (const neighbor of neighbors) {
      if (visited.has(neighbor.nextNodeId)) {
        continue;
      }

      visited.add(neighbor.nextNodeId);
      predecessors.set(neighbor.nextNodeId, { nodeId: currentNodeId, segmentId: neighbor.segmentId });

      if (neighbor.nextNodeId === toNodeId) {
        const route: string[] = [];
        let cursor = toNodeId;

        while (cursor !== fromNodeId) {
          const predecessor = predecessors.get(cursor);
          if (!predecessor) {
            return null;
          }

          route.push(predecessor.segmentId);
          cursor = predecessor.nodeId;
        }

        route.reverse();
        return route;
      }

      queue.push(neighbor.nextNodeId);
    }
  }

  return null;
}

function makePinRefKey(pinRef: PinRef): string {
  return `${pinRef.connectorId}:${pinRef.pinId}`;
}

function makeConnectionKey(from: PinRef, to: PinRef): string {
  const a = makePinRefKey(from);
  const b = makePinRefKey(to);
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function getExistingConnectionKeys(doc: HarnessDocument): Set<string> {
  return new Set(Object.values(doc.wires).map((wire) => makeConnectionKey(wire.from, wire.to)));
}

function sanitizeSignalForWireId(signal: string): string {
  const sanitized = signal.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return sanitized || 'SIG';
}

function createCanonicalWireId(signal: string, existingIds: Set<string>): string {
  const baseId = `W_${sanitizeSignalForWireId(signal)}`;

  if (!existingIds.has(baseId)) {
    return baseId;
  }

  let suffix = 2;
  while (existingIds.has(`${baseId}_${suffix}`)) {
    suffix += 1;
  }

  return `${baseId}_${suffix}`;
}

export function generateWiresFromSignals(doc: HarnessDocument): {
  document: HarnessDocument;
  report: WireGenerationReport;
} {
  const { signalIndex, ignoredEmptySignalPins } = buildSignalIndex(doc);
  const existingConnectionKeys = getExistingConnectionKeys(doc);
  const wireIds = new Set(Object.keys(doc.wires));

  let nextDocument = doc;

  const generatedSignals: string[] = [];
  const skippedNonPairSignals: Array<{ signal: string; endpointCount: number }> = [];
  const skippedAlreadyConnectedSignals: string[] = [];
  const skippedNoRouteSignals: string[] = [];

  for (const [signal, pinRefs] of signalIndex.entries()) {
    if (pinRefs.length !== 2) {
      skippedNonPairSignals.push({ signal, endpointCount: pinRefs.length });
      continue;
    }

    const [from, to] = pinRefs;
    const connectionKey = makeConnectionKey(from, to);
    if (existingConnectionKeys.has(connectionKey)) {
      skippedAlreadyConnectedSignals.push(signal);
      continue;
    }

    const route = inferRouteBySegmentsBfs(nextDocument, from.connectorId, to.connectorId);
    if (!route) {
      skippedNoRouteSignals.push(signal);
      continue;
    }

    const wireId = createCanonicalWireId(signal, wireIds);
    nextDocument = addWire(nextDocument, {
      id: wireId,
      from,
      to,
      route
    });

    wireIds.add(wireId);
    existingConnectionKeys.add(connectionKey);
    generatedSignals.push(signal);
  }

  return {
    document: nextDocument,
    report: {
      indexedSignalCount: signalIndex.size,
      generatedWireCount: generatedSignals.length,
      generatedSignals,
      skippedNonPairSignals,
      skippedAlreadyConnectedSignals,
      skippedNoRouteSignals,
      ignoredEmptySignalPins
    }
  };
}
