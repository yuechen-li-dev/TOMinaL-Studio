import type { SelectionState } from '@/app/App';
import { Button } from '@/components/ui/button';
import type { HarnessDocument, Wire } from '@/core/harnessModel';
import {
  formatPinRef,
  getAllWires,
  getConnectorPins,
  getNodeById,
  getNodeKind,
  getSegmentById,
  getWireById
} from '@/core/harnessSelectors';

type RightInspectorProps = {
  document: HarnessDocument;
  selection: SelectionState;
  onSelectionChange: (selection: SelectionState) => void;
  onSegmentNominalLengthChange: (segmentId: string, nominalLengthMm: number | undefined) => void;
  onWireAdd: () => void;
  onWireDelete: (wireId: string) => void;
  onWireChange: (wireId: string, patch: Partial<Wire>) => void;
};

function parseRouteInput(raw: string): string[] {
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function RightInspector({
  document,
  selection,
  onSelectionChange,
  onSegmentNominalLengthChange,
  onWireAdd,
  onWireDelete,
  onWireChange
}: RightInspectorProps) {
  const selectedNodeId = selection.selectedNodeIds[0];
  const selectedSegmentId = selection.selectedSegmentIds[0];
  const selectedWireId = selection.selectedWireIds[0];
  const selectedNode = selectedNodeId ? getNodeById(document, selectedNodeId) : undefined;
  const selectedNodeKind = selectedNodeId ? getNodeKind(document, selectedNodeId) : undefined;
  const selectedSegment = selectedSegmentId ? getSegmentById(document, selectedSegmentId) : undefined;
  const selectedWire = selectedWireId ? getWireById(document, selectedWireId) : undefined;
  const wires = getAllWires(document);

  const fromPins = selectedWire ? getConnectorPins(document, selectedWire.from.connectorId) : [];
  const toPins = selectedWire ? getConnectorPins(document, selectedWire.to.connectorId) : [];

  return (
    <aside className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <h2 className="text-sm font-medium text-muted-foreground">Inspector</h2>
      <div className="mt-4 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
        {!selectedNode && !selectedSegment && !selectedWire && (
          <p className="text-muted-foreground">Select a node, segment, or wire.</p>
        )}

        {selectedWire && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Wire: {selectedWire.id}</h3>
              <Button onClick={() => onWireDelete(selectedWire.id)} size="sm" variant="destructive">
                Delete
              </Button>
            </div>

            <div className="grid grid-cols-[120px_1fr] items-center gap-y-2">
              <label className="text-muted-foreground">from connector</label>
              <select
                className="rounded border border-border bg-background px-2 py-1"
                onChange={(event) =>
                  onWireChange(selectedWire.id, {
                    from: { connectorId: event.target.value, pinId: Object.keys(document.connectors[event.target.value].pins)[0] }
                  })
                }
                value={selectedWire.from.connectorId}
              >
                {Object.keys(document.connectors).map((connectorId) => (
                  <option key={connectorId} value={connectorId}>
                    {connectorId}
                  </option>
                ))}
              </select>

              <label className="text-muted-foreground">from pin</label>
              <select
                className="rounded border border-border bg-background px-2 py-1"
                onChange={(event) =>
                  onWireChange(selectedWire.id, {
                    from: { ...selectedWire.from, pinId: event.target.value }
                  })
                }
                value={selectedWire.from.pinId}
              >
                {fromPins.map((pin) => (
                  <option key={pin.pinId} value={pin.pinId}>
                    {pin.pinId}
                  </option>
                ))}
              </select>

              <label className="text-muted-foreground">to connector</label>
              <select
                className="rounded border border-border bg-background px-2 py-1"
                onChange={(event) =>
                  onWireChange(selectedWire.id, {
                    to: { connectorId: event.target.value, pinId: Object.keys(document.connectors[event.target.value].pins)[0] }
                  })
                }
                value={selectedWire.to.connectorId}
              >
                {Object.keys(document.connectors).map((connectorId) => (
                  <option key={connectorId} value={connectorId}>
                    {connectorId}
                  </option>
                ))}
              </select>

              <label className="text-muted-foreground">to pin</label>
              <select
                className="rounded border border-border bg-background px-2 py-1"
                onChange={(event) =>
                  onWireChange(selectedWire.id, {
                    to: { ...selectedWire.to, pinId: event.target.value }
                  })
                }
                value={selectedWire.to.pinId}
              >
                {toPins.map((pin) => (
                  <option key={pin.pinId} value={pin.pinId}>
                    {pin.pinId}
                  </option>
                ))}
              </select>

              <label className="text-muted-foreground">route</label>
              <input
                className="rounded border border-border bg-background px-2 py-1"
                onChange={(event) => onWireChange(selectedWire.id, { route: parseRouteInput(event.target.value) })}
                placeholder="SEG_A, SEG_B"
                value={selectedWire.route.join(', ')}
              />

              <label className="text-muted-foreground">color</label>
              <input
                className="rounded border border-border bg-background px-2 py-1"
                onChange={(event) => onWireChange(selectedWire.id, { color: event.target.value || undefined })}
                value={selectedWire.color ?? ''}
              />

              <label className="text-muted-foreground">gauge</label>
              <input
                className="rounded border border-border bg-background px-2 py-1"
                onChange={(event) => onWireChange(selectedWire.id, { gauge: event.target.value || undefined })}
                value={selectedWire.gauge ?? ''}
              />

              <label className="text-muted-foreground">material</label>
              <input
                className="rounded border border-border bg-background px-2 py-1"
                onChange={(event) => onWireChange(selectedWire.id, { material: event.target.value || undefined })}
                value={selectedWire.material ?? ''}
              />

              <label className="text-muted-foreground">terminal p/n</label>
              <input
                className="rounded border border-border bg-background px-2 py-1"
                onChange={(event) => onWireChange(selectedWire.id, { terminalPartNumber: event.target.value || undefined })}
                value={selectedWire.terminalPartNumber ?? ''}
              />

              <label className="text-muted-foreground">notes</label>
              <input
                className="rounded border border-border bg-background px-2 py-1"
                onChange={(event) => onWireChange(selectedWire.id, { notes: event.target.value || undefined })}
                value={selectedWire.notes ?? ''}
              />
            </div>
          </div>
        )}

        {!selectedWire && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Wires</h3>
              <Button onClick={onWireAdd} size="sm" variant="secondary">
                Add Wire
              </Button>
            </div>
            <ul className="space-y-1">
              {wires.map((wire) => (
                <li key={wire.id}>
                  <button
                    className="flex w-full items-center justify-between rounded border border-border/70 bg-background px-2 py-1 text-left hover:bg-muted"
                    onClick={() =>
                      onSelectionChange({ selectedNodeIds: [], selectedSegmentIds: [], selectedWireIds: [wire.id] })
                    }
                    type="button"
                  >
                    <span className="font-medium">{wire.id}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatPinRef(wire.from)} → {formatPinRef(wire.to)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {selectedNode && selectedNodeId && !selectedWire && (
          <dl className="mt-4 grid grid-cols-[120px_1fr] gap-y-2">
            <dt className="text-muted-foreground">ID</dt>
            <dd className="font-medium">{selectedNode.id}</dd>
            <dt className="text-muted-foreground">kind</dt>
            <dd className="font-medium">{selectedNodeKind}</dd>
            <dt className="text-muted-foreground">x/y</dt>
            <dd className="font-medium">
              {Math.round(selectedNode.position[0])} / {Math.round(selectedNode.position[1])}
            </dd>
            {selectedNodeKind === 'connector' && (
              <>
                <dt className="text-muted-foreground">part number</dt>
                <dd className="font-medium">{document.connectors[selectedNodeId]?.partNumber ?? '—'}</dd>
                <dt className="text-muted-foreground">pin count</dt>
                <dd className="font-medium">{Object.keys(document.connectors[selectedNodeId]?.pins ?? {}).length}</dd>
              </>
            )}
            {selectedNodeKind === 'branch' && (
              <>
                <dt className="text-muted-foreground">branch kind</dt>
                <dd className="font-medium">{document.branches[selectedNodeId]?.kind ?? '—'}</dd>
              </>
            )}
            {selectedNodeKind === 'splice' && (
              <>
                <dt className="text-muted-foreground">part number</dt>
                <dd className="font-medium">{document.splices[selectedNodeId]?.partNumber ?? '—'}</dd>
              </>
            )}
          </dl>
        )}

        {selectedSegment && !selectedWire && (
          <dl className="mt-4 grid grid-cols-[120px_1fr] gap-y-2">
            <dt className="text-muted-foreground">ID</dt>
            <dd className="font-medium">{selectedSegment.id}</dd>
            <dt className="text-muted-foreground">from</dt>
            <dd className="font-medium">{selectedSegment.from}</dd>
            <dt className="text-muted-foreground">to</dt>
            <dd className="font-medium">{selectedSegment.to}</dd>
            <dt className="text-muted-foreground">geometry</dt>
            <dd className="font-medium">{selectedSegment.geometry ?? 'spline'}</dd>
            <dt className="text-muted-foreground">nominal length</dt>
            <dd className="font-medium">
              <input
                className="w-24 rounded border border-border px-2 py-1"
                onChange={(event) => {
                  const raw = event.target.value.trim();
                  const next = raw === '' ? undefined : Number(raw);
                  onSegmentNominalLengthChange(selectedSegment.id, Number.isNaN(next) ? undefined : next);
                }}
                placeholder="mm"
                type="number"
                value={selectedSegment.nominalLengthMm ?? ''}
              />
            </dd>
          </dl>
        )}
      </div>
    </aside>
  );
}
