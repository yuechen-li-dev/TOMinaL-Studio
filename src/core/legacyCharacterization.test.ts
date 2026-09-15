import { describe, expect, it } from 'vitest';

import { exportCatalogToToml } from '@/catalog/catalogManifestCodec';
import { emptyMaterialCatalogData } from '@/catalog/catalogData';
import {
  addBranch,
  addConnector,
  addSegment,
  addWire,
  deleteNode,
  deleteSegment
} from '@/core/harnessMutations';
import { computeWireCutLength, computeWireRouteLength } from '@/core/harnessCalculations';
import { createEmptyHarnessDocument, createSampleHarnessDocument } from '@/core/harnessModel';
import { exportHarnessToToml, importHarnessFromToml } from '@/core/tomlCodec';
import { generateWiresFromSignals, inferRouteBySegmentsBfs } from '@/core/wireGeneration';
import { toFlowEdges, toFlowNodes } from '@/core/graphAdapter';

describe('v0.1 characterization', () => {
  it('round-trips the complete sample deterministically', () => {
    const sample = createSampleHarnessDocument();
    const encoded = exportHarnessToToml(sample);
    expect(exportHarnessToToml(importHarnessFromToml(encoded))).toBe(encoded);
  });

  it.each([
    ['version', 'version = "9.9"', /Unsupported harness version/],
    ['units', 'units = "inch"', /Unsupported harness units/],
    ['drawing type', 'drawing_type = "schematic"', /Unsupported harness drawing_type/]
  ])('rejects invalid %s envelope values', (_label, replacement, expected) => {
    const source = exportHarnessToToml(createSampleHarnessDocument());
    const key = replacement.slice(0, replacement.indexOf(' ='));
    const invalid = source.replace(new RegExp(`^${key} = .+$`, 'm'), replacement);
    expect(() => importHarnessFromToml(invalid)).toThrow(expected);
  });

  it('rejects invalid references on import', () => {
    const source = exportHarnessToToml(createSampleHarnessDocument()).replace(
      'from = "ECU_C1:1"',
      'from = "MISSING:1"'
    );
    expect(() => importHarnessFromToml(source)).toThrow(/missing connector/);
  });

  it('preserves mutation reference invariants and deletion cascades', () => {
    let document = createEmptyHarnessDocument();
    document = addConnector(document, { id: 'A', pins: { '1': { signal: 'X' } } });
    document = addConnector(document, { id: 'B', pins: { '1': { signal: 'X' } } });
    document = addBranch(document, { id: 'J' });
    document = addSegment(document, { id: 'S1', from: 'A', to: 'J', nominalLengthMm: 10 });
    document = addSegment(document, { id: 'S2', from: 'J', to: 'B', nominalLengthMm: 20 });
    document = addWire(document, {
      id: 'W',
      from: { connectorId: 'A', pinId: '1' },
      to: { connectorId: 'B', pinId: '1' },
      route: ['S1', 'S2']
    });

    expect(() => addSegment(document, { from: 'A', to: 'MISSING' })).toThrow(/Unknown node/);
    expect(deleteSegment(document, 'S1').wires).toEqual({});
    expect(deleteNode(document, 'A').wires).toEqual({});
  });

  it('keeps deterministic BFS route inference and pair-only generation', () => {
    const sample = createSampleHarnessDocument();
    expect(inferRouteBySegmentsBfs(sample, 'ECU_C1', 'CLUSTER_C1')).toEqual([
      'SEG_MAIN_LEFT',
      'SEG_MAIN_RIGHT'
    ]);
    const threeEndpoints = {
      ...sample,
      connectors: {
        ...sample.connectors,
        EXTRA: { id: 'EXTRA', position: [0, 0] as [number, number], pins: { '1': { signal: 'CAN_H' } } }
      },
      wires: {}
    };
    const result = generateWiresFromSignals(threeEndpoints);
    expect(result.report.skippedNonPairSignals).toContainEqual({ signal: 'CAN_H', endpointCount: 3 });
  });

  it('calculates route and cut lengths from legacy nominal values', () => {
    const sample = createSampleHarnessDocument();
    const wire = sample.wires.W_IGN_SW;
    expect(computeWireRouteLength(sample, wire)).toBe(650);
    expect(computeWireCutLength(sample, wire)).toBe(680);
  });

  it('projects stable React Flow identities without changing authority direction', () => {
    const sample = createSampleHarnessDocument();
    const nodes = toFlowNodes(sample, {
      collapsedConnectorIds: {},
      housingOptions: [],
      connectorCallbacks: {
        onToggleCollapse: () => undefined,
        onPartNumberChange: () => undefined,
        onHousingIdChange: () => undefined,
        onPinCountChange: () => undefined,
        onPinChange: () => undefined
      }
    });
    expect(nodes.map((node) => node.id)).toEqual(['ECU_C1', 'CLUSTER_C1', 'B1', 'S1']);
    expect(toFlowEdges(sample).map((edge) => edge.id)).toEqual([
      'SEG_MAIN_LEFT',
      'SEG_MAIN_RIGHT',
      'SEG_DROP_1'
    ]);
  });

  it('keeps catalog output deterministic', () => {
    expect(exportCatalogToToml(emptyMaterialCatalogData)).toBe(exportCatalogToToml(emptyMaterialCatalogData));
  });
});

