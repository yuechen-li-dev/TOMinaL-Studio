import type {
  Branch,
  Connector,
  HarnessDocument,
  Segment,
  SegmentGeometry,
  Splice,
  XY
} from '@/core/harnessModel';
import { getAllNodeIds, getNodeById } from '@/core/harnessSelectors';

type AddSegmentArgs = {
  id?: string;
  from: string;
  to: string;
  path?: XY[];
  geometry?: SegmentGeometry;
  nominalLengthMm?: number;
  bundleDiameterMm?: number;
};

const defaultNodePosition: XY = [200, 200];

function nextId(existingIds: string[], prefix: string): string {
  const values = existingIds
    .map((id) => {
      const match = id.match(new RegExp(`^${prefix}_(\\d+)$`));
      return match ? Number.parseInt(match[1], 10) : 0;
    })
    .filter((value) => Number.isFinite(value));

  const next = values.length > 0 ? Math.max(...values) + 1 : 1;
  return `${prefix}_${next}`;
}

function assertNodeExists(doc: HarnessDocument, nodeId: string): void {
  if (!getNodeById(doc, nodeId)) {
    throw new Error(`Unknown node id: ${nodeId}`);
  }
}

function withSegmentDefaults(segment: Segment): Segment {
  return {
    ...segment,
    geometry: segment.geometry ?? 'spline'
  };
}

export function addConnector(doc: HarnessDocument, partial: Partial<Connector> = {}): HarnessDocument {
  const id = partial.id ?? nextId(getAllNodeIds(doc), 'CONN');

  if (getNodeById(doc, id)) {
    throw new Error(`Node id already exists: ${id}`);
  }

  const connector: Connector = {
    id,
    position: partial.position ?? defaultNodePosition,
    pins: partial.pins ?? {},
    ...partial
  };

  return {
    ...doc,
    connectors: {
      ...doc.connectors,
      [id]: connector
    }
  };
}

export function addBranch(doc: HarnessDocument, partial: Partial<Branch> = {}): HarnessDocument {
  const id = partial.id ?? nextId(getAllNodeIds(doc), 'BR');

  if (getNodeById(doc, id)) {
    throw new Error(`Node id already exists: ${id}`);
  }

  const branch: Branch = {
    id,
    position: partial.position ?? defaultNodePosition,
    ...partial
  };

  return {
    ...doc,
    branches: {
      ...doc.branches,
      [id]: branch
    }
  };
}

export function addSplice(doc: HarnessDocument, partial: Partial<Splice> = {}): HarnessDocument {
  const id = partial.id ?? nextId(getAllNodeIds(doc), 'SP');

  if (getNodeById(doc, id)) {
    throw new Error(`Node id already exists: ${id}`);
  }

  const splice: Splice = {
    id,
    position: partial.position ?? defaultNodePosition,
    ...partial
  };

  return {
    ...doc,
    splices: {
      ...doc.splices,
      [id]: splice
    }
  };
}

export function addSegment(doc: HarnessDocument, args: AddSegmentArgs): HarnessDocument {
  const id = args.id ?? nextId(Object.keys(doc.segments), 'SEG');

  if (doc.segments[id]) {
    throw new Error(`Segment id already exists: ${id}`);
  }

  assertNodeExists(doc, args.from);
  assertNodeExists(doc, args.to);

  const fromNode = getNodeById(doc, args.from)!;
  const toNode = getNodeById(doc, args.to)!;

  const segment: Segment = withSegmentDefaults({
    id,
    from: args.from,
    to: args.to,
    path: args.path ?? [fromNode.position, toNode.position],
    geometry: args.geometry,
    nominalLengthMm: args.nominalLengthMm,
    bundleDiameterMm: args.bundleDiameterMm
  });

  return {
    ...doc,
    segments: {
      ...doc.segments,
      [id]: segment
    }
  };
}

export function moveNode(doc: HarnessDocument, nodeId: string, position: XY): HarnessDocument {
  if (doc.connectors[nodeId]) {
    return {
      ...doc,
      connectors: {
        ...doc.connectors,
        [nodeId]: {
          ...doc.connectors[nodeId],
          position
        }
      }
    };
  }

  if (doc.branches[nodeId]) {
    return {
      ...doc,
      branches: {
        ...doc.branches,
        [nodeId]: {
          ...doc.branches[nodeId],
          position
        }
      }
    };
  }

  if (doc.splices[nodeId]) {
    return {
      ...doc,
      splices: {
        ...doc.splices,
        [nodeId]: {
          ...doc.splices[nodeId],
          position
        }
      }
    };
  }

  return doc;
}

export function deleteNode(doc: HarnessDocument, nodeId: string): HarnessDocument {
  if (!getNodeById(doc, nodeId)) {
    return doc;
  }

  const { [nodeId]: connectorRemoved, ...connectors } = doc.connectors;
  const { [nodeId]: branchRemoved, ...branches } = doc.branches;
  const { [nodeId]: spliceRemoved, ...splices } = doc.splices;

  void connectorRemoved;
  void branchRemoved;
  void spliceRemoved;

  const segments = Object.fromEntries(
    Object.entries(doc.segments).filter(([, segment]) => segment.from !== nodeId && segment.to !== nodeId)
  );

  return {
    ...doc,
    connectors,
    branches,
    splices,
    segments
  };
}

export function deleteSegment(doc: HarnessDocument, segmentId: string): HarnessDocument {
  if (!doc.segments[segmentId]) {
    return doc;
  }

  const { [segmentId]: removed, ...segments } = doc.segments;
  void removed;

  return {
    ...doc,
    segments
  };
}

export function updateConnector(doc: HarnessDocument, id: string, patch: Partial<Connector>): HarnessDocument {
  if (!doc.connectors[id]) {
    return doc;
  }

  return {
    ...doc,
    connectors: {
      ...doc.connectors,
      [id]: {
        ...doc.connectors[id],
        ...patch,
        id
      }
    }
  };
}

export function updateBranch(doc: HarnessDocument, id: string, patch: Partial<Branch>): HarnessDocument {
  if (!doc.branches[id]) {
    return doc;
  }

  return {
    ...doc,
    branches: {
      ...doc.branches,
      [id]: {
        ...doc.branches[id],
        ...patch,
        id
      }
    }
  };
}

export function updateSplice(doc: HarnessDocument, id: string, patch: Partial<Splice>): HarnessDocument {
  if (!doc.splices[id]) {
    return doc;
  }

  return {
    ...doc,
    splices: {
      ...doc.splices,
      [id]: {
        ...doc.splices[id],
        ...patch,
        id
      }
    }
  };
}

export function updateSegment(doc: HarnessDocument, id: string, patch: Partial<Segment>): HarnessDocument {
  const segment = doc.segments[id];
  if (!segment) {
    return doc;
  }

  const next = withSegmentDefaults({
    ...segment,
    ...patch,
    id
  });

  assertNodeExists(doc, next.from);
  assertNodeExists(doc, next.to);

  return {
    ...doc,
    segments: {
      ...doc.segments,
      [id]: next
    }
  };
}
