import type { SelectionState } from '@/app/App';
import { Button } from '@/components/ui/button';
import type { HarnessDocument, Wire } from '@/core/harnessModel';
import {
  formatPinRef,
  getAllWireMetrics,
  getAllWires,
  getConnectorPins,
  getNodeById,
  getNodeKind,
  getSegmentById,
  getWireById,
  getWireMetrics
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

function toCutListCsv(harnessDocument: HarnessDocument): string {
  const metricsByWireId = getAllWireMetrics(harnessDocument);
  const rows = Object.values(harnessDocument.wires).map((wire) => {
    const metrics = metricsByWireId[wire.id];

    return [
      wire.id,
      formatPinRef(wire.from),
      formatPinRef(wire.to),
      wire.gauge ?? '',
      wire.color ?? '',
      String(metrics?.cutLengthMm ?? 0)
    ];
  });

  const escapeCsvCell = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
  };

  const header = ['wire_id', 'from', 'to', 'gauge', 'color', 'length_mm'];
  const lines = [header, ...rows].map((line) => line.map(escapeCsvCell).join(','));

  return `${lines.join('\n')}\n`;
}

function downloadCutListCsv(harnessDocument: HarnessDocument): void {
  const csv = toCutListCsv(harnessDocument);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');

  link.href = url;
  link.download = 'tominal-cut-list.csv';
  link.click();

  URL.revokeObjectURL(url);
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
  const selectedWireMetrics = selectedWire ? getWireMetrics(document, selectedWire.id) : undefined;
  const allWireMetrics = getAllWireMetrics(document);
  const wires = getAllWires(document);

  const fromPins = selectedWire ? getConnectorPins(document, selectedWire.from.connectorId) : [];
  const toPins = selectedWire ? getConnectorPins(document, selectedWire.to.connectorId) : [];
  const hasSelection = Boolean(selectedNode || selectedSegment || selectedWire);

  return (
    <aside className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <h2 className="text-sm font-medium text-muted-foreground">Inspector</h2>

      <section className="mt-4 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
        <div className="mb-3 flex items-center justify-between">
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
                onClick={() => onSelectionChange({ selectedNodeIds: [], selectedSegmentIds: [], selectedWireIds: [wire.id] })}
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
      </section>

      <section className="mt-3 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
        <h3 className="font-medium">Properties</h3>
        <div className="mt-3">
          {!hasSelection && (
            <div>
              <p className="text-muted-foreground">No selection.</p>
              <p className="text-muted-foreground">Select a node, segment, or wire to inspect its properties.</p>
            </div>
          )}

          {selectedWire && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Wire: {selectedWire.id}</h4>
                <Button onClick={() => onWireDelete(selectedWire.id)} size="sm" variant="destructive">
                  Delete
                </Button>
              </div>

              <div className="grid grid-cols-[120px_1fr] items-center gap-y-2">
                <label className="text-muted-foreground">From connector</label>
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

                <label className="text-muted-foreground">From pin</label>
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

                <label className="text-muted-foreground">To connector</label>
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

                <label className="text-muted-foreground">To pin</label>
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

                <label className="text-muted-foreground">Route</label>
                <input
                  className="rounded border border-border bg-background px-2 py-1"
                  onChange={(event) => onWireChange(selectedWire.id, { route: parseRouteInput(event.target.value) })}
                  placeholder="SEG_A, SEG_B"
                  value={selectedWire.route.join(', ')}
                />

                <label className="text-muted-foreground">Slack (mm)</label>
                <input
                  className="rounded border border-border bg-background px-2 py-1"
                  onChange={(event) => {
                    const raw = event.target.value.trim();
                    const next = raw === '' ? undefined : Number(raw);
                    onWireChange(selectedWire.id, { slackMm: Number.isNaN(next) ? undefined : next });
                  }}
                  type="number"
                  value={selectedWire.slackMm ?? ''}
                />

                <label className="text-muted-foreground">Color</label>
                <input
                  className="rounded border border-border bg-background px-2 py-1"
                  onChange={(event) => onWireChange(selectedWire.id, { color: event.target.value || undefined })}
                  value={selectedWire.color ?? ''}
                />

                <label className="text-muted-foreground">Gauge</label>
                <input
                  className="rounded border border-border bg-background px-2 py-1"
                  onChange={(event) => onWireChange(selectedWire.id, { gauge: event.target.value || undefined })}
                  value={selectedWire.gauge ?? ''}
                />

                <label className="text-muted-foreground">Material</label>
                <input
                  className="rounded border border-border bg-background px-2 py-1"
                  onChange={(event) => onWireChange(selectedWire.id, { material: event.target.value || undefined })}
                  value={selectedWire.material ?? ''}
                />

                <label className="text-muted-foreground">Terminal P/N</label>
                <input
                  className="rounded border border-border bg-background px-2 py-1"
                  onChange={(event) => onWireChange(selectedWire.id, { terminalPartNumber: event.target.value || undefined })}
                  value={selectedWire.terminalPartNumber ?? ''}
                />

                <label className="text-muted-foreground">Notes</label>
                <input
                  className="rounded border border-border bg-background px-2 py-1"
                  onChange={(event) => onWireChange(selectedWire.id, { notes: event.target.value || undefined })}
                  value={selectedWire.notes ?? ''}
                />
              </div>

              <dl className="grid grid-cols-[120px_1fr] gap-y-2 rounded border border-border/70 bg-background p-2">
                <dt className="text-muted-foreground">Route length</dt>
                <dd className="font-medium">{selectedWireMetrics?.routeLengthMm ?? 0} mm</dd>
                <dt className="text-muted-foreground">Slack</dt>
                <dd className="font-medium">{selectedWireMetrics?.slackMm ?? 0} mm</dd>
                <dt className="text-muted-foreground">Cut length</dt>
                <dd className="font-medium">{selectedWireMetrics?.cutLengthMm ?? 0} mm</dd>
              </dl>
            </div>
          )}

          {selectedNode && selectedNodeId && !selectedWire && (
            <dl className="grid grid-cols-[120px_1fr] gap-y-2">
            <dt className="text-muted-foreground">ID</dt>
            <dd className="font-medium">{selectedNode.id}</dd>
            <dt className="text-muted-foreground">Kind</dt>
            <dd className="font-medium">{selectedNodeKind}</dd>
            <dt className="text-muted-foreground">Position</dt>
            <dd className="font-medium">
              {Math.round(selectedNode.position[0])} / {Math.round(selectedNode.position[1])}
            </dd>
            {selectedNodeKind === 'connector' && (
              <>
                <dt className="text-muted-foreground">Part number</dt>
                <dd className="font-medium">{document.connectors[selectedNodeId]?.partNumber ?? '—'}</dd>
                <dt className="text-muted-foreground">Pin count</dt>
                <dd className="font-medium">{Object.keys(document.connectors[selectedNodeId]?.pins ?? {}).length}</dd>
              </>
            )}
            {selectedNodeKind === 'branch' && (
              <>
                <dt className="text-muted-foreground">Branch kind</dt>
                <dd className="font-medium">{document.branches[selectedNodeId]?.kind ?? '—'}</dd>
              </>
            )}
            {selectedNodeKind === 'splice' && (
              <>
                <dt className="text-muted-foreground">Part number</dt>
                <dd className="font-medium">{document.splices[selectedNodeId]?.partNumber ?? '—'}</dd>
              </>
            )}
          </dl>
        )}

        {selectedSegment && !selectedWire && (
          <dl className="grid grid-cols-[120px_1fr] gap-y-2">
            <dt className="text-muted-foreground">ID</dt>
            <dd className="font-medium">{selectedSegment.id}</dd>
            <dt className="text-muted-foreground">From</dt>
            <dd className="font-medium">{selectedSegment.from}</dd>
            <dt className="text-muted-foreground">To</dt>
            <dd className="font-medium">{selectedSegment.to}</dd>
            <dt className="text-muted-foreground">Geometry</dt>
            <dd className="font-medium">{selectedSegment.geometry ?? 'spline'}</dd>
            <dt className="text-muted-foreground">Nominal length</dt>
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
      </section>

      <section className="mt-3 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-medium">Cut List</h3>
          <Button onClick={() => downloadCutListCsv(document)} size="sm" variant="secondary">
            Export Cut List
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border/70 text-muted-foreground">
                <th className="px-2 py-1">Wire ID</th>
                <th className="px-2 py-1">From</th>
                <th className="px-2 py-1">To</th>
                <th className="px-2 py-1">Gauge</th>
                <th className="px-2 py-1">Color</th>
                <th className="px-2 py-1">Cut length (mm)</th>
              </tr>
            </thead>
            <tbody>
              {wires.map((wire) => (
                <tr className="border-b border-border/40" key={wire.id}>
                  <td className="px-2 py-1">{wire.id}</td>
                  <td className="px-2 py-1">{formatPinRef(wire.from)}</td>
                  <td className="px-2 py-1">{formatPinRef(wire.to)}</td>
                  <td className="px-2 py-1">{wire.gauge ?? '—'}</td>
                  <td className="px-2 py-1">{wire.color ?? '—'}</td>
                  <td className="px-2 py-1">{allWireMetrics[wire.id]?.cutLengthMm ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </aside>
  );
}
