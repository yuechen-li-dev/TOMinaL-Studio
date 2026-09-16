import type { BomRow, CutListRow } from './model';
import { csvRow, formatNumber, stableJson } from './stable';

const cutHeaders = ['Wire ID','Circuit / Signal','From Connector','From Cavity','To Connector','To Cavity / Splice / Stud','Wire Type','Gauge','Color','Route Length (mm)','Slack (mm)','Termination Allowance (mm)','Cut Length (mm)','Terminal A','Seal / Ring A','Terminal B','Seal / Ring B','Route ID','Notes'];

export function cutListCsv(rows: readonly CutListRow[]): string {
  return `${[csvRow(cutHeaders), ...rows.map((row) => csvRow([row.wireId,row.circuit,row.fromConnector,row.fromCavity,row.toConnector,row.toCavitySpliceStud,row.wireType,row.gauge,row.color,formatNumber(row.routeLengthMm),formatNumber(row.slackMm),formatNumber(row.terminationAllowanceMm),formatNumber(row.cutLengthMm),row.terminalA,row.sealOrRingA,row.terminalB,row.sealOrRingB,row.routeId,row.notes]))].join('\n')}\n`;
}

export const cutListJson = (rows: readonly CutListRow[]): string => stableJson({ schemaVersion: '1', lengthUnit: 'mm', rows });

export function bomCsv(rows: readonly BomRow[]): string {
  const header = ['Category','Manufacturer','Part Number','Description','Quantity','Unit','Conductor Count','Source Entities'];
  return `${[csvRow(header), ...rows.map((row) => csvRow([row.category,row.manufacturer,row.partNumber,row.description,formatNumber(row.quantity,6),row.unit,row.conductorCount ?? '',row.sourceEntities.map((entity) => `${entity.kind}:${entity.id}`).join('; ')]))].join('\n')}\n`;
}

export const bomJson = (rows: readonly BomRow[]): string => stableJson({ schemaVersion: '1', rows });
