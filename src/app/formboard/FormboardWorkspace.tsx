import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Focus, Grid3X3, Minus, Plus, Route as RouteIcon } from 'lucide-react';
import { clientPointToViewport, panViewport, zoomViewport, type ViewportRect } from 'machinalayout/viewport2d';

import type { AppCommandDispatcher, Selection } from '@/app/session/appSession';
import { emptySelection, singleSelection } from '@/app/session/appSession';
import {
  exportFormboardSvg,
  getRouteLength,
  moveConnector,
  moveRouteJunction,
  moveSplice,
  pointMm,
  projectFormboard,
  routeRelatedConductors,
  splinePathData,
  updateRouteSegment,
  validateFormboard,
  type FormboardDocument,
  type PointMm,
  type TominalProject
} from '@/formboard';
import { labelId, mm, sleeveId, tapeWrapId, type RouteSegmentId } from '@/harness-core';
import { Button } from '@/components/ui/button';

type ViewBox = ViewportRect;
type Drag =
  | { kind: 'connector' | 'junction' | 'splice'; id: string }
  | { kind: 'routePoint'; id: RouteSegmentId; index: number }
  | { kind: 'pan'; startClient: readonly [number, number]; startView: ViewBox };

const polylinePath = (points: readonly PointMm[]) =>
  points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${Number(point.x)} ${Number(point.y)}`).join(' ');

const selected = (selection: Selection['primary'], kind: Selection['entities'][number]['kind'], id: string) =>
  selection?.kind === kind && selection.id === id;

function downloadSvg(project: TominalProject, formboard: FormboardDocument) {
  const svg = exportFormboardSvg(project.harness, formboard);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${project.harness.id}-formboard.svg`;
  link.click();
  URL.revokeObjectURL(url);
}

