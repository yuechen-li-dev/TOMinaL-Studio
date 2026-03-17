import { Button } from '@/components/ui/button';

type CatalogSectionProps = {
  title: string;
  description: string;
  actionLabel: string;
};

function CatalogSection({ title, description, actionLabel }: CatalogSectionProps) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <Button type="button" variant="outline" size="sm">
          {actionLabel}
        </Button>
      </div>
      <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
        {description}
      </div>
    </section>
  );
}

export function MaterialCatalogView() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
        <CatalogSection
          title="Connector Housing"
          description="No connector housings yet. Add housing definitions to begin building the catalog."
          actionLabel="Add Housing"
        />
        <CatalogSection
          title="Standalone Terminals"
          description="No standalone terminals yet. Add terminal entries to start your terminal catalog."
          actionLabel="Add Terminal"
        />
        <CatalogSection
          title="Wire Types"
          description="No wire types yet. Add wire type records for reusable wire specifications."
          actionLabel="Add Wire Type"
        />
        <CatalogSection
          title="Accessory Materials"
          description="No accessory materials yet. Add consumables and support materials here."
          actionLabel="Add Accessory"
        />
      </div>
    </div>
  );
}
