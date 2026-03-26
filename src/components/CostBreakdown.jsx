import { formatCurrency } from '../utils/format'
import { MARGIN_PCT } from '../config/pricing'

function Row({ label, detail, amount, bold, separator }) {
  if (separator) {
    return <div style={{ height: '1px', backgroundColor: '#2d3448', margin: '4px 0' }} />
  }
  return (
    <div className={`flex items-baseline justify-between py-1.5 ${bold ? 'mt-1' : ''}`}>
      <div className="flex flex-col">
        <span className={`text-sm ${bold ? 'font-semibold text-white' : 'text-slate-300'}`}>{label}</span>
        {detail && <span className="text-xs text-slate-500 font-mono">{detail}</span>}
      </div>
      <span
        className={`font-mono text-sm ml-4 tabular-nums ${bold ? 'font-semibold text-white' : 'text-slate-300'}`}
      >
        {amount}
      </span>
    </div>
  )
}

export default function CostBreakdown({ breakdown, marginPct = MARGIN_PCT }) {
  if (!breakdown) return null

  const { frame, frameCost, sqm, claddingCost, doorjamCost, installationCost, subtotal, marginAmount, total } = breakdown

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: '#12172a', border: '1px solid #2d3448' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3"/>
          <polyline points="9,7 9,3 15,3 15,7"/>
          <line x1="9" y1="12" x2="15" y2="12"/>
          <line x1="9" y1="16" x2="11" y2="16"/>
        </svg>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cost Breakdown</span>
      </div>

      <Row
        label="Frame"
        detail={frame ? `${frame.size}` : 'Enter door width'}
        amount={formatCurrency(frameCost)}
      />
      <Row
        label="Cladding"
        detail={sqm > 0 ? `${sqm} boards` : 'Enter dimensions'}
        amount={formatCurrency(claddingCost)}
      />
      {doorjamCost > 0 && (
        <Row
          label="Door Jam"
          detail={`${breakdown.doorjamMetres || '?'} boards`}
          amount={formatCurrency(doorjamCost)}
        />
      )}
      {installationCost > 0 && (
        <Row
          label="Installation"
          detail="Base + area rate"
          amount={formatCurrency(installationCost)}
        />
      )}

      <Row separator />

      <Row label="Subtotal" amount={formatCurrency(subtotal)} />
      <Row
        label={`Margin (${Math.round(marginPct * 100)}%)`}
        amount={formatCurrency(marginAmount)}
      />

      <div
        className="mt-2 rounded-lg px-3 py-2.5 flex items-center justify-between"
        style={{ backgroundColor: '#1e2a3d', border: '1px solid #f97316' }}
      >
        <span className="text-sm font-bold text-white">TOTAL PRICE</span>
        <span className="font-mono text-lg font-bold tabular-nums" style={{ color: '#f97316' }}>
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  )
}