export function FormboardWorkspace({ project, document, selection: sharedSelection, dispatch }: {
  project: TominalProject;
  document?: FormboardDocument;
  selection?: Selection;
  dispatch?: AppCommandDispatcher;
}) {
  const [localFormboard, setLocalFormboard] = useState(project.formboard);
  const [localSelection, setLocalSelection] = useState<Selection>(emptySelection);
  const formboard = document ?? localFormboard;
  const selection = sharedSelection ?? localSelection;
  const setSelection = (next: Selection['primary']) => {
    const value = next ? singleSelection(next) : emptySelection;
    if (dispatch) dispatch({ type: 'selection.set', selection: value });
    else setLocalSelection(value);
  };
  const setFormboard = (update: (current: FormboardDocument) => FormboardDocument) => {
    if (dispatch) dispatch({ type: 'formboard.replace', document: update(formboard) });
    else setLocalFormboard(update);
  };
  const [drag, setDrag] = useState<Drag>();
  const [cursor, setCursor] = useState<PointMm>();
  const [showGrid, setShowGrid] = useState(project.formboard.exportSettings.includeGrid);
  const [view, setView] = useState<ViewBox>({ x: 0, y: 0, width: Number(formboard.board.widthMm), height: Number(formboard.board.heightMm) });
  const fitBoard = useCallback(() => {
    setView({ x: 0, y: 0, width: Number(formboard.board.widthMm), height: Number(formboard.board.heightMm) });
  }, [formboard.board.heightMm, formboard.board.widthMm]);
  const svgRef = useRef<SVGSVGElement>(null);
  const projection = useMemo(() => projectFormboard(project.harness, formboard), [formboard, project.harness]);
  const diagnostics = useMemo(() => validateFormboard(project.harness, formboard), [formboard, project.harness]);
  const routeMetrics = useMemo(
    () => formboard.routes.map((route) => ({ route, length: getRouteLength(formboard, route.routeId), conductors: routeRelatedConductors(project.harness, route.routeId) })),
    [formboard, project.harness]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const editing = target?.isContentEditable || target?.closest('input, textarea, select, [contenteditable="true"]');
      if (!editing && !event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        fitBoard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fitBoard]);

  const toBoardPoint = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return pointMm(0, 0);
    const point = clientPointToViewport(rect, view, clientX, clientY);
    return pointMm(point.x, point.y);
  };

  const updateDrag = (clientX: number, clientY: number) => {
    const point = toBoardPoint(clientX, clientY);
    setCursor(point);
    if (!drag) return;
    if (drag.kind === 'pan') {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      setView(panViewport(drag.startView, rect, clientX - drag.startClient[0], clientY - drag.startClient[1]));
    } else if (drag.kind === 'connector') {
      setFormboard((current) => moveConnector(current, drag.id as Parameters<typeof moveConnector>[1], point).document);
    } else if (drag.kind === 'junction') {
      setFormboard((current) => moveRouteJunction(current, drag.id as Parameters<typeof moveRouteJunction>[1], point).document);
    } else if (drag.kind === 'splice') {
      setFormboard((current) => moveSplice(current, drag.id as Parameters<typeof moveSplice>[1], point).document);
    } else if (drag.kind === 'routePoint') {
      setFormboard((current) => {
        const segment = current.segmentGeometry.find((item) => item.routeSegmentId === drag.id);
        if (!segment) return current;
        const points = [...segment.points];
        points[drag.index] = point;
        return updateRouteSegment(current, drag.id, { points: points as [PointMm, PointMm, ...PointMm[]] }).document;
      });
    }
  };

  const zoom = (factor: number) => setView((current) => zoomViewport(current, factor, { minWidth: 80, maxWidth: Number(formboard.board.widthMm) * 4 }));

  const selectedSegment = selection.primary?.kind === 'routeSegment'
    ? formboard.segmentGeometry.find((item) => item.routeSegmentId === selection.primary?.id)
    : undefined;
  const selectedConductor = selection.primary?.kind === 'conductor'
    ? project.harness.conductors.find((item) => item.id === selection.primary?.id)
    : undefined;
  const selectedRoute = selection.primary?.kind === 'route'
    ? routeMetrics.find((item) => item.route.routeId === selection.primary?.id)
    : selectedConductor?.routeId
      ? routeMetrics.find((item) => item.route.routeId === selectedConductor.routeId)
      : undefined;

  const addAccessory = (kind: 'label' | 'tapeWrap' | 'sleeve') => {
    const routeMetric = selectedRoute ?? routeMetrics[0];
    if (!routeMetric || routeMetric.length.status === 'unresolved') return;
    const length = Number(routeMetric.length.valueMm);
    const number = (formboard.accessories ?? []).filter((item) => item.kind === kind).length + 1;
    const material = project.harness.catalog.accessoryMaterials?.find((item) => item.kind === (kind === 'tapeWrap' ? 'tape' : kind));
    if (!material) return;
    const accessory = kind === 'label'
      ? { kind, id: labelId(`LABEL_${number}`), routeId: routeMetric.route.routeId, stationMm: mm(length / 2), text: `LABEL ${number}`, catalogPartId: material.id }
      : kind === 'tapeWrap'
        ? { kind, id: tapeWrapId(`TAPE_${number}`), routeId: routeMetric.route.routeId, startStationMm: mm(0), endStationMm: mm(length), catalogPartId: material.id, mode: 'spiral' as const, overlapFraction: 0, wasteFactor: 1.15 }
        : { kind, id: sleeveId(`SLEEVE_${number}`), routeId: routeMetric.route.routeId, startStationMm: mm(0), endStationMm: mm(length), catalogPartId: material.id, startAllowanceMm: mm(0), endAllowanceMm: mm(0) };
    setFormboard((current) => ({ ...current, accessories: [...(current.accessories ?? []), accessory] }));
    setSelection({ kind: kind === 'label' ? 'label' : kind, id: accessory.id });
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-[1fr_310px] gap-3 p-3">
      <section className="relative min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-xl">
        <div className="absolute left-4 top-4 z-10 flex items-center gap-1 rounded-xl border border-white/10 bg-slate-900/90 p-1 text-white shadow-lg backdrop-blur">
          <Button aria-label="Zoom in" size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => zoom(0.8)}><Plus className="h-4 w-4" /></Button>
          <Button aria-label="Zoom out" size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => zoom(1.25)}><Minus className="h-4 w-4" /></Button>
          <Button aria-label="Fit board" title="Fit board (F)" size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={fitBoard}><Focus className="h-4 w-4" /></Button>
          <Button aria-label="Toggle millimetre grid" size="sm" variant={showGrid ? 'secondary' : 'ghost'} className={showGrid ? '' : 'text-white hover:bg-white/10'} onClick={() => setShowGrid((value) => !value)}><Grid3X3 className="h-4 w-4" /></Button>
        </div>
        <div className="absolute bottom-4 left-4 z-10 rounded-lg border border-white/10 bg-slate-900/90 px-3 py-2 font-mono text-xs text-slate-200 backdrop-blur">
          {cursor ? `${Number(cursor.x).toFixed(1)}, ${Number(cursor.y).toFixed(1)} mm` : 'Move cursor over board'}
        </div>
        <svg
          ref={svgRef}
          aria-label="1:1 harness formboard"
          className="h-full w-full touch-none select-none"
          viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
          onPointerDown={(event) => { setSelection(undefined); setDrag({ kind: 'pan', startClient: [event.clientX, event.clientY], startView: view }); event.currentTarget.setPointerCapture(event.pointerId); }}
          onPointerMove={(event) => updateDrag(event.clientX, event.clientY)}
          onPointerUp={() => setDrag(undefined)}
          onPointerCancel={() => setDrag(undefined)}
          onWheel={(event) => { event.preventDefault(); zoom(event.deltaY > 0 ? 1.1 : 0.9); }}
        >
          <defs>
            <pattern id="formboard-grid" width={Number(formboard.board.gridSpacingMm)} height={Number(formboard.board.gridSpacingMm)} patternUnits="userSpaceOnUse">
              <path d={`M ${Number(formboard.board.gridSpacingMm)} 0 L 0 0 0 ${Number(formboard.board.gridSpacingMm)}`} fill="none" stroke="#dbe4ef" strokeWidth="0.35" />
            </pattern>
            <filter id="soft-shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity=".18" /></filter>
          </defs>
          <rect x="0" y="0" width={Number(formboard.board.widthMm)} height={Number(formboard.board.heightMm)} rx="4" fill="#f8fafc" stroke="#64748b" strokeWidth="1" />
          {showGrid && <rect x="0" y="0" width={Number(formboard.board.widthMm)} height={Number(formboard.board.heightMm)} fill="url(#formboard-grid)" pointerEvents="none" />}
          {projection.records.filter((item) => item.kind === 'contextRect').map((item) => item.kind === 'contextRect' && (
            <g key={item.id} opacity=".8"><rect x={Number(item.origin.x)} y={Number(item.origin.y)} width={item.widthMm} height={item.heightMm} rx="5" fill="#e2e8f0" fillOpacity=".35" stroke="#94a3b8" strokeDasharray="7 4" /><text x={Number(item.origin.x) + 7} y={Number(item.origin.y) + 13} fontSize="7" fill="#64748b" fontWeight="600">{item.label}</text></g>
          ))}
          {formboard.segmentGeometry.map((segment) => {
            const routeIsSelected = selectedRoute?.route.segmentIds.includes(segment.routeSegmentId) ?? false;
            const isSelected = selected(selection.primary, 'routeSegment', segment.routeSegmentId) || routeIsSelected;
            const d = segment.geometryKind === 'cubicSpline' ? splinePathData(segment.points) : polylinePath(segment.points);
            return <path key={segment.routeSegmentId} d={d} fill="none" stroke={isSelected ? '#0ea5e9' : '#334155'} strokeWidth={isSelected ? Number(segment.bundleDiameterMm ?? 4) + 3 : Number(segment.bundleDiameterMm ?? 4)} strokeLinecap="round" strokeLinejoin="round" className="cursor-pointer" data-entity-id={segment.routeSegmentId} role="button" aria-label={`Edit route segment ${segment.routeSegmentId}`} tabIndex={0} onClick={(event) => { event.stopPropagation(); setSelection({ kind: 'routeSegment', id: segment.routeSegmentId }); }} onPointerDown={(event) => { event.stopPropagation(); setSelection({ kind: 'routeSegment', id: segment.routeSegmentId }); }} />;
          })}
          {projection.records.filter((item) => item.kind === 'accessorySpan').map((item) => item.kind === 'accessorySpan' && <g key={item.id} className="cursor-pointer" role="button" aria-label={`Select ${item.accessoryKind} ${item.id}`} tabIndex={0} onPointerDown={(event) => { event.stopPropagation(); setSelection(item.entity); }}><path d={polylinePath(item.points)} fill="none" stroke={item.accessoryKind === 'tapeWrap' ? '#f59e0b' : '#0891b2'} strokeOpacity=".72" strokeWidth={selected(selection.primary, item.entity.kind, item.id) ? item.widthMm + 3 : item.widthMm} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={item.accessoryKind === 'sleeve' ? '7 3' : undefined} /><text x={Number(item.points[Math.floor(item.points.length / 2)].x)} y={Number(item.points[Math.floor(item.points.length / 2)].y) - 8} textAnchor="middle" fontSize="6" fontWeight="700" fill={item.accessoryKind === 'tapeWrap' ? '#92400e' : '#155e75'}>{item.text}</text></g>)}
          {formboard.connectorPlacements.map((item) => {
            const isSelected = selected(selection.primary, 'connectorOccurrence', item.connectorOccurrenceId);
            return <g key={item.connectorOccurrenceId} transform={`translate(${item.position.x} ${item.position.y}) rotate(${item.rotationDeg})`} className="cursor-grab" filter="url(#soft-shadow)" data-entity-id={item.connectorOccurrenceId} onPointerDown={(event) => { event.stopPropagation(); setSelection({ kind: 'connectorOccurrence', id: item.connectorOccurrenceId }); setDrag({ kind: 'connector', id: item.connectorOccurrenceId }); event.currentTarget.setPointerCapture(event.pointerId); }}><rect x="-14" y="-10" width="28" height="20" rx="3" fill={isSelected ? '#bae6fd' : '#e0f2fe'} stroke={isSelected ? '#0284c7' : '#0369a1'} strokeWidth={isSelected ? 2.5 : 1.2} /><path d="M -2 -5 L 5 0 L -2 5" fill="none" stroke="#0369a1" strokeWidth="1.2" /><text y="-14" textAnchor="middle" fontSize="6" fontWeight="700" fill="#0f172a" transform={`rotate(${-Number(item.rotationDeg)})`}>{item.connectorOccurrenceId}</text></g>;
          })}
          {formboard.routeJunctionPlacements.map((item) => <g key={item.routeJunctionId} transform={`translate(${item.position.x} ${item.position.y})`} className="cursor-grab" data-entity-id={item.routeJunctionId} onPointerDown={(event) => { event.stopPropagation(); setSelection({ kind: 'routeJunction', id: item.routeJunctionId }); setDrag({ kind: 'junction', id: item.routeJunctionId }); event.currentTarget.setPointerCapture(event.pointerId); }}><circle r="8" fill="white" stroke="#7c3aed" strokeWidth={selected(selection.primary, 'routeJunction', item.routeJunctionId) ? 3 : 1.8} /><path d="M -5 0 H 5 M 0 -5 V 5" stroke="#7c3aed" strokeWidth="1.4" /></g>)}
          {formboard.splicePlacements.map((item) => <g key={item.electricalSpliceId} transform={`translate(${item.position.x} ${item.position.y})`} className="cursor-grab" data-entity-id={item.electricalSpliceId} onPointerDown={(event) => { event.stopPropagation(); setSelection({ kind: 'electricalSplice', id: item.electricalSpliceId }); setDrag({ kind: 'splice', id: item.electricalSpliceId }); event.currentTarget.setPointerCapture(event.pointerId); }}><path d="M 0 -8 L 8 0 L 0 8 L -8 0 Z" fill="#ef4444" stroke="#7f1d1d" strokeWidth={selected(selection.primary, 'electricalSplice', item.electricalSpliceId) ? 3 : 1.5} /><text x="11" y="2" fontSize="6" fontWeight="700" fill="#7f1d1d">{item.electricalSpliceId}</text></g>)}
          {formboard.studPlacements.map((item) => <g key={item.studId} transform={`translate(${item.position.x} ${item.position.y})`}><circle r="7" fill="#fbbf24" stroke="#92400e" strokeWidth="1.5" /><circle r="2.5" fill="#fff" /><text x="10" y="2" fontSize="6" fontWeight="700" fill="#78350f">{item.studId}</text></g>)}
          {formboard.annotations.map((item) => <text key={item.id} x={Number(item.position.x)} y={Number(item.position.y)} fontSize="6" fontWeight="600" fill="#475569">{item.text}</text>)}
          {projection.records.filter((item) => item.kind === 'accessoryCallout').map((item) => item.kind === 'accessoryCallout' && <g key={item.id} className="cursor-pointer" role="button" aria-label={`Select label ${item.id}`} tabIndex={0} onPointerDown={(event) => { event.stopPropagation(); setSelection(item.entity); }}><path d={`M ${item.anchor.x} ${item.anchor.y} L ${item.position.x} ${item.position.y}`} stroke="#64748b" strokeWidth="1" /><circle cx={Number(item.anchor.x)} cy={Number(item.anchor.y)} r="4" fill="#0ea5e9" /><rect x={Number(item.position.x)} y={Number(item.position.y) - 8} width="80" height="13" rx="2" fill="#fff" stroke={selected(selection.primary, 'label', item.id) ? '#0ea5e9' : '#94a3b8'} strokeWidth={selected(selection.primary, 'label', item.id) ? 2 : 1} /><text x={Number(item.position.x) + 4} y={Number(item.position.y)} fontSize="5" fontWeight="700" fill="#0f172a">{item.text}</text></g>)}
          {projection.records.filter((item) => item.kind === 'heatShrink').map((item) => item.kind === 'heatShrink' && <g key={item.id} className="cursor-pointer" role="button" aria-label={`Select heat shrink ${item.id}`} tabIndex={0} onPointerDown={(event) => { event.stopPropagation(); setSelection(item.entity); }}><circle cx={Number(item.position.x)} cy={Number(item.position.y)} r="11" fill="none" stroke="#db2777" strokeWidth={selected(selection.primary, 'heatShrinkPlacement', item.id) ? 4 : 2.5} /><text x={Number(item.position.x) + 13} y={Number(item.position.y) + 12} fontSize="5" fontWeight="700" fill="#9d174d">{item.text}</text></g>)}
          {selectedSegment?.points.map((point, index) => <circle key={`${selectedSegment.routeSegmentId}:${index}`} cx={Number(point.x)} cy={Number(point.y)} r="5" fill="#fff" stroke="#0ea5e9" strokeWidth="2" className="cursor-move" role="button" aria-label={`Move spline knot ${index + 1} of ${selectedSegment.routeSegmentId}`} tabIndex={0} onPointerDown={(event) => { event.stopPropagation(); setDrag({ kind: 'routePoint', id: selectedSegment.routeSegmentId, index }); event.currentTarget.setPointerCapture(event.pointerId); }} />)}
        </svg>
      </section>

      <aside className="min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-sky-600">Manufacturing</p><h2 className="mt-1 text-lg font-semibold text-slate-900">1:1 Formboard</h2><p className="text-xs text-slate-500">{formboard.board.widthMm} × {formboard.board.heightMm} mm</p></div>
          <Button size="sm" onClick={() => downloadSvg(project, formboard)}><Download className="mr-1 h-4 w-4" /> SVG</Button>
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="flex items-center gap-2 font-medium text-slate-800"><RouteIcon className="h-4 w-4 text-sky-600" />Selection</div>
          <p className="mt-2 break-all font-mono text-xs text-slate-600">{selection.primary ? `${selection.primary.kind}:${selection.primary.id}` : 'Nothing selected'}</p>
          {selectedSegment && <p className="mt-2 text-xs text-slate-500">Drag the visible spline knots. Length updates from the cubic geometry.</p>}
          {selectedRoute && <p className="mt-2 text-xs text-slate-600">Conductors: {selectedRoute.conductors.join(', ') || 'none'}</p>}
        </div>
        <div className="mt-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Geometry-derived routes</h3>
          {routeMetrics.map(({ route, length, conductors }) => <button key={route.routeId} type="button" className={`w-full rounded-xl border p-3 text-left transition ${selected(selection.primary, 'route', route.routeId) || selectedRoute?.route.routeId === route.routeId ? 'border-sky-400 bg-sky-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`} onClick={() => setSelection({ kind: 'route', id: route.routeId })}><div className="flex items-center justify-between gap-2"><span className="truncate font-mono text-xs font-semibold text-slate-700">{route.routeId}</span><span className="whitespace-nowrap text-sm font-semibold text-sky-700">{length.status === 'resolved' ? `${Number(length.valueMm).toFixed(1)} mm` : 'Unresolved'}</span></div><p className="mt-1 truncate text-xs text-slate-500">{conductors.join(', ') || 'No conductors'}</p></button>)}
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between"><h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Accessories</h3><div className="flex gap-1"><button type="button" className="rounded border border-slate-300 px-1.5 py-1 text-[9px] text-slate-600" onClick={() => addAccessory('label')}>+ Label</button><button type="button" className="rounded border border-slate-300 px-1.5 py-1 text-[9px] text-slate-600" onClick={() => addAccessory('tapeWrap')}>+ Tape</button><button type="button" className="rounded border border-slate-300 px-1.5 py-1 text-[9px] text-slate-600" onClick={() => addAccessory('sleeve')}>+ Sleeve</button></div></div>
          {(formboard.accessories ?? []).map((accessory) => <button key={accessory.id} type="button" className={`w-full rounded-lg border px-3 py-2 text-left ${selected(selection.primary, accessory.kind === 'label' ? 'label' : accessory.kind === 'tapeWrap' ? 'tapeWrap' : 'sleeve', accessory.id) ? 'border-sky-400 bg-sky-50' : 'border-slate-200'}`} onClick={() => setSelection({ kind: accessory.kind === 'label' ? 'label' : accessory.kind === 'tapeWrap' ? 'tapeWrap' : 'sleeve', id: accessory.id })}><span className="font-mono text-[10px] font-semibold text-slate-700">{accessory.id}</span><span className="float-right text-[10px] uppercase text-slate-500">{accessory.kind}</span></button>)}
        </div>
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Spline geometry</h3>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {formboard.segmentGeometry.map((segment) => <button key={segment.routeSegmentId} type="button" className={`truncate rounded-lg border px-2 py-2 text-left font-mono text-[10px] transition ${selected(selection.primary, 'routeSegment', segment.routeSegmentId) ? 'border-sky-400 bg-sky-50 text-sky-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`} onClick={() => setSelection({ kind: 'routeSegment', id: segment.routeSegmentId })}>{segment.routeSegmentId}</button>)}
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 p-3 text-xs">
          <div className="flex justify-between"><span className="text-slate-500">Diagnostics</span><span className={diagnostics.length ? 'font-semibold text-amber-600' : 'font-semibold text-emerald-600'}>{diagnostics.length}</span></div>
          <div className="mt-2 flex justify-between"><span className="text-slate-500">Route segments</span><span className="font-semibold">{formboard.segmentGeometry.length}</span></div>
          <div className="mt-2 flex justify-between"><span className="text-slate-500">Smooth paths</span><span className="font-semibold">{formboard.segmentGeometry.filter((item) => item.geometryKind === 'cubicSpline').length}</span></div>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">SVG is the authoritative vector artifact. Print at 100% / actual size and verify the 100 mm calibration witness; browser auto-fit invalidates scale.</p>
      </aside>
    </div>
  );
}
