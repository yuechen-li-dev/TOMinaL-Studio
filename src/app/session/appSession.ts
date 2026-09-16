import type { MaterialCatalogData } from '@/catalog/catalogData';
import type { EntityRef, HarnessIr, RouteSegmentId } from '@/harness-core';
import type { FormboardDocument, PointMm } from '@/formboard';

export type WorkspaceId = 'logical' | 'formboard' | 'catalog';

export type Selection = {
  readonly entities: readonly EntityRef[];
  readonly primary?: EntityRef;
};

export const emptySelection: Selection = { entities: [] };

export function singleSelection(entity: EntityRef): Selection {
  return { entities: [entity], primary: entity };
}

export function selectionsEqual(left: Selection, right: Selection): boolean {
  if (left.primary?.kind !== right.primary?.kind || left.primary?.id !== right.primary?.id) return false;
  if (left.entities.length !== right.entities.length) return false;
  return left.entities.every(
    (entity, index) => entity.kind === right.entities[index]?.kind && entity.id === right.entities[index]?.id
  );
}

export type AppCommand =
  | { readonly type: 'selection.set'; readonly selection: Selection }
  | { readonly type: 'selection.clear' }
  | { readonly type: 'workspace.switch'; readonly workspace: WorkspaceId }
  | { readonly type: 'formboard.replace'; readonly document: FormboardDocument }
  | { readonly type: 'formboard.moveConnector'; readonly id: string; readonly position: PointMm }
  | { readonly type: 'formboard.moveRoutePoint'; readonly id: RouteSegmentId; readonly index: number; readonly position: PointMm }
  | { readonly type: 'harness.updateConductor'; readonly id: string; readonly patch: Partial<HarnessIr['conductors'][number]> }
  | { readonly type: 'catalog.replace'; readonly catalog: MaterialCatalogData };

export type AppCommandDispatcher = (command: AppCommand) => void;
