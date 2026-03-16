import { useState } from 'react';

import { AppShell } from '@/app/layout/AppShell';
import { createSampleHarnessDocument, type HarnessDocument } from '@/core/harnessModel';

export type SelectionState = {
  selectedNodeIds: string[];
  selectedSegmentIds: string[];
};

function App() {
  const [document, setDocument] = useState<HarnessDocument>(() => createSampleHarnessDocument());
  const [selection, setSelection] = useState<SelectionState>({ selectedNodeIds: [], selectedSegmentIds: [] });

  return (
    <div className="h-screen bg-background text-foreground">
      <AppShell document={document} onDocumentChange={setDocument} selection={selection} onSelectionChange={setSelection} />
    </div>
  );
}

export default App;
