import type { Branch, Connector, HarnessDocument, Segment, Splice } from '@/core/harnessModel';

export type HarnessNode = Connector | Branch | Splice;

export function getNodeById(doc: HarnessDocument, nodeId: string): HarnessNode | undefined {
  return doc.connectors[nodeId] ?? doc.branches[nodeId] ?? doc.splices[nodeId];
}

export function getNodeKind(doc: HarnessDocument, nodeId: string): 'connector' | 'branch' | 'splice' | undefined {
  if (doc.connectors[nodeId]) {
    return 'connector';
  }
  if (doc.branches[nodeId]) {
    return 'branch';
  }
  if (doc.splices[nodeId]) {
    return 'splice';
  }

  return undefined;
}

export function getAllNodeIds(doc: HarnessDocument): string[] {
  return [...Object.keys(doc.connectors), ...Object.keys(doc.branches), ...Object.keys(doc.splices)];
}

export function getSegmentById(doc: HarnessDocument, segmentId: string): Segment | undefined {
  return doc.segments[segmentId];
}

export function countNodes(doc: HarnessDocument): number {
  return Object.keys(doc.connectors).length + Object.keys(doc.branches).length + Object.keys(doc.splices).length;
}

export function countSegments(doc: HarnessDocument): number {
  return Object.keys(doc.segments).length;
}
