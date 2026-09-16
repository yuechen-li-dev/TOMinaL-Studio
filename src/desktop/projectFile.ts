import { stableJson } from '@/artifacts';
import { parseFormboard, validateFormboard, type TominalProject } from '@/formboard';
import { parseHarnessIr, validateHarnessIr } from '@/harness-core';

export const TOMINAL_PROJECT_FORMAT_VERSION = '1' as const;

export type TominalProjectFile = {
  readonly formatVersion: typeof TOMINAL_PROJECT_FORMAT_VERSION;
  readonly project: TominalProject;
  readonly quoteRevision: number;
};

export function serializeTominalProjectFile(project: TominalProject, quoteRevision: number): string {
  return stableJson({ formatVersion: TOMINAL_PROJECT_FORMAT_VERSION, project, quoteRevision });
}

export function parseTominalProjectFile(text: string): TominalProjectFile {
  const candidate = JSON.parse(text) as Partial<TominalProjectFile>;
  if (candidate.formatVersion !== TOMINAL_PROJECT_FORMAT_VERSION) {
    throw new Error(`Unsupported TOMinaL project format ${String(candidate.formatVersion)}.`);
  }
  const quoteRevision = Number(candidate.quoteRevision);
  if (!candidate.project || !Number.isSafeInteger(quoteRevision) || quoteRevision < 0) {
    throw new Error('Invalid TOMinaL project envelope.');
  }
  const harness = parseHarnessIr(JSON.stringify(candidate.project.harness));
  const formboard = parseFormboard(JSON.stringify(candidate.project.formboard));
  const diagnostics = [...validateHarnessIr(harness), ...validateFormboard(harness, formboard)];
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length) throw new Error(`Project validation failed: ${errors.map((item) => item.message).join('; ')}`);
  return { formatVersion: TOMINAL_PROJECT_FORMAT_VERSION, project: { harness, formboard }, quoteRevision };
}
