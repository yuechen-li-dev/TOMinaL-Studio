import { useCallback, useEffect, useState } from 'react';
import {
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { SelectionState } from '@/app/App';
import type { XY } from '@/core/harnessModel';
import type { TominalNodeData, TominalSegmentData } from '@/flow/flowTypes';
import { nodeTypes } from '@/flow/nodeTypes';

type FlowCanvasProps = {
  nodes: Node<TominalNodeData>[];
  segments: Edge<TominalSegmentData>[];
  onMoveNode: (nodeId: string, position: XY) => void;
  onSelectionChange: (selection: SelectionState) => void;
};

export function FlowCanvas({ nodes, segments, onMoveNode, onSelectionChange }: FlowCanvasProps) {
  const [uiNodes, setUiNodes] = useState(nodes);
  const [uiEdges, setUiEdges] = useState(segments);

  useEffect(() => setUiNodes(nodes), [nodes]);
  useEffect(() => setUiEdges(segments), [segments]);

  const onNodesChange = useCallback(
    (changes: NodeChange<Node<TominalNodeData>>[]) => setUiNodes((current) => applyNodeChanges(changes, current)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge<TominalSegmentData>>[]) => setUiEdges((current) => applyEdgeChanges(changes, current)),
    []
  );

  return (
    <main className="min-h-0 overflow-hidden rounded-xl border border-border/70 bg-white shadow-sm">
      <ReactFlow
        fitView
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={{ type: 'default', style: { stroke: '#374151', strokeWidth: 2.4 } }}
        edges={uiEdges}
        nodeTypes={nodeTypes}
        nodes={uiNodes}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={(_, node) => onMoveNode(node.id, [node.position.x, node.position.y])}
        onNodesChange={onNodesChange}
        onSelectionChange={(selection) =>
          onSelectionChange({
            selectedNodeIds: (selection.nodes ?? []).map((node) => node.id),
            selectedSegmentIds: (selection.edges ?? []).map((edge) => edge.id),
            selectedWireIds: []
          })
        }
        onPaneClick={() => onSelectionChange({ selectedNodeIds: [], selectedSegmentIds: [], selectedWireIds: [] })}
      >
        <Background color="#dbe4ef" gap={20} size={1} />
        <MiniMap className="!bg-slate-100" nodeColor="#94a3b8" pannable zoomable />
        <Controls />
      </ReactFlow>
    </main>
  );
}
