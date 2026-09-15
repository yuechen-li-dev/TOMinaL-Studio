import type { Diagnostic, EntityRef } from '@/harness-core/diagnostics';
import type { ConnectorOccurrenceId } from '@/harness-core/ids';
import type { HarnessIr } from '@/harness-core/model';

export type DestructiveEditPlan = {
  readonly allowedWithoutConfirmation: boolean;
  readonly affectedEntities: readonly EntityRef[];
  readonly diagnostics: readonly Diagnostic[];
};

export function planConnectorRemoval(ir: HarnessIr, connectorId: ConnectorOccurrenceId): DestructiveEditPlan {
  const terminationIds = new Set(
    ir.terminations
      .filter(
        (termination) =>
          termination.target.kind === 'connectorCavity' && termination.target.occurrenceId === connectorId
      )
      .map((termination) => termination.id as string)
  );
  const conductors = ir.conductors.filter(
    (conductor) =>
      (conductor.terminationAId && terminationIds.has(conductor.terminationAId)) ||
      (conductor.terminationBId && terminationIds.has(conductor.terminationBId))
  );
  const circuitIds = new Set(conductors.map((conductor) => conductor.circuitId as string));
  const affectedEntities: EntityRef[] = [
    ...[...terminationIds].map((id) => ({ kind: 'termination' as const, id })),
    ...conductors.map((conductor) => ({ kind: 'conductor' as const, id: conductor.id as string })),
    ...[...circuitIds].map((id) => ({ kind: 'circuit' as const, id }))
  ];

  return {
    allowedWithoutConfirmation: affectedEntities.length === 0,
    affectedEntities,
    diagnostics:
      affectedEntities.length === 0
        ? []
        : [
            {
              id: `edit.removeConnector.dependencies:${connectorId}`,
              severity: 'warning',
              rule: 'edit.removeConnector.dependencies',
              entity: { kind: 'connectorOccurrence', id: connectorId },
              message: `Removing connector ${connectorId} affects ${affectedEntities.length} semantic entities and requires confirmation.`
            }
          ]
  };
}

