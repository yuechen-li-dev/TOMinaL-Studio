import { useMemo, useState } from 'react';
import type { Edge, Node } from '@xyflow/react';

import { AppShell } from '@/app/layout/AppShell';
import { buildSampleGraph } from '@/flow/sampleGraph';
import type { TominalEdgeData, TominalNodeData } from '@/flow/flowTypes';

export type SelectionState =
  | { type: 'node'; item: Node<TominalNodeData> }
  | { type: 'edge'; item: Edge<TominalEdgeData> }
  | null;

function App() {
  const initial = useMemo(() => buildSampleGraph(), []);
  const [selection, setSelection] = useState<SelectionState>(null);

  return (
    <div className="h-screen bg-background text-foreground">
      <AppShell
        initialNodes={initial.nodes}
        initialEdges={initial.edges}
        selection={selection}
        onSelectionChange={setSelection}
      />
    </div>
  );
}

export default App;
