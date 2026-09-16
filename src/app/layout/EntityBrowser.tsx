import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { AppCommandDispatcher, Selection } from '@/app/session/appSession';
import { singleSelection } from '@/app/session/appSession';
import type { EntityRef, HarnessIr } from '@/harness-core';

type Group = { readonly label: string; readonly entities: readonly EntityRef[] };

export function EntityBrowser({ harness, selection, dispatch }: {
  harness: HarnessIr;
  selection: Selection;
  dispatch: AppCommandDispatcher;
}) {
  const [filter, setFilter] = useState('');
  const groups = useMemo<Group[]>(() => [
    { label: 'Connectors', entities: harness.connectorOccurrences.map((item) => ({ kind: 'connectorOccurrence', id: item.id })) },
    { label: 'Circuits', entities: harness.circuits.map((item) => ({ kind: 'circuit', id: item.id })) },
    { label: 'Conductors', entities: harness.conductors.map((item) => ({ kind: 'conductor', id: item.id })) },
    { label: 'Electrical Splices', entities: harness.electricalSplices.map((item) => ({ kind: 'electricalSplice', id: item.id })) },
    { label: 'Routes', entities: harness.routes.map((item) => ({ kind: 'route', id: item.id })) },
    { label: 'Physical Junctions', entities: harness.routeJunctions.map((item) => ({ kind: 'routeJunction', id: item.id })) }
  ], [harness]);
  const normalizedFilter = filter.trim().toLowerCase();

  return (
    <aside className="flex min-h-0 flex-col border-r border-slate-800 bg-slate-900/95" aria-label="Entity browser">
      <div className="border-b border-slate-800 p-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">Project entities</div>
        <label className="flex items-center gap-2 border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs focus-within:border-cyan-500">
          <Search className="h-3.5 w-3.5 text-slate-500" />
          <span className="sr-only">Filter entities</span>
          <input className="min-w-0 flex-1 bg-transparent text-slate-200 outline-none" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter IDs" />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {groups.map((group) => {
          const entities = group.entities.filter((entity) => entity.id.toLowerCase().includes(normalizedFilter));
          if (entities.length === 0) return null;
          return (
            <section key={group.label} className="mb-3">
              <h2 className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{group.label} <span className="text-slate-600">{entities.length}</span></h2>
              {entities.map((entity) => {
                const active = selection.primary?.kind === entity.kind && selection.primary.id === entity.id;
                return <button key={`${entity.kind}:${entity.id}`} type="button" className={`block w-full truncate border-l-2 px-3 py-1.5 text-left font-mono text-[11px] ${active ? 'border-cyan-400 bg-cyan-950/50 text-cyan-200' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`} onClick={() => dispatch({ type: 'selection.set', selection: singleSelection(entity) })}>{entity.id}</button>;
              })}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
