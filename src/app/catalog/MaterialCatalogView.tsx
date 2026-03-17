import { Fragment, useEffect, useMemo, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';

import {
  validateAccessoryMaterial,
  validateConnectorHousing,
  validateConnectorPlug,
  validateConnectorSeal,
  validateConnectorTerminal,
  validateRingTerminal,
  validateWireType
} from '@/catalog/validation';
import type { MaterialCatalogData } from '@/catalog/catalogData';
import { exportCatalogToToml, importCatalogAdditive } from '@/catalog/catalogManifestCodec';
import { Button } from '@/components/ui/button';

type ConnectorTerminalItem = {
  id: string;
  partNumber: string;
  description: string;
  compatibleWireGauge: string;
  crimpToolPartNumber: string;
  notes: string;
};

type ConnectorSealItem = {
  id: string;
  partNumber: string;
  description: string;
  notes: string;
};

type ConnectorPlugItem = {
  id: string;
  partNumber: string;
  description: string;
  notes: string;
};

type ConnectorHousingItem = {
  id: string;
  partNumber: string;
  manufacturer: string;
  description: string;
  family: string;
  cavityCount: number;
  notes: string;
  terminals: ConnectorTerminalItem[];
  seals: ConnectorSealItem[];
  plugs: ConnectorPlugItem[];
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

type ConnectorTerminalForm = {
  id: string;
  partNumber: string;
  description: string;
  compatibleWireGauge: string;
  crimpToolPartNumber: string;
  notes: string;
};

type ConnectorSealForm = {
  id: string;
  partNumber: string;
  description: string;
  notes: string;
};

type ConnectorPlugForm = {
  id: string;
  partNumber: string;
  description: string;
  notes: string;
};

type RingTerminalItem = {
  id: string;
  partNumber: string;
  manufacturer: string;
  description: string;
  compatibleWireGauge: string;
  crimpToolPartNumber: string;
  studSize: string;
  notes: string;
};

type RingTerminalForm = {
  id: string;
  partNumber: string;
  manufacturer: string;
  description: string;
  compatibleWireGauge: string;
  crimpToolPartNumber: string;
  studSize: string;
  notes: string;
};

type WireTypeItem = {
  id: string;
  partNumber: string;
  manufacturer: string;
  description: string;
  gauge: string;
  insulationType: string;
  notes: string;
};

type WireTypeForm = {
  id: string;
  partNumber: string;
  manufacturer: string;
  description: string;
  gauge: string;
  insulationType: string;
  notes: string;
};

type AccessoryMaterialItem = {
  id: string;
  partNumber: string;
  manufacturer: string;
  description: string;
  category: string;
  notes: string;
};

type AccessoryMaterialForm = {
  id: string;
  partNumber: string;
  manufacturer: string;
  description: string;
  category: string;
  notes: string;
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

const emptyTerminalForm: ConnectorTerminalForm = {
  id: '',
  partNumber: '',
  description: '',
  compatibleWireGauge: '',
  crimpToolPartNumber: '',
  notes: ''
};

const emptySealForm: ConnectorSealForm = {
  id: '',
  partNumber: '',
  description: '',
  notes: ''
};

const emptyPlugForm: ConnectorPlugForm = {
  id: '',
  partNumber: '',
  description: '',
  notes: ''
};

const emptyRingTerminalForm: RingTerminalForm = {
  id: '',
  partNumber: '',
  manufacturer: '',
  description: '',
  compatibleWireGauge: '',
  crimpToolPartNumber: '',
  studSize: '',
  notes: ''
};

const emptyWireTypeForm: WireTypeForm = {
  id: '',
  partNumber: '',
  manufacturer: '',
  description: '',
  gauge: '',
  insulationType: '',
  notes: ''
};

const emptyAccessoryMaterialForm: AccessoryMaterialForm = {
  id: '',
  partNumber: '',
  manufacturer: '',
  description: '',
  category: '',
  notes: ''
};

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

function mapRingTerminalItemToForm(item: RingTerminalItem): RingTerminalForm {
  return {
    id: item.id,
    partNumber: item.partNumber,
    manufacturer: item.manufacturer,
    description: item.description,
    compatibleWireGauge: item.compatibleWireGauge,
    crimpToolPartNumber: item.crimpToolPartNumber,
    studSize: item.studSize,
    notes: item.notes
  };
}

function mapWireTypeItemToForm(item: WireTypeItem): WireTypeForm {
  return {
    id: item.id,
    partNumber: item.partNumber,
    manufacturer: item.manufacturer,
    description: item.description,
    gauge: item.gauge,
    insulationType: item.insulationType,
    notes: item.notes ?? ''
  };
}

function mapAccessoryMaterialItemToForm(item: AccessoryMaterialItem): AccessoryMaterialForm {
  return {
    id: item.id,
    partNumber: item.partNumber,
    manufacturer: item.manufacturer,
    description: item.description,
    category: item.category,
    notes: item.notes ?? ''
  };
}

function formatValidationErrors(errors: string[]): string {
  return errors.join(' · ');
}

function AccessoryMaterialsSection({
  accessoryItems,
  onAccessoryItemsChange
}: {
  accessoryItems: AccessoryMaterialItem[];
  onAccessoryItemsChange: Dispatch<SetStateAction<AccessoryMaterialItem[]>>;
}) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AccessoryMaterialForm>(emptyAccessoryMaterialForm);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isEditing = editingItemId !== null;

  const handleDraftChange = <K extends keyof AccessoryMaterialForm>(key: K, value: AccessoryMaterialForm[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const resetEditor = () => {
    setEditingItemId(null);
    setDraft(emptyAccessoryMaterialForm);
    setValidationError(null);
  };

  const handleSave = () => {
    const notes = draft.notes.trim();

    const validationResult = validateAccessoryMaterial({
      id: draft.id,
      partNumber: draft.partNumber,
      manufacturer: draft.manufacturer,
      description: draft.description,
      category: draft.category,
      notes
    });

    if (!validationResult.success) {
      setValidationError(formatValidationErrors(validationResult.errors));
      return;
    }

    setValidationError(null);
    const nextItem: AccessoryMaterialItem = {
      ...validationResult.data,
      notes: validationResult.data.notes ?? ''
    };

    onAccessoryItemsChange((current) => {
      if (editingItemId === null) {
        return [...current, nextItem];
      }

      return current.map((item) => (item.id === editingItemId ? nextItem : item));
    });

    resetEditor();
  };

  const handleEdit = (item: AccessoryMaterialItem) => {
    setEditingItemId(item.id);
    setDraft(mapAccessoryMaterialItemToForm(item));
    setValidationError(null);
  };

  const handleDelete = (itemId: string) => {
    onAccessoryItemsChange((current) => current.filter((item) => item.id !== itemId));

    if (editingItemId === itemId) {
      resetEditor();
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Accessory Materials</h2>
        <Button type="button" size="sm" onClick={resetEditor}>
          Add Accessory
        </Button>
      </div>

      <div className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-2">
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
        <label className="text-xs font-medium text-muted-foreground md:col-span-2">
          Category
          <input
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
            value={draft.category}
            onChange={(event) => handleDraftChange('category', event.target.value)}
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground md:col-span-2">
          Notes
          <textarea
            className="mt-1 min-h-16 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
            value={draft.notes}
            onChange={(event) => handleDraftChange('notes', event.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <Button type="button" size="sm" onClick={handleSave}>
            {isEditing ? 'Update Accessory' : 'Add Accessory'}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={resetEditor}>
            Clear
          </Button>
        </div>
        {validationError ? <p className="text-xs text-destructive md:col-span-2">{validationError}</p> : null}
      </div>

      {accessoryItems.length === 0 ? (
        <div className="mt-3 rounded-md border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
          No accessory materials yet. Add accessory entries to build this catalog section.
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[920px] border-collapse text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="border-b border-border px-2 py-1 text-left font-medium">ID</th>
                <th className="border-b border-border px-2 py-1 text-left font-medium">Part Number</th>
                <th className="border-b border-border px-2 py-1 text-left font-medium">Manufacturer</th>
                <th className="border-b border-border px-2 py-1 text-left font-medium">Description</th>
                <th className="border-b border-border px-2 py-1 text-left font-medium">Category</th>
                <th className="border-b border-border px-2 py-1 text-left font-medium">Notes</th>
                <th className="border-b border-border px-2 py-1 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accessoryItems.map((item) => (
                <tr key={item.id}>
                  <td className="border-b border-border px-2 py-1">{item.id}</td>
                  <td className="border-b border-border px-2 py-1">{item.partNumber}</td>
                  <td className="border-b border-border px-2 py-1">{item.manufacturer}</td>
                  <td className="border-b border-border px-2 py-1">{item.description}</td>
                  <td className="border-b border-border px-2 py-1">{item.category}</td>
                  <td className="border-b border-border px-2 py-1">{item.notes ?? ''}</td>
                  <td className="border-b border-border px-2 py-1">
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => handleEdit(item)}>
                        Edit
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleDelete(item.id)}>
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

function WireTypesSection({
  wireTypeItems,
  onWireTypeItemsChange
}: {
  wireTypeItems: WireTypeItem[];
  onWireTypeItemsChange: Dispatch<SetStateAction<WireTypeItem[]>>;
}) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [draft, setDraft] = useState<WireTypeForm>(emptyWireTypeForm);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isEditing = editingItemId !== null;

  const handleDraftChange = <K extends keyof WireTypeForm>(key: K, value: WireTypeForm[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const resetEditor = () => {
    setEditingItemId(null);
    setDraft(emptyWireTypeForm);
    setValidationError(null);
  };

  const handleSave = () => {
    const notes = draft.notes.trim();

    const validationResult = validateWireType({
      id: draft.id,
      partNumber: draft.partNumber,
      manufacturer: draft.manufacturer,
      description: draft.description,
      gauge: draft.gauge,
      insulationType: draft.insulationType,
      notes
    });

    if (!validationResult.success) {
      setValidationError(formatValidationErrors(validationResult.errors));
      return;
    }

    setValidationError(null);
    const nextItem: WireTypeItem = {
      ...validationResult.data,
      notes: validationResult.data.notes ?? ''
    };

    onWireTypeItemsChange((current) => {
      if (editingItemId === null) {
        return [...current, nextItem];
      }

      return current.map((item) => (item.id === editingItemId ? nextItem : item));
    });

    resetEditor();
  };

  const handleEdit = (item: WireTypeItem) => {
    setEditingItemId(item.id);
    setDraft(mapWireTypeItemToForm(item));
    setValidationError(null);
  };

  const handleDelete = (itemId: string) => {
    onWireTypeItemsChange((current) => current.filter((item) => item.id !== itemId));

    if (editingItemId === itemId) {
      resetEditor();
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Wire Types</h2>
        <Button type="button" size="sm" onClick={resetEditor}>
          Add Wire Type
        </Button>
      </div>

      <div className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-2">
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
          Gauge
          <input
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
            value={draft.gauge}
            onChange={(event) => handleDraftChange('gauge', event.target.value)}
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Insulation Type
          <input
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
            value={draft.insulationType}
            onChange={(event) => handleDraftChange('insulationType', event.target.value)}
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground md:col-span-2">
          Notes
          <textarea
            className="mt-1 min-h-16 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
            value={draft.notes}
            onChange={(event) => handleDraftChange('notes', event.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <Button type="button" size="sm" onClick={handleSave}>
            {isEditing ? 'Update Wire Type' : 'Add Wire Type'}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={resetEditor}>
            Clear
          </Button>
        </div>
        {validationError ? <p className="text-xs text-destructive md:col-span-2">{validationError}</p> : null}
      </div>

      {wireTypeItems.length === 0 ? (
        <div className="mt-3 rounded-md border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
          No wire types yet. Add wire type entries to build this catalog section.
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[840px] border-collapse text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="border-b border-border px-2 py-1 text-left font-medium">ID</th>
                <th className="border-b border-border px-2 py-1 text-left font-medium">Part Number</th>
                <th className="border-b border-border px-2 py-1 text-left font-medium">Manufacturer</th>
                <th className="border-b border-border px-2 py-1 text-left font-medium">Description</th>
                <th className="border-b border-border px-2 py-1 text-left font-medium">Gauge</th>
                <th className="border-b border-border px-2 py-1 text-left font-medium">Insulation Type</th>
                <th className="border-b border-border px-2 py-1 text-left font-medium">Notes</th>
                <th className="border-b border-border px-2 py-1 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {wireTypeItems.map((item) => (
                <tr key={item.id}>
                  <td className="border-b border-border px-2 py-1">{item.id}</td>
                  <td className="border-b border-border px-2 py-1">{item.partNumber}</td>
                  <td className="border-b border-border px-2 py-1">{item.manufacturer}</td>
                  <td className="border-b border-border px-2 py-1">{item.description}</td>
                  <td className="border-b border-border px-2 py-1">{item.gauge}</td>
                  <td className="border-b border-border px-2 py-1">{item.insulationType}</td>
                  <td className="border-b border-border px-2 py-1">{item.notes ?? ''}</td>
                  <td className="border-b border-border px-2 py-1">
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => handleEdit(item)}>
                        Edit
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleDelete(item.id)}>
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

function RingTerminalSection({
  ringTerminalItems,
  onRingTerminalItemsChange
}: {
  ringTerminalItems: RingTerminalItem[];
  onRingTerminalItemsChange: Dispatch<SetStateAction<RingTerminalItem[]>>;
}) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RingTerminalForm>(emptyRingTerminalForm);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isEditing = editingItemId !== null;

  const handleDraftChange = <K extends keyof RingTerminalForm>(key: K, value: RingTerminalForm[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const resetEditor = () => {
    setEditingItemId(null);
    setDraft(emptyRingTerminalForm);
    setValidationError(null);
  };

  const handleSave = () => {
    const validationResult = validateRingTerminal({
      id: draft.id,
      partNumber: draft.partNumber,
      manufacturer: draft.manufacturer,
      description: draft.description,
      compatibleWireGauge: draft.compatibleWireGauge,
      crimpToolPartNumber: draft.crimpToolPartNumber,
      studSize: draft.studSize,
      notes: draft.notes
    });

    if (!validationResult.success) {
      setValidationError(formatValidationErrors(validationResult.errors));
      return;
    }

    setValidationError(null);
    const nextItem: RingTerminalItem = {
      ...validationResult.data,
      notes: validationResult.data.notes ?? ''
    };

    onRingTerminalItemsChange((current) => {
      if (editingItemId === null) {
        return [...current, nextItem];
      }

      return current.map((item) => (item.id === editingItemId ? nextItem : item));
    });

    resetEditor();
  };

  const handleEdit = (item: RingTerminalItem) => {
    setEditingItemId(item.id);
    setDraft(mapRingTerminalItemToForm(item));
    setValidationError(null);
  };

  const handleDelete = (itemId: string) => {
    onRingTerminalItemsChange((current) => current.filter((item) => item.id !== itemId));

    if (editingItemId === itemId) {
      resetEditor();
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Ring Terminals</h2>
        <Button type="button" size="sm" onClick={resetEditor}>
          Add Ring Terminal
        </Button>
      </div>

      <div className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-2">
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
          Compatible Wire Gauge
          <input
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
            value={draft.compatibleWireGauge}
            onChange={(event) => handleDraftChange('compatibleWireGauge', event.target.value)}
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Crimp Tool Part Number
          <input
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
            value={draft.crimpToolPartNumber}
            onChange={(event) => handleDraftChange('crimpToolPartNumber', event.target.value)}
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Stud Size
          <input
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
            value={draft.studSize}
            onChange={(event) => handleDraftChange('studSize', event.target.value)}
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground md:col-span-2">
          Notes
          <textarea
            className="mt-1 min-h-16 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
            value={draft.notes}
            onChange={(event) => handleDraftChange('notes', event.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <Button type="button" size="sm" onClick={handleSave}>
            {isEditing ? 'Update Ring Terminal' : 'Add Ring Terminal'}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={resetEditor}>
            Clear
          </Button>
        </div>
        {validationError ? <p className="text-xs text-destructive md:col-span-2">{validationError}</p> : null}
      </div>

      {ringTerminalItems.length === 0 ? (
        <div className="mt-3 rounded-md border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
          No ring terminals yet. Add ring terminal entries to build this catalog section.
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[920px] border-collapse text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="border-b border-border px-2 py-1 text-left font-medium">ID</th>
                <th className="border-b border-border px-2 py-1 text-left font-medium">Part Number</th>
                <th className="border-b border-border px-2 py-1 text-left font-medium">Manufacturer</th>
                <th className="border-b border-border px-2 py-1 text-left font-medium">Description</th>
                <th className="border-b border-border px-2 py-1 text-left font-medium">Compatible Wire Gauge</th>
                <th className="border-b border-border px-2 py-1 text-left font-medium">Crimp Tool Part Number</th>
                <th className="border-b border-border px-2 py-1 text-left font-medium">Stud Size</th>
                <th className="border-b border-border px-2 py-1 text-left font-medium">Notes</th>
                <th className="border-b border-border px-2 py-1 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ringTerminalItems.map((item) => (
                <tr key={item.id}>
                  <td className="border-b border-border px-2 py-1">{item.id}</td>
                  <td className="border-b border-border px-2 py-1">{item.partNumber}</td>
                  <td className="border-b border-border px-2 py-1">{item.manufacturer}</td>
                  <td className="border-b border-border px-2 py-1">{item.description}</td>
                  <td className="border-b border-border px-2 py-1">{item.compatibleWireGauge}</td>
                  <td className="border-b border-border px-2 py-1">{item.crimpToolPartNumber}</td>
                  <td className="border-b border-border px-2 py-1">{item.studSize}</td>
                  <td className="border-b border-border px-2 py-1">{item.notes}</td>
                  <td className="border-b border-border px-2 py-1">
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => handleEdit(item)}>
                        Edit
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleDelete(item.id)}>
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

function ConnectorHousingSection({
  housingItems,
  onHousingItemsChange
}: {
  housingItems: ConnectorHousingItem[];
  onHousingItemsChange: Dispatch<SetStateAction<ConnectorHousingItem[]>>;
}) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selectedHousingId, setSelectedHousingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ConnectorHousingForm>(emptyHousingForm);
  const [housingValidationError, setHousingValidationError] = useState<string | null>(null);

  const [editingTerminalId, setEditingTerminalId] = useState<string | null>(null);
  const [terminalDraft, setTerminalDraft] = useState<ConnectorTerminalForm>(emptyTerminalForm);
  const [terminalValidationError, setTerminalValidationError] = useState<string | null>(null);

  const [editingSealId, setEditingSealId] = useState<string | null>(null);
  const [sealDraft, setSealDraft] = useState<ConnectorSealForm>(emptySealForm);
  const [sealValidationError, setSealValidationError] = useState<string | null>(null);

  const [editingPlugId, setEditingPlugId] = useState<string | null>(null);
  const [plugDraft, setPlugDraft] = useState<ConnectorPlugForm>(emptyPlugForm);
  const [plugValidationError, setPlugValidationError] = useState<string | null>(null);

  const isEditing = editingItemId !== null;
  const selectedHousing = useMemo(
    () => housingItems.find((item) => item.id === selectedHousingId) ?? null,
    [housingItems, selectedHousingId]
  );

  const primaryActionLabel = useMemo(() => {
    if (isEditing) {
      return 'Update Housing';
    }
    return 'Add Housing';
  }, [isEditing]);

  const handleDraftChange = <K extends keyof ConnectorHousingForm>(key: K, value: ConnectorHousingForm[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const resetNestedEditors = () => {
    setEditingTerminalId(null);
    setTerminalDraft(emptyTerminalForm);
    setTerminalValidationError(null);
    setEditingSealId(null);
    setSealDraft(emptySealForm);
    setSealValidationError(null);
    setEditingPlugId(null);
    setPlugDraft(emptyPlugForm);
    setPlugValidationError(null);
  };

  const resetEditor = () => {
    setEditingItemId(null);
    setDraft(emptyHousingForm);
    setHousingValidationError(null);
  };

  const updateSelectedHousing = (updater: (item: ConnectorHousingItem) => ConnectorHousingItem) => {
    if (selectedHousingId === null) {
      return;
    }

    onHousingItemsChange((current) =>
      current.map((item) => (item.id === selectedHousingId ? updater(item) : item))
    );
  };

  const handleSaveHousing = () => {
    const cavityCount = Number.parseInt(draft.cavityCount, 10);

    const validationResult = validateConnectorHousing({
      id: draft.id,
      partNumber: draft.partNumber,
      manufacturer: draft.manufacturer,
      description: draft.description,
      family: draft.family,
      cavityCount,
      notes: draft.notes,
      terminals: [],
      seals: [],
      plugs: []
    });

    if (!validationResult.success) {
      setHousingValidationError(formatValidationErrors(validationResult.errors));
      return;
    }

    setHousingValidationError(null);
    const nextItem: ConnectorHousingItem = {
      ...validationResult.data,
      notes: validationResult.data.notes ?? '',
      terminals: [],
      seals: [],
      plugs: []
    };

    onHousingItemsChange((current) => {
      if (editingItemId === null) {
        return [...current, nextItem];
      }

      return current.map((item) =>
        item.id === editingItemId
          ? {
              ...nextItem,
              terminals: item.terminals,
              seals: item.seals,
              plugs: item.plugs
            }
          : item
      );
    });

    setSelectedHousingId(nextItem.id);
    resetEditor();
  };

  const handleEditHousing = (item: ConnectorHousingItem) => {
    setEditingItemId(item.id);
    setSelectedHousingId(item.id);
    setDraft(mapHousingItemToForm(item));
    setHousingValidationError(null);
  };

  const handleDeleteHousing = (itemId: string) => {
    onHousingItemsChange((current) => current.filter((item) => item.id !== itemId));

    if (editingItemId === itemId) {
      resetEditor();
    }

    if (selectedHousingId === itemId) {
      setSelectedHousingId(null);
      resetNestedEditors();
    }
  };

  const handleSaveTerminal = () => {
    if (!selectedHousing) {
      return;
    }

    const validationResult = validateConnectorTerminal({
      id: terminalDraft.id,
      partNumber: terminalDraft.partNumber,
      description: terminalDraft.description,
      compatibleWireGauge: terminalDraft.compatibleWireGauge,
      crimpToolPartNumber: terminalDraft.crimpToolPartNumber,
      notes: terminalDraft.notes
    });

    if (!validationResult.success) {
      setTerminalValidationError(formatValidationErrors(validationResult.errors));
      return;
    }

    setTerminalValidationError(null);
    const nextTerminal: ConnectorTerminalItem = {
      ...validationResult.data,
      notes: validationResult.data.notes ?? ''
    };

    updateSelectedHousing((item) => ({
      ...item,
      terminals:
        editingTerminalId === null
          ? [...item.terminals, nextTerminal]
          : item.terminals.map((terminal) => (terminal.id === editingTerminalId ? nextTerminal : terminal))
    }));

    setEditingTerminalId(null);
    setTerminalDraft(emptyTerminalForm);
    setTerminalValidationError(null);
  };

  const handleSaveSeal = () => {
    if (!selectedHousing) {
      return;
    }

    const validationResult = validateConnectorSeal({
      id: sealDraft.id,
      partNumber: sealDraft.partNumber,
      description: sealDraft.description,
      notes: sealDraft.notes
    });

    if (!validationResult.success) {
      setSealValidationError(formatValidationErrors(validationResult.errors));
      return;
    }

    setSealValidationError(null);
    const nextSeal: ConnectorSealItem = {
      ...validationResult.data,
      notes: validationResult.data.notes ?? ''
    };

    updateSelectedHousing((item) => ({
      ...item,
      seals: editingSealId === null ? [...item.seals, nextSeal] : item.seals.map((seal) => (seal.id === editingSealId ? nextSeal : seal))
    }));

    setEditingSealId(null);
    setSealDraft(emptySealForm);
    setSealValidationError(null);
  };

  const handleSavePlug = () => {
    if (!selectedHousing) {
      return;
    }

    const validationResult = validateConnectorPlug({
      id: plugDraft.id,
      partNumber: plugDraft.partNumber,
      description: plugDraft.description,
      notes: plugDraft.notes
    });

    if (!validationResult.success) {
      setPlugValidationError(formatValidationErrors(validationResult.errors));
      return;
    }

    setPlugValidationError(null);
    const nextPlug: ConnectorPlugItem = {
      ...validationResult.data,
      notes: validationResult.data.notes ?? ''
    };

    updateSelectedHousing((item) => ({
      ...item,
      plugs: editingPlugId === null ? [...item.plugs, nextPlug] : item.plugs.map((plug) => (plug.id === editingPlugId ? nextPlug : plug))
    }));

    setEditingPlugId(null);
    setPlugDraft(emptyPlugForm);
    setPlugValidationError(null);
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Connector Housing</h2>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            resetEditor();
          }}
        >
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
        {housingValidationError ? <p className="text-xs text-destructive">{housingValidationError}</p> : null}
      </div>

      {housingItems.length === 0 ? (
        <div className="mt-3 rounded-md border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
          No connector housings yet. Add housing definitions to begin building the catalog.
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[820px] border-collapse text-sm">
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
                <Fragment key={item.id}>
                  <tr key={item.id} className="align-top">
                    <td className="border-b border-border px-2 py-2">{item.id}</td>
                    <td className="border-b border-border px-2 py-2">{item.partNumber}</td>
                    <td className="border-b border-border px-2 py-2">{item.manufacturer}</td>
                    <td className="border-b border-border px-2 py-2">{item.description}</td>
                    <td className="border-b border-border px-2 py-2">{item.family}</td>
                    <td className="border-b border-border px-2 py-2">{item.cavityCount}</td>
                    <td className="border-b border-border px-2 py-2">{item.notes}</td>
                    <td className="border-b border-border px-2 py-2">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => handleEditHousing(item)}>
                          Edit
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleDeleteHousing(item.id)}>
                          Delete
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (selectedHousingId === item.id) {
                              setSelectedHousingId(null);
                              resetNestedEditors();
                              return;
                            }

                            setSelectedHousingId(item.id);
                            resetNestedEditors();
                          }}
                        >
                          {selectedHousingId === item.id ? 'Hide Details' : 'Manage Children'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {selectedHousingId === item.id ? (
                    <tr>
                      <td className="bg-muted/10 px-3 py-3" colSpan={8}>
                        <div className="space-y-3">
                          <div className="rounded-md border border-border bg-background p-3">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <h3 className="text-sm font-semibold">Terminals</h3>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingTerminalId(null);
                                  setTerminalDraft(emptyTerminalForm);
                                }}
                              >
                                Add Terminal
                              </Button>
                            </div>
                            <div className="grid gap-2 md:grid-cols-3">
                              <label className="text-xs font-medium text-muted-foreground">
                                ID
                                <input
                                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                                  value={terminalDraft.id}
                                  onChange={(event) => setTerminalDraft((current) => ({ ...current, id: event.target.value }))}
                                />
                              </label>
                              <label className="text-xs font-medium text-muted-foreground">
                                Part Number
                                <input
                                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                                  value={terminalDraft.partNumber}
                                  onChange={(event) =>
                                    setTerminalDraft((current) => ({ ...current, partNumber: event.target.value }))
                                  }
                                />
                              </label>
                              <label className="text-xs font-medium text-muted-foreground">
                                Description
                                <input
                                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                                  value={terminalDraft.description}
                                  onChange={(event) =>
                                    setTerminalDraft((current) => ({ ...current, description: event.target.value }))
                                  }
                                />
                              </label>
                              <label className="text-xs font-medium text-muted-foreground">
                                Compatible Wire Gauge
                                <input
                                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                                  value={terminalDraft.compatibleWireGauge}
                                  onChange={(event) =>
                                    setTerminalDraft((current) => ({ ...current, compatibleWireGauge: event.target.value }))
                                  }
                                />
                              </label>
                              <label className="text-xs font-medium text-muted-foreground">
                                Crimp Tool Part Number
                                <input
                                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                                  value={terminalDraft.crimpToolPartNumber}
                                  onChange={(event) =>
                                    setTerminalDraft((current) => ({ ...current, crimpToolPartNumber: event.target.value }))
                                  }
                                />
                              </label>
                              <label className="text-xs font-medium text-muted-foreground md:col-span-3">
                                Notes
                                <input
                                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                                  value={terminalDraft.notes}
                                  onChange={(event) =>
                                    setTerminalDraft((current) => ({ ...current, notes: event.target.value }))
                                  }
                                />
                              </label>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button type="button" size="sm" onClick={handleSaveTerminal}>
                                {editingTerminalId === null ? 'Add Terminal' : 'Update Terminal'}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingTerminalId(null);
                                  setTerminalDraft(emptyTerminalForm);
                                }}
                              >
                                Clear
                              </Button>
                            </div>
                            {terminalValidationError ? <p className="mt-2 text-xs text-destructive">{terminalValidationError}</p> : null}
                            {item.terminals.length === 0 ? (
                              <div className="mt-2 rounded-md border border-dashed border-border bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
                                No terminals for this housing yet.
                              </div>
                            ) : (
                              <div className="mt-2 overflow-x-auto rounded-md border border-border">
                                <table className="w-full min-w-[760px] border-collapse text-xs">
                                  <thead className="bg-muted/40">
                                    <tr>
                                      <th className="border-b border-border px-2 py-1 text-left font-medium">ID</th>
                                      <th className="border-b border-border px-2 py-1 text-left font-medium">Part Number</th>
                                      <th className="border-b border-border px-2 py-1 text-left font-medium">Description</th>
                                      <th className="border-b border-border px-2 py-1 text-left font-medium">Compatible Wire Gauge</th>
                                      <th className="border-b border-border px-2 py-1 text-left font-medium">Crimp Tool Part Number</th>
                                      <th className="border-b border-border px-2 py-1 text-left font-medium">Notes</th>
                                      <th className="border-b border-border px-2 py-1 text-left font-medium">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.terminals.map((terminal) => (
                                      <tr key={terminal.id}>
                                        <td className="border-b border-border px-2 py-1">{terminal.id}</td>
                                        <td className="border-b border-border px-2 py-1">{terminal.partNumber}</td>
                                        <td className="border-b border-border px-2 py-1">{terminal.description}</td>
                                        <td className="border-b border-border px-2 py-1">{terminal.compatibleWireGauge}</td>
                                        <td className="border-b border-border px-2 py-1">{terminal.crimpToolPartNumber}</td>
                                        <td className="border-b border-border px-2 py-1">{terminal.notes}</td>
                                        <td className="border-b border-border px-2 py-1">
                                          <div className="flex gap-2">
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                setEditingTerminalId(terminal.id);
                                                setTerminalDraft({ ...terminal, notes: terminal.notes ?? '' });
                                              }}
                                            >
                                              Edit
                                            </Button>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                updateSelectedHousing((housing) => ({
                                                  ...housing,
                                                  terminals: housing.terminals.filter(
                                                    (currentTerminal) => currentTerminal.id !== terminal.id
                                                  )
                                                }));

                                                if (editingTerminalId === terminal.id) {
                                                  setEditingTerminalId(null);
                                                  setTerminalDraft(emptyTerminalForm);
                                                }
                                              }}
                                            >
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
                          </div>

                          <div className="rounded-md border border-border bg-background p-3">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <h3 className="text-sm font-semibold">Seals</h3>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingSealId(null);
                                  setSealDraft(emptySealForm);
                                }}
                              >
                                Add Seal
                              </Button>
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                              <label className="text-xs font-medium text-muted-foreground">
                                ID
                                <input
                                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                                  value={sealDraft.id}
                                  onChange={(event) => setSealDraft((current) => ({ ...current, id: event.target.value }))}
                                />
                              </label>
                              <label className="text-xs font-medium text-muted-foreground">
                                Part Number
                                <input
                                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                                  value={sealDraft.partNumber}
                                  onChange={(event) => setSealDraft((current) => ({ ...current, partNumber: event.target.value }))}
                                />
                              </label>
                              <label className="text-xs font-medium text-muted-foreground md:col-span-2">
                                Description
                                <input
                                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                                  value={sealDraft.description}
                                  onChange={(event) =>
                                    setSealDraft((current) => ({ ...current, description: event.target.value }))
                                  }
                                />
                              </label>
                              <label className="text-xs font-medium text-muted-foreground md:col-span-2">
                                Notes
                                <input
                                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                                  value={sealDraft.notes}
                                  onChange={(event) => setSealDraft((current) => ({ ...current, notes: event.target.value }))}
                                />
                              </label>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button type="button" size="sm" onClick={handleSaveSeal}>
                                {editingSealId === null ? 'Add Seal' : 'Update Seal'}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingSealId(null);
                                  setSealDraft(emptySealForm);
                                }}
                              >
                                Clear
                              </Button>
                            </div>
                            {sealValidationError ? <p className="mt-2 text-xs text-destructive">{sealValidationError}</p> : null}
                            {item.seals.length === 0 ? (
                              <div className="mt-2 rounded-md border border-dashed border-border bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
                                No seals for this housing yet.
                              </div>
                            ) : (
                              <div className="mt-2 overflow-x-auto rounded-md border border-border">
                                <table className="w-full min-w-[620px] border-collapse text-xs">
                                  <thead className="bg-muted/40">
                                    <tr>
                                      <th className="border-b border-border px-2 py-1 text-left font-medium">ID</th>
                                      <th className="border-b border-border px-2 py-1 text-left font-medium">Part Number</th>
                                      <th className="border-b border-border px-2 py-1 text-left font-medium">Description</th>
                                      <th className="border-b border-border px-2 py-1 text-left font-medium">Notes</th>
                                      <th className="border-b border-border px-2 py-1 text-left font-medium">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.seals.map((seal) => (
                                      <tr key={seal.id}>
                                        <td className="border-b border-border px-2 py-1">{seal.id}</td>
                                        <td className="border-b border-border px-2 py-1">{seal.partNumber}</td>
                                        <td className="border-b border-border px-2 py-1">{seal.description}</td>
                                        <td className="border-b border-border px-2 py-1">{seal.notes}</td>
                                        <td className="border-b border-border px-2 py-1">
                                          <div className="flex gap-2">
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                setEditingSealId(seal.id);
                                                setSealDraft({ ...seal, notes: seal.notes ?? '' });
                                              }}
                                            >
                                              Edit
                                            </Button>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                updateSelectedHousing((housing) => ({
                                                  ...housing,
                                                  seals: housing.seals.filter((currentSeal) => currentSeal.id !== seal.id)
                                                }));

                                                if (editingSealId === seal.id) {
                                                  setEditingSealId(null);
                                                  setSealDraft(emptySealForm);
                                                }
                                              }}
                                            >
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
                          </div>

                          <div className="rounded-md border border-border bg-background p-3">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <h3 className="text-sm font-semibold">Plugs</h3>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingPlugId(null);
                                  setPlugDraft(emptyPlugForm);
                                }}
                              >
                                Add Plug
                              </Button>
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                              <label className="text-xs font-medium text-muted-foreground">
                                ID
                                <input
                                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                                  value={plugDraft.id}
                                  onChange={(event) => setPlugDraft((current) => ({ ...current, id: event.target.value }))}
                                />
                              </label>
                              <label className="text-xs font-medium text-muted-foreground">
                                Part Number
                                <input
                                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                                  value={plugDraft.partNumber}
                                  onChange={(event) => setPlugDraft((current) => ({ ...current, partNumber: event.target.value }))}
                                />
                              </label>
                              <label className="text-xs font-medium text-muted-foreground md:col-span-2">
                                Description
                                <input
                                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                                  value={plugDraft.description}
                                  onChange={(event) =>
                                    setPlugDraft((current) => ({ ...current, description: event.target.value }))
                                  }
                                />
                              </label>
                              <label className="text-xs font-medium text-muted-foreground md:col-span-2">
                                Notes
                                <input
                                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                                  value={plugDraft.notes}
                                  onChange={(event) => setPlugDraft((current) => ({ ...current, notes: event.target.value }))}
                                />
                              </label>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button type="button" size="sm" onClick={handleSavePlug}>
                                {editingPlugId === null ? 'Add Plug' : 'Update Plug'}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingPlugId(null);
                                  setPlugDraft(emptyPlugForm);
                                }}
                              >
                                Clear
                              </Button>
                            </div>
                            {plugValidationError ? <p className="mt-2 text-xs text-destructive">{plugValidationError}</p> : null}
                            {item.plugs.length === 0 ? (
                              <div className="mt-2 rounded-md border border-dashed border-border bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
                                No plugs for this housing yet.
                              </div>
                            ) : (
                              <div className="mt-2 overflow-x-auto rounded-md border border-border">
                                <table className="w-full min-w-[620px] border-collapse text-xs">
                                  <thead className="bg-muted/40">
                                    <tr>
                                      <th className="border-b border-border px-2 py-1 text-left font-medium">ID</th>
                                      <th className="border-b border-border px-2 py-1 text-left font-medium">Part Number</th>
                                      <th className="border-b border-border px-2 py-1 text-left font-medium">Description</th>
                                      <th className="border-b border-border px-2 py-1 text-left font-medium">Notes</th>
                                      <th className="border-b border-border px-2 py-1 text-left font-medium">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.plugs.map((plug) => (
                                      <tr key={plug.id}>
                                        <td className="border-b border-border px-2 py-1">{plug.id}</td>
                                        <td className="border-b border-border px-2 py-1">{plug.partNumber}</td>
                                        <td className="border-b border-border px-2 py-1">{plug.description}</td>
                                        <td className="border-b border-border px-2 py-1">{plug.notes}</td>
                                        <td className="border-b border-border px-2 py-1">
                                          <div className="flex gap-2">
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                setEditingPlugId(plug.id);
                                                setPlugDraft({ ...plug, notes: plug.notes ?? '' });
                                              }}
                                            >
                                              Edit
                                            </Button>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                updateSelectedHousing((housing) => ({
                                                  ...housing,
                                                  plugs: housing.plugs.filter((currentPlug) => currentPlug.id !== plug.id)
                                                }));

                                                if (editingPlugId === plug.id) {
                                                  setEditingPlugId(null);
                                                  setPlugDraft(emptyPlugForm);
                                                }
                                              }}
                                            >
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
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function MaterialCatalogView({ onCatalogChange }: { onCatalogChange?: (catalog: MaterialCatalogData) => void }) {
  const [connectorHousings, setConnectorHousings] = useState<ConnectorHousingItem[]>([]);
  const [ringTerminals, setRingTerminals] = useState<RingTerminalItem[]>([]);
  const [wireTypes, setWireTypes] = useState<WireTypeItem[]>([]);
  const [accessoryMaterials, setAccessoryMaterials] = useState<AccessoryMaterialItem[]>([]);
  const [manifestMessage, setManifestMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    onCatalogChange?.({
      connectorHousings,
      ringTerminals,
      wireTypes,
      accessoryMaterials
    });
  }, [accessoryMaterials, connectorHousings, onCatalogChange, ringTerminals, wireTypes]);

  const handleExportManifest = () => {
    const toml = exportCatalogToToml({ connectorHousings, ringTerminals, wireTypes, accessoryMaterials });
    const blob = new Blob([toml], { type: 'text/toml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'material-catalog.toml';
    link.click();
    URL.revokeObjectURL(url);
    setManifestMessage('Catalog manifest exported.');
  };

  const handleImportManifestClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportManifestChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const existingCatalog: MaterialCatalogData = {
        connectorHousings,
        ringTerminals,
        wireTypes,
        accessoryMaterials
      };
      const result = importCatalogAdditive(existingCatalog, text);

      setConnectorHousings(
        result.catalog.connectorHousings.map((housing) => ({
          ...housing,
          notes: housing.notes ?? '',
          terminals: housing.terminals.map((terminal) => ({ ...terminal, notes: terminal.notes ?? '' })),
          seals: housing.seals.map((seal) => ({ ...seal, notes: seal.notes ?? '' })),
          plugs: housing.plugs.map((plug) => ({ ...plug, notes: plug.notes ?? '' }))
        }))
      );
      setRingTerminals(result.catalog.ringTerminals.map((item) => ({ ...item, notes: item.notes ?? '' })));
      setWireTypes(result.catalog.wireTypes.map((item) => ({ ...item, notes: item.notes ?? '' })));
      setAccessoryMaterials(result.catalog.accessoryMaterials.map((item) => ({ ...item, notes: item.notes ?? '' })));
      setManifestMessage(
        `Catalog import complete: added ${result.summary.added}, skipped duplicates ${result.summary.skippedDuplicates}, invalid ${result.summary.invalid}.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown catalog TOML import error.';
      setManifestMessage(`Catalog import failed: ${message}`);
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={handleExportManifest}>
              Export Catalog Manifest
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleImportManifestClick}>
              Import Catalog Manifest
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".toml,text/toml"
              className="hidden"
              onChange={handleImportManifestChange}
            />
            {manifestMessage ? <p className="text-xs text-muted-foreground">{manifestMessage}</p> : null}
          </div>
        </section>
        <ConnectorHousingSection housingItems={connectorHousings} onHousingItemsChange={setConnectorHousings} />
        <RingTerminalSection ringTerminalItems={ringTerminals} onRingTerminalItemsChange={setRingTerminals} />
        <WireTypesSection wireTypeItems={wireTypes} onWireTypeItemsChange={setWireTypes} />
        <AccessoryMaterialsSection accessoryItems={accessoryMaterials} onAccessoryItemsChange={setAccessoryMaterials} />
      </div>
    </div>
  );
}
