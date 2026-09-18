import { Boxes, Cable, CircuitBoard, ClipboardList, Coins, Download, Factory, FolderOpen, PanelTop, Save, ShieldCheck, TableProperties } from 'lucide-react';
import { lazy, Suspense, useMemo, useState } from 'react';

import type { AppCommandDispatcher, Selection, WorkspaceId } from '@/app/session/appSession';
import type { MaterialCatalogData } from '@/catalog/catalogData';
import { buildLocalQuoteSnapshot, buildManufacturingPackage, deriveManufacturingArtifacts, LocalQuoteProvider, type GeneratedArtifact } from '@/artifacts';
import { BomWorkspace, ManufacturingWorkspace, QuoteWorkspace, WiresWorkspace } from '@/app/manufacturing/ArtifactWorkspaces';
import { exportFormboardSvg, validateFormboard, type TominalProject } from '@/formboard';
import { generateConnectorDeclarations } from '@/harness-authoring';
import { validateHarnessIr } from '@/harness-core';
import { downloadTextFile, exportNativeArtifactFile, exportNativeArtifactFolder } from '@/desktop';
import { controllerChassisLocalQuoteData, controllerChassisQuoteTimestamp } from '../../../fixtures/controller-chassis/localQuoteData';
import { CommandPalette } from './CommandPalette';
import { EntityBrowser } from './EntityBrowser';
import { WorkspaceErrorBoundary } from './WorkspaceErrorBoundary';
import { WorkspaceInspector } from './WorkspaceInspector';

const LogicalWorkspace = lazy(() => import('@/app/logical/LogicalWorkspace'));
const FormboardWorkspace = lazy(() => import('@/app/formboard/FormboardWorkspace').then((module) => ({ default: module.FormboardWorkspace })));
const CatalogWorkspace = lazy(() => import('@/app/catalog/CatalogWorkspace'));

const modes: readonly { id: WorkspaceId; label: string; icon: typeof Cable }[] = [
  { id: 'logical', label: 'Logical', icon: CircuitBoard },
  { id: 'formboard', label: 'Formboard', icon: PanelTop },
  { id: 'wires', label: 'Wires', icon: TableProperties },
  { id: 'bom', label: 'BOM', icon: ClipboardList },
  { id: 'quote', label: 'Quote', icon: Coins },
  { id: 'manufacturing', label: 'Manufacturing', icon: Factory },
  { id: 'catalog', label: 'Catalog', icon: Boxes }
];

export type ProjectFileActions = {
  readonly isDesktop: boolean;
  readonly status: string;
  readonly open: () => void | Promise<void>;
  readonly save: () => void | Promise<void>;
};

