import type { EntityRef } from '@/harness-core/diagnostics';
import type { HarnessIr, TerminationTarget } from '@/harness-core/model';

export type LogicalGraphNode = {
  readonly id: string;
  readonly kind: 'connector' | 'electricalSplice' | 'stud' | 'serviceEnd';
  readonly label: string;
  readonly entity: EntityRef;
  readonly status: 'normal';
};

export type LogicalGraphEdge = {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly label: string;
  readonly circuitId: string;
  readonly entity: EntityRef;
};

export type LogicalGraphProjection = {
  readonly nodes: readonly LogicalGraphNode[];
  readonly edges: readonly LogicalGraphEdge[];
};

function nodeId(target: TerminationTarget): string {
  switch (target.kind) {
    case 'connectorCavity':
      return `connector:${target.occurrenceId}`;
    case 'electricalSplicePort':
      return `splice:${target.spliceId}`;
    case 'stud':
      return `stud:${target.studId}`;
    case 'serviceEnd':
      return `service:${target.id}`;
  }
}

export function projectLogicalGraph(ir: HarnessIr): LogicalGraphProjection {
  const nodes = new Map<string, LogicalGraphNode>();
  for (const connector of ir.connectorOccurrences) {
    nodes.set(`connector:${connector.id}`, {
      id: `connector:${connector.id}`,
      kind: 'connector',
      label: connector.role,
      entity: { kind: 'connectorOccurrence', id: connector.id },
      status: 'normal'
    });
  }
  for (const splice of ir.electricalSplices) {
    nodes.set(`splice:${splice.id}`, {
      id: `splice:${splice.id}`,
      kind: 'electricalSplice',
      label: splice.id,
      entity: { kind: 'electricalSplice', id: splice.id },
      status: 'normal'
    });
  }

  const terminations = new Map(ir.terminations.map((termination) => [termination.id as string, termination]));
  const circuits = new Map(ir.circuits.map((circuit) => [circuit.id as string, circuit]));
  const edges: LogicalGraphEdge[] = [];
  for (const conductor of ir.conductors) {
    const a = conductor.terminationAId ? terminations.get(conductor.terminationAId) : undefined;
    const b = conductor.terminationBId ? terminations.get(conductor.terminationBId) : undefined;
    if (!a || !b) continue;
    for (const target of [a.target, b.target]) {
      const id = nodeId(target);
      if (!nodes.has(id) && target.kind === 'stud') {
        nodes.set(id, {
          id,
          kind: 'stud',
          label: target.studId,
          entity: { kind: 'catalogPart', id: target.studId },
          status: 'normal'
        });
      } else if (!nodes.has(id) && target.kind === 'serviceEnd') {
        nodes.set(id, {
          id,
          kind: 'serviceEnd',
          label: target.id,
          entity: { kind: 'termination', id: target.id },
          status: 'normal'
        });
      }
    }
    const circuit = circuits.get(conductor.circuitId);
    edges.push({
      id: conductor.id,
      source: nodeId(a.target),
      target: nodeId(b.target),
      label: circuit?.signalRole ?? conductor.id,
      circuitId: conductor.circuitId,
      entity: { kind: 'conductor', id: conductor.id }
    });
  }

  return {
    nodes: [...nodes.values()].sort((left, right) => left.id.localeCompare(right.id)),
    edges: edges.sort((left, right) => left.id.localeCompare(right.id))
  };
}

