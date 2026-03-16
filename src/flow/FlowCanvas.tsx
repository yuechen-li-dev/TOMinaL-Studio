import {
  addEdge,
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnConnect
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { SelectionState } from '@/app/App';
import { edgeTypes } from '@/flow/edgeTypes';
import type { TominalEdgeData, TominalNodeData } from '@/flow/flowTypes';
import { nodeTypes } from '@/flow/nodeTypes';

type FlowCanvasProps = {
  nodes: Node<TominalNodeData>[];
  edges: Edge<TominalEdgeData>[];
  onNodesChange: (changes: NodeChange<Node<TominalNodeData>>[]) => void;
  onEdgesChange: (changes: EdgeChange<Edge<TominalEdgeData>>[]) => void;
  setEdges: React.Dispatch<React.SetStateAction<Edge<TominalEdgeData>[]>>;
  onSelectionChange: (selection: SelectionState) => void;
};

export function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  setEdges,
  onSelectionChange
}: FlowCanvasProps) {
  const onConnect: OnConnect = (connection) => {
    setEdges((eds) =>
      addEdge(
        {
          ...connection,
          id: `E_${connection.source}_${connection.target}_${eds.length + 1}`,
          type: 'harness'
        },
        eds
      )
    );
  };

  return (
    <main className="min-h-0 overflow-hidden rounded-xl border border-border/70 bg-white shadow-sm">
      <ReactFlow
        fitView
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={{ type: 'harness' }}
        edgeTypes={edgeTypes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodes={nodes}
        onConnect={onConnect}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => onSelectionChange({ type: 'node', item: node })}
        onNodesChange={onNodesChange}
        onEdgeClick={(_, edge) => onSelectionChange({ type: 'edge', item: edge })}
        onPaneClick={() => onSelectionChange(null)}
      >
        <Background color="#dbe4ef" gap={20} size={1} />
        <MiniMap className="!bg-slate-100" nodeColor="#94a3b8" pannable zoomable />
        <Controls />
      </ReactFlow>
    </main>
  );
}
