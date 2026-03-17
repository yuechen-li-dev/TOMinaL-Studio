import type { ZodType } from 'zod';

import {
  accessoryMaterialSchema,
  connectorHousingSchema,
  connectorPlugSchema,
  connectorSealSchema,
  connectorTerminalSchema,
  ringTerminalSchema,
  wireTypeSchema
} from '@/catalog/schemas';

export type CatalogValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: string[] };

function validateWithSchema<T>(schema: ZodType<T>, candidate: unknown): CatalogValidationResult<T> {
  const result = schema.safeParse(candidate);

  if (result.success) {
    return {
      success: true,
      data: result.data
    };
  }

  return {
    success: false,
    errors: result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      return `${path}${issue.message}`;
    })
  };
}

export const validateConnectorHousing = (candidate: unknown) => validateWithSchema(connectorHousingSchema, candidate);
export const validateConnectorTerminal = (candidate: unknown) => validateWithSchema(connectorTerminalSchema, candidate);
export const validateConnectorSeal = (candidate: unknown) => validateWithSchema(connectorSealSchema, candidate);
export const validateConnectorPlug = (candidate: unknown) => validateWithSchema(connectorPlugSchema, candidate);
export const validateRingTerminal = (candidate: unknown) => validateWithSchema(ringTerminalSchema, candidate);
export const validateWireType = (candidate: unknown) => validateWithSchema(wireTypeSchema, candidate);
export const validateAccessoryMaterial = (candidate: unknown) => validateWithSchema(accessoryMaterialSchema, candidate);
