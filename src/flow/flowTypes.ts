import type { Edge, Node } from '@xyflow/react';

export type TominalNodeKind = 'connector' | 'branch' | 'splice';

export type TominalNodeData = {
  label: string;
  kind: TominalNodeKind;
  modelId: string;
};

export type TominalSegmentData = {
  label?: string;
  modelId: string;
  geometry?: 'polyline' | 'spline';
  nominalLengthMm?: number;
};

export type TominalNode = Node<TominalNodeData>;
export type TominalSegment = Edge<TominalSegmentData>;
