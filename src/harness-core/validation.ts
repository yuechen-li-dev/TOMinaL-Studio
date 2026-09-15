import { isCatalogHashCurrent } from '@/harness-core/catalogHash';
import { sortDiagnostics, type Diagnostic, type EntityRef } from '@/harness-core/diagnostics';
import { isGaugeAllowed } from '@/harness-core/gauge';
import type {
  Circuit,
  Conductor,
  HarnessIr,
  Termination,
  TerminationTarget
} from '@/harness-core/model';

const entity = (kind: EntityRef['kind'], id: string): EntityRef => ({ kind, id });

function diagnostic(
  severity: Diagnostic['severity'],
  rule: string,
  target: EntityRef,
  message: string,
  suffix = ''
): Diagnostic {
  return {
    id: `${rule}:${target.kind}:${target.id}${suffix}`,
    severity,
    rule,
    entity: target,
    message
  };
}

function indexById<T extends { readonly id: string }>(
  values: readonly T[],
  kind: EntityRef['kind'],
  diagnostics: Diagnostic[]
): Map<string, T> {
  const index = new Map<string, T>();
  for (const value of values) {
    if (index.has(value.id)) {
      diagnostics.push(
        diagnostic('error', 'identity.duplicate', entity(kind, value.id), `Duplicate ${kind} ID ${value.id}.`)
      );
    } else {
      index.set(value.id, value);
    }
  }
  return index;
}

function targetKey(target: TerminationTarget): string {
  switch (target.kind) {
    case 'connectorCavity':
      return `cavity:${target.occurrenceId}:${target.cavityId}`;
    case 'electricalSplicePort':
      return `splice:${target.spliceId}`;
    case 'stud':
      return `stud:${target.studId}`;
    case 'serviceEnd':
      return `service:${target.id}`;
  }
}

function validateCircuitConnectivity(
  circuit: Circuit,
  conductors: Map<string, Conductor>,
  terminations: Map<string, Termination>,
  diagnostics: Diagnostic[]
): void {
  const ids = circuit.topology.conductorIds;
  const circuitConductors = ids.map((id) => conductors.get(id)).filter((value): value is Conductor => value !== undefined);

  for (const id of ids) {
    const conductor = conductors.get(id);
    if (!conductor) {
      diagnostics.push(
        diagnostic(
          'error',
          'circuit.conductor.missing',
          entity('circuit', circuit.id),
          `Circuit ${circuit.id} references missing conductor ${id}.`,
          `:${id}`
        )
      );
    } else if (conductor.circuitId !== circuit.id) {
      diagnostics.push(
        diagnostic(
          'error',
          'circuit.conductor.foreign',
          entity('circuit', circuit.id),
          `Conductor ${id} belongs to circuit ${conductor.circuitId}, not ${circuit.id}.`,
          `:${id}`
        )
      );
    }
  }

  if (circuit.topology.kind === 'pointToPoint' && ids.length !== 1) {
    diagnostics.push(
      diagnostic(
        'error',
        'circuit.pointToPoint.cardinality',
        entity('circuit', circuit.id),
        `Point-to-point circuit ${circuit.id} must own exactly one conductor.`
      )
    );
  }

  if (circuitConductors.length === 0) {
    diagnostics.push(
      diagnostic('error', 'circuit.disconnected', entity('circuit', circuit.id), `Circuit ${circuit.id} has no conductors.`)
    );
    return;
  }

  const adjacency = new Map<string, Set<string>>();
  const connect = (left: string, right: string) => {
    const leftNeighbors = adjacency.get(left) ?? new Set<string>();
    leftNeighbors.add(right);
    adjacency.set(left, leftNeighbors);
    const rightNeighbors = adjacency.get(right) ?? new Set<string>();
    rightNeighbors.add(left);
    adjacency.set(right, rightNeighbors);
  };

  for (const conductor of circuitConductors) {
    const a = conductor.terminationAId ? terminations.get(conductor.terminationAId) : undefined;
    const b = conductor.terminationBId ? terminations.get(conductor.terminationBId) : undefined;
    if (a && b) connect(targetKey(a.target), targetKey(b.target));
  }

  const nodes = [...adjacency.keys()];
  if (nodes.length === 0) return;
  const visited = new Set<string>();
  const queue = [nodes[0]];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const next of adjacency.get(current) ?? []) queue.push(next);
  }

  if (visited.size !== nodes.length) {
    diagnostics.push(
      diagnostic(
        'error',
        'circuit.disconnected',
        entity('circuit', circuit.id),
        `Circuit ${circuit.id} contains disconnected conductor groups.`
      )
    );
  }
}

