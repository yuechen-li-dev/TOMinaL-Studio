import { z } from 'zod';

export const partNumberPattern = /^[A-Z0-9-]+$/;

const requiredText = (fieldName: string) => z.string().trim().min(1, `${fieldName} is required`);

const optionalNotes = z.string().trim().optional();

export const connectorTerminalSchema = z.object({
  id: requiredText('ID'),
  partNumber: requiredText('Part Number').regex(partNumberPattern, 'Part Number must match ^[A-Z0-9-]+$'),
  description: requiredText('Description'),
  compatibleWireGauge: requiredText('Compatible Wire Gauge'),
  crimpToolPartNumber: requiredText('Crimp Tool Part Number'),
  notes: optionalNotes
});

export const connectorSealSchema = z.object({
  id: requiredText('ID'),
  partNumber: requiredText('Part Number').regex(partNumberPattern, 'Part Number must match ^[A-Z0-9-]+$'),
  description: requiredText('Description'),
  notes: optionalNotes
});

export const connectorPlugSchema = z.object({
  id: requiredText('ID'),
  partNumber: requiredText('Part Number').regex(partNumberPattern, 'Part Number must match ^[A-Z0-9-]+$'),
  description: requiredText('Description'),
  notes: optionalNotes
});

export const connectorHousingSchema = z.object({
  id: requiredText('ID'),
  partNumber: requiredText('Part Number').regex(partNumberPattern, 'Part Number must match ^[A-Z0-9-]+$'),
  manufacturer: requiredText('Manufacturer'),
  description: requiredText('Description'),
  family: requiredText('Family'),
  cavityCount: z.number().int().positive('Cavity Count must be a positive integer'),
  notes: optionalNotes,
  terminals: z.array(connectorTerminalSchema),
  seals: z.array(connectorSealSchema),
  plugs: z.array(connectorPlugSchema)
});

export const ringTerminalSchema = z.object({
  id: requiredText('ID'),
  partNumber: requiredText('Part Number').regex(partNumberPattern, 'Part Number must match ^[A-Z0-9-]+$'),
  manufacturer: requiredText('Manufacturer'),
  description: requiredText('Description'),
  compatibleWireGauge: requiredText('Compatible Wire Gauge'),
  crimpToolPartNumber: requiredText('Crimp Tool Part Number'),
  studSize: requiredText('Stud Size'),
  notes: optionalNotes
});

export const wireTypeSchema = z.object({
  id: requiredText('ID'),
  partNumber: requiredText('Part Number').regex(partNumberPattern, 'Part Number must match ^[A-Z0-9-]+$'),
  manufacturer: requiredText('Manufacturer'),
  description: requiredText('Description'),
  gauge: requiredText('Gauge'),
  insulationType: requiredText('Insulation Type'),
  notes: optionalNotes
});

export const accessoryMaterialSchema = z.object({
  id: requiredText('ID'),
  partNumber: requiredText('Part Number').regex(partNumberPattern, 'Part Number must match ^[A-Z0-9-]+$'),
  manufacturer: requiredText('Manufacturer'),
  description: requiredText('Description'),
  category: requiredText('Category'),
  notes: optionalNotes
});

export type ConnectorHousing = z.infer<typeof connectorHousingSchema>;
export type ConnectorTerminal = z.infer<typeof connectorTerminalSchema>;
export type ConnectorSeal = z.infer<typeof connectorSealSchema>;
export type ConnectorPlug = z.infer<typeof connectorPlugSchema>;
export type RingTerminal = z.infer<typeof ringTerminalSchema>;
export type WireType = z.infer<typeof wireTypeSchema>;
export type AccessoryMaterial = z.infer<typeof accessoryMaterialSchema>;


export const materialCatalogSchema = z.object({
  connectorHousings: z.array(connectorHousingSchema),
  ringTerminals: z.array(ringTerminalSchema),
  wireTypes: z.array(wireTypeSchema),
  accessoryMaterials: z.array(accessoryMaterialSchema)
});

export type MaterialCatalog = z.infer<typeof materialCatalogSchema>;
