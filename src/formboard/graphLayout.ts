import type { HarnessIr, Millimeters } from '@/harness-core';
import type { BoardSettings, PhysicalRouteNodeRef, PointMm } from './model';

export type GraphLayoutNode = {
  readonly ref: PhysicalRouteNodeRef;
  readonly position: PointMm;
  readonly layer: number;
};

const key = (node: PhysicalRouteNodeRef) => `${node.kind}:${node.id}`;
const mmValue = (value: number) => value as Millimeters;

/**
 * Deterministic layered layout for a small harness graph. It is deliberately a proposal:
 * persisted FormboardDocument coordinates, never this algorithm, remain manufacturing authority.
 */
export function layoutHarnessGraph(harness: HarnessIr, board: BoardSettings): readonly GraphLayoutNode[] {
  const nodes: PhysicalRouteNodeRef[] = [
    ...harness.connectorOccurrences.map((item) => ({ kind: 'connector' as const, id: item.id })),
    ...harness.electricalSplices.map((item) => ({ kind: 'splice' as const, id: item.id })),
    ...harness.routeJunctions.map((item) => ({ kind: 'junction' as const, id: item.id })),
    ...(harness.catalog.studs ?? []).map((item) => ({ kind: 'stud' as const, id: item.id }))
  ];
  const adjacency = new Map(nodes.map((node) => [key(node), new Set<string>()]));
  for (const segment of harness.routeSegments) {
    adjacency.get(key(segment.from))?.add(key(segment.to));
    adjacency.get(key(segment.to))?.add(key(segment.from));
  }
  const sortedKeys = [...adjacency.keys()].sort();
  const root = sortedKeys.find((id) => id.includes('PCB_')) ?? sortedKeys[0];
  const layers = new Map<string, number>();
  if (root) {
    layers.set(root, 0);
    const queue = [root];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const neighbor of [...(adjacency.get(current) ?? [])].sort()) {
        if (!layers.has(neighbor)) {
          layers.set(neighbor, (layers.get(current) ?? 0) + 1);
          queue.push(neighbor);
        }
      }
    }
  }
  let disconnectedLayer = Math.max(0, ...layers.values()) + 1;
  for (const id of sortedKeys) if (!layers.has(id)) layers.set(id, disconnectedLayer++);
  const groups = new Map<number, string[]>();
  for (const id of sortedKeys) {
    const layer = layers.get(id)!;
    groups.set(layer, [...(groups.get(layer) ?? []), id]);
  }
  const margin = Number(board.drawingMarginMm ?? mmValue(40));
  const maxLayer = Math.max(1, ...groups.keys());
  const byKey = new Map(nodes.map((node) => [key(node), node]));
  return [...groups.entries()].sort(([a], [b]) => a - b).flatMap(([layer, ids]) =>
    ids.map((id, index) => ({
      ref: byKey.get(id)!,
      layer,
      position: {
        x: mmValue(margin + (Number(board.widthMm) - 2 * margin) * (layer / maxLayer)),
        y: mmValue(margin + (Number(board.heightMm) - 2 * margin) * ((index + 1) / (ids.length + 1)))
      }
    }))
  );
}

