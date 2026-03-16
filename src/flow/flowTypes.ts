import type { Edge, Node } from '@xyflow/react';

export type TominalNodeKind = 'connector' | 'branch' | 'splice';

export type TominalNodeData = {
  label: string;
  kind: TominalNodeKind;
};

export type TominalEdgeData = {
  label?: string;
};

export type TominalNode = Node<TominalNodeData>;
export type TominalEdge = Edge<TominalEdgeData>;
