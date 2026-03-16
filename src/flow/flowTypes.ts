import type { Edge, Node } from '@xyflow/react';

import type { ConnectorPin } from '@/core/harnessModel';

export type TominalNodeKind = 'connector' | 'branch' | 'splice';

export type ConnectorNodePinRow = {
  pinId: string;
  pin: ConnectorPin;
};

export type TominalNodeData = {
  label: string;
  kind: TominalNodeKind;
  modelId: string;
  partNumber?: string;
  pinCount?: number;
  pinRows?: ConnectorNodePinRow[];
  isCollapsed?: boolean;
  onToggleCollapse?: (connectorId: string) => void;
  onPartNumberChange?: (connectorId: string, partNumber: string) => void;
  onPinCountChange?: (connectorId: string, pinCount: number) => void;
  onPinChange?: (connectorId: string, pinId: string, patch: Partial<ConnectorPin>) => void;
};

export type TominalSegmentData = {
  label?: string;
  modelId: string;
  geometry?: 'polyline' | 'spline';
  nominalLengthMm?: number;
};

export type TominalNode = Node<TominalNodeData>;
export type TominalSegment = Edge<TominalSegmentData>;
