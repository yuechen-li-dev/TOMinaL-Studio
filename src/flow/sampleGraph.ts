import type { TominalNode, TominalSegment } from '@/flow/flowTypes';

export function buildSampleGraph(): { nodes: TominalNode[]; edges: TominalSegment[] } {
  const nodes: TominalNode[] = [
    {
      id: 'ECU_C1',
      type: 'connector',
      position: { x: 120, y: 220 },
      data: { label: 'ECU_C1', kind: 'connector', modelId: 'ECU_C1' }
    },
    {
      id: 'B1',
      type: 'branch',
      position: { x: 390, y: 210 },
      data: { label: 'B1', kind: 'branch', modelId: 'B1' }
    },
    {
      id: 'CLUSTER_C1',
      type: 'connector',
      position: { x: 660, y: 220 },
      data: { label: 'CLUSTER_C1', kind: 'connector', modelId: 'CLUSTER_C1' }
    },
    {
      id: 'S1',
      type: 'splice',
      position: { x: 420, y: 380 },
      data: { label: 'S1', kind: 'splice', modelId: 'S1' }
    }
  ];

  const edges: TominalSegment[] = [
    {
      id: 'SEG_MAIN_LEFT',
      type: 'default',
      source: 'ECU_C1',
      target: 'B1',
      data: { modelId: 'SEG_MAIN_LEFT', label: 'SEG_MAIN_LEFT', geometry: 'spline', nominalLengthMm: 320 }
    },
    {
      id: 'SEG_MAIN_RIGHT',
      type: 'default',
      source: 'B1',
      target: 'CLUSTER_C1',
      data: { modelId: 'SEG_MAIN_RIGHT', geometry: 'spline', nominalLengthMm: 330 }
    },
    {
      id: 'SEG_DROP_1',
      type: 'default',
      source: 'B1',
      sourceHandle: 'branch-out',
      target: 'S1',
      data: { modelId: 'SEG_DROP_1', geometry: 'spline', nominalLengthMm: 200 }
    }
  ];

  return { nodes, edges };
}
