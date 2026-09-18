import type { HarnessIr } from '@/harness-core';
import type { FormboardDocument } from './model';
import { projectFormboard, formboardProjectionToMachinaScene } from './projection';

const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const n = (value: number) => Number(value.toFixed(4)).toString();

export function exportFormboardSvg(harness: HarnessIr, document: FormboardDocument): string {
  const width = Number(document.board.widthMm);
  const height = Number(document.board.heightMm);
  const scene = formboardProjectionToMachinaScene(projectFormboard(harness, document));
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${n(width)}mm" height="${n(height)}mm" viewBox="0 0 ${n(width)} ${n(height)}" data-units="mm" data-scale="1:1">`,
    '  <title>' + esc(document.title) + '</title>',
    '  <rect id="board" x="0" y="0" width="100%" height="100%" fill="white" stroke="#0f172a" stroke-width="0.5"/>'
  ];
  if (document.exportSettings.includeGrid) {
    const grid = Number(document.board.gridSpacingMm);
    lines.push(`  <defs><pattern id="grid-mm" width="${n(grid)}" height="${n(grid)}" patternUnits="userSpaceOnUse"><path d="M ${n(grid)} 0 L 0 0 0 ${n(grid)}" fill="none" stroke="#dbe4ef" stroke-width="0.2"/></pattern></defs>`);
    lines.push('  <rect x="0" y="0" width="100%" height="100%" fill="url(#grid-mm)"/>');
  }
  for (const item of scene) {
    if (item.type === 'rect') {
      lines.push(`  <rect id="${esc(item.id)}" data-role="${item.role}" x="${n(item.x)}" y="${n(item.y)}" width="${n(item.width)}" height="${n(item.height)}" fill="none" stroke="#94a3b8" stroke-width="0.6" stroke-dasharray="4 2"/>`);
    } else if (item.type === 'path') {
      const stroke = item.role === 'tapeWrap' ? '#f59e0b' : item.role === 'sleeve' ? '#0891b2' : '#334155';
      const dash = item.role === 'sleeve' ? ' stroke-dasharray="5 2"' : '';
      lines.push(`  <path id="${esc(item.id)}" data-role="${esc(item.role)}" data-entity-kind="${esc(item.role)}" data-entity-id="${esc(item.id)}" d="${item.d}" fill="none" stroke="${stroke}" stroke-opacity="${item.role === 'routeSegment' ? '1' : '0.72'}" stroke-width="${n(Math.max(1, item.strokeWidth))}" stroke-linecap="round" stroke-linejoin="round"${dash}/>`);
    } else if (item.type === 'text') {
      lines.push(`  <text id="${esc(item.id)}" x="${n(item.x)}" y="${n(item.y)}" font-family="sans-serif" font-size="5" fill="#0f172a">${esc(item.text)}</text>`);
    } else if (item.type === 'callout') {
      const entityKind = item.role === 'accessoryLabel' ? 'label' : item.role === 'heatShrink' ? 'heatShrinkPlacement' : 'route';
      const leader = item.anchorX === undefined ? '' : `<path d="M ${n(item.anchorX)} ${n(item.anchorY!)} L ${n(item.x)} ${n(item.y + item.height / 2)}" stroke="#64748b" stroke-width="0.45"/><circle cx="${n(item.anchorX)}" cy="${n(item.anchorY!)}" r="1.8" fill="#0ea5e9"/>`;
      lines.push(`  <g id="${esc(item.id)}" data-role="${item.role}" data-entity-kind="${entityKind}" data-entity-id="${esc(item.entityId)}">${leader}<rect x="${n(item.x)}" y="${n(item.y)}" width="${n(item.width)}" height="${n(item.height)}" rx="2" fill="#f8fafc" fill-opacity="0.96" stroke="#cbd5e1" stroke-width="0.45"/><circle cx="${n(item.x + 5)}" cy="${n(item.y + item.height / 2)}" r="1.8" fill="#0ea5e9"/><text x="${n(item.x + 9)}" y="${n(item.y + item.height / 2 + 1.5)}" font-family="sans-serif" font-size="4.5" font-weight="600" fill="#0f172a">${esc(item.text)}</text></g>`);
    } else if (item.marker === 'connector') {
      lines.push(`  <g id="${esc(item.id)}" data-entity-kind="connectorOccurrence" data-entity-id="${esc(item.id)}" transform="translate(${n(item.x)} ${n(item.y)})"><rect x="-12" y="-8" width="24" height="16" rx="1" fill="#e0f2fe" stroke="#0369a1" stroke-width="1"/><path d="M 0 -5 L 5 0 L 0 5" fill="none" stroke="#0369a1" stroke-width="1"/><text x="0" y="-11" text-anchor="middle" font-family="sans-serif" font-size="4">${esc(item.id)}</text></g>`);
    } else if (item.marker === 'splice') {
      lines.push(`  <g id="${esc(item.id)}" data-entity-kind="electricalSplice" data-entity-id="${esc(item.id)}" transform="translate(${n(item.x)} ${n(item.y)})"><path d="M 0 -6 L 6 0 L 0 6 L -6 0 Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="1"/><text x="8" y="2" font-family="sans-serif" font-size="4">${esc(item.id)}</text></g>`);
    } else if (item.marker === 'junction') {
      lines.push(`  <g id="${esc(item.id)}" data-entity-kind="routeJunction" data-entity-id="${esc(item.id)}" transform="translate(${n(item.x)} ${n(item.y)})"><circle r="6" fill="white" stroke="#7c3aed" stroke-width="1.5"/><path d="M -4 0 H 4 M 0 -4 V 4" stroke="#7c3aed" stroke-width="1"/><text x="8" y="2" font-family="sans-serif" font-size="4">${esc(item.id)}</text></g>`);
    } else {
      lines.push(`  <g id="${esc(item.id)}" data-entity-kind="stud" data-entity-id="${esc(item.id)}" transform="translate(${n(item.x)} ${n(item.y)})"><circle r="5" fill="#fbbf24" stroke="#92400e" stroke-width="1"/><text x="8" y="2" font-family="sans-serif" font-size="4">${esc(item.id)}</text></g>`);
    }
  }
  for (const dimension of document.dimensions) {
    const length = Math.hypot(Number(dimension.to.x) - Number(dimension.from.x), Number(dimension.to.y) - Number(dimension.from.y));
    lines.push(`  <g id="${esc(dimension.id)}" data-role="dimension"><path d="M ${n(Number(dimension.from.x))} ${n(Number(dimension.from.y) + Number(dimension.offsetMm))} L ${n(Number(dimension.to.x))} ${n(Number(dimension.to.y) + Number(dimension.offsetMm))}" stroke="#475569" stroke-width="0.4"/><text x="${n((Number(dimension.from.x) + Number(dimension.to.x)) / 2)}" y="${n((Number(dimension.from.y) + Number(dimension.to.y)) / 2 + Number(dimension.offsetMm) - 2)}" text-anchor="middle" font-family="sans-serif" font-size="4">${esc(dimension.label ?? `${n(length)} mm`)}</text></g>`);
  }
  const calibration = Number(document.exportSettings.calibrationLengthMm);
  const calibrationY = height - 18;
  lines.push(`  <g id="calibration-witness" data-length-mm="${n(calibration)}"><path d="M 15 ${n(calibrationY)} H ${n(15 + calibration)}" stroke="#000" stroke-width="0.8"/><path d="M 15 ${n(calibrationY - 3)} V ${n(calibrationY + 3)} M ${n(15 + calibration)} ${n(calibrationY - 3)} V ${n(calibrationY + 3)}" stroke="#000" stroke-width="0.8"/><text x="${n(15 + calibration / 2)}" y="${n(calibrationY - 4)}" text-anchor="middle" font-family="sans-serif" font-size="4">${n(calibration)} mm calibration</text></g>`);
  lines.push(`  <g id="title-block"><text x="${n(width - 12)}" y="${n(height - 12)}" text-anchor="end" font-family="sans-serif" font-size="5">${esc(document.title)} · Rev ${esc(document.revision ?? '—')} · mm · SCALE 1:1 · TOMinaL Studio</text></g>`);
  lines.push('</svg>', '');
  return lines.join('\n');
}
