import type { Edge, Node } from '@xyflow/react';

import type { LogicalGraphProjection } from '@/harness-core/logicalProjection';

export type VNextLogicalNodeData = {
  label: string;
  kind: 'connector' | 'electricalSplice' | 'stud' | 'serviceEnd';
  entityKind: string;
  entityId: string;
};

export type VNextLogicalEdgeData = {
  label: string;
  circuitId: string;
  entityKind: 'conductor';
  entityId: string;
};

export type VNextLogicalLayout = Readonly<Record<string, { readonly x: number; readonly y: number }>>;

export function logicalProjectionToReactFlow(
  projection: LogicalGraphProjection,
  layout: VNextLogicalLayout = {}
): { nodes: Node<VNextLogicalNodeData>[]; edges: Edge<VNextLogicalEdgeData>[] } {
  const nodes = projection.nodes.map((node, index) => ({
    id: node.id,
    type: 'default',
    position: layout[node.id] ?? { x: 80 + (index % 4) * 240, y: 80 + Math.floor(index / 4) * 160 },
    data: {
      label: node.label,
      kind: node.kind,
      entityKind: node.entity.kind,
      entityId: node.entity.id
    }
  }));
  const edges = projection.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    data: {
      label: edge.label,
      circuitId: edge.circuitId,
      entityKind: 'conductor' as const,
      entityId: edge.entity.id
    }
  }));
  return { nodes, edges };
}

