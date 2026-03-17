import { AlertCircle, CheckCircle2, CircleHelp, GitBranchPlus, PlusCircle, Split, WandSparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { GraphValidationResult } from '@/core/graphValidation';
import type { WireGenerationReport } from '@/core/wireGeneration';
import type { TominalNodeKind } from '@/flow/flowTypes';

type LeftSidebarProps = {
  summary: {
    nodeCount: number;
    edgeCount: number;
    wireCount: number;
  };
  onAddNode: (kind: TominalNodeKind) => void;
  onCreateSegment: () => void;
  canCreateSegment: boolean;
  onGenerateWiresFromSignals: () => void;
  wireGenerationReport: WireGenerationReport | null;
  validationSummary: { valid: number; unbound: number; invalid: number };
  validationHighlights: GraphValidationResult[];
};

export function LeftSidebar({
  summary,
  onAddNode,
  onCreateSegment,
  canCreateSegment,
  onGenerateWiresFromSignals,
  wireGenerationReport,
  validationSummary,
  validationHighlights
}: LeftSidebarProps) {
  return (
    <aside className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <h2 className="text-sm font-medium text-muted-foreground">Palette</h2>
      <div className="mt-3 grid gap-2">
        <Button className="justify-start" onClick={() => onAddNode('connector')} variant="secondary">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Connector
        </Button>
        <Button className="justify-start" onClick={() => onAddNode('branch')} variant="secondary">
          <GitBranchPlus className="mr-2 h-4 w-4" />
          Add Branch
        </Button>
        <Button className="justify-start" onClick={() => onAddNode('splice')} variant="secondary">
          <Split className="mr-2 h-4 w-4" />
          Add Splice
        </Button>
        <Button className="justify-start" disabled={!canCreateSegment} onClick={onCreateSegment} variant="secondary">
          Create Segment (2 selected nodes)
        </Button>
        <Button className="justify-start" onClick={onGenerateWiresFromSignals} variant="default">
          <WandSparkles className="mr-2 h-4 w-4" />
          Generate Wires From Signals
        </Button>
      </div>

      <div className="mt-8 space-y-2 rounded-lg border border-border/70 bg-muted/30 p-3">
        <h3 className="text-sm font-medium">Document Summary</h3>
        <p className="text-sm text-muted-foreground">Name: Tominal Demo</p>
        <p className="text-sm text-muted-foreground">Nodes: {summary.nodeCount}</p>
        <p className="text-sm text-muted-foreground">Segments: {summary.edgeCount}</p>
        <p className="text-sm text-muted-foreground">Wires: {summary.wireCount}</p>
      </div>


      <div className="mt-4 space-y-2 rounded-lg border border-border/70 bg-muted/30 p-3">
        <h3 className="text-sm font-medium">Validation Summary</h3>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Valid: {validationSummary.valid}
        </p>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <CircleHelp className="h-3.5 w-3.5 text-amber-500" /> Unbound: {validationSummary.unbound}
        </p>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5 text-destructive" /> Invalid: {validationSummary.invalid}
        </p>
        {validationHighlights.length > 0 ? (
          <ul className="space-y-1 pt-1 text-xs text-muted-foreground">
            {validationHighlights.map((item) => (
              <li key={`${item.rule}:${item.entityId}`} className="line-clamp-2">
                {item.message}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {wireGenerationReport ? (
        <div className="mt-4 space-y-1 rounded-lg border border-border/70 bg-muted/30 p-3">
          <h3 className="text-sm font-medium">Wire Generation Report</h3>
          <p className="text-xs text-muted-foreground">Signals indexed: {wireGenerationReport.indexedSignalCount}</p>
          <p className="text-xs text-muted-foreground">Wires generated: {wireGenerationReport.generatedWireCount}</p>
          <p className="text-xs text-muted-foreground">
            Skipped (non-pair): {wireGenerationReport.skippedNonPairSignals.length}
          </p>
          <p className="text-xs text-muted-foreground">
            Skipped (already connected): {wireGenerationReport.skippedAlreadyConnectedSignals.length}
          </p>
          <p className="text-xs text-muted-foreground">Skipped (no route): {wireGenerationReport.skippedNoRouteSignals.length}</p>
          <p className="text-xs text-muted-foreground">Ignored empty signal pins: {wireGenerationReport.ignoredEmptySignalPins}</p>
        </div>
      ) : null}
    </aside>
  );
}
