import type { Edge, Node } from '@xyflow/react';

import type { HarnessDocument } from '@/core/harnessModel';
import type { TominalNodeData, TominalSegmentData } from '@/flow/flowTypes';

export function toFlowNodes(doc: HarnessDocument): Node<TominalNodeData>[] {
  const connectorNodes: Node<TominalNodeData>[] = Object.values(doc.connectors).map((connector) => ({
    id: connector.id,
    type: 'connector',
    position: { x: connector.position[0], y: connector.position[1] },
    data: {
      label: connector.id,
      kind: 'connector',
      modelId: connector.id
    }
  }));

  const branchNodes: Node<TominalNodeData>[] = Object.values(doc.branches).map((branch) => ({
    id: branch.id,
    type: 'branch',
    position: { x: branch.position[0], y: branch.position[1] },
    data: {
      label: branch.id,
      kind: 'branch',
      modelId: branch.id
    }
  }));

  const spliceNodes: Node<TominalNodeData>[] = Object.values(doc.splices).map((splice) => ({
    id: splice.id,
    type: 'splice',
    position: { x: splice.position[0], y: splice.position[1] },
    data: {
      label: splice.id,
      kind: 'splice',
      modelId: splice.id
    }
  }));

  return [...connectorNodes, ...branchNodes, ...spliceNodes];
}

export function toFlowEdges(doc: HarnessDocument): Edge<TominalSegmentData>[] {
  return Object.values(doc.segments).map((segment) => ({
    id: segment.id,
    type: 'harness',
    source: segment.from,
    target: segment.to,
    data: {
      modelId: segment.id,
      label: segment.id,
      geometry: segment.geometry,
      nominalLengthMm: segment.nominalLengthMm
    }
  }));
}
