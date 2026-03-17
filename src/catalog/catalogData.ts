import type { AccessoryMaterial, ConnectorHousing, RingTerminal, WireType } from '@/catalog/schemas';

export type MaterialCatalogData = {
  connectorHousings: ConnectorHousing[];
  ringTerminals: RingTerminal[];
  wireTypes: WireType[];
  accessoryMaterials: AccessoryMaterial[];
};

export const emptyMaterialCatalogData: MaterialCatalogData = {
  connectorHousings: [],
  ringTerminals: [],
  wireTypes: [],
  accessoryMaterials: []
};
