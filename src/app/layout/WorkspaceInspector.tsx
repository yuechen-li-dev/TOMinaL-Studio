import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

import type { AppCommandDispatcher, Selection, WorkspaceId } from '@/app/session/appSession';
import { singleSelection } from '@/app/session/appSession';
import { deriveBundleSections, deriveHeatShrinkPlacements, estimateTapeWrap, getRouteLength, routeRelatedConductors, validateSleeveFit, type TominalProject } from '@/formboard';
import { connectorOccurrenceId, planConnectorRemoval, type Diagnostic } from '@/harness-core';

export function WorkspaceInspector({ project, selection, diagnostics, dispatch, workspace }: {
  project: TominalProject;
  selection: Selection;
  diagnostics: readonly Diagnostic[];
  dispatch: AppCommandDispatcher;
  workspace: WorkspaceId;
}) {
  const [showRemovalPlan, setShowRemovalPlan] = useState(false);
  const entity = selection.primary;
  const conductor = entity?.kind === 'conductor' ? project.harness.conductors.find((item) => item.id === entity.id) : undefined;
  const connector = entity?.kind === 'connectorOccurrence' ? project.harness.connectorOccurrences.find((item) => item.id === entity.id) : undefined;
  const route = entity?.kind === 'route' ? project.harness.routes.find((item) => item.id === entity.id) : conductor?.routeId ? project.harness.routes.find((item) => item.id === conductor.routeId) : undefined;
  const routeLength = route ? getRouteLength(project.formboard, route.id) : undefined;
  const relatedConductors = route ? routeRelatedConductors(project.harness, route.id) : [];
  const accessory = project.formboard.accessories?.find((item) => item.id === entity?.id);
  const tape = accessory?.kind === 'tapeWrap' ? estimateTapeWrap(project, accessory) : undefined;
  const sleeve = accessory?.kind === 'sleeve' ? validateSleeveFit(project, accessory) : undefined;
  const heatShrink = entity?.kind === 'heatShrinkPlacement' ? deriveHeatShrinkPlacements(project).placements.find((item) => item.id === entity.id) : undefined;
  const routeBundle = route ? deriveBundleSections(project.harness, project.formboard, route.id) : undefined;

  const navigateDiagnostic = (diagnostic: Diagnostic) => {
    dispatch({ type: 'selection.set', selection: singleSelection(diagnostic.entity) });
    if (diagnostic.entity.kind === 'route' || diagnostic.entity.kind === 'routeSegment' || diagnostic.entity.kind === 'routeJunction') {
      dispatch({ type: 'workspace.switch', workspace: 'formboard' });
    } else if (diagnostic.entity.kind !== 'catalogPart') {
      dispatch({ type: 'workspace.switch', workspace: 'logical' });
    }
  };

  return (
    <aside className="flex min-h-0 flex-col border-l border-slate-800 bg-slate-900/95" aria-label="Inspector">
      <div className="border-b border-slate-800 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">Inspector</div>
        <div className="mt-2 text-sm font-semibold text-slate-100">{entity?.id ?? 'No selection'}</div>
        <div className="mt-0.5 text-[11px] text-slate-500">{entity?.kind ?? `Select an entity in ${workspace}`}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {conductor ? <section className="space-y-3">
          <Property label="Circuit" value={conductor.circuitId} />
          <Property label="Wire type" value={conductor.wireTypeId} />
          <Property label="Color" value={conductor.color} />
          <label className="block text-[11px] text-slate-500">Slack (mm)<input aria-label="Conductor slack" className="mt-1 w-full border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200" type="number" value={Number(conductor.slackMm)} onChange={(event) => dispatch({ type: 'harness.updateConductor', id: conductor.id, patch: { slackMm: Number(event.target.value) as typeof conductor.slackMm } })} /></label>
          <Property label="Physical route" value={conductor.routeId ?? 'Unrouted'} />
          <Property label="Route length" value={routeLength?.status === 'resolved' ? `${Number(routeLength.valueMm).toFixed(1)} mm` : 'Unresolved'} />
        </section> : null}
        {connector ? <section className="space-y-3"><Property label="Role" value={connector.role} /><Property label="Family" value={connector.familyId} /><Property label="Cavities" value={String(connector.cavityPopulations.length)} /><button type="button" className="border border-amber-800 px-2 py-1.5 text-xs text-amber-300 hover:bg-amber-950" onClick={() => setShowRemovalPlan((current) => !current)}>Review delete impact</button>{showRemovalPlan ? <RemovalPlan project={project} connectorId={connector.id} /> : null}</section> : null}
        {route ? <section className="mt-3 space-y-3"><Property label="Segments" value={String(route.segmentIds.length)} /><Property label="Length" value={routeLength?.status === 'resolved' ? `${Number(routeLength.valueMm).toFixed(1)} mm` : 'Unresolved'} /><Property label="Conductors" value={relatedConductors.join(', ') || 'None'} /></section> : null}
        {routeBundle ? <section className="mt-3 space-y-3"><Property label="Bundle sections" value={String(routeBundle.sections.length)} /><Property label="Core OD range" value={`${Math.min(...routeBundle.sections.map((item) => Number(item.coreDiameterMm ?? Infinity))).toFixed(3)}–${Math.max(...routeBundle.sections.map((item) => Number(item.coreDiameterMm ?? 0))).toFixed(3)} mm estimated`} /><Property label="Packing efficiency" value={String(routeBundle.sections[0]?.packingEfficiency ?? '—')} /></section> : null}
        {accessory?.kind === 'label' ? <section className="mt-3 space-y-3"><label className="block text-[11px] text-slate-500">Text<input aria-label="Label text" className="mt-1 w-full border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200" value={accessory.text} onChange={(event) => dispatch({ type: 'formboard.updateAccessory', id: accessory.id, patch: { text: event.target.value } })} /></label><Property label="Route" value={accessory.routeId} /><NumberEditor label="Station (mm)" value={Number(accessory.stationMm)} onChange={(value) => dispatch({ type: 'formboard.updateAccessory', id: accessory.id, patch: { stationMm: value as typeof accessory.stationMm } })} /></section> : null}
        {accessory?.kind === 'tapeWrap' ? <section className="mt-3 space-y-3"><NumberEditor label="Start station (mm)" value={Number(accessory.startStationMm)} onChange={(value) => dispatch({ type: 'formboard.updateAccessory', id: accessory.id, patch: { startStationMm: value as typeof accessory.startStationMm } })} /><NumberEditor label="End station (mm)" value={Number(accessory.endStationMm)} onChange={(value) => dispatch({ type: 'formboard.updateAccessory', id: accessory.id, patch: { endStationMm: value as typeof accessory.endStationMm } })} /><NumberEditor label="Overlap fraction" value={accessory.overlapFraction} step={0.05} onChange={(value) => dispatch({ type: 'formboard.updateAccessory', id: accessory.id, patch: { overlapFraction: value } })} /><NumberEditor label="Waste factor" value={accessory.wasteFactor} step={0.05} onChange={(value) => dispatch({ type: 'formboard.updateAccessory', id: accessory.id, patch: { wasteFactor: value } })} /><Property label="Mode" value={accessory.mode} /><Property label="Bundle OD range" value={tape?.estimate ? `${tape.estimate.bundleDiameterMinMm.toFixed(3)}–${tape.estimate.bundleDiameterMaxMm.toFixed(3)} mm` : 'Unresolved'} /><Property label="Estimated tape" value={tape?.estimate ? `${tape.estimate.estimatedTapeLengthMm.toFixed(3)} mm` : 'Unresolved'} /></section> : null}
        {accessory?.kind === 'sleeve' ? <section className="mt-3 space-y-3"><NumberEditor label="Start station (mm)" value={Number(accessory.startStationMm)} onChange={(value) => dispatch({ type: 'formboard.updateAccessory', id: accessory.id, patch: { startStationMm: value as typeof accessory.startStationMm } })} /><NumberEditor label="End station (mm)" value={Number(accessory.endStationMm)} onChange={(value) => dispatch({ type: 'formboard.updateAccessory', id: accessory.id, patch: { endStationMm: value as typeof accessory.endStationMm } })} /><Property label="Cut length" value={`${sleeve?.qualification.cutLengthMm.toFixed(3) ?? '—'} mm`} /><Property label="Max bundle OD" value={`${sleeve?.qualification.maxBundleDiameterMm?.toFixed(3) ?? '—'} mm`} /><Property label="Fit" value={sleeve?.qualification.valid ? 'Validated' : 'Invalid'} /></section> : null}
        {heatShrink ? <section className="mt-3 space-y-3"><Property label="Termination" value={heatShrink.terminationId} /><Property label="Substrate OD" value={`${Number(heatShrink.substrateMaxDiameterMm)} mm`} /><Property label="Tubing range" value={`${Number(heatShrink.suppliedInnerDiameterMm)} → ${Number(heatShrink.recoveredInnerDiameterMm)} mm`} /><Property label="Cut length" value={`${Number(heatShrink.cutLengthMm)} mm`} /></section> : null}
        {!entity ? <p className="text-xs leading-5 text-slate-500">Selection is shared by Logical and Formboard. Choose a conductor or connector to inspect the same semantic entity across views.</p> : null}
        <section className="mt-6 border-t border-slate-800 pt-3">
          <div className="mb-2 flex items-center justify-between"><h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Diagnostics</h2><span className={`text-xs font-semibold ${diagnostics.length ? 'text-amber-400' : 'text-emerald-400'}`}>{diagnostics.length}</span></div>
          {diagnostics.length === 0 ? <div className="flex items-center gap-2 text-xs text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />Validation clean</div> : diagnostics.slice(0, 20).map((diagnostic) => <button key={diagnostic.id} type="button" className="mb-1.5 flex w-full gap-2 border border-slate-800 bg-slate-950/50 p-2 text-left text-[11px] text-slate-400 hover:border-amber-700" onClick={() => navigateDiagnostic(diagnostic)}><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" /><span><strong className="block text-slate-300">{diagnostic.rule}</strong>{diagnostic.message}</span></button>)}
        </section>
      </div>
    </aside>
  );
}

function RemovalPlan({ project, connectorId }: { project: TominalProject; connectorId: string }) {
  const plan = planConnectorRemoval(project.harness, connectorOccurrenceId(connectorId));
  return <div className="border border-amber-900 bg-amber-950/30 p-2 text-[11px] text-amber-200"><strong className="block">Destructive edit plan</strong><p className="mt-1 text-amber-300/80">{plan.affectedEntities.length} dependent semantic entities. Removal is not applied until an explicit domain command confirms this plan.</p><ul className="mt-2 max-h-32 overflow-y-auto font-mono text-[10px] text-amber-100/80">{plan.affectedEntities.map((entity) => <li key={`${entity.kind}:${entity.id}`}>{entity.kind}:{entity.id}</li>)}</ul></div>;
}

function Property({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[10px] uppercase tracking-wide text-slate-600">{label}</div><div className="mt-0.5 break-words font-mono text-xs text-slate-300">{value}</div></div>;
}

function NumberEditor({ label, value, step = 1, onChange }: { label: string; value: number; step?: number; onChange: (value: number) => void }) {
  return <label className="block text-[11px] text-slate-500">{label}<input aria-label={label} className="mt-1 w-full border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200" type="number" step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}
