import {
  cavityId,
  connectorFamilyId,
  type CatalogPartId,
  type ConnectorFamilyId,
  type SignalRoleId
} from '@/harness-core/ids';
import type { ConnectorFamilyDefinition } from '@/harness-core/model';

export type AuthoredCavity = {
  readonly label: string;
  readonly required?: boolean;
  readonly requiredRole?: SignalRoleId;
  readonly allowedTerminalIds: readonly CatalogPartId[];
  readonly allowedSealIds?: readonly CatalogPartId[];
  readonly allowedPlugIds?: readonly CatalogPartId[];
};

export type ConnectorFamilySource<
  TFamilyId extends string,
  TCavities extends Readonly<Record<string, AuthoredCavity>>
> = {
  readonly id: TFamilyId;
  readonly name: string;
  readonly manufacturer?: string;
  readonly housingPartId?: CatalogPartId;
  readonly housingPartNumber?: string;
  readonly cavities: TCavities;
};

export type TypedConnectorFamily<
  TFamilyId extends string = string,
  TCavities extends Readonly<Record<string, AuthoredCavity>> = Readonly<Record<string, AuthoredCavity>>
> = {
  readonly familyKey: TFamilyId;
  readonly cavitySource: TCavities;
  readonly definition: ConnectorFamilyDefinition;
};

export function defineConnectorFamily<
  const TFamilyId extends string,
  const TCavities extends Readonly<Record<string, AuthoredCavity>>
>(source: ConnectorFamilySource<TFamilyId, TCavities>): TypedConnectorFamily<TFamilyId, TCavities> {
  const familyId = connectorFamilyId(source.id);
  return {
    familyKey: source.id,
    cavitySource: source.cavities,
    definition: {
      id: familyId,
      name: source.name,
      manufacturer: source.manufacturer,
      housingPartId: source.housingPartId,
      housingPartNumber: source.housingPartNumber,
      cavities: Object.entries(source.cavities)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => ({
          id: cavityId<TFamilyId>(`${source.id}.${key}`),
          label: value.label,
          required: value.required,
          requiredRole: value.requiredRole,
          allowedTerminalIds: [...value.allowedTerminalIds],
          allowedSealIds: value.allowedSealIds ? [...value.allowedSealIds] : undefined,
          allowedPlugIds: value.allowedPlugIds ? [...value.allowedPlugIds] : undefined
        }))
    }
  };
}

export function connectorFamilyIdOf(family: TypedConnectorFamily): ConnectorFamilyId {
  return family.definition.id;
}
