import { exportFormboardSvg, serializeFormboard, validateFormboard, type TominalProject } from '@/formboard';
import { serializeHarnessIr, validateHarnessIr } from '@/harness-core';
import type { ArtifactManifest, GeneratedArtifact, ManufacturingArtifactPackage, QuoteSnapshot } from './model';
import { accessoryScheduleCsv, accessoryScheduleJson, bomCsv, bomJson, cutListCsv, cutListJson } from './exports';
import { deriveManufacturingArtifacts } from './derive';
import { sha256, stableJson } from './stable';

export const ARTIFACT_GENERATOR_VERSION = 'TOMINAL-ACCESSORIES-X1';

const artifact = (file: string, artifactType: string, schemaVersion: string, content: string, sourceDependencies: readonly string[]): GeneratedArtifact => ({ file, artifactType, schemaVersion, content, sha256: sha256(content), sourceDependencies });

function lockfile(project: TominalProject, quote: QuoteSnapshot, hashes: Readonly<Record<string, string>>, generatedDeclarationHash: string): string {
  const resolved = project.harness.catalog.connectorFamilies.filter((family) => family.manufacturer && family.housingPartNumber).map((family) => ({ manufacturer: family.manufacturer!, partNumber: family.housingPartNumber! }))
    .concat([...project.harness.catalog.terminals, ...project.harness.catalog.seals, ...project.harness.catalog.plugs, ...project.harness.catalog.ringTerminals, ...project.harness.catalog.wireTypes, ...(project.harness.catalog.accessoryMaterials ?? [])].map((item) => ({ manufacturer: item.manufacturer, partNumber: item.partNumber })))
    .sort((left, right) => `${left.manufacturer}|${left.partNumber}`.localeCompare(`${right.manufacturer}|${right.partNumber}`));
  const lines = [
    'lock_format_version = "1"', `generator_version = "${ARTIFACT_GENERATOR_VERSION}"`, `harness_ir_schema_version = "${project.harness.schemaVersion}"`, `formboard_document_schema_version = "${project.formboard.formboardVersion}"`,
    `source_project_hash = "sha256:${sha256(serializeHarnessIr(project.harness) + serializeFormboard(project.formboard))}"`, `catalog_snapshot_id = ${JSON.stringify(project.harness.catalog.snapshotId)}`, `catalog_snapshot_hash = ${JSON.stringify(project.harness.catalog.snapshotHash)}`,
    `generated_connector_declaration_hash = "sha256:${generatedDeclarationHash}"`, `cut_list_hash = "sha256:${hashes.cutlist}"`, `bom_hash = "sha256:${hashes.bom}"`, `formboard_svg_hash = "sha256:${hashes.svg}"`,
    `quote_snapshot_hash = "sha256:${hashes.quote}"`, `quote_snapshot_identity = ${JSON.stringify(quote.identity)}`, `quote_snapshot_timestamp = ${JSON.stringify(quote.timestamp)}`, '',
    ...resolved.map((part) => `[[resolved_manufacturer_parts]]\nmanufacturer = ${JSON.stringify(part.manufacturer)}\npart_number = ${JSON.stringify(part.partNumber)}`)
  ];
  return `${lines.join('\n')}\n`;
}

export function buildManufacturingPackage(project: TominalProject, quote: QuoteSnapshot, generatedConnectorDeclarations: string): ManufacturingArtifactPackage {
  const projection = deriveManufacturingArtifacts(project);
  const engineeringDiagnostics = [...validateHarnessIr(project.harness), ...validateFormboard(project.harness, project.formboard), ...projection.diagnostics];
  if (engineeringDiagnostics.some((item) => item.severity === 'error')) throw new Error(`Release-ready artifact generation refused: ${engineeringDiagnostics.map((item) => `${item.rule}: ${item.message}`).join('; ')}`);
  const prefix = project.harness.id;
  const svg = exportFormboardSvg(project.harness, project.formboard);
  const initial = [
    artifact(`${prefix}.formboard.svg`, 'formboard-svg', '1', svg, ['HarnessIr', 'FormboardDocument']),
    artifact(`${prefix}.cutlist.csv`, 'cut-list-csv', '1', cutListCsv(projection.cutList), ['HarnessIr', 'FormboardDocument', 'CatalogSnapshot']),
    artifact(`${prefix}.cutlist.json`, 'cut-list-json', '1', cutListJson(projection.cutList), ['HarnessIr', 'FormboardDocument', 'CatalogSnapshot']),
    artifact(`${prefix}.bom.csv`, 'bom-csv', '1', bomCsv(projection.bom), ['HarnessIr', 'CutList', 'CatalogSnapshot']),
    artifact(`${prefix}.bom.json`, 'bom-json', '1', bomJson(projection.bom), ['HarnessIr', 'CutList', 'CatalogSnapshot']),
    artifact(`${prefix}.accessories.csv`, 'accessory-schedule-csv', '1', accessoryScheduleCsv(projection.accessorySchedule), ['HarnessIr', 'FormboardDocument', 'CatalogSnapshot']),
    artifact(`${prefix}.accessories.json`, 'accessory-schedule-json', '1', accessoryScheduleJson(projection.accessorySchedule), ['HarnessIr', 'FormboardDocument', 'CatalogSnapshot']),
    artifact(`${prefix}.quote.json`, 'quote-snapshot', '1', stableJson(quote), ['BOM', quote.identity])
  ];
  const hashes = { svg: initial[0].sha256, cutlist: initial[1].sha256, bom: initial[3].sha256, quote: initial[7].sha256 };
  const lock = artifact('tominal.lock.toml', 'project-lock', '1', lockfile(project, quote, hashes, sha256(generatedConnectorDeclarations)), ['HarnessIr', 'FormboardDocument', 'CatalogSnapshot', quote.identity]);
  const withoutManifest = [...initial, lock];
  const manifest: ArtifactManifest = { schemaVersion: '1', projectId: project.harness.id, generatedBy: ARTIFACT_GENERATOR_VERSION, diagnostics: engineeringDiagnostics, artifacts: withoutManifest.map(({ content: _content, ...entry }) => entry) };
  const manifestArtifact = artifact('artifact-manifest.json', 'artifact-manifest', '1', stableJson(manifest), ['tominal.lock.toml']);
  return { projection, quote, artifacts: [...withoutManifest, manifestArtifact], manifest };
}
