import type { SelectionState } from '@/app/App';
import type { HarnessDocument } from '@/core/harnessModel';
import { getNodeById, getNodeKind, getSegmentById } from '@/core/harnessSelectors';

type RightInspectorProps = {
  document: HarnessDocument;
  selection: SelectionState;
  onSegmentNominalLengthChange: (segmentId: string, nominalLengthMm: number | undefined) => void;
};

export function RightInspector({ document, selection, onSegmentNominalLengthChange }: RightInspectorProps) {
  const selectedNodeId = selection.selectedNodeIds[0];
  const selectedSegmentId = selection.selectedSegmentIds[0];
  const selectedNode = selectedNodeId ? getNodeById(document, selectedNodeId) : undefined;
  const selectedNodeKind = selectedNodeId ? getNodeKind(document, selectedNodeId) : undefined;
  const selectedSegment = selectedSegmentId ? getSegmentById(document, selectedSegmentId) : undefined;

  return (
    <aside className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <h2 className="text-sm font-medium text-muted-foreground">Inspector</h2>
      <div className="mt-4 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
        {!selectedNode && !selectedSegment && <p className="text-muted-foreground">Select a node or segment.</p>}

        {selectedNode && selectedNodeId && (
          <dl className="grid grid-cols-[120px_1fr] gap-y-2">
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

        {selectedSegment && (
          <dl className="grid grid-cols-[120px_1fr] gap-y-2">
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
