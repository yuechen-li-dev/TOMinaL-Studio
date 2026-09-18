import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { controllerChassisCatalog } from '../../fixtures/controller-chassis/catalog';
import { controllerChassisHarness } from '../../fixtures/controller-chassis/controllerChassis.harness';
import { generateConnectorDeclarations } from '@/harness-authoring';
import {
  catalogPartId,
  conductorId,
  gaugeAreaMm2,
  parseHarnessIr,
  planConnectorRemoval,
  projectLogicalGraph,
  serializeHarnessIr,
  validateHarnessIr,
  wireTypeId
} from '@/harness-core';
import type { HarnessIr } from '@/harness-core';
import { logicalProjectionToReactFlow } from '@/flow/vnextGraphAdapter';

type Mutable<T> = T extends string | number | boolean
  ? T
  : T extends readonly (infer TItem)[]
    ? Mutable<TItem>[]
    : T extends object
      ? { -readonly [TKey in keyof T]: Mutable<T[TKey]> }
      : T;

function cloneFixture(): Mutable<HarnessIr> {
  return JSON.parse(serializeHarnessIr(controllerChassisHarness)) as Mutable<HarnessIr>;
}

describe('HarnessIr vNext', () => {
  it('creates the clean controller chassis fixture with no validation errors', () => {
    expect(validateHarnessIr(controllerChassisHarness)).toEqual([]);
    expect(controllerChassisHarness.catalog.connectorFamilies).toHaveLength(4);
    expect(controllerChassisHarness.connectorOccurrences).toHaveLength(8);
    expect(controllerChassisHarness.connectorOccurrences.flatMap((connector) => connector.cavityPopulations)).toHaveLength(24);
    expect(controllerChassisHarness.circuits).toHaveLength(11);
    expect(controllerChassisHarness.conductors).toHaveLength(13);
    expect(controllerChassisHarness.terminations).toHaveLength(26);
    expect(controllerChassisHarness.electricalSplices).toHaveLength(1);
    expect(controllerChassisHarness.routeJunctions).toHaveLength(1);
    expect(controllerChassisHarness.routes).toHaveLength(3);
  });

  it('represents circuits, conductors, splices, and physical branches separately', () => {
    expect(controllerChassisHarness.circuits.find((circuit) => circuit.id === 'CIRCUIT_CHASSIS_GROUND')?.topology.kind).toBe(
      'spliceTree'
    );
    expect(controllerChassisHarness.electricalSplices[0].id).toBe('SPLICE_GROUND');
    expect(controllerChassisHarness.routeJunctions[0].id).toBe('JUNCTION_PANEL_FANOUT');
    expect(
      controllerChassisHarness.terminations.some((termination) => termination.target.kind === 'electricalSplicePort')
    ).toBe(true);
  });

  it('serializes and parses byte-stably without timestamps', () => {
    const first = serializeHarnessIr(controllerChassisHarness);
    const second = serializeHarnessIr(parseHarnessIr(first));
    expect(second).toBe(first);
    expect(first).not.toContain('timestamp');
  });

  it('projects a plain logical graph and omits physical route junctions', () => {
    const projection = projectLogicalGraph(controllerChassisHarness);
    expect(projection.nodes.some((node) => node.entity.kind === 'routeJunction')).toBe(false);
    expect(projection.nodes.some((node) => node.entity.kind === 'electricalSplice')).toBe(true);
    expect(projection.edges).toHaveLength(controllerChassisHarness.conductors.length);
    const reactFlow = logicalProjectionToReactFlow(projection);
    expect(reactFlow.nodes.map((node) => node.id)).toEqual(projection.nodes.map((node) => node.id));
    expect(reactFlow.edges.map((edge) => edge.id)).toEqual(projection.edges.map((edge) => edge.id));
  });

  it('normalizes AWG and metric gauge to engineering area', () => {
    expect(gaugeAreaMm2({ kind: 'crossSection', areaMm2: 1 as never })).toBe(1);
    expect(gaugeAreaMm2({ kind: 'awg', value: 18 })).toBeGreaterThan(0.8);
    expect(gaugeAreaMm2({ kind: 'awg', value: 18 })).toBeLessThan(0.9);
  });

  it('generates connector declarations deterministically and ties them to the catalog hash', () => {
    expect(controllerChassisCatalog.snapshotHash).toBe('fnv1a32:483a8bd0');
    const first = generateConnectorDeclarations(controllerChassisCatalog);
    expect(generateConnectorDeclarations(controllerChassisCatalog)).toBe(first);
    expect(first).toContain(`// Catalog hash: ${controllerChassisCatalog.snapshotHash}`);
    expect(first).toContain('export const Power3Family');
    const checkedIn = readFileSync(
      new URL('../../fixtures/controller-chassis/connectorFamilies.generated.ts', import.meta.url),
      'utf8'
    );
    expect(checkedIn.replace(/\r\n/g, '\n')).toBe(first);
  });

  it('plans destructive connector edits instead of cascading silently', () => {
    const plan = planConnectorRemoval(controllerChassisHarness, 'PCB_POWER' as never);
    expect(plan.allowedWithoutConfirmation).toBe(false);
    expect(plan.affectedEntities.some((candidate) => candidate.kind === 'conductor')).toBe(true);
  });

  it.each([
    ['illegal cavity', (ir: ReturnType<typeof cloneFixture>) => {
      ir.connectorOccurrences[0].cavityPopulations[0] = {
        ...ir.connectorOccurrences[0].cavityPopulations[0],
        cavityId: 'DOES_NOT_EXIST' as never
      };
    }, 'cavity.illegal'],
    ['duplicate cavity population', (ir: ReturnType<typeof cloneFixture>) => {
      ir.connectorOccurrences[0].cavityPopulations = [
        ...ir.connectorOccurrences[0].cavityPopulations,
        ir.connectorOccurrences[0].cavityPopulations[0]
      ];
    }, 'cavity.population.duplicate'],
    ['wrong terminal', (ir: ReturnType<typeof cloneFixture>) => {
      const occurrence = ir.connectorOccurrences.find((candidate) => candidate.id === 'PCB_POWER')!;
      occurrence.cavityPopulations[0] = {
        ...occurrence.cavityPopulations[0],
        population: { kind: 'terminalPopulated', terminalPartId: catalogPartId('TERM_SIGNAL') }
      };
    }, 'cavity.terminal.illegal'],
    ['incompatible wire gauge', (ir: ReturnType<typeof cloneFixture>) => {
      const conductor = ir.conductors.find((candidate) => candidate.id === 'WIRE_VIN_POS')!;
      conductor.wireTypeId = wireTypeId('WIRE_SIGNAL_022MM2');
    }, 'termination.gauge.incompatible'],
    ['missing conductor end', (ir: ReturnType<typeof cloneFixture>) => {
      const conductor = ir.conductors[0];
      conductor.terminationBId = undefined;
    }, 'conductor.termination.missing'],
    ['invalid splice port', (ir: ReturnType<typeof cloneFixture>) => {
      const termination = ir.terminations.find((candidate) => candidate.target.kind === 'electricalSplicePort')!;
      if (termination.target.kind !== 'electricalSplicePort') throw new Error('Expected splice port fixture.');
      termination.target.portId = 'BAD' as never;
    }, 'splice.port.invalid'],
    ['duplicate ID', (ir: ReturnType<typeof cloneFixture>) => {
      ir.conductors = [...ir.conductors, { ...ir.conductors[0] }];
    }, 'identity.duplicate'],
    ['unresolved catalog binding', (ir: ReturnType<typeof cloneFixture>) => {
      ir.conductors[0].wireTypeId = wireTypeId('UNKNOWN');
    }, 'catalog.wireType.unknown'],
    ['negative slack', (ir: ReturnType<typeof cloneFixture>) => {
      ir.conductors[0].slackMm = -1 as never;
    }, 'conductor.slack.negative']
  ])('diagnoses %s', (_label, mutate, expectedRule) => {
    const ir = cloneFixture();
    mutate(ir);
    expect(validateHarnessIr(ir as unknown as HarnessIr).map((diagnostic) => diagnostic.rule)).toContain(expectedRule);
  });

  it('rejects malformed untrusted JSON instead of trusting TypeScript shapes', () => {
    expect(() => parseHarnessIr('{"schemaVersion":"1.0"}')).toThrow();
    const parsed = JSON.parse(serializeHarnessIr(controllerChassisHarness));
    parsed.conductors[0].slackMm = 'twenty';
    expect(() => parseHarnessIr(JSON.stringify(parsed))).toThrow();
  });

  it('uses distinct branded identities at authoring boundaries', () => {
    expect(conductorId('X')).toBe('X');
    expect(wireTypeId('X')).toBe('X');
  });
});
