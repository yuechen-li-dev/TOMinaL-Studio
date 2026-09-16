import { useCallback, useState } from 'react';

import { AppShell } from '@/app/layout/AppShell';
import { emptyMaterialCatalogData, type MaterialCatalogData } from '@/catalog/catalogData';
import { moveConnector, updateRouteSegment, type TominalProject } from '@/formboard';
import type { HarnessIr } from '@/harness-core';
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
    }
  }, []);

  const project: TominalProject = { harness, formboard };

  return (
    <div className="h-screen bg-slate-950 text-slate-100">
      <AppShell catalog={catalog} dispatch={dispatch} project={project} selection={selection} workspace={workspace} />
    </div>
  );
}

export default App;
