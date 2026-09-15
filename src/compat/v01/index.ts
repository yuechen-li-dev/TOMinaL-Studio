import type { HarnessDocument } from '@/core/harnessModel';
import { exportHarnessToToml, importHarnessFromToml } from '@/core/tomlCodec';

export type { HarnessDocument as HarnessDocumentV01 } from '@/core/harnessModel';
export { exportHarnessToToml as serializeV01 } from '@/core/tomlCodec';

export function parseV01(text: string): HarnessDocument {
  return importHarnessFromToml(text);
}

export function validateV01(candidate: HarnessDocument): readonly string[] {
  const errors: string[] = [];
  if (candidate.version !== '0.1') errors.push(`Unsupported version ${String(candidate.version)}.`);
  if (candidate.units !== 'mm') errors.push(`Unsupported units ${String(candidate.units)}.`);
  if (candidate.drawingType !== 'formboard') errors.push(`Unsupported drawing type ${String(candidate.drawingType)}.`);
  try {
    importHarnessFromToml(exportHarnessToToml(candidate));
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown v0.1 validation error.');
  }
  return errors;
}

export { migrateV01, type MigrationResult } from './migration';

