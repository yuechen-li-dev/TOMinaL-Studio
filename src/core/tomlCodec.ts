import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';

import type {
  Board,
  Branch,
  Connector,
  ConnectorPin,
  HarnessDocument,
  PinRef,
  Segment,
  Splice,
  Wire,
  XY
} from '@/core/harnessModel';

type TomlPinRef = string;

type TomlHarnessDocument = {
  version?: unknown;
  units?: unknown;
  name?: unknown;
  drawing_type?: unknown;
  board?: unknown;
  connectors?: unknown;
  branches?: unknown;
  splices?: unknown;
  segments?: unknown;
  wires?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function expectString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Expected ${field} to be a string.`);
  }
  return value;
}

function expectNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Expected ${field} to be a number.`);
  }
  return value;
}

function expectStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`Expected ${field} to be an array of strings.`);
  }
  return value;
}

function expectXY(value: unknown, field: string): XY {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    typeof value[0] !== 'number' ||
    typeof value[1] !== 'number' ||
    Number.isNaN(value[0]) ||
    Number.isNaN(value[1])
  ) {
    throw new Error(`Expected ${field} to be a two-item numeric tuple.`);
  }
  return [value[0], value[1]];
}

function parsePinRef(pinRef: TomlPinRef, field: string): PinRef {
  const separatorIndex = pinRef.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex === pinRef.length - 1) {
    throw new Error(`Expected ${field} to be in CONNECTOR:PIN format.`);
  }

  return {
    connectorId: pinRef.slice(0, separatorIndex),
    pinId: pinRef.slice(separatorIndex + 1)
  };
}

function formatPinRef(pinRef: PinRef): TomlPinRef {
  return `${pinRef.connectorId}:${pinRef.pinId}`;
}

function parseBoard(value: unknown): Board {
  if (!isRecord(value)) {
    throw new Error('Expected board table.');
  }

  return {
    width: expectNumber(value.width, 'board.width'),
    height: expectNumber(value.height, 'board.height'),
    grid: expectNumber(value.grid, 'board.grid'),
    origin: expectXY(value.origin, 'board.origin')
  };
}

function parseConnectorPins(value: unknown, connectorId: string): Record<string, ConnectorPin> {
  if (!isRecord(value)) {
    throw new Error(`Expected connectors.${connectorId}.pins table.`);
  }

  const pins: Record<string, ConnectorPin> = {};
  for (const [pinId, pinRaw] of Object.entries(value)) {
    if (!isRecord(pinRaw)) {
      throw new Error(`Expected connectors.${connectorId}.pins.${pinId} table.`);
    }

    pins[pinId] = {
      signal: typeof pinRaw.signal === 'string' ? pinRaw.signal : undefined,
      terminalPartNumber:
        typeof pinRaw.terminal_part_number === 'string' ? pinRaw.terminal_part_number : undefined,
      cavityLabel: typeof pinRaw.cavity_label === 'string' ? pinRaw.cavity_label : undefined
    };
  }

  return pins;
}

function parseConnectors(value: unknown): Record<string, Connector> {
  if (!isRecord(value)) {
    throw new Error('Expected connectors table.');
  }

  const connectors: Record<string, Connector> = {};
  for (const [connectorId, connectorRaw] of Object.entries(value)) {
    if (!isRecord(connectorRaw)) {
      throw new Error(`Expected connectors.${connectorId} table.`);
    }

    connectors[connectorId] = {
      id: expectString(connectorRaw.id, `connectors.${connectorId}.id`),
      kind: typeof connectorRaw.kind === 'string' ? connectorRaw.kind : undefined,
      partNumber: typeof connectorRaw.part_number === 'string' ? connectorRaw.part_number : undefined,
      description: typeof connectorRaw.description === 'string' ? connectorRaw.description : undefined,
      position: expectXY(connectorRaw.position, `connectors.${connectorId}.position`),
      rotationDeg:
        typeof connectorRaw.rotation_deg === 'number' ? connectorRaw.rotation_deg : undefined,
      side: typeof connectorRaw.side === 'string' ? connectorRaw.side : undefined,
      pins: parseConnectorPins(connectorRaw.pins, connectorId)
    };
  }

  return connectors;
}

