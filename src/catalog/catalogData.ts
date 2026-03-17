import type { ConnectorHousing, WireType } from '@/catalog/schemas';

export type MaterialCatalogData = {
  connectorHousings: ConnectorHousing[];
  wireTypes: WireType[];
};

export const emptyMaterialCatalogData: MaterialCatalogData = {
  connectorHousings: [],
  wireTypes: []
};
