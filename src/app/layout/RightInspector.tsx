import type { SelectionState } from '@/app/App';

export function RightInspector({ selection }: { selection: SelectionState }) {
  return (
    <aside className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <h2 className="text-sm font-medium text-muted-foreground">Inspector</h2>
      <div className="mt-4 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
        {!selection && <p className="text-muted-foreground">Select a node or segment.</p>}

        {selection?.type === 'node' && (
          <dl className="grid grid-cols-[80px_1fr] gap-y-2">
            <dt className="text-muted-foreground">ID</dt>
            <dd className="font-medium">{selection.item.id}</dd>
            <dt className="text-muted-foreground">kind</dt>
            <dd className="font-medium">{selection.item.data.kind}</dd>
            <dt className="text-muted-foreground">x/y</dt>
            <dd className="font-medium">
              {Math.round(selection.item.position.x)} / {Math.round(selection.item.position.y)}
            </dd>
          </dl>
        )}

        {selection?.type === 'edge' && (
          <dl className="grid grid-cols-[80px_1fr] gap-y-2">
            <dt className="text-muted-foreground">ID</dt>
            <dd className="font-medium">{selection.item.id}</dd>
            <dt className="text-muted-foreground">source</dt>
            <dd className="font-medium">{selection.item.source}</dd>
            <dt className="text-muted-foreground">target</dt>
            <dd className="font-medium">{selection.item.target}</dd>
          </dl>
        )}
      </div>
    </aside>
  );
}