function parseBranches(value: unknown): Record<string, Branch> {
  if (!isRecord(value)) {
    throw new Error('Expected branches table.');
  }

  const branches: Record<string, Branch> = {};
  for (const [branchId, branchRaw] of Object.entries(value)) {
    if (!isRecord(branchRaw)) {
      throw new Error(`Expected branches.${branchId} table.`);
    }

    branches[branchId] = {
      id: expectString(branchRaw.id, `branches.${branchId}.id`),
      kind: typeof branchRaw.kind === 'string' ? branchRaw.kind : undefined,
      position: expectXY(branchRaw.position, `branches.${branchId}.position`)
    };
  }

  return branches;
}

function parseSplices(value: unknown): Record<string, Splice> {
  if (!isRecord(value)) {
    throw new Error('Expected splices table.');
  }

  const splices: Record<string, Splice> = {};
  for (const [spliceId, spliceRaw] of Object.entries(value)) {
    if (!isRecord(spliceRaw)) {
      throw new Error(`Expected splices.${spliceId} table.`);
    }

    splices[spliceId] = {
      id: expectString(spliceRaw.id, `splices.${spliceId}.id`),
      kind: typeof spliceRaw.kind === 'string' ? spliceRaw.kind : undefined,
      partNumber: typeof spliceRaw.part_number === 'string' ? spliceRaw.part_number : undefined,
      position: expectXY(spliceRaw.position, `splices.${spliceId}.position`)
    };
  }

  return splices;
}

function parseSegments(value: unknown): Record<string, Segment> {
  if (!isRecord(value)) {
    throw new Error('Expected segments table.');
  }

  const segments: Record<string, Segment> = {};
  for (const [segmentId, segmentRaw] of Object.entries(value)) {
    if (!isRecord(segmentRaw)) {
      throw new Error(`Expected segments.${segmentId} table.`);
    }

    const pathRaw = segmentRaw.path;
    if (!Array.isArray(pathRaw)) {
      throw new Error(`Expected segments.${segmentId}.path to be an array of XY tuples.`);
    }

    segments[segmentId] = {
      id: expectString(segmentRaw.id, `segments.${segmentId}.id`),
      from: expectString(segmentRaw.from, `segments.${segmentId}.from`),
      to: expectString(segmentRaw.to, `segments.${segmentId}.to`),
      path: pathRaw.map((entry, index) => expectXY(entry, `segments.${segmentId}.path[${index}]`)),
      geometry:
        segmentRaw.geometry === 'polyline' || segmentRaw.geometry === 'spline'
          ? segmentRaw.geometry
          : undefined,
      nominalLengthMm:
        typeof segmentRaw.nominal_length_mm === 'number' ? segmentRaw.nominal_length_mm : undefined,
      bundleDiameterMm:
        typeof segmentRaw.bundle_diameter_mm === 'number' ? segmentRaw.bundle_diameter_mm : undefined
    };
  }

  return segments;
}

function parseWires(value: unknown): Record<string, Wire> {
  if (!Array.isArray(value)) {
    throw new Error('Expected wires to be an array of tables.');
  }

  const wires: Record<string, Wire> = {};

  for (const [index, wireRaw] of value.entries()) {
    if (!isRecord(wireRaw)) {
      throw new Error(`Expected wires[${index}] to be a table.`);
    }

    const wireId = expectString(wireRaw.id, `wires[${index}].id`);
    wires[wireId] = {
      id: wireId,
      from: parsePinRef(expectString(wireRaw.from, `wires[${index}].from`), `wires[${index}].from`),
      to: parsePinRef(expectString(wireRaw.to, `wires[${index}].to`), `wires[${index}].to`),
      route: expectStringArray(wireRaw.route, `wires[${index}].route`),
      slackMm: typeof wireRaw.slack_mm === 'number' ? wireRaw.slack_mm : undefined,
      color: typeof wireRaw.color === 'string' ? wireRaw.color : undefined,
      gauge: typeof wireRaw.gauge === 'string' ? wireRaw.gauge : undefined,
      material: typeof wireRaw.material === 'string' ? wireRaw.material : undefined,
      terminalPartNumber:
        typeof wireRaw.terminal_part_number === 'string' ? wireRaw.terminal_part_number : undefined,
      notes: typeof wireRaw.notes === 'string' ? wireRaw.notes : undefined
    };
  }

  return wires;
}

