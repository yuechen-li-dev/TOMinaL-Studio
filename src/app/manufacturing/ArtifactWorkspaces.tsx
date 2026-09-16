import { Download, RefreshCw } from 'lucide-react';

import type { AppCommandDispatcher, Selection } from '@/app/session/appSession';
import { singleSelection } from '@/app/session/appSession';
import type { ArtifactProjection, GeneratedArtifact, QuoteSnapshot } from '@/artifacts';

const th = 'sticky top-0 border-b border-slate-700 bg-slate-900 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500';
const td = 'border-b border-slate-800 px-2 py-1.5 text-[11px] text-slate-300';

export function WiresWorkspace({ projection, selection, dispatch }: { projection: ArtifactProjection; selection: Selection; dispatch: AppCommandDispatcher }) {
  return <TableFrame title="Wire Cut List" subtitle={`${projection.cutList.length} resolved conductors · geometry + allowance in mm`}>
    <table className="min-w-[1500px] w-full border-collapse"><thead><tr>{['Wire ID','Circuit','Endpoints','Wire / Gauge / Color','Route','Route mm','Slack','Allowance','Cut mm','Terminations','Status'].map((label) => <th className={th} key={label}>{label}</th>)}</tr></thead><tbody>
      {projection.cutList.map((row) => <tr key={row.wireId} aria-selected={selection.primary?.kind === 'conductor' && selection.primary.id === row.wireId} className="cursor-pointer hover:bg-slate-900 aria-selected:bg-cyan-950/40" onClick={() => dispatch({ type: 'selection.set', selection: singleSelection({ kind: 'conductor', id: row.wireId }) })}>
        <td className={`${td} font-mono text-cyan-300`}>{row.wireId}</td><td className={td}>{row.circuit}</td><td className={td}>{row.fromConnector}:{row.fromCavity} → {row.toConnector || row.toCavitySpliceStud}:{row.toConnector ? row.toCavitySpliceStud : ''}</td><td className={td}>{row.wireType} · {row.gauge} · {row.color}</td><td className={td}>{row.routeId}</td><td className={td}>{row.routeLengthMm.toFixed(1)}</td><td className={td}>{row.slackMm.toFixed(1)}</td><td className={td}>{row.terminationAllowanceMm.toFixed(1)}</td><td className={`${td} font-semibold text-slate-100`}>{row.cutLengthMm.toFixed(1)}</td><td className={td}>{row.terminalA || '—'} / {row.terminalB || '—'}</td><td className={td}><span className="text-emerald-400">Resolved</span>{row.lengthProvenance === 'override' ? ' · override' : ''}</td>
      </tr>)}
    </tbody></table>
  </TableFrame>;
}

export function BomWorkspace({ projection, dispatch }: { projection: ArtifactProjection; dispatch: AppCommandDispatcher }) {
  return <TableFrame title="Bill of Materials" subtitle={`${projection.bom.length} grouped manufacturer-part rows · required quantity only`}>
    <table className="min-w-[1050px] w-full border-collapse"><thead><tr>{['Category','Manufacturer','Part Number','Description','Quantity','Unit','Conductors','Sources'].map((label) => <th className={th} key={label}>{label}</th>)}</tr></thead><tbody>{projection.bom.map((row) => <tr key={row.id} className="cursor-pointer hover:bg-slate-900" onClick={() => row.sourceEntities[0] && dispatch({ type: 'selection.set', selection: singleSelection(row.sourceEntities[0]) })}><td className={td}>{row.category}</td><td className={td}>{row.manufacturer}</td><td className={`${td} font-mono text-cyan-300`}>{row.partNumber}</td><td className={td}>{row.description}</td><td className={`${td} text-right font-semibold`}>{row.quantity}</td><td className={td}>{row.unit}</td><td className={td}>{row.conductorCount ?? '—'}</td><td className={td}>{row.sourceEntities.length}</td></tr>)}</tbody></table>
  </TableFrame>;
}

