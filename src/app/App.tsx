import { useState } from 'react';

import { AppShell } from '@/app/layout/AppShell';
import { createSampleHarnessDocument, type HarnessDocument } from '@/core/harnessModel';

export type SelectionState = {
  selectedNodeIds: string[];
  selectedSegmentIds: string[];
};

export type UiState = {
  collapsedConnectorIds: Record<string, boolean>;
};

function App() {
  const [document, setDocument] = useState<HarnessDocument>(() => createSampleHarnessDocument());
  const [selection, setSelection] = useState<SelectionState>({ selectedNodeIds: [], selectedSegmentIds: [] });
  const [uiState, setUiState] = useState<UiState>({ collapsedConnectorIds: {} });

  return (
    <div className="h-screen bg-background text-foreground">
      <AppShell
        document={document}
        onDocumentChange={setDocument}
        onUiStateChange={setUiState}
        selection={selection}
        uiState={uiState}
        onSelectionChange={setSelection}
      />
    </div>
  );
}

export default App;
