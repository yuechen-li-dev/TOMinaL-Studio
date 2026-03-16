import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';

import type { TominalNodeData } from '@/flow/flowTypes';

type TominalRFNode = Node<TominalNodeData>;

function ConnectorNode({ data }: NodeProps<TominalRFNode>) {
  return (
    <div className="relative min-w-24 rounded-full border border-blue-300 bg-blue-100 px-4 py-2 text-center text-xs font-semibold text-blue-900 shadow-sm">
      <Handle className="!h-2 !w-2 !bg-blue-500" position={Position.Left} type="target" />
      <span>{data.label}</span>
      <Handle className="!h-2 !w-2 !bg-blue-500" position={Position.Right} type="source" />
    </div>
  );
}

function BranchNode({ data }: NodeProps<TominalRFNode>) {
  return (
    <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-amber-300 bg-amber-100 text-xs font-bold text-amber-900 shadow-sm">
      <Handle className="!h-2 !w-2 !bg-amber-600" position={Position.Left} type="target" />
      <Handle className="!h-2 !w-2 !bg-amber-600" position={Position.Right} type="source" />
      <Handle className="!h-2 !w-2 !bg-amber-600" id="branch-out" position={Position.Bottom} type="source" />
      {data.label}
    </div>
  );
}

function SpliceNode({ data }: NodeProps<TominalRFNode>) {
  return (
    <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-300 bg-emerald-100 text-[11px] font-semibold text-emerald-900 shadow-sm">
      <Handle className="!h-2 !w-2 !bg-emerald-600" position={Position.Top} type="target" />
      <Handle className="!h-2 !w-2 !bg-emerald-600" position={Position.Bottom} type="source" />
      {data.label}
    </div>
  );
}

export const nodeTypes = {
  connector: ConnectorNode,
  branch: BranchNode,
  splice: SpliceNode
};
