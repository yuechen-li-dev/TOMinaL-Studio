import type { HarnessDocument } from '@/core/harnessModel';

export type BindingStatus = 'unbound' | 'valid' | 'invalid';

export type BindingResult = {
  status: BindingStatus;
  referenceId?: string;
};

export type CatalogBindingIndex = {
  connectorHousingIds?: Iterable<string>;
  wireTypeIds?: Iterable<string>;
};

function toLookup(values?: Iterable<string>): Set<string> {
  return new Set(values ?? []);
}

export function resolveBindingStatus(referenceId: string | undefined, availableIds: Iterable<string>): BindingResult {
  if (!referenceId) {
    return { status: 'unbound' };
  }

  return {
    status: toLookup(availableIds).has(referenceId) ? 'valid' : 'invalid',
    referenceId
  };
}

export function getConnectorHousingBindingStatuses(
  document: HarnessDocument,
  connectorHousingIds: Iterable<string>
): Record<string, BindingResult> {
  return Object.fromEntries(
    Object.values(document.connectors).map((connector) => [
      connector.id,
      resolveBindingStatus(connector.housingId, connectorHousingIds)
    ])
  );
}

export function getWireTypeBindingStatuses(
  document: HarnessDocument,
  wireTypeIds: Iterable<string>
): Record<string, BindingResult> {
  return Object.fromEntries(
    Object.values(document.wires).map((wire) => [wire.id, resolveBindingStatus(wire.wireTypeId, wireTypeIds)])
  );
}

export function getGraphCatalogBindingSummary(document: HarnessDocument, catalog: CatalogBindingIndex) {
  return {
    connectorHousing: getConnectorHousingBindingStatuses(document, catalog.connectorHousingIds ?? []),
    wireType: getWireTypeBindingStatuses(document, catalog.wireTypeIds ?? [])
  };
}
