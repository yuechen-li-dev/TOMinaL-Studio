import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';

import type { MaterialCatalogData } from '@/catalog/catalogData';
import { materialCatalogSchema } from '@/catalog/schemas';

type CatalogManifestToml = {
  connector_housings?: unknown;
  ring_terminals?: unknown;
  wire_types?: unknown;
  accessory_materials?: unknown;
};

export type CatalogImportSummary = {
  added: number;
  skippedDuplicates: number;
  invalid: number;
  sections: {
    connectorHousings: { added: number; skippedDuplicates: number; invalid: number };
    ringTerminals: { added: number; skippedDuplicates: number; invalid: number };
    wireTypes: { added: number; skippedDuplicates: number; invalid: number };
    accessoryMaterials: { added: number; skippedDuplicates: number; invalid: number };
  };
};

export type CatalogImportResult = {
  catalog: MaterialCatalogData;
  summary: CatalogImportSummary;
};

function toSectionArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toModel(raw: CatalogManifestToml): MaterialCatalogData {
  return {
    connectorHousings: toSectionArray(raw.connector_housings) as MaterialCatalogData['connectorHousings'],
    ringTerminals: toSectionArray(raw.ring_terminals) as MaterialCatalogData['ringTerminals'],
    wireTypes: toSectionArray(raw.wire_types) as MaterialCatalogData['wireTypes'],
    accessoryMaterials: toSectionArray(raw.accessory_materials) as MaterialCatalogData['accessoryMaterials']
  };
}

function toManifest(catalog: MaterialCatalogData) {
  return {
    connector_housings: catalog.connectorHousings,
    ring_terminals: catalog.ringTerminals,
    wire_types: catalog.wireTypes,
    accessory_materials: catalog.accessoryMaterials
  };
}

function sortById<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.id.localeCompare(b.id));
}

function normalizeCatalog(catalog: MaterialCatalogData): MaterialCatalogData {
  return {
    connectorHousings: sortById(catalog.connectorHousings).map((housing) => ({
      ...housing,
      terminals: sortById(housing.terminals),
      seals: sortById(housing.seals),
      plugs: sortById(housing.plugs)
    })),
    ringTerminals: sortById(catalog.ringTerminals),
    wireTypes: sortById(catalog.wireTypes),
    accessoryMaterials: sortById(catalog.accessoryMaterials)
  };
}

export function exportCatalogToToml(catalog: MaterialCatalogData): string {
  return stringifyToml(toManifest(normalizeCatalog(catalog)));
}

export function importCatalogFromToml(text: string): MaterialCatalogData {
  const parsed = parseToml(text) as CatalogManifestToml;
  const candidate = toModel(parsed);
  const result = materialCatalogSchema.safeParse(candidate);

  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(' · ');
    throw new Error(`Catalog manifest validation failed: ${details}`);
  }

  return result.data;
}

function mergeSection<T extends { id: string }>(
  existing: T[],
  incoming: T[]
): { merged: T[]; added: number; skippedDuplicates: number } {
  const existingIds = new Set(existing.map((item) => item.id));
  const additions: T[] = [];
  let skippedDuplicates = 0;

  for (const item of incoming) {
    if (existingIds.has(item.id)) {
      skippedDuplicates += 1;
      continue;
    }

    existingIds.add(item.id);
    additions.push(item);
  }

  return {
    merged: [...existing, ...additions],
    added: additions.length,
    skippedDuplicates
  };
}

export function importCatalogAdditive(existing: MaterialCatalogData, text: string): CatalogImportResult {
  const parsedCatalog = importCatalogFromToml(text);

  const connectorHousings = mergeSection(existing.connectorHousings, parsedCatalog.connectorHousings);
  const ringTerminals = mergeSection(existing.ringTerminals, parsedCatalog.ringTerminals);
  const wireTypes = mergeSection(existing.wireTypes, parsedCatalog.wireTypes);
  const accessoryMaterials = mergeSection(existing.accessoryMaterials, parsedCatalog.accessoryMaterials);


  const summary: CatalogImportSummary = {
    added: connectorHousings.added + ringTerminals.added + wireTypes.added + accessoryMaterials.added,
    skippedDuplicates:
      connectorHousings.skippedDuplicates +
      ringTerminals.skippedDuplicates +
      wireTypes.skippedDuplicates +
      accessoryMaterials.skippedDuplicates,
    invalid: 0,
    sections: {
      connectorHousings: {
        added: connectorHousings.added,
        skippedDuplicates: connectorHousings.skippedDuplicates,
        invalid: 0
      },
      ringTerminals: { added: ringTerminals.added, skippedDuplicates: ringTerminals.skippedDuplicates, invalid: 0 },
      wireTypes: { added: wireTypes.added, skippedDuplicates: wireTypes.skippedDuplicates, invalid: 0 },
      accessoryMaterials: {
        added: accessoryMaterials.added,
        skippedDuplicates: accessoryMaterials.skippedDuplicates,
        invalid: 0
      }
    }
  };

  return {
    catalog: {
      connectorHousings: connectorHousings.merged,
      ringTerminals: ringTerminals.merged,
      wireTypes: wireTypes.merged,
      accessoryMaterials: accessoryMaterials.merged
    },
    summary
  };
}
