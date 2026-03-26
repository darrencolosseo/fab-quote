import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  DOOR_TYPES, CLADDING_TYPES, MARGIN_PCT,
  WALL_DEFAULTS, BOARD_COST, BOARD_WIDTH_MM, HEIGHT_CUT_THRESHOLD,
  calcGarage, calcFrontDoor, calcWall, getFrameCost,
} from '../config/pricing'
import { formatCurrency } from '../utils/format'
import { generateQuoteNumber } from '../utils/quoteNumber'
import { downloadQuotePDF } from '../utils/generatePDF'
import { showToast } from '../utils/toast'

const GARAGE_WIDTH_PRESETS = ['2400', '2700', '3000', '4800', '5000', '5500', '6100']
const GARAGE_HEIGHT_PRESETS = ['2100', '2400', '2700']

// ── Flash hook ────────────────────────────────────────────────────────────────
function useFlash(value) {
  const [flash, setFlash] = useState(false)
  const prev = useRef(value)
  useEffect(() => {
    if (prev.current !== value && value > 0) {
      setFlash(true)
      const t = setTimeout(() => setFlash(false), 350)
      prev.current = value
      return () => clearTimeout(t)
    }
    prev.current = value
  }, [value])
  return flash
}

// ── Small UI helpers ──────────────────────────────────────────────────────────
function Label({ children }) {
  return (
    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
      {children}
    </label>
  )
}

function Field({ label, children }) {
  return <div><Label>{label}</Label>{children}</div>
}

function TextIn({ value, onChange, placeholder, type = 'text', inputMode }) {
  return (
    <input
      type={type} inputMode={inputMode} value={value}
      onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-600 text-base outline-none"
      style={{ backgroundColor: '#252b3d', border: '1px solid #2d3448', transition: 'border 0.15s' }}
      onFocus={(e) => e.target.style.border = '1px solid #f97316'}
      onBlur={(e) => e.target.style.border = '1px solid #2d3448'}
    />
  )
}

function NumIn({ value, onChange, placeholder, unit, prefix }) {
  return (
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">{prefix}</span>}
      <input
        type="number" inputMode="numeric" value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full py-3 rounded-xl text-white placeholder-slate-600 text-base outline-none font-mono"
        style={{
          backgroundColor: '#252b3d', border: '1px solid #2d3448',
          paddingLeft: prefix ? '1.75rem' : '1rem',
          paddingRight: unit ? '3rem' : '1rem',
          transition: 'border 0.15s',
        }}
        onFocus={(e) => e.target.style.border = '1px solid #f97316'}
        onBlur={(e) => e.target.style.border = '1px solid #2d3448'}
      />
      {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-mono">{unit}</span>}
    </div>
  )
}

function SelectIn({ value, onChange, options }) {
  return (
    <select
      value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 rounded-xl text-white text-base outline-none"
      style={{ backgroundColor: '#252b3d', border: '1px solid #2d3448' }}
    >
      {options.map((o) => (
        <option key={typeof o === 'string' ? o : o.name} value={typeof o === 'string' ? o : o.name}>
          {typeof o === 'string' ? o : o.name}
        </option>
      ))}
    </select>
  )
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #2d3448' }}>
      <div>
        <div className="text-sm font-medium text-white">{label}</div>
        {description && <div className="text-xs text-slate-500 mt-0.5">{description}</div>}
      </div>
      <button
        type="button" onClick={() => onChange(!checked)}
        className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
        style={{ backgroundColor: checked ? '#f97316' : '#2d3448' }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
          style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )
}

function SectionCard({ number, title, children, accent, complete }) {
  return (
    <section className="rounded-xl p-5" style={{ backgroundColor: '#252b3d', border: `1px solid ${accent ? '#f97316' : '#2d3448'}` }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: '#f97316', color: 'white' }}>
          {number}
          {complete && (
            <span
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2"
              style={{ backgroundColor: '#22c55e', borderColor: '#252b3d' }}
            />
          )}
        </div>
        <h2 className="text-base font-semibold text-white m-0">{title}</h2>
      </div>
      {children}
    </section>
  )
}

