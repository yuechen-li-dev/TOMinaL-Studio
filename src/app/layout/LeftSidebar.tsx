import { GitBranchPlus, PlusCircle, Split } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { TominalNodeKind } from '@/flow/flowTypes';

type LeftSidebarProps = {
  summary: {
    nodeCount: number;
    edgeCount: number;
  };
  onAddNode: (kind: TominalNodeKind) => void;
};

export function LeftSidebar({ summary, onAddNode }: LeftSidebarProps) {
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
      </div>

      <div className="mt-8 space-y-2 rounded-lg border border-border/70 bg-muted/30 p-3">
        <h3 className="text-sm font-medium">Document Summary</h3>
        <p className="text-sm text-muted-foreground">Name: Tominal Demo</p>
        <p className="text-sm text-muted-foreground">Nodes: {summary.nodeCount}</p>
        <p className="text-sm text-muted-foreground">Segments: {summary.edgeCount}</p>
      </div>
    </aside>
  );
}