function validateReferences(document: HarnessDocument): void {
  const nodeIds = new Set<string>([
    ...Object.keys(document.connectors),
    ...Object.keys(document.branches),
    ...Object.keys(document.splices)
  ]);

  const segmentIds = new Set<string>(Object.keys(document.segments));

  for (const [segmentId, segment] of Object.entries(document.segments)) {
    if (!nodeIds.has(segment.from)) {
      throw new Error(`Segment ${segmentId} references missing from node: ${segment.from}.`);
    }
    if (!nodeIds.has(segment.to)) {
      throw new Error(`Segment ${segmentId} references missing to node: ${segment.to}.`);
    }
  }

  for (const [wireId, wire] of Object.entries(document.wires)) {
    const fromConnector = document.connectors[wire.from.connectorId];
    const toConnector = document.connectors[wire.to.connectorId];

    if (!fromConnector) {
      throw new Error(`Wire ${wireId} references missing connector in from: ${wire.from.connectorId}.`);
    }
    if (!toConnector) {
      throw new Error(`Wire ${wireId} references missing connector in to: ${wire.to.connectorId}.`);
    }
    if (!fromConnector.pins[wire.from.pinId]) {
      throw new Error(`Wire ${wireId} references missing from pin: ${wire.from.connectorId}:${wire.from.pinId}.`);
    }
    if (!toConnector.pins[wire.to.pinId]) {
      throw new Error(`Wire ${wireId} references missing to pin: ${wire.to.connectorId}:${wire.to.pinId}.`);
    }

    for (const routeSegmentId of wire.route) {
      if (!segmentIds.has(routeSegmentId)) {
        throw new Error(`Wire ${wireId} references missing route segment: ${routeSegmentId}.`);
      }
    }
  }
}

export function exportHarnessToToml(document: HarnessDocument): string {
  const tomlDocument = {
    version: document.version,
    units: document.units,
    name: document.name,
    drawing_type: document.drawingType,
    board: {
      width: document.board.width,
      height: document.board.height,
      grid: document.board.grid,
      origin: document.board.origin
    },
    connectors: Object.fromEntries(
      Object.entries(document.connectors).map(([connectorId, connector]) => [
        connectorId,
        {
          id: connector.id,
          kind: connector.kind,
          part_number: connector.partNumber,
          description: connector.description,
          position: connector.position,
          rotation_deg: connector.rotationDeg,
          side: connector.side,
          pins: Object.fromEntries(
            Object.entries(connector.pins).map(([pinId, pin]) => [
              pinId,
              {
                signal: pin.signal,
                terminal_part_number: pin.terminalPartNumber,
                cavity_label: pin.cavityLabel
              }
            ])
          )
        }
      ])
    ),
    branches: Object.fromEntries(
      Object.entries(document.branches).map(([branchId, branch]) => [
        branchId,
        {
          id: branch.id,
          kind: branch.kind,
          position: branch.position
        }
      ])
    ),
    splices: Object.fromEntries(
      Object.entries(document.splices).map(([spliceId, splice]) => [
        spliceId,
        {
          id: splice.id,
          kind: splice.kind,
          part_number: splice.partNumber,
          position: splice.position
        }
      ])
    ),
    segments: Object.fromEntries(
      Object.entries(document.segments).map(([segmentId, segment]) => [
        segmentId,
        {
          id: segment.id,
          from: segment.from,
          to: segment.to,
          path: segment.path,
          geometry: segment.geometry,
          nominal_length_mm: segment.nominalLengthMm,
          bundle_diameter_mm: segment.bundleDiameterMm
        }
      ])
    ),
    wires: Object.values(document.wires).map((wire) => ({
      id: wire.id,
      from: formatPinRef(wire.from),
      to: formatPinRef(wire.to),
      route: wire.route,
      slack_mm: wire.slackMm,
      color: wire.color,
      gauge: wire.gauge,
      material: wire.material,
      terminal_part_number: wire.terminalPartNumber,
      notes: wire.notes
    }))
  };

  return stringifyToml(tomlDocument).trimEnd() + '\n';
}

export function importHarnessFromToml(text: string): HarnessDocument {
  const parsed = parseToml(text) as TomlHarnessDocument;

  const version = expectString(parsed.version, 'version');
  const units = expectString(parsed.units, 'units');
  const name = expectString(parsed.name, 'name');
  const drawingType = expectString(parsed.drawing_type, 'drawing_type');

  const document: HarnessDocument = {
    version: version as HarnessDocument['version'],
    units: units as HarnessDocument['units'],
    name,
    drawingType: drawingType as HarnessDocument['drawingType'],
    board: parseBoard(parsed.board),
    connectors: parseConnectors(parsed.connectors),
    branches: parseBranches(parsed.branches),
    splices: parseSplices(parsed.splices),
    segments: parseSegments(parsed.segments),
    wires: parseWires(parsed.wires)
  };

  validateReferences(document);
  return document;
}
