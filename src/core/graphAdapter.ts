import type { Edge, Node } from '@xyflow/react';

import type { ConnectorPin, HarnessDocument } from '@/core/harnessModel';
import type { CatalogOption, TominalNodeData, TominalSegmentData } from '@/flow/flowTypes';

type ConnectorNodeCallbacks = {
  onToggleCollapse: (connectorId: string) => void;
  onPartNumberChange: (connectorId: string, partNumber: string) => void;
  onHousingIdChange: (connectorId: string, housingId: string | undefined) => void;
  onPinCountChange: (connectorId: string, pinCount: number) => void;
  onPinChange: (connectorId: string, pinId: string, patch: Partial<ConnectorPin>) => void;
};

type ToFlowNodesOptions = {
  collapsedConnectorIds: Record<string, boolean>;
  connectorCallbacks: ConnectorNodeCallbacks;
  housingOptions: CatalogOption[];
};

function sortPinIds(pins: Record<string, ConnectorPin>): string[] {
  return Object.keys(pins).sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10));
}

export function toFlowNodes(doc: HarnessDocument, options: ToFlowNodesOptions): Node<TominalNodeData>[] {
  const { collapsedConnectorIds, connectorCallbacks, housingOptions } = options;

  const connectorNodes: Node<TominalNodeData>[] = Object.values(doc.connectors).map((connector) => {
    const pinRows = sortPinIds(connector.pins).map((pinId) => ({ pinId, pin: connector.pins[pinId] }));

    return {
      id: connector.id,
      type: 'connector',
      dragHandle: '.connector-node__drag-handle',
      position: { x: connector.position[0], y: connector.position[1] },
      data: {
        label: connector.id,
        kind: 'connector',
        modelId: connector.id,
        partNumber: connector.partNumber,
        housingId: connector.housingId,
        housingOptions,
        pinCount: pinRows.length,
        pinRows,
        isCollapsed: collapsedConnectorIds[connector.id] ?? true,
        ...connectorCallbacks
      }
    };
  });

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
    type: 'default',
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
