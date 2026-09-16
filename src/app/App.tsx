import { useCallback, useRef, useState } from 'react';

import { AppShell } from '@/app/layout/AppShell';
import { emptyMaterialCatalogData, type MaterialCatalogData } from '@/catalog/catalogData';
import { moveConnector, updateRouteSegment, type TominalProject } from '@/formboard';
import type { HarnessIr } from '@/harness-core';
import { downloadTextFile, isTauriDesktop, openNativeProjectText, parseTominalProjectFile, saveNativeProjectText, serializeTominalProjectFile } from '@/desktop';
import { controllerChassisProject } from '../../fixtures/controller-chassis/controllerChassis.formboard';
import {
  emptySelection,
  selectionsEqual,
  type AppCommand,
  type Selection,
  type WorkspaceId
} from './session/appSession';

/** Compatibility types retained for the v0.1 editor adapter tests. */
export type SelectionState = {
  selectedNodeIds: string[];
  selectedSegmentIds: string[];
  selectedWireIds: string[];
};

export type UiState = { collapsedConnectorIds: Record<string, boolean> };

function App() {
  const [harness, setHarness] = useState<HarnessIr>(controllerChassisProject.harness);
  const [formboard, setFormboard] = useState(controllerChassisProject.formboard);
  const [catalog, setCatalog] = useState<MaterialCatalogData>(emptyMaterialCatalogData);
  const [selection, setSelection] = useState<Selection>(emptySelection);
  const [workspace, setWorkspace] = useState<WorkspaceId>('logical');
  const [quoteRevision, setQuoteRevision] = useState(0);
  const [projectFileStatus, setProjectFileStatus] = useState(isTauriDesktop() ? 'Native desktop · Unsaved project' : 'Browser · Unsaved project');
  const projectInput = useRef<HTMLInputElement>(null);

  const loadProjectText = useCallback((text: string, source: string) => {
    const loaded = parseTominalProjectFile(text);
    setHarness(loaded.project.harness);
    setFormboard(loaded.project.formboard);
    setQuoteRevision(loaded.quoteRevision);
    setSelection(emptySelection);
    setProjectFileStatus(source);
  }, []);

  const openProject = useCallback(async () => {
    try {
      if (!isTauriDesktop()) { projectInput.current?.click(); return; }
      const opened = await openNativeProjectText();
      if (opened) loadProjectText(opened.text, `Opened · ${opened.path}`);
    } catch (error) { setProjectFileStatus(`Open failed · ${error instanceof Error ? error.message : String(error)}`); }
  }, [loadProjectText]);

  const saveProject = useCallback(async () => {
    try {
      const contents = serializeTominalProjectFile({ harness, formboard }, quoteRevision);
      const name = `${harness.id}.tominal.json`;
      if (isTauriDesktop()) {
        const path = await saveNativeProjectText(name, contents);
        if (path) setProjectFileStatus(`Saved · ${path}`);
      } else {
        downloadTextFile(name, contents);
        setProjectFileStatus(`Downloaded · ${name}`);
      }
    } catch (error) { setProjectFileStatus(`Save failed · ${error instanceof Error ? error.message : String(error)}`); }
  }, [formboard, harness, quoteRevision]);

  const dispatch = useCallback((command: AppCommand) => {
    switch (command.type) {
      case 'selection.set':
        setSelection((current) => (selectionsEqual(current, command.selection) ? current : command.selection));
        return;
      case 'selection.clear':
        setSelection((current) => (current.entities.length === 0 ? current : emptySelection));
        return;
      case 'workspace.switch':
        setWorkspace(command.workspace);
        return;
      case 'formboard.replace':
        setFormboard(command.document);
        return;
      case 'formboard.moveConnector':
        setFormboard((current) => moveConnector(current, command.id as Parameters<typeof moveConnector>[1], command.position).document);
        return;
      case 'formboard.moveRoutePoint':
        setFormboard((current) => {
          const segment = current.segmentGeometry.find((item) => item.routeSegmentId === command.id);
          if (!segment) return current;
          const points = [...segment.points];
          points[command.index] = command.position;
          return updateRouteSegment(current, command.id, {
            points: points as [typeof command.position, typeof command.position, ...typeof command.position[]]
          }).document;
        });
        return;
      case 'harness.updateConductor':
        setHarness((current) => ({
          ...current,
          conductors: current.conductors.map((conductor) =>
            conductor.id === command.id ? { ...conductor, ...command.patch, id: conductor.id } : conductor
          )
        }));
        return;
      case 'catalog.replace':
        setCatalog(command.catalog);
        return;
      case 'quote.refresh':
        setQuoteRevision((current) => current + 1);
    }
  }, []);

  const project: TominalProject = { harness, formboard };

  return (
    <div className="h-screen bg-slate-950 text-slate-100">
      <input ref={projectInput} aria-label="Open TOMinaL project file" className="hidden" type="file" accept=".json,.tominal.json,application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void file.text().then((text) => loadProjectText(text, `Opened · ${file.name}`)).catch((error) => setProjectFileStatus(`Open failed · ${String(error)}`)); event.currentTarget.value = ''; }} />
      <AppShell catalog={catalog} dispatch={dispatch} project={project} projectFileActions={{ isDesktop: isTauriDesktop(), status: projectFileStatus, open: openProject, save: saveProject }} quoteRevision={quoteRevision} selection={selection} workspace={workspace} />
    </div>
  );
}

export default App;
