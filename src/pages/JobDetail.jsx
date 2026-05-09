import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate } from '../utils/format'
import { MARGIN_PCT } from '../config/pricing'
import StatusBadge from '../components/StatusBadge'
import { downloadQuotePDF } from '../utils/generatePDF'

const STATUSES = ['Draft', 'Sent', 'Followed Up', 'Won', 'Lost']

function DetailRow({ label, value, mono }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex justify-between items-baseline py-2" style={{ borderBottom: '1px solid #2d3448' }}>
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm text-white ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

function CostRow({ label, sub, value, bold, highlight }) {
  return (
    <div
      className={`flex justify-between items-center py-2 px-3 rounded-lg ${highlight ? 'mt-1' : ''}`}
      style={highlight ? { backgroundColor: '#1e2a3d', border: '1px solid #f97316' } : {}}
    >
      <div>
        <span className={`text-sm ${bold ? 'font-semibold text-white' : 'text-slate-300'}`}>{label}</span>
        {sub && <div className="text-xs text-slate-500 font-mono">{sub}</div>}
      </div>
      <span
        className={`font-mono text-sm tabular-nums ml-4 ${highlight ? 'font-bold text-lg' : ''} ${bold ? 'font-semibold text-white' : 'text-slate-300'}`}
        style={highlight ? { color: '#f97316' } : {}}
      >
        {value}
      </span>
    </div>
  )
}

function SectionHeader({ label }) {
  return (
    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-4 mb-1 px-1 flex items-center gap-2">
      <span style={{ color: '#f97316' }}>▪</span> {label}
    </div>
  )
}

function parseNotes(raw) {
  if (!raw) return { userNotes: null, parsed: null }
  try {
    const obj = JSON.parse(raw)
    if (obj.v === 2 || obj.v === 3) return { userNotes: obj.userNotes || null, parsed: obj }
  } catch {}
  return { userNotes: raw, parsed: null }
}

function buildSummaryText(job, parsed) {
  const fmt = (n) => `$${Math.round(n || 0).toLocaleString('en-AU')}`
  const lines = []
  const g  = parsed?.garage
  const fd = parsed?.frontDoor
  const w  = parsed?.wall

  lines.push(`Garage door — ${job.door_type || ''}`)
  if (job.width_mm && job.height_mm) lines.push(`Size: ${job.width_mm}mm × ${job.height_mm}mm`)
  lines.push(`Includes:`)
  lines.push(`  • Doorman Motor`)
  lines.push(`  • 2 Remotes and 1 × wall button`)
  lines.push(`  • Custom aluminium frame`)
  lines.push(`  • Tracks and springs to suit`)
  if (g?.boards > 0) lines.push(`  • Cladding: ${g.boards} boards (${job.frame_size || g.claddingType || ''})`)
  lines.push(`Price: ${fmt(g?.total || job.frame_cost)} + GST`)

  if (fd) {
    lines.push(``)
    lines.push(`Front Door — ${fd.doorCategory || 'Timber'}`)
    if (fd.widthMm && fd.heightMm) lines.push(`Size: ${fd.widthMm}mm × ${fd.heightMm}mm`)
    if (fd.boards > 0) lines.push(`  • Cladding: ${fd.boards} boards (${fd.claddingType || ''})`)
    lines.push(`Price: ${fmt(fd.total)} + GST`)
  }

  if (w) {
    lines.push(``)
    lines.push(`Wall Cladding`)
    if (w.walls?.length > 1) {
      w.walls.forEach((wall, i) => lines.push(`  Wall ${i + 1}: ${wall.widthMm || 0}mm × ${wall.heightMm || 0}mm`))
    } else if (w.walls?.[0]) {
      lines.push(`Size: ${w.walls[0].widthMm || 0}mm wide × ${w.walls[0].heightMm || 0}mm high`)
    } else if (w.widthMm && w.heightMm) {
      lines.push(`Size: ${w.widthMm}mm wide × ${w.heightMm}mm high`)
    }
    lines.push(`Price: ${fmt(w.total)} + GST`)
  }

  lines.push(``)
  lines.push(`─────────────────────────────────────`)
  lines.push(`TOTAL: ${fmt(job.total_price)} + GST`)
  lines.push(`Quote valid for 30 days`)
  lines.push(`Payment: 50% deposit on acceptance, balance on completion`)
  if (parsed?.userNotes) { lines.push(``); lines.push(`Notes: ${parsed.userNotes}`) }
  return lines.join('\n')
}

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob]             = useState(null)
  const [loading, setLoading]     = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [copied, setCopied]       = useState(false)
  const [showSummary, setShowSummary] = useState(false)

  useEffect(() => { fetchJob() }, [id])

  async function fetchJob() {
    setLoading(true)
    const { data, error } = await supabase.from('jobs').select('*').eq('id', id).single()
    if (error) { console.error(error); navigate('/') }
    else setJob(data)
    setLoading(false)
  }

  async function updateStatus(newStatus) {
    setUpdatingStatus(true)
    const { error } = await supabase.from('jobs').update({ status: newStatus }).eq('id', id)
    if (!error) setJob((j) => ({ ...j, status: newStatus }))
    setUpdatingStatus(false)
  }

  function handleCopy(text) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1f2e' }}>
        <div className="w-8 h-8 border-2 border-slate-600 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }
  if (!job) return null

  const { userNotes, parsed } = parseNotes(job.notes)
  const g  = parsed?.garage
  const fd = parsed?.frontDoor
  const w  = parsed?.wall
  const isV3 = parsed?.v === 3
  const marginPct = parsed?.marginPct ?? job.margin_pct ?? MARGIN_PCT
  const marginLabel = `${Math.round(marginPct * 100)}%`
  const summaryText = buildSummaryText(job, parsed)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1f2e' }}>
      {/* Header */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: '#1a1f2e', borderBottom: '1px solid #2d3448' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/')}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15,18 9,12 15,6" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-white truncate m-0 leading-tight">{job.quote_number}</h1>
            <p className="text-xs text-slate-400 m-0 leading-tight">{job.address}{job.suburb ? `, ${job.suburb}` : ''}</p>
          </div>
          <StatusBadge status={job.status} />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 pb-36 flex flex-col gap-4">

        {/* Site details */}
        <section className="rounded-xl p-4" style={{ backgroundColor: '#252b3d', border: '1px solid #2d3448' }}>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Site</div>
          <DetailRow label="Address"    value={job.address} />
          <DetailRow label="Suburb"     value={job.suburb} />
          <DetailRow label="Quote Date" value={formatDate(job.created_at)} />
        </section>

        {/* Door specs */}
        <section className="rounded-xl p-4" style={{ backgroundColor: '#252b3d', border: '1px solid #2d3448' }}>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Door Specifications</div>
          <DetailRow label="Mount Type"    value={job.door_type} />
          <DetailRow label="Width"         value={job.width_mm ? `${job.width_mm}mm` : null} mono />
          <DetailRow label="Height"        value={job.height_mm ? `${job.height_mm}mm` : null} mono />
          <DetailRow label="Cladding Type" value={job.frame_size} />
          {g?.boards > 0 && <DetailRow label="Boards (garage)" value={`${g.boards} boards`} mono />}
        </section>

        {/* Cost breakdown */}
        <section className="rounded-xl p-4" style={{ backgroundColor: '#252b3d', border: '1px solid #2d3448' }}>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Cost Breakdown</div>

          {/* Garage */}
          {g ? (
            <>
              <SectionHeader label="Garage Door" />
              {g.framePkgCost > 0 && <CostRow label="Frame / Motor Package" value={formatCurrency(g.framePkgCost)} />}
              {g.boards > 0 && <CostRow label={`Cladding — ${g.boards} boards`} sub={`${g.boardWidthMm}mm × $${g.boardCostPerUnit}`} value={formatCurrency(g.claddingCost)} />}
              <CostRow label={`Margin (${marginLabel})`} value={formatCurrency(g.margin)} />
              <CostRow label="Garage Total" value={formatCurrency(g.total)} bold />
            </>
          ) : (
            <>
              {job.frame_cost > 0 && <CostRow label={`Frame — ${job.frame_size}`} value={formatCurrency(job.frame_cost)} />}
              {job.cladding_cost > 0 && <CostRow label={`Cladding (${job.cladding_sqm} boards)`} value={formatCurrency(job.cladding_cost)} />}
            </>
          )}

          {/* Front door — v3 format */}
          {fd && isV3 && (
            <>
              <SectionHeader label={`Front Door — ${fd.doorCategory || 'Timber'}`} />
              {fd.doorCategory === 'Timber' && fd.doorCost > 0 && (
                <CostRow label={`Timber door${fd.timberDoorLabel ? ` (${fd.timberDoorLabel})` : ''}`} value={formatCurrency(fd.doorCost)} />
              )}
              {fd.doorCategory === 'Aluminium' && fd.frame > 0 && (
                <CostRow label="Aluminium door frame" value={formatCurrency(fd.frame)} />
              )}
              {fd.jambCost > 0 && <CostRow label={`Door jamb (${fd.jambCount || 1}× length)`} value={formatCurrency(fd.jambCost)} />}
              {fd.pivot > 0 && <CostRow label="Pivot hardware" value={formatCurrency(fd.pivot)} />}
              {fd.doorCategory === 'Timber' && fd.deliv > 0 && <CostRow label="Delivery" value={formatCurrency(fd.deliv)} />}
              {fd.doorCategory === 'Aluminium' && fd.delivJ > 0 && <CostRow label="Delivery — jambs" value={formatCurrency(fd.delivJ)} />}
              {fd.doorCategory === 'Aluminium' && fd.delivD > 0 && <CostRow label="Delivery — door" value={formatCurrency(fd.delivD)} />}
              {fd.sheetCost > 0 && <CostRow label={`Alum composite sheets${fd.alumSheets ? ` (${fd.alumSheets})` : ''}`} value={formatCurrency(fd.sheetCost)} />}
              {fd.boards > 0 && <CostRow label={`Cladding — ${fd.boards} boards`} sub={`${fd.boardWidthMm}mm board`} value={formatCurrency(fd.claddingCost)} />}
              {fd.install > 0 && <CostRow label="Labour — install door" value={formatCurrency(fd.install)} />}
              {fd.clad > 0 && <CostRow label="Labour — clad door" value={formatCurrency(fd.clad)} />}
              <CostRow label={`Margin (${marginLabel})`} value={formatCurrency(fd.margin)} />
              <CostRow label="Front Door Total" value={formatCurrency(fd.total)} bold />
            </>
          )}

          {/* Front door — legacy v2 format */}
          {fd && !isV3 && (
            <>
              <SectionHeader label="Front Door" />
              {fd.doorComponents > 0 && <CostRow label="Door components" value={formatCurrency(fd.doorComponents)} />}
              {fd.boards > 0 && <CostRow label={`Cladding — ${fd.boards} boards`} sub={`${fd.boardWidthMm}mm board`} value={formatCurrency(fd.claddingCost)} />}
              <CostRow label="Trims" value={formatCurrency(fd.trimsCost)} />
              {fd.labourCost > 0 && <CostRow label="Labour" value={formatCurrency(fd.labourCost)} />}
              <CostRow label={`Margin (${marginLabel})`} value={formatCurrency(fd.margin)} />
              <CostRow label="Front Door Total" value={formatCurrency(fd.total)} bold />
            </>
          )}

          {/* Wall cladding — v3 (multi-wall) */}
          {w && isV3 && (
            <>
              <SectionHeader label="Wall Cladding" />
              {w.walls?.length > 1 && w.walls.map((wall, i) => (
                <CostRow key={wall.id || i} label={`Wall ${i + 1}`} sub={`${wall.widthMm || 0}mm × ${wall.heightMm || 0}mm = ${w.wallDetails?.[i]?.boards || 0} boards`} value="" />
              ))}
              {w.totalBoards > 0 && <CostRow label={`Cladding — ${w.totalBoards} boards`} sub={`${w.boardWidthMm}mm board`} value={formatCurrency(w.claddingCost)} />}
              {w.topHatsCost > 0 && <CostRow label="Top hats" value={formatCurrency(w.topHatsCost)} />}
              <CostRow label="Trims" value={formatCurrency(w.trimsCost)} />
              {w.labourCost > 0 && <CostRow label="Labour" value={formatCurrency(w.labourCost)} />}
              {w.curvingCost > 0 && <CostRow label="Curving allowance" value={formatCurrency(w.curvingCost)} />}
              <CostRow label={`Margin (${marginLabel})`} value={formatCurrency(w.margin)} />
              <CostRow label="Wall Total" value={formatCurrency(w.total)} bold />
            </>
          )}

          {/* Wall cladding — legacy v2 (single wall) */}
          {w && !isV3 && (
            <>
              <SectionHeader label="Wall Cladding" />
              {w.boards > 0 && <CostRow label={`Cladding — ${w.boards} boards`} sub={`${w.boardWidthMm}mm board`} value={formatCurrency(w.claddingCost)} />}
              {w.topHatsCost > 0 && <CostRow label="Top hats" value={formatCurrency(w.topHatsCost)} />}
              <CostRow label="Trims" value={formatCurrency(w.trimsCost)} />
              {w.labourCost > 0 && <CostRow label="Labour" value={formatCurrency(w.labourCost)} />}
              <CostRow label={`Margin (${marginLabel})`} value={formatCurrency(w.margin)} />
              <CostRow label="Wall Total" value={formatCurrency(w.total)} bold />
            </>
          )}

          {/* Grand total */}
          <div style={{ height: '1px', backgroundColor: '#2d3448', margin: '8px 4px' }} />
          <CostRow label="TOTAL PRICE" value={formatCurrency(job.total_price)} bold highlight />
        </section>

        {/* Notes */}
        {userNotes && (
          <section className="rounded-xl p-4" style={{ backgroundColor: '#252b3d', border: '1px solid #2d3448' }}>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Notes</div>
            <p className="text-sm text-slate-300 leading-relaxed m-0 whitespace-pre-wrap">{userNotes}</p>
          </section>
        )}

        {/* Status update */}
        <section className="rounded-xl p-4" style={{ backgroundColor: '#252b3d', border: '1px solid #2d3448' }}>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Update Status</div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => updateStatus(s)} disabled={updatingStatus}
                className="py-2.5 px-2 rounded-lg text-xs font-semibold text-center transition-all disabled:opacity-50"
                style={job.status === s
                  ? { backgroundColor: '#f97316', color: 'white', border: '1px solid #f97316' }
                  : { backgroundColor: '#12172a', color: '#94a3b8', border: '1px solid #2d3448' }}>
                {s}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Quote Summary Modal */}
      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-2xl rounded-2xl overflow-hidden" style={{ backgroundColor: '#252b3d', border: '1px solid #2d3448' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2d3448' }}>
              <div>
                <div className="font-semibold text-white">Quote Summary</div>
                <div className="text-xs text-slate-400 mt-0.5">Ready to paste into email</div>
              </div>
              <button onClick={() => setShowSummary(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 max-h-96 overflow-y-auto">
              <pre className="text-sm text-slate-200 whitespace-pre-wrap font-mono leading-relaxed">{summaryText}</pre>
            </div>
            <div className="flex gap-3 p-4" style={{ borderTop: '1px solid #2d3448' }}>
              <button onClick={() => handleCopy(summaryText)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors"
                style={{ backgroundColor: copied ? '#16a34a' : '#2d3448', color: 'white' }}>
                {copied ? '✓ Copied!' : 'Copy to Clipboard'}
              </button>
              <button onClick={() => setShowSummary(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: '#f97316', color: 'white' }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-4 py-4"
        style={{ backgroundColor: '#1a1f2e', borderTop: '1px solid #2d3448' }}>
        <div className="max-w-2xl mx-auto flex gap-2">
          <button onClick={() => setShowSummary(true)}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors"
            style={{ backgroundColor: '#2d3448', color: '#cbd5e1' }}>
            Copy Summary
          </button>
          <button onClick={() => downloadQuotePDF(job)}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors"
            style={{ backgroundColor: '#2d3448', color: '#cbd5e1' }}>
            ↓ PDF
          </button>
          <button onClick={() => navigate(`/job/${id}/edit`)}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors"
            style={{ backgroundColor: '#f97316', color: 'white' }}>
            Edit Quote
          </button>
        </div>
      </div>
    </div>
  )
}
