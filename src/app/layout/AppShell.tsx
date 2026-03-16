import { useMemo, useState } from 'react';

import type { SelectionState, UiState } from '@/app/App';
import { LeftSidebar } from '@/app/layout/LeftSidebar';
import { RightInspector } from '@/app/layout/RightInspector';
import { TopBar } from '@/app/layout/TopBar';
import {
  addBranch,
  addConnector,
  addSegment,
  addSplice,
  addWire,
  deleteWire,
  moveNode,
  setConnectorPinCount,
  updateConnector,
  updateConnectorPin,
  updateSegment,
  updateWire
} from '@/core/harnessMutations';
import type { ConnectorPin, HarnessDocument, XY } from '@/core/harnessModel';
import { generateWiresFromSignals, type WireGenerationReport } from '@/core/wireGeneration';
import { toFlowEdges, toFlowNodes } from '@/core/graphAdapter';
import { countNodes, countSegments, countWires } from '@/core/harnessSelectors';
import { FlowCanvas } from '@/flow/FlowCanvas';
import type { TominalNodeKind } from '@/flow/flowTypes';

type AppShellProps = {
  document: HarnessDocument;
  onDocumentChange: React.Dispatch<React.SetStateAction<HarnessDocument>>;
  uiState: UiState;
  onUiStateChange: React.Dispatch<React.SetStateAction<UiState>>;
  selection: SelectionState;
  onSelectionChange: (selection: SelectionState) => void;
};

const getNewNodePosition = (index: number): XY => [120 + (index % 4) * 140, 120 + Math.floor(index / 4) * 120];

export function AppShell({
  document,
  onDocumentChange,
  uiState,
  onUiStateChange,
  selection,
  onSelectionChange
}: AppShellProps) {
  const [wireGenerationReport, setWireGenerationReport] = useState<WireGenerationReport | null>(null);

  const connectorCallbacks = useMemo(
    () => ({
      onToggleCollapse: (connectorId: string) => {
        onUiStateChange((current) => ({
          ...current,
          collapsedConnectorIds: {
            ...current.collapsedConnectorIds,
            [connectorId]: !(current.collapsedConnectorIds[connectorId] ?? true)
          }
        }));
      },
      onPartNumberChange: (connectorId: string, partNumber: string) => {
        onDocumentChange((current) => updateConnector(current, connectorId, { partNumber: partNumber || undefined }));
      },
      onPinCountChange: (connectorId: string, pinCount: number) => {
        onDocumentChange((current) => setConnectorPinCount(current, connectorId, pinCount));
      },
      onPinChange: (connectorId: string, pinId: string, patch: Partial<ConnectorPin>) => {
        onDocumentChange((current) => updateConnectorPin(current, connectorId, pinId, patch));
      }
    }),
    [onDocumentChange, onUiStateChange]
  );

  const nodes = useMemo(
    () =>
      toFlowNodes(document, {
        collapsedConnectorIds: uiState.collapsedConnectorIds,
        connectorCallbacks
      }),
    [connectorCallbacks, document, uiState.collapsedConnectorIds]
  );
  const segments = useMemo(() => toFlowEdges(document), [document]);

  const summary = useMemo(
    () => ({
      nodeCount: countNodes(document),
      edgeCount: countSegments(document),
      wireCount: countWires(document)
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

  const handleGenerateWiresFromSignals = () => {
    onDocumentChange((current) => {
      const { document: nextDocument, report } = generateWiresFromSignals(current);
      setWireGenerationReport(report);
      return nextDocument;
    });
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
          onGenerateWiresFromSignals={handleGenerateWiresFromSignals}
          wireGenerationReport={wireGenerationReport}
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
          onSelectionChange={onSelectionChange}
          onSegmentNominalLengthChange={(segmentId, nominalLengthMm) =>
            onDocumentChange((current) => updateSegment(current, segmentId, { nominalLengthMm }))
          }
          onWireAdd={() => {
            const connectorIds = Object.keys(document.connectors);
            if (connectorIds.length === 0) {
              return;
            }

            const fromConnectorId = connectorIds[0];
            const toConnectorId = connectorIds[1] ?? connectorIds[0];
            const fromPinId = Object.keys(document.connectors[fromConnectorId].pins)[0];
            const toPinId = Object.keys(document.connectors[toConnectorId].pins)[0];
            const defaultRoute = Object.keys(document.segments).slice(0, 2);

            if (!fromPinId || !toPinId) {
              return;
            }

            onDocumentChange((current) => {
              const next = addWire(current, {
                from: { connectorId: fromConnectorId, pinId: fromPinId },
                to: { connectorId: toConnectorId, pinId: toPinId },
                route: defaultRoute
              });

              const wireIds = Object.keys(next.wires);
              const newestWireId = wireIds[wireIds.length - 1];
              if (newestWireId) {
                onSelectionChange({ selectedNodeIds: [], selectedSegmentIds: [], selectedWireIds: [newestWireId] });
              }

              return next;
            });
          }}
          onWireDelete={(wireId) => {
            onDocumentChange((current) => deleteWire(current, wireId));
            onSelectionChange({ selectedNodeIds: [], selectedSegmentIds: [], selectedWireIds: [] });
          }}
          onWireChange={(wireId, patch) => onDocumentChange((current) => updateWire(current, wireId, patch))}
        />
      </div>
    </div>
  );
}
