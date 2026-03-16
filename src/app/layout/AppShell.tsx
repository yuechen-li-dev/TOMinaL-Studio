import { useMemo } from 'react';
import { useEdgesState, useNodesState } from '@xyflow/react';

import { LeftSidebar } from '@/app/layout/LeftSidebar';
import { RightInspector } from '@/app/layout/RightInspector';
import { TopBar } from '@/app/layout/TopBar';
import type { SelectionState } from '@/app/App';
import { FlowCanvas } from '@/flow/FlowCanvas';
import type { TominalEdgeData, TominalNodeData, TominalNodeKind } from '@/flow/flowTypes';

type AppShellProps = {
  initialNodes: import('@xyflow/react').Node<TominalNodeData>[];
  initialEdges: import('@xyflow/react').Edge<TominalEdgeData>[];
  selection: SelectionState;
  onSelectionChange: (selection: SelectionState) => void;
};

const getNewNodePosition = (index: number) => ({
  x: 120 + (index % 4) * 140,
  y: 120 + Math.floor(index / 4) * 120
});

export function AppShell({ initialNodes, initialEdges, selection, onSelectionChange }: AppShellProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const summary = useMemo(
    () => ({
      nodeCount: nodes.length,
      edgeCount: edges.length
    }),
    [nodes.length, edges.length]
  );

  const handleAddNode = (kind: TominalNodeKind) => {
    const nextIndex = nodes.length + 1;
    setNodes((current) => [
      ...current,
      {
        id: `${kind.toUpperCase()}_${nextIndex}`,
        type: kind,
        position: getNewNodePosition(nextIndex),
        data: { label: `${kind.toUpperCase()}_${nextIndex}`, kind }
      }
    ]);
  };

  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <div className="grid min-h-0 flex-1 grid-cols-[280px_1fr_320px] gap-3 p-3">
        <LeftSidebar summary={summary} onAddNode={handleAddNode} />
        <FlowCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          setEdges={setEdges}
          onSelectionChange={onSelectionChange}
        />
        <RightInspector selection={selection} />
      </div>
    </div>
  );
}
