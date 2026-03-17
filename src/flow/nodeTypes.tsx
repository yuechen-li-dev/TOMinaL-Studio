import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';

import { CatalogIdSelect } from '@/components/CatalogIdSelect';
import type { TominalNodeData } from '@/flow/flowTypes';

type TominalRFNode = Node<TominalNodeData>;

function ConnectorNode({ data }: NodeProps<TominalRFNode>) {
  const connectorId = data.modelId;
  const pinRows = data.pinRows ?? [];
  const pinCount = data.pinCount ?? 0;
  const isCollapsed = data.isCollapsed ?? true;

  return (
    <div className="relative w-[280px] overflow-hidden rounded-lg border border-blue-300 bg-blue-50 text-blue-950 shadow-sm">
      <Handle className="!h-2 !w-2 !bg-blue-500" position={Position.Left} type="target" />
      <Handle className="!h-2 !w-2 !bg-blue-500" position={Position.Right} type="source" />

      <div className="connector-node__drag-handle flex cursor-grab items-center justify-between border-b border-blue-200 bg-blue-100 px-2 py-1.5 active:cursor-grabbing">
        <div className="truncate pr-2 text-[11px] font-semibold">{data.label}</div>
        <button
          aria-label={isCollapsed ? 'Expand connector' : 'Collapse connector'}
          className="inline-flex h-5 w-5 items-center justify-center rounded border border-blue-300 bg-white text-[10px] leading-none text-blue-800"
          onClick={(event) => {
            event.stopPropagation();
            data.onToggleCollapse?.(connectorId);
          }}
          type="button"
        >
          {isCollapsed ? '▾' : '▴'}
        </button>
      </div>

      {isCollapsed ? (
        <div className="space-y-0.5 px-2 py-1.5 text-[10px]">
          <p>
            <span className="font-medium">PN:</span> {data.partNumber || '—'}
          </p>
          <p>
            <span className="font-medium">Housing:</span> {data.housingId || '—'}
          </p>
          <p>
            <span className="font-medium">Pins:</span> {pinCount}
          </p>
        </div>
      ) : (
        <div className="nodrag space-y-1.5 p-2 text-[10px]">
          <label className="grid grid-cols-[60px_1fr] items-center gap-1.5">
            <span className="font-medium">Part #</span>
            <input
              className="nodrag h-6 rounded border border-blue-200 bg-white px-1.5 py-0.5 text-[10px]"
              onChange={(event) => data.onPartNumberChange?.(connectorId, event.target.value)}
              onPointerDown={(event) => event.stopPropagation()}
              value={data.partNumber ?? ''}
            />
          </label>

          <label className="grid grid-cols-[60px_1fr] items-center gap-1.5">
            <span className="font-medium">Housing</span>
            <CatalogIdSelect
              className="nodrag h-6 rounded border border-blue-200 bg-white px-1.5 py-0.5 text-[10px]"
              currentValue={data.housingId}
              idLabel="housings"
              onChange={(nextId) => data.onHousingIdChange?.(connectorId, nextId)}
              options={data.housingOptions ?? []}
              placeholder="Unbound"
            />
          </label>

          <label className="grid grid-cols-[60px_1fr] items-center gap-1.5">
            <span className="font-medium">Pins</span>
            <input
              className="nodrag h-6 w-16 rounded border border-blue-200 bg-white px-1.5 py-0.5 text-[10px]"
              min={0}
              onChange={(event) => {
                const next = Number.parseInt(event.target.value, 10);
                data.onPinCountChange?.(connectorId, Number.isNaN(next) ? 0 : next);
              }}
              onPointerDown={(event) => event.stopPropagation()}
              type="number"
              value={pinCount}
            />
          </label>

          <div className="overflow-hidden rounded border border-blue-200 bg-white">
            <table className="w-full border-collapse text-[10px]">
              <thead className="bg-blue-100/70">
                <tr>
                  <th className="border-b border-blue-200 px-1.5 py-1 text-left font-semibold">Pin</th>
                  <th className="border-b border-blue-200 px-1.5 py-1 text-left font-semibold">Signal</th>
                  <th className="border-b border-blue-200 px-1.5 py-1 text-left font-semibold">Terminal</th>
                </tr>
              </thead>
              <tbody>
                {pinRows.map(({ pinId, pin }) => (
                  <tr key={pinId}>
                    <td className="border-b border-blue-100 px-1.5 py-0.5 font-medium">{pinId}</td>
                    <td className="border-b border-blue-100 px-1.5 py-0.5">
                      <input
                        className="nodrag h-5 w-full rounded border border-blue-200 px-1.5 py-0.5"
                        onChange={(event) => data.onPinChange?.(connectorId, pinId, { signal: event.target.value || undefined })}
                        onPointerDown={(event) => event.stopPropagation()}
                        value={pin.signal ?? ''}
                      />
                    </td>
                    <td className="border-b border-blue-100 px-1.5 py-0.5">
                      <input
                        className="nodrag h-5 w-full rounded border border-blue-200 px-1.5 py-0.5"
                        onChange={(event) =>
                          data.onPinChange?.(connectorId, pinId, { terminalPartNumber: event.target.value || undefined })
                        }
                        onPointerDown={(event) => event.stopPropagation()}
                        value={pin.terminalPartNumber ?? ''}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function BranchNode(_: NodeProps<TominalRFNode>) {
  return (
    <div className="relative h-5 w-5 rounded-full border border-amber-400 bg-amber-500 shadow-sm transition-shadow duration-150 selected:shadow-[0_0_0_4px_rgba(245,158,11,0.3)]">
      <Handle className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0" position={Position.Left} type="target" />
      <Handle className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0" id="branch-out" position={Position.Right} type="source" />
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
