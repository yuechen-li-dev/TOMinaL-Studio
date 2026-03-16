import type { TominalEdge, TominalNode } from '@/flow/flowTypes';

export function buildSampleGraph(): { nodes: TominalNode[]; edges: TominalEdge[] } {
  const nodes: TominalNode[] = [
    {
      id: 'ECU_C1',
      type: 'connector',
      position: { x: 120, y: 220 },
      data: { label: 'ECU_C1', kind: 'connector' }
    },
    {
      id: 'B1',
      type: 'branch',
      position: { x: 390, y: 210 },
      data: { label: 'B1', kind: 'branch' }
    },
    {
      id: 'CLUSTER_C1',
      type: 'connector',
      position: { x: 660, y: 220 },
      data: { label: 'CLUSTER_C1', kind: 'connector' }
    },
    {
      id: 'S1',
      type: 'splice',
      position: { x: 420, y: 380 },
      data: { label: 'S1', kind: 'splice' }
    }
  ];

  const edges: TominalEdge[] = [
    {
      id: 'E_ECU_B1',
      type: 'harness',
      source: 'ECU_C1',
      target: 'B1',
      data: { label: 'segment-1' }
    },
    {
      id: 'E_B1_CLUSTER',
      type: 'harness',
      source: 'B1',
      target: 'CLUSTER_C1'
    },
    {
      id: 'E_B1_S1',
      type: 'harness',
      source: 'B1',
      sourceHandle: 'branch-out',
      target: 'S1'
    }
  ];

  return { nodes, edges };
}