export function validateHarnessIr(ir: HarnessIr): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  if (!isCatalogHashCurrent(ir.catalog)) {
    diagnostics.push(
      diagnostic(
        'error',
        'catalog.hash.stale',
        entity('harness', ir.id),
        `Catalog snapshot ${ir.catalog.snapshotId} does not match recorded hash ${ir.catalog.snapshotHash}.`
      )
    );
  }

  const families = indexById(ir.catalog.connectorFamilies, 'connectorFamily', diagnostics);
  const terminals = indexById(ir.catalog.terminals, 'catalogPart', diagnostics);
  const seals = indexById(ir.catalog.seals, 'catalogPart', diagnostics);
  const plugs = indexById(ir.catalog.plugs, 'catalogPart', diagnostics);
  const rings = indexById(ir.catalog.ringTerminals, 'catalogPart', diagnostics);
  const wireTypes = indexById(ir.catalog.wireTypes, 'catalogPart', diagnostics);
  const studs = indexById(ir.catalog.studs ?? [], 'catalogPart', diagnostics);
  const occurrences = indexById(ir.connectorOccurrences, 'connectorOccurrence', diagnostics);
  const circuits = indexById(ir.circuits, 'circuit', diagnostics);
  const conductors = indexById(ir.conductors, 'conductor', diagnostics);
  const terminations = indexById(ir.terminations, 'termination', diagnostics);
  const splices = indexById(ir.electricalSplices, 'electricalSplice', diagnostics);
  const routeJunctions = indexById(ir.routeJunctions, 'routeJunction', diagnostics);
  const routes = indexById(ir.routes, 'route', diagnostics);
  const routeSegments = indexById(ir.routeSegments, 'routeSegment', diagnostics);

  const globalIds = new Map<string, EntityRef['kind']>();
  const globalCollections: ReadonlyArray<readonly [EntityRef['kind'], readonly { readonly id: string }[]]> = [
    ['connectorOccurrence', ir.connectorOccurrences],
    ['circuit', ir.circuits],
    ['conductor', ir.conductors],
    ['termination', ir.terminations],
    ['electricalSplice', ir.electricalSplices],
    ['routeJunction', ir.routeJunctions],
    ['route', ir.routes],
    ['routeSegment', ir.routeSegments]
  ];
  for (const [kind, values] of globalCollections) {
    for (const value of values) {
      const previous = globalIds.get(value.id);
      if (previous && previous !== kind) {
        diagnostics.push(
          diagnostic(
            'error',
            'identity.globalDuplicate',
            entity(kind, value.id),
            `ID ${value.id} is used by both ${previous} and ${kind}.`
          )
        );
      } else {
        globalIds.set(value.id, kind);
      }
    }
  }

  for (const occurrence of ir.connectorOccurrences) {
    const family = families.get(occurrence.familyId);
    if (!family) {
      diagnostics.push(
        diagnostic(
          'error',
          'catalog.connectorFamily.unknown',
          entity('connectorOccurrence', occurrence.id),
          `Connector ${occurrence.id} references unknown family ${occurrence.familyId}.`
        )
      );
      continue;
    }

    const cavityIndex = new Map(family.cavities.map((cavity) => [cavity.id as string, cavity]));
    const populations = new Map<string, (typeof occurrence.cavityPopulations)[number]>();
    for (const entry of occurrence.cavityPopulations) {
      const target = entity('cavity', `${occurrence.id}:${entry.cavityId}`);
      if (populations.has(entry.cavityId)) {
        diagnostics.push(
          diagnostic('error', 'cavity.population.duplicate', target, `Cavity ${entry.cavityId} is populated more than once.`)
        );
        continue;
      }
      populations.set(entry.cavityId, entry);
      const cavity = cavityIndex.get(entry.cavityId);
      if (!cavity) {
        diagnostics.push(
          diagnostic(
            'error',
            'cavity.illegal',
            target,
            `Cavity ${entry.cavityId} is not defined by connector family ${family.id}.`
          )
        );
        continue;
      }

      if (entry.population.kind === 'terminalPopulated') {
        if (!terminals.has(entry.population.terminalPartId)) {
          diagnostics.push(
            diagnostic(
              'error',
              'catalog.terminal.unknown',
              target,
              `Unknown terminal ${entry.population.terminalPartId}.`
            )
          );
        } else if (!cavity.allowedTerminalIds.includes(entry.population.terminalPartId)) {
          diagnostics.push(
            diagnostic(
              'error',
              'cavity.terminal.illegal',
              target,
              `Terminal ${entry.population.terminalPartId} is not allowed in cavity ${entry.cavityId}.`
            )
          );
        }
        if (entry.population.sealPartId) {
          const terminal = terminals.get(entry.population.terminalPartId);
          if (!seals.has(entry.population.sealPartId)) {
            diagnostics.push(
              diagnostic('error', 'catalog.seal.unknown', target, `Unknown seal ${entry.population.sealPartId}.`)
            );
          } else if (
            !(cavity.allowedSealIds ?? []).includes(entry.population.sealPartId) ||
            (terminal?.allowedSealIds && !terminal.allowedSealIds.includes(entry.population.sealPartId))
          ) {
            diagnostics.push(
              diagnostic(
                'error',
                'cavity.seal.incompatible',
                target,
                `Seal ${entry.population.sealPartId} is incompatible with cavity ${entry.cavityId} or its terminal.`
              )
            );
          }
        }
      } else if (entry.population.kind === 'plugged') {
        if (!plugs.has(entry.population.plugPartId)) {
          diagnostics.push(
            diagnostic('error', 'catalog.plug.unknown', target, `Unknown cavity plug ${entry.population.plugPartId}.`)
          );
        } else if (!(cavity.allowedPlugIds ?? []).includes(entry.population.plugPartId)) {
          diagnostics.push(
            diagnostic(
              'error',
              'cavity.plug.illegal',
              target,
              `Plug ${entry.population.plugPartId} is not allowed in cavity ${entry.cavityId}.`
            )
          );
        }
      }
    }

    for (const cavity of family.cavities.filter((candidate) => candidate.required)) {
      if (populations.get(cavity.id)?.population.kind !== 'terminalPopulated') {
        diagnostics.push(
          diagnostic(
            'error',
            'cavity.required.unpopulated',
            entity('cavity', `${occurrence.id}:${cavity.id}`),
            `Required cavity ${cavity.id} on connector ${occurrence.id} is not terminal-populated.`
          )
        );
      }
    }
  }

  for (const termination of ir.terminations) {
    const target = termination.target;
    if (target.kind === 'connectorCavity') {
      const occurrence = occurrences.get(target.occurrenceId);
      const family = occurrence ? families.get(occurrence.familyId) : undefined;
      const cavity = family?.cavities.find((candidate) => candidate.id === target.cavityId);
      if (!occurrence || occurrence.familyId !== target.familyId || !cavity) {
        diagnostics.push(
          diagnostic(
            'error',
            'termination.target.impossible',
            entity('termination', termination.id),
            `Termination ${termination.id} references an impossible connector cavity target.`
          )
        );
      } else {
        const population = occurrence.cavityPopulations.find((entry) => entry.cavityId === target.cavityId)?.population;
        if (population?.kind !== 'terminalPopulated') {
          diagnostics.push(
            diagnostic(
              'error',
              'termination.cavity.unpopulated',
              entity('termination', termination.id),
              `Termination ${termination.id} targets cavity ${target.cavityId}, which is not terminal-populated.`
            )
          );
        } else if (
          population.terminalPartId !== termination.terminalPartId ||
          population.sealPartId !== termination.sealPartId
        ) {
          diagnostics.push(
            diagnostic(
              'error',
              'termination.cavity.populationMismatch',
              entity('termination', termination.id),
              `Termination ${termination.id} does not match the terminal/seal population of cavity ${target.cavityId}.`
            )
          );
        }
      }
    } else if (target.kind === 'electricalSplicePort') {
      const splice = splices.get(target.spliceId);
      if (!splice || !splice.ports.includes(target.portId)) {
        diagnostics.push(
          diagnostic(
            'error',
            'splice.port.invalid',
            entity('termination', termination.id),
            `Termination ${termination.id} references invalid splice port ${target.spliceId}:${target.portId}.`
          )
        );
      }
    } else if (target.kind === 'stud' && !studs.has(target.studId)) {
      diagnostics.push(
        diagnostic(
          'error',
          'termination.target.impossible',
          entity('termination', termination.id),
          `Termination ${termination.id} references unknown stud ${target.studId}.`
        )
      );
    }
  }

  const usedTerminationIds = new Set<string>();
  for (const conductor of ir.conductors) {
    if (!circuits.has(conductor.circuitId)) {
      diagnostics.push(
        diagnostic(
          'error',
          'conductor.circuit.unknown',
          entity('conductor', conductor.id),
          `Conductor ${conductor.id} references unknown circuit ${conductor.circuitId}.`
        )
      );
    }
    const wireType = wireTypes.get(conductor.wireTypeId);
    if (!wireType) {
      diagnostics.push(
        diagnostic(
          'error',
          'catalog.wireType.unknown',
          entity('conductor', conductor.id),
          `Conductor ${conductor.id} references unknown wire type ${conductor.wireTypeId}.`
        )
      );
    }
    if (conductor.slackMm < 0) {
      diagnostics.push(
        diagnostic('error', 'conductor.slack.negative', entity('conductor', conductor.id), `Conductor ${conductor.id} has negative slack.`)
      );
    }
    if (conductor.routeId && !routes.has(conductor.routeId)) {
      diagnostics.push(
        diagnostic(
          'error',
          'route.reference.missing',
          entity('conductor', conductor.id),
          `Conductor ${conductor.id} references missing route ${conductor.routeId}.`
        )
      );
    }

    for (const [end, terminationId] of [
      ['A', conductor.terminationAId],
      ['B', conductor.terminationBId]
    ] as const) {
      const termination = terminationId ? terminations.get(terminationId) : undefined;
      if (!termination) {
        diagnostics.push(
          diagnostic(
            'error',
            'conductor.termination.missing',
            entity('conductor', conductor.id),
            `Conductor ${conductor.id} is missing termination ${end}.`,
            `:${end}`
          )
        );
        continue;
      }
      usedTerminationIds.add(termination.id);
      if (!wireType) continue;
      if (termination.terminalPartId) {
        const terminal = terminals.get(termination.terminalPartId);
        if (!terminal) {
          diagnostics.push(
            diagnostic(
              'error',
              'catalog.terminal.unknown',
              entity('termination', termination.id),
              `Termination ${termination.id} references unknown terminal ${termination.terminalPartId}.`
            )
          );
        } else if (!isGaugeAllowed(wireType.gauge, terminal.compatibleGauge)) {
          diagnostics.push(
            diagnostic(
              'error',
              'termination.gauge.incompatible',
              entity('termination', termination.id),
              `Wire type ${wireType.id} is incompatible with terminal ${terminal.id}.`
            )
          );
        }
      }
      if (termination.ringTerminalPartId) {
        const ring = rings.get(termination.ringTerminalPartId);
        if (!ring) {
          diagnostics.push(
            diagnostic(
              'error',
              'catalog.ringTerminal.unknown',
              entity('termination', termination.id),
              `Termination ${termination.id} references unknown ring terminal ${termination.ringTerminalPartId}.`
            )
          );
        } else {
          if (!isGaugeAllowed(wireType.gauge, ring.compatibleGauge)) {
            diagnostics.push(
              diagnostic(
                'error',
                'termination.gauge.incompatible',
                entity('termination', termination.id),
                `Wire type ${wireType.id} is incompatible with ring terminal ${ring.id}.`
              )
            );
          }
          if (termination.target.kind === 'stud') {
            const stud = studs.get(termination.target.studId);
            if (stud && !ring.compatibleStudSizes.includes(stud.size)) {
              diagnostics.push(
                diagnostic(
                  'error',
                  'termination.stud.incompatible',
                  entity('termination', termination.id),
                  `Ring terminal ${ring.id} is incompatible with stud ${stud.id}.`
                )
              );
            }
          }
        }
      }
    }
  }

  const splicePortUse = new Map<string, number>();
  for (const termination of ir.terminations) {
    if (!usedTerminationIds.has(termination.id)) {
      diagnostics.push(
        diagnostic(
          'warning',
          'termination.unused',
          entity('termination', termination.id),
          `Termination ${termination.id} is not referenced by a conductor.`
        )
      );
    }
    if (termination.target.kind === 'electricalSplicePort') {
      const key = `${termination.target.spliceId}:${termination.target.portId}`;
      splicePortUse.set(key, (splicePortUse.get(key) ?? 0) + 1);
    }
  }
  for (const splice of ir.electricalSplices) {
    for (const port of splice.ports) {
      const count = splicePortUse.get(`${splice.id}:${port}`) ?? 0;
      if (count !== 1) {
        diagnostics.push(
          diagnostic(
            'error',
            'splice.port.mismatch',
            entity('electricalSplice', splice.id),
            `Splice ${splice.id} port ${port} must have exactly one conductor termination; found ${count}.`,
            `:${port}`
          )
        );
      }
    }
  }

  for (const route of ir.routes) {
    for (const segmentId of route.segmentIds) {
      if (!routeSegments.has(segmentId)) {
        diagnostics.push(
          diagnostic(
            'error',
            'route.segment.missing',
            entity('route', route.id),
            `Route ${route.id} references missing segment ${segmentId}.`,
            `:${segmentId}`
          )
        );
      }
    }
  }

  for (const segment of ir.routeSegments) {
    for (const endpoint of [segment.from, segment.to]) {
      const exists =
        (endpoint.kind === 'connector' && occurrences.has(endpoint.id)) ||
        (endpoint.kind === 'splice' && splices.has(endpoint.id)) ||
        (endpoint.kind === 'junction' && routeJunctions.has(endpoint.id)) ||
        (endpoint.kind === 'stud' && studs.has(endpoint.id));
      if (!exists) {
        diagnostics.push(
          diagnostic(
            'error',
            'route.endpoint.missing',
            entity('routeSegment', segment.id),
            `Route segment ${segment.id} references missing ${endpoint.kind} endpoint ${endpoint.id}.`,
            `:${endpoint.kind}:${endpoint.id}`
          )
        );
      }
    }
  }

  for (const circuit of ir.circuits) {
    if (circuit.topology.kind === 'spliceTree') {
      for (const spliceId of circuit.topology.spliceIds) {
        if (!splices.has(spliceId)) {
          diagnostics.push(
            diagnostic(
              'error',
              'circuit.splice.missing',
              entity('circuit', circuit.id),
              `Circuit ${circuit.id} references missing splice ${spliceId}.`,
              `:${spliceId}`
            )
          );
        }
      }
    }
    validateCircuitConnectivity(circuit, conductors, terminations, diagnostics);
  }

  return sortDiagnostics(diagnostics);
}