export function QuoteWorkspace({ quote, dispatch }: { quote: QuoteSnapshot; dispatch: AppCommandDispatcher }) {
  return <TableFrame title="Quote Snapshot" subtitle={`${quote.label} · ${quote.timestamp}`} action={<button type="button" className="flex items-center gap-1.5 border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:border-cyan-500" onClick={() => dispatch({ type: 'quote.refresh' })}><RefreshCw className="h-3.5 w-3.5" />Refresh snapshot</button>}>
    <table className="min-w-[1200px] w-full border-collapse"><thead><tr>{['BOM Line','Required','Purchase','Status','MOQ','Unit Price','Extended','Price Breaks','Provider','Snapshot'].map((label) => <th className={th} key={label}>{label}</th>)}</tr></thead><tbody>{quote.lines.map((line) => <tr key={line.bomRowId}><td className={`${td} font-mono text-cyan-300`}>{line.partNumber}</td><td className={td}>{line.requiredQuantity} {line.unit}</td><td className={td}>{line.quotedPurchaseQuantity} {line.unit}</td><td className={td}><span className={line.status === 'available' ? 'text-emerald-400' : 'text-amber-400'}>{line.status}</span></td><td className={td}>{line.moq ?? '—'}</td><td className={td}>{line.unitPrice === undefined ? '—' : `${line.currency} ${line.unitPrice.toFixed(4)}`}</td><td className={`${td} font-semibold`}>{line.extendedPrice === undefined ? '—' : `${line.currency} ${line.extendedPrice.toFixed(2)}`}</td><td className={td}>{line.priceBreaks.map((item) => `${item.minimumQuantity}+: ${item.unitPrice}`).join(' · ') || '—'}</td><td className={td}>{line.provider}</td><td className={td}>{quote.timestamp}</td></tr>)}</tbody></table>
    <div className="sticky bottom-0 flex justify-end gap-6 border-t border-slate-700 bg-slate-900 px-4 py-3 text-sm"><span className="text-slate-500">Unavailable {quote.unavailableLineCount}</span><strong>Subtotal {quote.currency} {quote.subtotal.toFixed(2)}</strong></div>
  </TableFrame>;
}

export function ManufacturingWorkspace({ artifacts, exportAllLabel, exportStatus, onDownload, onDownloadAll }: { artifacts: readonly GeneratedArtifact[]; exportAllLabel: string; exportStatus: string; onDownload: (artifact: GeneratedArtifact) => void; onDownloadAll: () => void | Promise<void> }) {
  return <div className="h-full overflow-y-auto p-5"><div className="mx-auto max-w-4xl"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-lg font-semibold">Manufacturing Artifacts</h2><p className="mt-1 text-xs text-slate-500">Release-ready deterministic projections. Engineering source remains HarnessIr + Formboard + Catalog.</p>{exportStatus ? <p className="mt-1 text-[10px] text-cyan-500">{exportStatus}</p> : null}</div><button type="button" className="flex items-center gap-2 bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400" onClick={onDownloadAll}><Download className="h-4 w-4" />{exportAllLabel}</button></div><div className="grid gap-2">{artifacts.map((artifact) => <div key={artifact.file} className="grid grid-cols-[1fr_180px_110px] items-center border border-slate-800 bg-slate-900 px-3 py-2"><div><div className="font-mono text-xs text-slate-200">{artifact.file}</div><div className="mt-0.5 text-[10px] text-slate-600">sha256:{artifact.sha256.slice(0, 16)}…</div></div><span className="text-[11px] text-slate-500">{artifact.artifactType}</span><button type="button" className="flex items-center justify-center gap-1 border border-slate-700 px-2 py-1 text-[11px] hover:border-cyan-500" onClick={() => onDownload(artifact)}><Download className="h-3 w-3" />Export</button></div>)}</div></div></div>;
}

function TableFrame({ title, subtitle, action, children }: { title: string; subtitle: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="flex h-full min-h-0 flex-col"><header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3"><div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-0.5 text-[10px] text-slate-500">{subtitle}</p></div>{action}</header><div className="min-h-0 flex-1 overflow-auto">{children}</div></section>;
}
