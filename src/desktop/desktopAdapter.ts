import type { GeneratedArtifact } from '@/artifacts';

export const isTauriDesktop = (): boolean => '__TAURI_INTERNALS__' in window;

export async function openNativeProjectText(): Promise<{ readonly path: string; readonly text: string } | undefined> {
  const [{ open }, { invoke }] = await Promise.all([import('@tauri-apps/plugin-dialog'), import('@tauri-apps/api/core')]);
  const path = await open({ multiple: false, directory: false, title: 'Open TOMinaL Project', filters: [{ name: 'TOMinaL Project', extensions: ['json'] }] });
  if (!path) return undefined;
  return { path, text: await invoke<string>('read_text_file', { path }) };
}

export async function saveNativeProjectText(suggestedName: string, contents: string): Promise<string | undefined> {
  const [{ save }, { invoke }] = await Promise.all([import('@tauri-apps/plugin-dialog'), import('@tauri-apps/api/core')]);
  const path = await save({ title: 'Save TOMinaL Project', defaultPath: suggestedName, filters: [{ name: 'TOMinaL Project', extensions: ['json'] }] });
  if (!path) return undefined;
  await invoke('write_text_file', { path, contents });
  return path;
}

export async function exportNativeArtifactFolder(projectId: string, artifacts: readonly GeneratedArtifact[]): Promise<string | undefined> {
  const [{ open }, { invoke }] = await Promise.all([import('@tauri-apps/plugin-dialog'), import('@tauri-apps/api/core')]);
  const directory = await open({ multiple: false, directory: true, title: 'Export TOMinaL Artifact Folder' });
  if (!directory) return undefined;
  return invoke<string>('write_artifact_folder', { directory, projectId, artifacts: artifacts.map(({ file, content }) => ({ file, content })) });
}

export async function exportNativeArtifactFile(artifact: GeneratedArtifact): Promise<string | undefined> {
  const [{ save }, { invoke }] = await Promise.all([import('@tauri-apps/plugin-dialog'), import('@tauri-apps/api/core')]);
  const fileParts = artifact.file.split('.');
  const extension = fileParts.length > 1 ? fileParts[fileParts.length - 1] : undefined;
  const path = await save({
    title: `Export ${artifact.file}`,
    defaultPath: artifact.file,
    filters: extension ? [{ name: 'Artifact', extensions: [extension] }] : undefined
  });
  if (!path) return undefined;
  await invoke('write_text_file', { path, contents: artifact.content });
  return path;
}

export function downloadTextFile(file: string, contents: string, mimeType = 'application/json;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([contents], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = file;
  link.click();
  URL.revokeObjectURL(url);
}
