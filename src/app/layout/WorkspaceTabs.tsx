import { Button } from '@/components/ui/button';

type WorkspaceTab = 'graph' | 'material-catalog';

type WorkspaceTabsProps = {
  selectedTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
};

const tabs: Array<{ id: WorkspaceTab; label: string }> = [
  { id: 'graph', label: 'Graph' },
  { id: 'material-catalog', label: 'Material Catalog' }
];

export function WorkspaceTabs({ selectedTab, onTabChange }: WorkspaceTabsProps) {
  return (
    <div className="border-b border-border bg-muted/30 px-3 py-2">
      <div className="flex items-center gap-2">
        {tabs.map((tab) => {
          const isActive = tab.id === selectedTab;
          return (
            <Button
              key={tab.id}
              type="button"
              size="sm"
              variant={isActive ? 'secondary' : 'ghost'}
              aria-pressed={isActive}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export type { WorkspaceTab };
