import { Background, Controls, MiniMap, ReactFlow, ReactFlowProvider, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useMemo, useState } from 'react';

import type { AppCommandDispatcher, Selection } from '@/app/session/appSession';
import { emptySelection } from '@/app/session/appSession';
import { logicalProjectionToReactFlow, type VNextLogicalLayout } from '@/flow/vnextGraphAdapter';
import { projectLogicalGraph, type HarnessIr } from '@/harness-core';

function LogicalSurface({ harness, selection, dispatch }: { harness: HarnessIr; selection: Selection; dispatch: AppCommandDispatcher }) {
  const [layout, setLayout] = useState<VNextLogicalLayout>({});
  const projection = useMemo(() => projectLogicalGraph(harness), [harness]);
  const graph = useMemo(() => logicalProjectionToReactFlow(projection, layout), [layout, projection]);
  const nodes = useMemo(() => graph.nodes.map((node) => ({ ...node, selected: selection.entities.some((entity) => entity.kind === node.data.entityKind && entity.id === node.data.entityId) })), [graph.nodes, selection.entities]);
  const edges = useMemo(() => graph.edges.map((edge) => ({ ...edge, selected: selection.entities.some((entity) => entity.kind === 'conductor' && entity.id === edge.data?.entityId), style: { stroke: selection.entities.some((entity) => entity.kind === 'conductor' && entity.id === edge.data?.entityId) ? '#22d3ee' : '#64748b', strokeWidth: 2.2 } })), [graph.edges, selection.entities]);

  const handleSelection = useCallback(({ nodes: selectedNodes, edges: selectedEdges }: { nodes: Node[]; edges: { data?: { entityKind?: string; entityId?: string } }[] }) => {
    const entities = [
      ...selectedNodes.map((node) => node.data as { entityKind: Selection['entities'][number]['kind']; entityId: string }),
      ...selectedEdges.map((edge) => edge.data as { entityKind: Selection['entities'][number]['kind']; entityId: string })
    ].filter((item) => item?.entityId).map((item) => ({ kind: item.entityKind, id: item.entityId }));
    dispatch({ type: 'selection.set', selection: entities.length ? { entities, primary: entities[0] } : emptySelection });
  }, [dispatch]);

  return <ReactFlow fitView nodes={nodes} edges={edges} onSelectionChange={handleSelection} onPaneClick={() => dispatch({ type: 'selection.clear' })} onNodeDragStop={(_, node) => setLayout((current) => ({ ...current, [node.id]: node.position }))} nodesDraggable nodesConnectable={false} deleteKeyCode={null} minZoom={0.2} maxZoom={2.5}>
    <Background color="#25344a" gap={24} size={1} />
    <MiniMap className="!bg-slate-900" nodeColor="#64748b" pannable zoomable />
    <Controls className="!bg-slate-900" />
  </ReactFlow>;
}

export default function LogicalWorkspace(props: { harness: HarnessIr; selection: Selection; dispatch: AppCommandDispatcher }) {
  return <ReactFlowProvider><LogicalSurface {...props} /></ReactFlowProvider>;
}
