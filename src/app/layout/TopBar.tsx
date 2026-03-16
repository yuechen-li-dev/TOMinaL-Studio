import { useRef } from 'react';
import { Download, Upload } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type TopBarProps = {
  onImport: (file: File) => void;
  onExport: () => void;
};

export function TopBar({ onImport, onExport }: TopBarProps) {
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    onImport(file);
    event.currentTarget.value = '';
  };

  return (
    <header className="border-b border-border/70 bg-card/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight">Tominal</h1>
          <Badge variant="secondary">M6</Badge>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".toml,text/toml"
            className="hidden"
            onChange={handleImportFileChange}
          />
          <Button size="sm" variant="outline" onClick={handleImportClick}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button size="sm" variant="outline" onClick={onExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
    </header>
  );
}
