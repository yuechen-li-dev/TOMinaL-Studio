export type XY = [number, number];

export type Board = {
  width: number;
  height: number;
  grid: number;
  origin: XY;
};

export type ConnectorPin = {
  signal?: string;
  terminalPartNumber?: string;
  cavityLabel?: string;
};

export type Connector = {
  id: string;
  kind?: string;
  partNumber?: string;
  description?: string;
  position: XY;
  rotationDeg?: number;
  side?: string;
  pins: Record<string, ConnectorPin>;
};

export type Branch = {
  id: string;
  kind?: string;
  position: XY;
};

export type Splice = {
  id: string;
  kind?: string;
  partNumber?: string;
  position: XY;
};

export type SegmentGeometry = 'polyline' | 'spline';

export type Segment = {
  id: string;
  from: string;
  to: string;
  path: XY[];
  geometry?: SegmentGeometry;
  nominalLengthMm?: number;
  bundleDiameterMm?: number;
};

export type HarnessDocument = {
  version: '0.1';
  name: string;
  units: 'mm';
  drawingType: 'formboard';
  board: Board;
  connectors: Record<string, Connector>;
  branches: Record<string, Branch>;
  splices: Record<string, Splice>;
  segments: Record<string, Segment>;
};

export function createEmptyHarnessDocument(): HarnessDocument {
  return {
    version: '0.1',
    name: 'Untitled Harness',
    units: 'mm',
    drawingType: 'formboard',
    board: {
      width: 1600,
      height: 1000,
      grid: 20,
      origin: [0, 0]
    },
    connectors: {},
    branches: {},
    splices: {},
    segments: {}
  };
}

export function createSampleHarnessDocument(): HarnessDocument {
  return {
    ...createEmptyHarnessDocument(),
    name: 'Tominal Demo',
    connectors: {
      ECU_C1: {
        id: 'ECU_C1',
        kind: 'inline',
        partNumber: 'ECU-CONN-001',
        position: [120, 220],
        pins: {
          '1': { signal: 'IGN_SW', terminalPartNumber: 'TE-1123343-1' },
          '2': { signal: 'CAN_H', terminalPartNumber: 'TE-1123343-1' },
          '3': { signal: 'CAN_L', terminalPartNumber: 'TE-1123343-1' }
        }
      },
      CLUSTER_C1: {
        id: 'CLUSTER_C1',
        kind: 'inline',
        partNumber: 'CLUSTER-CONN-002',
        position: [660, 220],
        pins: {
          '1': { signal: 'CLUSTER_IGN', terminalPartNumber: 'MX150-33012' },
          '2': { signal: 'CAN_H', terminalPartNumber: 'MX150-33012' },
          '3': { signal: 'CAN_L' }
        }
      }
    },
    branches: {
      B1: {
        id: 'B1',
        kind: 'Y',
        position: [390, 210]
      }
    },
    splices: {
      S1: {
        id: 'S1',
        kind: 'sealed',
        partNumber: 'SPL-100',
        position: [420, 380]
      }
    },
    segments: {
      SEG_MAIN_LEFT: {
        id: 'SEG_MAIN_LEFT',
        from: 'ECU_C1',
        to: 'B1',
        path: [
          [120, 220],
          [390, 210]
        ],
        geometry: 'spline',
        nominalLengthMm: 320
      },
      SEG_MAIN_RIGHT: {
        id: 'SEG_MAIN_RIGHT',
        from: 'B1',
        to: 'CLUSTER_C1',
        path: [
          [390, 210],
          [660, 220]
        ],
        geometry: 'spline',
        nominalLengthMm: 330
      },
      SEG_DROP_1: {
        id: 'SEG_DROP_1',
        from: 'B1',
        to: 'S1',
        path: [
          [390, 210],
          [420, 380]
        ],
        geometry: 'spline',
        nominalLengthMm: 200
      }
    }
  };
}