// Size preset chips
function SizePresets({ label, presets, value, onSelect }) {
  return (
    <div className="mb-2">
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 font-semibold">{label}</div>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {presets.map((p) => {
          const isActive = String(value) === String(p)
          return (
            <button
              key={p}
              type="button"
              onClick={() => onSelect(p)}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all"
              style={{
                backgroundColor: isActive ? '#f97316' : '#12172a',
                color: isActive ? 'white' : '#94a3b8',
                border: `1px solid ${isActive ? '#f97316' : '#2d3448'}`,
              }}
            >
              {p}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Frame cost auto-estimate badge
function FrameAutobadge({ autoEst, isOverride, onToggleOverride }) {
  if (!autoEst && !isOverride) return (
    <div className="text-xs mt-1.5" style={{ color: '#64748b' }}>
      Enter width above to auto-estimate frame cost
    </div>
  )
  if (isOverride) return (
    <div className="flex items-center gap-2 mt-1.5">
      <span className="text-xs font-mono" style={{ color: '#f97316' }}>
        Auto-est: {autoEst != null ? `$${Number(autoEst).toLocaleString('en-AU')}` : 'n/a'}
      </span>
      <button type="button" onClick={onToggleOverride}
        className="text-xs px-2 py-0.5 rounded-md transition-colors"
        style={{ backgroundColor: '#2d3448', color: '#94a3b8' }}>
        ← Restore auto
      </button>
    </div>
  )
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{ backgroundColor: '#052e16', color: '#22c55e', border: '1px solid #166534' }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20,6 9,17 4,12" />
        </svg>
        Auto-estimated
      </span>
      <button type="button" onClick={onToggleOverride}
        className="text-xs px-2 py-0.5 rounded-md transition-colors"
        style={{ backgroundColor: '#2d3448', color: '#94a3b8' }}>
        Override
      </button>
    </div>
  )
}

// Board info pill — enhanced
function BoardInfo({ boards, widthMm, heightMm, boardWidthMm, boardCost }) {
  if (!boards && boards !== 0) return null
  const optimised = parseFloat(heightMm) > 0 && parseFloat(heightMm) < HEIGHT_CUT_THRESHOLD
  const boardCostTotal = boards > 0 ? boards * parseFloat(boardCost || 0) : 0

  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: '#12172a' }}>
      <div className="flex items-center gap-2">
        <span style={{ color: '#f97316' }}>⊞</span>
        <span className="text-slate-400">Boards needed:</span>
        {optimised && boards > 0 ? (
          <span className="font-bold font-mono" style={{ color: '#22c55e' }}>
            {boards} — cut optimised ✓
          </span>
        ) : (
          <span className="text-white font-bold font-mono">{boards}</span>
        )}
      </div>
      {boardCostTotal > 0 && (
        <span className="font-mono font-semibold" style={{ color: '#f97316' }}>
          = {formatCurrency(boardCostTotal)}
        </span>
      )}
    </div>
  )
}

// Mini cost breakdown card
function MiniBreakdown({ rows, total, label }) {
  return (
    <div className="rounded-xl p-4 mt-4" style={{ backgroundColor: '#12172a', border: '1px solid #2d3448' }}>
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{label || 'Breakdown'}</div>
      {rows.map((r, i) => r && (
        <div key={i} className="flex justify-between py-1 text-sm">
          <span className="text-slate-400">{r.label}</span>
          <span className="font-mono text-slate-200">{formatCurrency(r.value)}</span>
        </div>
      ))}
      <div className="flex justify-between items-center mt-2 pt-2" style={{ borderTop: '1px solid #2d3448' }}>
        <span className="text-sm font-bold text-white">Section Total</span>
        <span className="font-mono font-bold" style={{ color: '#f97316' }}>{formatCurrency(total)}</span>
      </div>
    </div>
  )
}

