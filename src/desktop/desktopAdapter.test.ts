// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GeneratedArtifact } from '@/artifacts';
import { exportNativeArtifactFile } from './desktopAdapter';

const tauri = vi.hoisted(() => ({
  invoke: vi.fn(),
  save: vi.fn()
}));

vi.mock('@tauri-apps/api/core', () => ({ invoke: tauri.invoke }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: tauri.save }));

const artifact: GeneratedArtifact = {
  file: 'controller-chassis.cutlist.csv',
  artifactType: 'wire-cut-list',
  schemaVersion: '1',
  content: 'wire_id,cut_length_mm\nWIRE_MOTOR_POS,100\n',
  sha256: 'test',
  sourceDependencies: []
};

describe('desktop artifact export', () => {
  beforeEach(() => {
    tauri.invoke.mockReset();
    tauri.save.mockReset();
  });

  it('uses a native save dialog and writes the selected individual artifact path', async () => {
    tauri.save.mockResolvedValue('C:\\Exports\\controller-chassis.cutlist.csv');
    tauri.invoke.mockResolvedValue(undefined);

    await expect(exportNativeArtifactFile(artifact)).resolves.toBe('C:\\Exports\\controller-chassis.cutlist.csv');
    expect(tauri.save).toHaveBeenCalledWith(expect.objectContaining({
      defaultPath: artifact.file,
      filters: [{ name: 'Artifact', extensions: ['csv'] }]
    }));
    expect(tauri.invoke).toHaveBeenCalledWith('write_text_file', {
      path: 'C:\\Exports\\controller-chassis.cutlist.csv',
      contents: artifact.content
    });
  });

  it('does not write when the native save dialog is cancelled', async () => {
    tauri.save.mockResolvedValue(null);
    await expect(exportNativeArtifactFile(artifact)).resolves.toBeUndefined();
    expect(tauri.invoke).not.toHaveBeenCalled();
  });
});
