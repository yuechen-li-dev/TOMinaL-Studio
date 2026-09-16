import { describe, expect, it } from 'vitest';

import { controllerChassisProject } from '../../fixtures/controller-chassis/controllerChassis.formboard';
import { parseTominalProjectFile, serializeTominalProjectFile } from './projectFile';

describe('TOMINAL-DESKTOP-X1 project files', () => {
  it('round-trips project authority and quote revision byte-stably', () => {
    const first = serializeTominalProjectFile(controllerChassisProject, 4);
    const parsed = parseTominalProjectFile(first);
    expect(parsed.project).toEqual(controllerChassisProject);
    expect(parsed.quoteRevision).toBe(4);
    expect(serializeTominalProjectFile(parsed.project, parsed.quoteRevision)).toBe(first);
    expect(first).not.toMatch(/[A-Z]:\\/i);
  });

  it('rejects unsupported envelopes and invalid engineering state', () => {
    expect(() => parseTominalProjectFile('{"formatVersion":"99"}')).toThrow('Unsupported');
    const invalid = JSON.parse(serializeTominalProjectFile(controllerChassisProject, 0));
    invalid.project.harness.conductors[0].wireTypeId = 'MISSING';
    expect(() => parseTominalProjectFile(JSON.stringify(invalid))).toThrow('Project validation failed');
  });
});
