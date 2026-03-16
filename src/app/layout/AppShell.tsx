import { useMemo } from 'react';

import type { SelectionState } from '@/app/App';
import { LeftSidebar } from '@/app/layout/LeftSidebar';
import { RightInspector } from '@/app/layout/RightInspector';
import { TopBar } from '@/app/layout/TopBar';
import { addBranch, addConnector, addSegment, addSplice, moveNode, updateSegment } from '@/core/harnessMutations';
import type { HarnessDocument, XY } from '@/core/harnessModel';
import { toFlowEdges, toFlowNodes } from '@/core/graphAdapter';
import { countNodes, countSegments } from '@/core/harnessSelectors';
import { FlowCanvas } from '@/flow/FlowCanvas';
import type { TominalNodeKind } from '@/flow/flowTypes';

type AppShellProps = {
  document: HarnessDocument;
  onDocumentChange: React.Dispatch<React.SetStateAction<HarnessDocument>>;
  selection: SelectionState;
  onSelectionChange: (selection: SelectionState) => void;
};

const getNewNodePosition = (index: number): XY => [120 + (index % 4) * 140, 120 + Math.floor(index / 4) * 120];

export function AppShell({ document, onDocumentChange, selection, onSelectionChange }: AppShellProps) {
  const nodes = useMemo(() => toFlowNodes(document), [document]);
  const segments = useMemo(() => toFlowEdges(document), [document]);

  const summary = useMemo(
    () => ({
      nodeCount: countNodes(document),
      edgeCount: countSegments(document)
    }),
    [document]
  );

  const handleAddNode = (kind: TominalNodeKind) => {
    const nextIndex = countNodes(document) + 1;
    const position = getNewNodePosition(nextIndex);

    onDocumentChange((current) => {
      if (kind === 'connector') {
        return addConnector(current, { position });
      }
      if (kind === 'branch') {
        return addBranch(current, { position });
      }
      return addSplice(current, { position });
    });
  };

  const canCreateSegment = selection.selectedNodeIds.length === 2;

  const handleCreateSegment = () => {
    if (!canCreateSegment) {
      return;
    }

    const [from, to] = selection.selectedNodeIds;
    onDocumentChange((current) => addSegment(current, { from, to, geometry: 'spline' }));
  };

  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <div className="grid min-h-0 flex-1 grid-cols-[280px_1fr_320px] gap-3 p-3">
        <LeftSidebar
          summary={summary}
          onAddNode={handleAddNode}
          onCreateSegment={handleCreateSegment}
          canCreateSegment={canCreateSegment}
        />
        <FlowCanvas
          nodes={nodes}
          segments={segments}
          onMoveNode={(nodeId, position) => onDocumentChange((current) => moveNode(current, nodeId, position))}
          onSelectionChange={onSelectionChange}
        />
        <RightInspector
          document={document}
          selection={selection}
          onSegmentNominalLengthChange={(segmentId, nominalLengthMm) =>
            onDocumentChange((current) => updateSegment(current, segmentId, { nominalLengthMm }))
          }
        />
      </div>
    </div>
  );
}