// ── CladType helper — sync board width when type changes ──────────────────────
function useCladding(defaultType = CLADDING_TYPES[0].name) {
  const [claddingType, setCladdingTypeRaw] = useState(defaultType)
  const [boardWidthMm, setBoardWidthMm] = useState(String(BOARD_WIDTH_MM))
  const [boardCost, setBoardCost] = useState(String(BOARD_COST))

  function setCladdingType(name) {
    setCladdingTypeRaw(name)
    const found = CLADDING_TYPES.find((c) => c.name === name)
    if (found) setBoardWidthMm(String(found.boardWidthMm))
  }

  return { claddingType, setCladdingType, boardWidthMm, setBoardWidthMm, boardCost, setBoardCost }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function NewQuote() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [copied, setCopied] = useState(false)

  // Customer
  const [name, setName]     = useState('')
  const [phone, setPhone]   = useState('')
  const [email, setEmail]   = useState('')
  const [address, setAddress] = useState('')
  const [suburb, setSuburb] = useState('')

  // Garage door
  const [doorType, setDoorType]     = useState(DOOR_TYPES[0])
  const [garageW, setGarageW]       = useState('')
  const [garageH, setGarageH]       = useState('')
  const [garageFrameCost, setGarageFrameCost] = useState('')
  const [frameAutoEstimate, setFrameAutoEstimate] = useState(null)   // last auto value
  const [frameOverride, setFrameOverride] = useState(false)          // user manually overriding?
  const garageCladding = useCladding(CLADDING_TYPES[0].name)

  // Auto-fill frame cost when door type or width changes (unless user is overriding)
  useEffect(() => {
    if (frameOverride) return
    const est = getFrameCost(doorType, garageW)
    setFrameAutoEstimate(est)
    if (est !== null) setGarageFrameCost(String(est))
    else if (!garageW) setGarageFrameCost('')   // clear when width removed
  }, [doorType, garageW, frameOverride])

  // Front door (optional)
  const [hasFrontDoor, setHasFrontDoor] = useState(false)
  const [fdW, setFdW]           = useState('')
  const [fdH, setFdH]           = useState('')
  const [fdSupply, setFdSupply] = useState(false)
  const [fdLabour, setFdLabour] = useState(true)
  const fdCladding = useCladding(CLADDING_TYPES[0].name)

  // Wall cladding (optional)
  const [hasWall, setHasWall]           = useState(false)
  const [wallW, setWallW]               = useState('')
  const [wallH, setWallH]               = useState('')
  const [wallTopHats, setWallTopHats]   = useState(true)
  const [wallLabour, setWallLabour]     = useState(String(WALL_DEFAULTS.defaultLabour))
  const wallCladding = useCladding(CLADDING_TYPES[0].name)

  // Notes + price override
  const [notes, setNotes]               = useState('')
  const [overrideActive, setOverrideActive] = useState(false)
  const [priceOverride, setPriceOverride] = useState('')

  // ── Live calculations ───────────────────────────────────────────────────────
  const garage = useMemo(() => calcGarage({
    widthMm: garageW, heightMm: garageH,
    boardWidthMm: garageCladding.boardWidthMm,
    boardCostPerUnit: garageCladding.boardCost,
    framePkgCost: garageFrameCost,
  }), [garageW, garageH, garageCladding.boardWidthMm, garageCladding.boardCost, garageFrameCost])

  const frontDoor = useMemo(() => hasFrontDoor ? calcFrontDoor({
    widthMm: fdW, heightMm: fdH,
    boardWidthMm: fdCladding.boardWidthMm,
    boardCostPerUnit: fdCladding.boardCost,
    supplyDoor: fdSupply, includeLabour: fdLabour,
  }) : null, [hasFrontDoor, fdW, fdH, fdCladding.boardWidthMm, fdCladding.boardCost, fdSupply, fdLabour])

  const wall = useMemo(() => hasWall ? calcWall({
    widthMm: wallW, heightMm: wallH,
    boardWidthMm: wallCladding.boardWidthMm,
    boardCostPerUnit: wallCladding.boardCost,
    includeTopHats: wallTopHats, labourCost: wallLabour,
  }) : null, [hasWall, wallW, wallH, wallCladding.boardWidthMm, wallCladding.boardCost, wallTopHats, wallLabour])

  const grandTotal = (garage?.total || 0) + (frontDoor?.total || 0) + (wall?.total || 0)
  const finalPrice = overrideActive && priceOverride !== '' ? parseFloat(priceOverride) : grandTotal

  // Flash effect on total change
  const flash = useFlash(grandTotal)

  // ── Quote summary text ──────────────────────────────────────────────────────
  const summaryText = useMemo(() => {
    const fmt = (n) => `$${Math.round(n).toLocaleString('en-AU')}`
    const lines = []

    lines.push(`Garage door — ${doorType}`)
    if (garageW && garageH) lines.push(`Size: ${garageW}mm × ${garageH}mm`)
    lines.push(`Includes:`)
    lines.push(`  • Doorman Motor`)
    lines.push(`  • 2 Remotes and 1 × wall button`)
    lines.push(`  • Custom aluminium frame`)
    lines.push(`  • Tracks and springs to suit`)
    if (garage.boards > 0) lines.push(`  • Cladding: ${garage.boards} boards (${garageCladding.claddingType})`)
    lines.push(`Price: ${fmt(garage.total)} + GST`)

    if (hasFrontDoor && frontDoor) {
      lines.push(``)
      lines.push(`Front Door${fdSupply ? ' — Supply & Install' : ' — Cladding'}`)
      if (fdW && fdH) lines.push(`Size: ${fdW}mm × ${fdH}mm`)
      lines.push(`Includes:`)
      if (fdSupply) {
        lines.push(`  • Timber door supply`)
        lines.push(`  • Aluminium door jamb + pivot hardware`)
        lines.push(`  • Delivery to site`)
      }
      if (frontDoor.boards > 0) lines.push(`  • Cladding: ${frontDoor.boards} boards (${fdCladding.claddingType})`)
      lines.push(`  • Trims`)
      if (fdLabour) lines.push(`  • Installation labour`)
      lines.push(`Price: ${fmt(frontDoor.total)} + GST`)
    }

    if (hasWall && wall) {
      lines.push(``)
      lines.push(`Wall Cladding`)
      if (wallW && wallH) lines.push(`Size: ${wallW}mm wide × ${wallH}mm high`)
      lines.push(`Includes:`)
      if (wall.boards > 0) lines.push(`  • ${wall.boards} boards (${wallCladding.claddingType})`)
      if (wallTopHats) lines.push(`  • Top hats and trims`)
      if (parseFloat(wallLabour) > 0) lines.push(`  • Installation labour`)
      lines.push(`Price: ${fmt(wall.total)} + GST`)
    }

    lines.push(``)
    lines.push(`─────────────────────────────────────`)
    lines.push(`TOTAL: ${fmt(finalPrice)} + GST`)
    lines.push(`Quote valid for 30 days`)
    lines.push(`Payment: 50% deposit on acceptance, balance on completion`)
    if (notes) { lines.push(``); lines.push(`Notes: ${notes}`) }

    return lines.join('\n')
  }, [garage, frontDoor, wall, hasFrontDoor, hasWall, finalPrice, doorType,
      garageW, garageH, fdW, fdH, wallW, wallH, fdSupply, fdLabour, wallTopHats,
      wallLabour, garageCladding.claddingType, fdCladding.claddingType,
      wallCladding.claddingType, notes])

  // ── Save to Supabase ────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    try {
      const quoteNum = await generateQuoteNumber()
      const notesData = JSON.stringify({
        v: 2, userNotes: notes,
        garage: {
          claddingType: garageCladding.claddingType,
          boardWidthMm: garageCladding.boardWidthMm,
          boardCostPerUnit: garageCladding.boardCost,
          framePkgCost: garageFrameCost,
          ...garage,
        },
        frontDoor: hasFrontDoor ? {
          widthMm: fdW, heightMm: fdH,
          claddingType: fdCladding.claddingType,
          boardWidthMm: fdCladding.boardWidthMm,
          boardCostPerUnit: fdCladding.boardCost,
          supplyDoor: fdSupply, includeLabour: fdLabour,
          ...frontDoor,
        } : null,
        wall: hasWall ? {
          widthMm: wallW, heightMm: wallH,
          claddingType: wallCladding.claddingType,
          boardWidthMm: wallCladding.boardWidthMm,
          boardCostPerUnit: wallCladding.boardCost,
          includeTopHats: wallTopHats, labourCost: wallLabour,
          ...wall,
        } : null,
      })

      const grandSubtotal = (garage?.subtotal || 0) + (frontDoor?.subtotal || 0) + (wall?.subtotal || 0)
      const payload = {
        quote_number:      quoteNum,
        status:            'Draft',
        customer_name:     name,
        customer_email:    email,
        customer_phone:    phone,
        address,
        suburb,
        door_type:         doorType,
        width_mm:          parseFloat(garageW) || null,
        height_mm:         parseFloat(garageH) || null,
        frame_size:        garageCladding.claddingType,
        frame_cost:        garage.framePkgCost,
        cladding_sqm:      garage.boards,        // repurposed: board count
        cladding_cost:     garage.claddingCost,
        doorjam_metres:    hasFrontDoor ? frontDoor?.boards || 0 : null,
        doorjam_cost:      hasFrontDoor ? frontDoor?.total || 0 : 0,
        installation_cost: hasWall ? wall?.total || 0 : 0,
        subtotal:          grandSubtotal,
        margin_pct:        MARGIN_PCT,
        total_price:       finalPrice,
        notes:             notesData,
      }

      const { data, error } = await supabase.from('jobs').insert([payload]).select().single()
      if (error) throw error

      // Auto-download PDF named "Customer Name - Address.pdf"
      downloadQuotePDF({ ...payload, id: data.id, created_at: data.created_at })

      showToast('Quote saved & PDF downloaded!', 'success')
      navigate(`/job/${data.id}`)
    } catch (err) {
      console.error(err)
      showToast('Failed to save: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(summaryText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── Render ──────────────────────────────────────────────────────────────────
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
          <h1 className="text-base font-semibold text-white flex-1 m-0">New Quote</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 pb-36 flex flex-col gap-5">

        {/* ── 1. Customer ─────────────────────────────────────────────────── */}
        <SectionCard number="1" title="Customer Details">
          <div className="flex flex-col gap-4">
            <Field label="Customer Name">
              <TextIn value={name} onChange={setName} placeholder="Jane Smith" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone">
                <TextIn value={phone} onChange={setPhone} type="tel" placeholder="04XX XXX XXX" inputMode="tel" />
              </Field>
              <Field label="Email">
                <TextIn value={email} onChange={setEmail} type="email" placeholder="jane@email.com" />
              </Field>
            </div>
            <Field label="Address">
              <TextIn value={address} onChange={setAddress} placeholder="123 Main St" />
            </Field>
            <Field label="Suburb">
              <TextIn value={suburb} onChange={setSuburb} placeholder="Suburb" />
            </Field>
          </div>
        </SectionCard>

        {/* ── 2. Garage Door ──────────────────────────────────────────────── */}
        <SectionCard number="2" title="Garage Door" complete={garage.boards > 0}>
          <div className="flex flex-col gap-4">
            <Field label="Mount Type">
              <SelectIn value={doorType} onChange={setDoorType} options={DOOR_TYPES} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Width">
                <SizePresets
                  label="Common Widths"
                  presets={GARAGE_WIDTH_PRESETS}
                  value={garageW}
                  onSelect={setGarageW}
                />
                <NumIn value={garageW} onChange={setGarageW} placeholder="4930" unit="mm" />
              </Field>
              <Field label="Height">
                <SizePresets
                  label="Common Heights"
                  presets={GARAGE_HEIGHT_PRESETS}
                  value={garageH}
                  onSelect={setGarageH}
                />
                <NumIn value={garageH} onChange={setGarageH} placeholder="2400" unit="mm" />
              </Field>
            </div>

            <BoardInfo
              boards={garage.boards}
              widthMm={garageW}
              heightMm={garageH}
              boardWidthMm={garageCladding.boardWidthMm}
              boardCost={garageCladding.boardCost}
            />

            <Field label="Cladding Type">
              <SelectIn value={garageCladding.claddingType} onChange={garageCladding.setCladdingType} options={CLADDING_TYPES} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Board Width">
                <NumIn value={garageCladding.boardWidthMm} onChange={garageCladding.setBoardWidthMm} placeholder="150" unit="mm" />
              </Field>
              <Field label="Cost / Board">
                <NumIn value={garageCladding.boardCost} onChange={garageCladding.setBoardCost} placeholder="180" prefix="$" />
              </Field>
            </div>

            <Field label="Frame / Motor Package Cost (base price, excl. cladding)">
              <NumIn
                value={garageFrameCost}
                onChange={(v) => { setGarageFrameCost(v); setFrameOverride(true) }}
                placeholder={frameAutoEstimate != null ? String(frameAutoEstimate) : '7500'}
                prefix="$"
              />
              <FrameAutobadge
                autoEst={frameAutoEstimate}
                isOverride={frameOverride}
                onToggleOverride={() => {
                  setFrameOverride(false)
                  if (frameAutoEstimate != null) setGarageFrameCost(String(frameAutoEstimate))
                }}
              />
            </Field>

            {/* Garage mini breakdown */}
            {(garageW || garageFrameCost) && (
              <MiniBreakdown
                label="Garage Breakdown"
                rows={[
                  garage.framePkgCost > 0 && { label: 'Frame / Motor Package', value: garage.framePkgCost },
                  garage.boards > 0 && { label: `Cladding (${garage.boards} boards × $${garageCladding.boardCost})`, value: garage.claddingCost },
                  { label: `Margin (${Math.round(MARGIN_PCT * 100)}%)`, value: garage.margin },
                ]}
                total={garage.total}
              />
            )}
          </div>
        </SectionCard>

        {/* ── 3. Front Door (optional) ────────────────────────────────────── */}
        <SectionCard number="3" title="Front Door" accent={hasFrontDoor} complete={hasFrontDoor && frontDoor?.boards > 0}>
          <Toggle
            label="Include Front Door?"
            description="Add front door cladding to this quote"
            checked={hasFrontDoor}
            onChange={setHasFrontDoor}
          />

          {hasFrontDoor && (
            <div className="flex flex-col gap-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Width">
                  <NumIn value={fdW} onChange={setFdW} placeholder="1200" unit="mm" />
                </Field>
                <Field label="Height">
                  <NumIn value={fdH} onChange={setFdH} placeholder="2700" unit="mm" />
                </Field>
              </div>

              <BoardInfo
                boards={frontDoor?.boards}
                widthMm={fdW}
                heightMm={fdH}
                boardWidthMm={fdCladding.boardWidthMm}
                boardCost={fdCladding.boardCost}
              />

              <Field label="Cladding Type">
                <SelectIn value={fdCladding.claddingType} onChange={fdCladding.setCladdingType} options={CLADDING_TYPES} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Board Width">
                  <NumIn value={fdCladding.boardWidthMm} onChange={fdCladding.setBoardWidthMm} placeholder="150" unit="mm" />
                </Field>
                <Field label="Cost / Board">
                  <NumIn value={fdCladding.boardCost} onChange={fdCladding.setBoardCost} placeholder="180" prefix="$" />
                </Field>
              </div>

              <div className="flex flex-col" style={{ borderTop: '1px solid #2d3448', paddingTop: '4px' }}>
                <Toggle
                  label="Supply door too?"
                  description="Includes timber door, jamb, pivot, delivery"
                  checked={fdSupply}
                  onChange={setFdSupply}
                />
                <Toggle
                  label="Include installation labour?"
                  description="Door fit + cladding install"
                  checked={fdLabour}
                  onChange={setFdLabour}
                />
              </div>

              {frontDoor && (
                <MiniBreakdown
                  label="Front Door Breakdown"
                  rows={[
                    frontDoor.doorComponents > 0 && { label: 'Door components (supply)', value: frontDoor.doorComponents },
                    frontDoor.boards > 0 && { label: `Cladding (${frontDoor.boards} boards)`, value: frontDoor.claddingCost },
                    { label: 'Trims', value: frontDoor.trimsCost },
                    frontDoor.labourCost > 0 && { label: 'Labour (install)', value: frontDoor.labourCost },
                    { label: `Margin (${Math.round(MARGIN_PCT * 100)}%)`, value: frontDoor.margin },
                  ]}
                  total={frontDoor.total}
                />
              )}
            </div>
          )}
        </SectionCard>

        {/* ── 4. Wall Cladding (optional) ─────────────────────────────────── */}
        <SectionCard number="4" title="Wall Cladding" accent={hasWall} complete={hasWall && wall?.boards > 0}>
          <Toggle
            label="Include Wall Cladding?"
            description="Add wall cladding section to this quote"
            checked={hasWall}
            onChange={setHasWall}
          />

          {hasWall && (
            <div className="flex flex-col gap-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Wall Width">
                  <NumIn value={wallW} onChange={setWallW} placeholder="4200" unit="mm" />
                </Field>
                <Field label="Wall Height">
                  <NumIn value={wallH} onChange={setWallH} placeholder="2700" unit="mm" />
                </Field>
              </div>

              <BoardInfo
                boards={wall?.boards}
                widthMm={wallW}
                heightMm={wallH}
                boardWidthMm={wallCladding.boardWidthMm}
                boardCost={wallCladding.boardCost}
              />

              <Field label="Cladding Type">
                <SelectIn value={wallCladding.claddingType} onChange={wallCladding.setCladdingType} options={CLADDING_TYPES} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Board Width">
                  <NumIn value={wallCladding.boardWidthMm} onChange={wallCladding.setBoardWidthMm} placeholder="150" unit="mm" />
                </Field>
                <Field label="Cost / Board">
                  <NumIn value={wallCladding.boardCost} onChange={wallCladding.setBoardCost} placeholder="180" prefix="$" />
                </Field>
              </div>

              <div className="flex flex-col" style={{ borderTop: '1px solid #2d3448', paddingTop: '4px' }}>
                <Toggle
                  label="Include top hats & trims?"
                  description={`6 top hats @ $25 + $100 trims = $${WALL_DEFAULTS.topHatCount * WALL_DEFAULTS.topHatCostEach + WALL_DEFAULTS.trimsCost}`}
                  checked={wallTopHats}
                  onChange={setWallTopHats}
                />
              </div>

              <Field label="Labour Cost">
                <NumIn value={wallLabour} onChange={setWallLabour} placeholder="2600" prefix="$" />
              </Field>

              {wall && (
                <MiniBreakdown
                  label="Wall Breakdown"
                  rows={[
                    wall.boards > 0 && { label: `Cladding (${wall.boards} boards)`, value: wall.claddingCost },
                    wall.topHatsCost > 0 && { label: 'Top hats', value: wall.topHatsCost },
                    { label: 'Trims', value: wall.trimsCost },
                    wall.labourCost > 0 && { label: 'Labour', value: wall.labourCost },
                    { label: `Margin (${Math.round(MARGIN_PCT * 100)}%)`, value: wall.margin },
                  ]}
                  total={wall.total}
                />
              )}
            </div>
          )}
        </SectionCard>

        {/* ── 5. Grand Total ──────────────────────────────────────────────── */}
        <section className="rounded-xl p-5" style={{ backgroundColor: '#252b3d', border: '1px solid #2d3448' }}>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Grand Total</div>

          {/* Section breakdown */}
          <div className="flex flex-col gap-1 mb-3">
            {garage.total > 0 && (
              <div className="flex justify-between text-sm py-1.5" style={{ borderBottom: '1px solid #2d3448' }}>
                <span className="text-slate-300">Garage Door</span>
                <span className="font-mono text-white">{formatCurrency(garage.total)}</span>
              </div>
            )}
            {hasFrontDoor && frontDoor && frontDoor.total > 0 && (
              <div className="flex justify-between text-sm py-1.5" style={{ borderBottom: '1px solid #2d3448' }}>
                <span className="text-slate-300">Front Door</span>
                <span className="font-mono text-white">{formatCurrency(frontDoor.total)}</span>
              </div>
            )}
            {hasWall && wall && wall.total > 0 && (
              <div className="flex justify-between text-sm py-1.5" style={{ borderBottom: '1px solid #2d3448' }}>
                <span className="text-slate-300">Wall Cladding</span>
                <span className="font-mono text-white">{formatCurrency(wall.total)}</span>
              </div>
            )}
          </div>

          {/* Override toggle */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Price</span>
            <button type="button"
              onClick={() => { setOverrideActive(!overrideActive); if (!overrideActive) setPriceOverride(String(grandTotal)) }}
              className="text-xs font-medium transition-colors"
              style={{ color: overrideActive ? '#f97316' : '#64748b' }}>
              {overrideActive ? 'Use Calculated' : 'Override'}
            </button>
          </div>

          {overrideActive ? (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono">$</span>
              <input type="number" inputMode="decimal" value={priceOverride}
                onChange={(e) => setPriceOverride(e.target.value)}
                className="w-full pl-7 pr-4 py-3 rounded-xl text-white text-base outline-none font-mono"
                style={{ backgroundColor: '#12172a', border: '1px solid #f97316' }}
              />
            </div>
          ) : (
            <div
              className="rounded-lg px-4 py-3 flex items-center justify-between"
              style={{
                backgroundColor: flash ? '#7c2d00' : '#12172a',
                border: `1px solid ${flash ? '#ff6b00' : '#f97316'}`,
                transition: 'background-color 0.2s, border-color 0.2s',
              }}
            >
              <span className="text-sm font-bold text-white">TOTAL + GST</span>
              <span
                className="font-mono text-2xl font-bold tabular-nums"
                style={{ color: flash ? '#ff6b00' : '#f97316', transition: 'color 0.2s' }}
              >
                {formatCurrency(grandTotal)}
              </span>
            </div>
          )}

          {/* Notes */}
          <div className="mt-4">
            <Label>Notes</Label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Site conditions, access notes, special requirements…"
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-600 text-sm outline-none resize-none"
              style={{ backgroundColor: '#12172a', border: '1px solid #2d3448' }}
            />
          </div>

          {/* Quote summary preview button */}
          <button
            type="button"
            onClick={() => setShowSummary(true)}
            className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            style={{ backgroundColor: '#2d3448', color: '#94a3b8', border: '1px solid #3d4560' }}
          >
            <span>👁</span> Preview Quote Summary
          </button>
        </section>
      </div>

      {/* ── Quote Summary Modal ────────────────────────────────────────────────── */}
      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-2xl rounded-2xl overflow-hidden" style={{ backgroundColor: '#252b3d', border: '1px solid #2d3448' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2d3448' }}>
              <span className="font-semibold text-white">Quote Summary</span>
              <button onClick={() => setShowSummary(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 max-h-96 overflow-y-auto">
              <pre className="text-sm text-slate-200 whitespace-pre-wrap font-mono leading-relaxed">{summaryText}</pre>
            </div>
            <div className="flex gap-3 p-4" style={{ borderTop: '1px solid #2d3448' }}>
              <button onClick={handleCopy}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors"
                style={{ backgroundColor: copied ? '#16a34a' : '#2d3448', color: 'white' }}>
                {copied ? '✓ Copied!' : 'Copy to Clipboard'}
              </button>
              <button onClick={() => setShowSummary(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: '#f97316', color: 'white' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky Save Bar ────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-4 py-4"
        style={{ backgroundColor: '#1a1f2e', borderTop: '1px solid #2d3448' }}>
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 rounded-xl text-base font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              backgroundColor: flash ? '#ff6b00' : '#f97316',
              color: 'white',
              transition: 'background-color 0.2s',
            }}
          >
            {saving ? (
              <>
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Saving…
              </>
            ) : (
              `Save Quote — $${Math.round(finalPrice).toLocaleString('en-AU')} + GST`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
