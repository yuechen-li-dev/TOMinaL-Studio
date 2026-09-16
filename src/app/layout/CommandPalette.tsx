import { Command, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { AppCommandDispatcher, WorkspaceId } from '@/app/session/appSession';

const workspaceCommands: readonly { id: WorkspaceId; label: string; keywords: string }[] = [
  { id: 'logical', label: 'Switch to Logical', keywords: 'graph connectivity conductor' },
  { id: 'formboard', label: 'Switch to Formboard', keywords: 'physical board manufacturing' },
  { id: 'catalog', label: 'Open Catalog', keywords: 'parts materials' }
];

export function CommandPalette({ dispatch }: { dispatch: AppCommandDispatcher }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = target?.matches('input, textarea, select, [contenteditable="true"]');
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      } else if (!editing && event.key === '1') dispatch({ type: 'workspace.switch', workspace: 'logical' });
      else if (!editing && event.key === '2') dispatch({ type: 'workspace.switch', workspace: 'formboard' });
      else if (!editing && event.key === '3') dispatch({ type: 'workspace.switch', workspace: 'catalog' });
      else if (event.key === 'Escape') {
        if (open) setOpen(false);
        else dispatch({ type: 'selection.clear' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, open]);
  const commands = useMemo(() => workspaceCommands.filter((command) => `${command.label} ${command.keywords}`.toLowerCase().includes(query.toLowerCase())), [query]);

  return <>
    <button type="button" className="flex items-center gap-2 border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-400 hover:border-slate-500 hover:text-slate-200" onClick={() => setOpen(true)}><Command className="h-3.5 w-3.5" />Commands <kbd className="ml-2 text-[10px] text-slate-600">Ctrl K</kbd></button>
    {open ? <div className="fixed inset-0 z-50 flex justify-center bg-slate-950/75 pt-[16vh]" onMouseDown={() => setOpen(false)}><section role="dialog" aria-label="Command palette" className="h-fit w-[520px] border border-slate-700 bg-slate-900 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><label className="flex items-center gap-2 border-b border-slate-700 px-3 py-3"><Search className="h-4 w-4 text-cyan-400" /><span className="sr-only">Find command</span><input autoFocus className="flex-1 bg-transparent text-sm text-slate-100 outline-none" placeholder="Type a command" value={query} onChange={(event) => setQuery(event.target.value)} /></label><div className="p-2">{commands.map((command) => <button key={command.id} type="button" className="block w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-cyan-950 hover:text-cyan-200" onClick={() => { dispatch({ type: 'workspace.switch', workspace: command.id }); setOpen(false); }}>{command.label}</button>)}</div></section></div> : null}
  </>;
}
