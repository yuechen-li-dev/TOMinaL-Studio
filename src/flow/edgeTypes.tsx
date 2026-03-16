import { BaseEdge, getSmoothStepPath, type Edge, type EdgeProps } from '@xyflow/react';

import type { TominalSegmentData } from '@/flow/flowTypes';

type TominalRFEdge = Edge<TominalSegmentData>;

function HarnessEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style
}: EdgeProps<TominalRFEdge>) {
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 18
  });

  return <BaseEdge markerEnd={markerEnd} path={path} style={{ stroke: '#374151', strokeWidth: 2.4, ...style }} />;
}

export const edgeTypes = {
  harness: HarnessEdge
};
