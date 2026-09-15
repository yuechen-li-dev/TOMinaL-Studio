import type { HarnessCatalogSnapshot } from '@/harness-core/model';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)])
    );
  }
  return value;
}

export function canonicalCatalogPayload(snapshot: Omit<HarnessCatalogSnapshot, 'snapshotHash'>): string {
  return JSON.stringify(canonicalize(snapshot));
}

export function computeCatalogHash(snapshot: Omit<HarnessCatalogSnapshot, 'snapshotHash'>): string {
  const text = canonicalCatalogPayload(snapshot);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function withCatalogHash(snapshot: Omit<HarnessCatalogSnapshot, 'snapshotHash'>): HarnessCatalogSnapshot {
  return { ...snapshot, snapshotHash: computeCatalogHash(snapshot) };
}

export function isCatalogHashCurrent(snapshot: HarnessCatalogSnapshot): boolean {
  const { snapshotHash: _ignored, ...payload } = snapshot;
  return snapshot.snapshotHash === computeCatalogHash(payload);
}

