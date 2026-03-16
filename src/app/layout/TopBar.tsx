import { Download, Upload } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function TopBar() {
  return (
    <header className="border-b border-border/70 bg-card/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight">Tominal</h1>
          <Badge variant="secondary">M0</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled>
            <Upload className="mr-2 h-4 w-4" />
            Import (soon)
          </Button>
          <Button size="sm" variant="outline" disabled>
            <Download className="mr-2 h-4 w-4" />
            Export (soon)
          </Button>
        </div>
      </div>
    </header>
  );
}
