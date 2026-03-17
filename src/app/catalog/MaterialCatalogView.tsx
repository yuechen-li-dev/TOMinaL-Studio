import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';

type ConnectorHousingItem = {
  id: string;
  partNumber: string;
  manufacturer: string;
  description: string;
  family: string;
  cavityCount: number;
  notes: string;
};

type ConnectorHousingForm = {
  id: string;
  partNumber: string;
  manufacturer: string;
  description: string;
  family: string;
  cavityCount: string;
  notes: string;
};

type CatalogScaffoldSectionProps = {
  title: string;
  description: string;
  actionLabel: string;
};

const emptyHousingForm: ConnectorHousingForm = {
  id: '',
  partNumber: '',
  manufacturer: '',
  description: '',
  family: '',
  cavityCount: '',
  notes: ''
};

function CatalogScaffoldSection({ title, description, actionLabel }: CatalogScaffoldSectionProps) {
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

function mapHousingItemToForm(item: ConnectorHousingItem): ConnectorHousingForm {
  return {
    id: item.id,
    partNumber: item.partNumber,
    manufacturer: item.manufacturer,
    description: item.description,
    family: item.family,
    cavityCount: String(item.cavityCount),
    notes: item.notes
  };
}

function ConnectorHousingSection() {
  const [housingItems, setHousingItems] = useState<ConnectorHousingItem[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ConnectorHousingForm>(emptyHousingForm);

  const isEditing = editingItemId !== null;

  const primaryActionLabel = useMemo(() => {
    if (isEditing) {
      return 'Update Housing';
    }
    return 'Add Housing';
  }, [isEditing]);

  const handleDraftChange = <K extends keyof ConnectorHousingForm>(key: K, value: ConnectorHousingForm[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const resetEditor = () => {
    setEditingItemId(null);
    setDraft(emptyHousingForm);
  };

  const handleSaveHousing = () => {
    const cavityCount = Number.parseInt(draft.cavityCount, 10);
    if (!draft.id.trim() || !draft.partNumber.trim() || Number.isNaN(cavityCount)) {
      return;
    }

    const nextItem: ConnectorHousingItem = {
      id: draft.id.trim(),
      partNumber: draft.partNumber.trim(),
      manufacturer: draft.manufacturer.trim(),
      description: draft.description.trim(),
      family: draft.family.trim(),
      cavityCount,
      notes: draft.notes.trim()
    };

    setHousingItems((current) => {
      if (editingItemId === null) {
        return [...current, nextItem];
      }

      return current.map((item) => (item.id === editingItemId ? nextItem : item));
    });

    resetEditor();
  };

  const handleEditHousing = (item: ConnectorHousingItem) => {
    setEditingItemId(item.id);
    setDraft(mapHousingItemToForm(item));
  };

  const handleDeleteHousing = (itemId: string) => {
    setHousingItems((current) => current.filter((item) => item.id !== itemId));

    if (editingItemId === itemId) {
      resetEditor();
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Connector Housing</h2>
        <Button type="button" size="sm" onClick={() => resetEditor()}>
          Add Housing
        </Button>
      </div>

      <div className="grid gap-3 rounded-md border border-border p-3">
        <div className="grid gap-2 md:grid-cols-2">
          <label className="text-xs font-medium text-muted-foreground">
            ID
            <input
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
              value={draft.id}
              onChange={(event) => handleDraftChange('id', event.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Part Number
            <input
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
              value={draft.partNumber}
              onChange={(event) => handleDraftChange('partNumber', event.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Manufacturer
            <input
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
              value={draft.manufacturer}
              onChange={(event) => handleDraftChange('manufacturer', event.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Description
            <input
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
              value={draft.description}
              onChange={(event) => handleDraftChange('description', event.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Family
            <input
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
              value={draft.family}
              onChange={(event) => handleDraftChange('family', event.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Cavity Count
            <input
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
              type="number"
              min={1}
              value={draft.cavityCount}
              onChange={(event) => handleDraftChange('cavityCount', event.target.value)}
            />
          </label>
        </div>
        <label className="text-xs font-medium text-muted-foreground">
          Notes
          <textarea
            className="mt-1 min-h-16 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
            value={draft.notes}
            onChange={(event) => handleDraftChange('notes', event.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={handleSaveHousing}>
            {primaryActionLabel}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={resetEditor}>
            Clear
          </Button>
        </div>
      </div>

      {housingItems.length === 0 ? (
        <div className="mt-3 rounded-md border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
          No connector housings yet. Add housing definitions to begin building the catalog.
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="border-b border-border px-2 py-2 text-left font-medium">ID</th>
                <th className="border-b border-border px-2 py-2 text-left font-medium">Part Number</th>
                <th className="border-b border-border px-2 py-2 text-left font-medium">Manufacturer</th>
                <th className="border-b border-border px-2 py-2 text-left font-medium">Description</th>
                <th className="border-b border-border px-2 py-2 text-left font-medium">Family</th>
                <th className="border-b border-border px-2 py-2 text-left font-medium">Cavity Count</th>
                <th className="border-b border-border px-2 py-2 text-left font-medium">Notes</th>
                <th className="border-b border-border px-2 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {housingItems.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="border-b border-border px-2 py-2">{item.id}</td>
                  <td className="border-b border-border px-2 py-2">{item.partNumber}</td>
                  <td className="border-b border-border px-2 py-2">{item.manufacturer}</td>
                  <td className="border-b border-border px-2 py-2">{item.description}</td>
                  <td className="border-b border-border px-2 py-2">{item.family}</td>
                  <td className="border-b border-border px-2 py-2">{item.cavityCount}</td>
                  <td className="border-b border-border px-2 py-2">{item.notes}</td>
                  <td className="border-b border-border px-2 py-2">
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => handleEditHousing(item)}>
                        Edit
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleDeleteHousing(item.id)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function MaterialCatalogView() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
        <ConnectorHousingSection />
        <CatalogScaffoldSection
          title="Standalone Terminals"
          description="No standalone terminals yet. Add terminal entries to start your terminal catalog."
          actionLabel="Add Terminal"
        />
        <CatalogScaffoldSection
          title="Wire Types"
          description="No wire types yet. Add wire type records for reusable wire specifications."
          actionLabel="Add Wire Type"
        />
        <CatalogScaffoldSection
          title="Accessory Materials"
          description="No accessory materials yet. Add consumables and support materials here."
          actionLabel="Add Accessory"
        />
      </div>
    </div>
  );
}