export function AppShell({ project, catalog, projectFileActions, quoteRevision, selection, workspace, dispatch }: {
  project: TominalProject;
  catalog: MaterialCatalogData;
  projectFileActions: ProjectFileActions;
  quoteRevision: number;
  selection: Selection;
  workspace: WorkspaceId;
  dispatch: AppCommandDispatcher;
}) {
  const projection = useMemo(() => deriveManufacturingArtifacts(project), [project]);
  const diagnostics = useMemo(() => [...validateHarnessIr(project.harness), ...validateFormboard(project.harness, project.formboard), ...projection.diagnostics], [project, projection.diagnostics]);
  const quoteTimestamp = useMemo(() => new Date(Date.parse(controllerChassisQuoteTimestamp) + quoteRevision * 1000).toISOString(), [quoteRevision]);
  const quote = useMemo(() => buildLocalQuoteSnapshot(projection.bom, new LocalQuoteProvider(controllerChassisLocalQuoteData), quoteTimestamp), [projection.bom, quoteTimestamp]);
  const artifactPackage = useMemo(() => {
    try { return buildManufacturingPackage(project, quote, generateConnectorDeclarations(project.harness.catalog)); }
    catch { return undefined; }
  }, [project, quote]);
  const [exportStatus, setExportStatus] = useState('');
  const downloadArtifact = async (item: GeneratedArtifact) => {
    try {
      if (projectFileActions.isDesktop) {
        const path = await exportNativeArtifactFile(item);
        if (path) setExportStatus(`Exported · ${path}`);
      } else {
        downloadTextFile(item.file, item.content, item.file.endsWith('.json') ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8');
        setExportStatus(`Downloaded · ${item.file}`);
      }
    } catch (error) { setExportStatus(`Export failed · ${error instanceof Error ? error.message : String(error)}`); }
  };
  const exportAll = async () => {
    if (!artifactPackage) return;
    try {
      if (projectFileActions.isDesktop) {
        const path = await exportNativeArtifactFolder(project.harness.id, artifactPackage.artifacts);
        if (path) setExportStatus(`Exported · ${path}`);
      } else {
        artifactPackage.artifacts.forEach(downloadArtifact);
        setExportStatus(`Downloaded ${artifactPackage.artifacts.length} artifacts`);
      }
    } catch (error) { setExportStatus(`Export failed · ${error instanceof Error ? error.message : String(error)}`); }
  };
  const exportSvg = () => {
    const svg = exportFormboardSvg(project.harness, project.formboard);
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.harness.id}-formboard.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return <div className="grid h-full min-h-0 grid-rows-[46px_38px_1fr_28px] overflow-hidden bg-slate-950">
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3">
      <div className="flex items-center gap-3"><div className="flex h-7 w-7 items-center justify-center bg-cyan-500 text-slate-950"><Cable className="h-4 w-4" /></div><div><h1 className="text-sm font-semibold tracking-wide">TOMinaL Studio</h1><p className="text-[10px] text-slate-500">{project.harness.metadata.name}</p></div><span className="border border-slate-700 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-slate-500">ARTIFACTS-X1</span></div>
      <div className="flex items-center gap-2"><button type="button" className="flex items-center gap-1.5 border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-100" onClick={projectFileActions.open}><FolderOpen className="h-3.5 w-3.5" />Open Project</button><button type="button" className="flex items-center gap-1.5 border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-100" onClick={projectFileActions.save}><Save className="h-3.5 w-3.5" />Save Project</button><button type="button" className="flex items-center gap-1.5 border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-100" onClick={exportSvg}><Download className="h-3.5 w-3.5" />Export 1:1 SVG</button><CommandPalette dispatch={dispatch} /></div>
    </header>
    <nav className="flex items-center gap-1 border-b border-slate-800 bg-slate-900/80 px-2" aria-label="Primary workspace">
      {modes.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={workspace === id ? 'page' : undefined} className={`flex h-full items-center gap-2 border-b-2 px-3 text-xs font-medium ${workspace === id ? 'border-cyan-400 bg-slate-800 text-cyan-200' : 'border-transparent text-slate-500 hover:text-slate-200'}`} onClick={() => dispatch({ type: 'workspace.switch', workspace: id })}><Icon className="h-3.5 w-3.5" />{label}</button>)}
      <div className="ml-3 h-4 w-px bg-slate-800" /><span className="px-2 text-[10px] text-slate-700">Wires · BOM · Manufacturing · Quote</span>
    </nav>
    <div className="grid min-h-0 grid-cols-[230px_minmax(0,1fr)_286px]">
      <EntityBrowser harness={project.harness} selection={selection} dispatch={dispatch} />
      <main className="min-h-0 min-w-0 bg-slate-950">
        <WorkspaceErrorBoundary name={workspace}><Suspense fallback={<div className="flex h-full items-center justify-center text-xs text-slate-500">Loading {workspace} workspace…</div>}>
          {workspace === 'logical' ? <LogicalWorkspace harness={project.harness} selection={selection} dispatch={dispatch} /> : null}
          {workspace === 'formboard' ? <FormboardWorkspace project={project} document={project.formboard} selection={selection} dispatch={dispatch} /> : null}
          {workspace === 'wires' ? <WiresWorkspace projection={projection} selection={selection} dispatch={dispatch} /> : null}
          {workspace === 'bom' ? <BomWorkspace projection={projection} dispatch={dispatch} /> : null}
          {workspace === 'quote' ? <QuoteWorkspace quote={quote} dispatch={dispatch} /> : null}
          {workspace === 'manufacturing' ? artifactPackage ? <ManufacturingWorkspace artifacts={artifactPackage.artifacts} exportAllLabel={projectFileActions.isDesktop ? 'Export Artifact Folder' : 'Export All Artifacts'} exportStatus={exportStatus} onDownload={downloadArtifact} onDownloadAll={exportAll} /> : <div className="p-6 text-sm text-amber-300">Release-ready export is blocked by engineering or artifact diagnostics.</div> : null}
          {workspace === 'catalog' ? <CatalogWorkspace catalog={catalog} dispatch={dispatch} /> : null}
        </Suspense></WorkspaceErrorBoundary>
      </main>
      <WorkspaceInspector project={project} selection={selection} diagnostics={diagnostics} dispatch={dispatch} workspace={workspace} />
    </div>
    <footer className="flex items-center justify-between border-t border-slate-800 bg-slate-900 px-3 text-[10px] text-slate-500"><div className="flex items-center gap-4"><span className="flex items-center gap-1.5"><ShieldCheck className={`h-3 w-3 ${diagnostics.length ? 'text-amber-400' : 'text-emerald-400'}`} />{diagnostics.length} diagnostics</span><span>{project.harness.connectorOccurrences.length} connectors</span><span>{project.harness.conductors.length} conductors</span><span className="text-emerald-500">Formboard · Cut List · BOM · Lockfile: Current</span><span className="text-cyan-600">Quote: {quoteTimestamp}</span></div><div className="flex items-center gap-4"><span className={projectFileActions.status.includes('failed') ? 'text-amber-400' : 'text-slate-500'}>{projectFileActions.status}</span><span>{selection.primary ? `${selection.primary.kind}:${selection.primary.id}` : 'No selection'}</span><span className="uppercase tracking-wider text-slate-600">mm · {workspace}</span></div></footer>
  </div>;
}
