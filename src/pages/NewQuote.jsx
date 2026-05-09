import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  DOOR_TYPES, CLADDING_TYPES, MARGIN_PCT,
  WALL_DEFAULTS, BOARD_COST, BOARD_WIDTH_MM, HEIGHT_CUT_THRESHOLD,
  TIMBER_DOORS, FRONT_DOOR_DEFAULTS,
  calcGarage, calcFrontDoorTimber, calcFrontDoorAluminium, calcWallMulti, getFrameCost,
} from '../config/pricing'
import { formatCurrency } from '../utils/format'
import { generateQuoteNumber } from '../utils/quoteNumber'
import { downloadQuotePDF } from '../utils/generatePDF'
import { showToast } from '../utils/toast'

const GARAGE_WIDTH_PRESETS  = ['2400', '2700', '3000', '4800', '5000', '5500', '6100']
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

// ── UI helpers ────────────────────────────────────────────────────────────────
function Label({ children }) {
  return (
    <label className="label-condensed block mb-1.5">
      {children}
    </label>
  )
}

function Field({ label, children }) {
  return <div><Label>{label}</Label>{children}</div>
}

const inputBase = {
  backgroundColor: 'var(--bg-input)',
  border: '1px solid rgba(255,255,255,0.08)',
  transition: 'border 0.15s, box-shadow 0.15s',
  color: '#e2e8f0',
}

function TextIn({ value, onChange, placeholder, type = 'text', inputMode }) {
  return (
    <input
      type={type} inputMode={inputMode} value={value}
      onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl placeholder-slate-700 text-base outline-none"
      style={{ ...inputBase, fontFamily: "'Barlow', sans-serif" }}
    />
  )
}

function NumIn({ value, onChange, placeholder, unit, prefix, small }) {
  return (
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm" style={{ color: '#f97316' }}>{prefix}</span>}
      <input
        type="number" inputMode="numeric" value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full ${small ? 'py-2' : 'py-3'} rounded-xl placeholder-slate-700 text-base outline-none font-mono`}
        style={{
          ...inputBase,
          paddingLeft:  prefix ? '1.75rem' : '1rem',
          paddingRight: unit   ? '3rem'    : '1rem',
        }}
      />
      {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-mono" style={{ color: 'var(--text-muted)' }}>{unit}</span>}
    </div>
  )
}

function SelectIn({ value, onChange, options }) {
  return (
    <select
      value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 rounded-xl text-base outline-none"
      style={{ ...inputBase, fontFamily: "'Barlow', sans-serif" }}
    >
      {options.map((o) => (
        <option key={typeof o === 'string' ? o : o.sku ?? o.name} value={typeof o === 'string' ? o : o.sku ?? o.name}
          style={{ backgroundColor: '#1c2130' }}>
          {typeof o === 'string' ? o : o.label ?? o.name}
        </option>
      ))}
    </select>
  )
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div>
        <div className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{label}</div>
        {description && <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</div>}
      </div>
      <button
        type="button" onClick={() => onChange(!checked)}
        className="relative w-11 h-6 rounded-full transition-all flex-shrink-0 ml-3"
        style={{
          backgroundColor: checked ? '#f97316' : 'rgba(255,255,255,0.08)',
          boxShadow: checked ? '0 0 12px rgba(249,115,22,0.4)' : 'none',
        }}
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
    <section className="rounded-2xl p-5" style={{
      background: 'linear-gradient(135deg, #1e2438 0%, #1a2030 100%)',
      border: `1px solid ${accent ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.07)'}`,
      boxShadow: accent
        ? '0 0 24px rgba(249,115,22,0.1), 0 4px 20px rgba(0,0,0,0.4)'
        : '0 4px 20px rgba(0,0,0,0.35)',
    }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #f97316, #ea6b0f)',
            color: 'white',
            boxShadow: '0 2px 8px rgba(249,115,22,0.4)',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '15px',
            letterSpacing: '0.02em',
          }}>
          {number}
          {complete && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2"
              style={{ backgroundColor: '#22c55e', borderColor: '#1e2438', boxShadow: '0 0 6px rgba(34,197,94,0.5)' }} />
          )}
        </div>
        <h2 className="text-base font-semibold m-0" style={{ color: '#f1f5f9', fontFamily: "'Barlow', sans-serif", letterSpacing: '0.01em' }}>{title}</h2>
      </div>
      {children}
    </section>
  )
}

function SizePresets({ label, presets, value, onSelect }) {
  return (
    <div className="mb-2">
      <div className="label-condensed mb-1.5" style={{ fontSize: '10px' }}>{label}</div>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
        {presets.map((p) => {
          const isActive = String(value) === String(p)
          return (
            <button key={p} type="button" onClick={() => onSelect(p)}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all"
              style={{
                background: isActive ? 'linear-gradient(135deg, #f97316, #ea6b0f)' : 'var(--bg-deep)',
                color: isActive ? 'white' : 'var(--text-muted)',
                border: `1px solid ${isActive ? '#f97316' : 'rgba(255,255,255,0.07)'}`,
                boxShadow: isActive ? '0 2px 8px rgba(249,115,22,0.3)' : 'none',
              }}>
              {p}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FrameAutobadge({ autoEst, isOverride, onToggleOverride }) {
  if (!autoEst && !isOverride) return (
    <div className="text-xs mt-1.5" style={{ color: '#64748b' }}>Enter width above to auto-estimate frame cost</div>
  )
  if (isOverride) return (
    <div className="flex items-center gap-2 mt-1.5">
      <span className="text-xs font-mono" style={{ color: '#f97316' }}>
        Auto-est: {autoEst != null ? `$${Number(autoEst).toLocaleString('en-AU')}` : 'n/a'}
      </span>
      <button type="button" onClick={onToggleOverride}
        className="text-xs px-2 py-0.5 rounded-md" style={{ backgroundColor: '#2d3448', color: '#94a3b8' }}>
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
        className="text-xs px-2 py-0.5 rounded-md" style={{ backgroundColor: '#2d3448', color: '#94a3b8' }}>
        Override
      </button>
    </div>
  )
}

function BoardInfo({ boards, heightMm, widthMm, boardWidthMm, boardCost, horizontal }) {
  if (!boards && boards !== 0) return null
  const secondary = horizontal ? parseFloat(widthMm) : parseFloat(heightMm)
  const optimised = secondary > 0 && secondary < HEIGHT_CUT_THRESHOLD
  const boardCostTotal = boards > 0 ? boards * parseFloat(boardCost || 0) : 0
  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs"
      style={{ background: 'linear-gradient(90deg, rgba(249,115,22,0.08), rgba(249,115,22,0.03))', border: '1px solid rgba(249,115,22,0.2)' }}>
      <div className="flex items-center gap-2">
        <span style={{ color: '#f97316', fontSize: '14px' }}>⊞</span>
        <span style={{ color: 'var(--text-muted)' }}>Boards needed:</span>
        {optimised && boards > 0 ? (
          <span className="font-bold font-mono" style={{ color: '#22c55e' }}>{boards} — cut optimised ✓</span>
        ) : (
          <span className="font-bold font-mono" style={{ color: '#f1f5f9' }}>{boards}</span>
        )}
      </div>
      {boardCostTotal > 0 && (
        <span className="font-mono font-semibold" style={{ color: '#f97316' }}>{formatCurrency(boardCostTotal)}</span>
      )}
    </div>
  )
}

function MiniBreakdown({ rows, total, label }) {
  return (
    <div className="rounded-xl p-4 mt-4" style={{ backgroundColor: 'var(--bg-deep)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="label-condensed mb-3">{label || 'Breakdown'}</div>
      {rows.map((r, i) => r && (
        <div key={i} className="flex justify-between py-1.5 text-sm" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
          <span className="font-mono" style={{ color: '#cbd5e1' }}>{formatCurrency(r.value)}</span>
        </div>
      ))}
      <div className="flex justify-between items-center mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <span className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Section Total</span>
        <span className="font-mono font-bold text-base" style={{ color: '#f97316' }}>{formatCurrency(total)}</span>
      </div>
    </div>
  )
}

// Editable cost field with a label and optional fixed/editable toggle
function CostField({ label, value, onChange, description }) {
  return (
    <div>
      <Label>{label}</Label>
      {description && <div className="text-xs text-slate-500 mb-1.5">{description}</div>}
      <NumIn value={value} onChange={onChange} placeholder="0" prefix="$" small />
    </div>
  )
}

// ── useCladding hook ──────────────────────────────────────────────────────────
function useCladding(defaultType = CLADDING_TYPES[0].name) {
  const [claddingType, setCladdingTypeRaw] = useState(defaultType)
  const [boardWidthMm, setBoardWidthMm]   = useState(String(CLADDING_TYPES[0].boardWidthMm))
  const [boardCost, setBoardCost]         = useState(String(CLADDING_TYPES[0].defaultCostPerUnit || BOARD_COST))
  const [isHorizontal, setIsHorizontal]   = useState(CLADDING_TYPES[0].horizontal || false)

  function setCladdingType(name) {
    setCladdingTypeRaw(name)
    const found = CLADDING_TYPES.find((c) => c.name === name)
    if (found) {
      setBoardWidthMm(String(found.boardWidthMm))
      setBoardCost(String(found.defaultCostPerUnit || BOARD_COST))
      setIsHorizontal(found.horizontal || false)
    }
  }

  return { claddingType, setCladdingType, boardWidthMm, setBoardWidthMm, boardCost, setBoardCost, isHorizontal }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function NewQuote() {
  const navigate  = useNavigate()
  const [saving, setSaving]         = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [copied, setCopied]         = useState(false)

  // Site details (customer name/phone/email removed)
  const [address, setAddress] = useState('')
  const [suburb, setSuburb]   = useState('')

  // Global margin %
  const [marginPct, setMarginPct] = useState('30')
  const marginDecimal = useMemo(() => (parseFloat(marginPct) || 0) / 100, [marginPct])

  // ── Garage door ────────────────────────────────────────────────────────────
  const [doorType, setDoorType]   = useState(DOOR_TYPES[0])
  const [garageW, setGarageW]     = useState('')
  const [garageH, setGarageH]     = useState('')
  const [garageFrameCost, setGarageFrameCost] = useState('')
  const [frameAutoEstimate, setFrameAutoEstimate] = useState(null)
  const [frameOverride, setFrameOverride]         = useState(false)
  const garageCladding = useCladding(CLADDING_TYPES[0].name)

  useEffect(() => {
    if (frameOverride) return
    const est = getFrameCost(doorType, garageW)
    setFrameAutoEstimate(est)
    if (est !== null) setGarageFrameCost(String(est))
    else if (!garageW) setGarageFrameCost('')
  }, [doorType, garageW, frameOverride])

  const garage = useMemo(() => calcGarage({
    widthMm: garageW, heightMm: garageH,
    boardWidthMm: garageCladding.boardWidthMm,
    boardCostPerUnit: garageCladding.boardCost,
    framePkgCost: garageFrameCost,
    horizontal: garageCladding.isHorizontal,
    marginPct: marginDecimal,
  }), [garageW, garageH, garageCladding.boardWidthMm, garageCladding.boardCost,
       garageFrameCost, garageCladding.isHorizontal, marginDecimal])

  // ── Front door (optional) ──────────────────────────────────────────────────
  const [hasFrontDoor, setHasFrontDoor]     = useState(false)
  const [fdDoorCategory, setFdDoorCategory] = useState('Timber') // 'Timber' | 'Aluminium'

  // Shared door fields
  const [fdW, setFdW] = useState('')
  const [fdH, setFdH] = useState('')
  const fdCladding = useCladding(CLADDING_TYPES[0].name)
  const [fdJambCount, setFdJambCount]         = useState('1')
  const [fdJambCostEach, setFdJambCostEach]   = useState(String(FRONT_DOOR_DEFAULTS.jambCostPerLength))
  const [fdExtraJambCost, setFdExtraJambCost] = useState('')
  const [fdPivotCost, setFdPivotCost]         = useState(String(FRONT_DOOR_DEFAULTS.pivotCost))
  const [fdAlumSheets, setFdAlumSheets]       = useState('0')
  const [fdAlumSheetCost, setFdAlumSheetCost] = useState(String(FRONT_DOOR_DEFAULTS.alumSheetCost))
  const [fdLabourInstall, setFdLabourInstall] = useState(String(FRONT_DOOR_DEFAULTS.labourInstall))
  const [fdLabourClad, setFdLabourClad]       = useState(String(FRONT_DOOR_DEFAULTS.labourClad))

  // Timber-specific
  const [fdTimberDoorSku, setFdTimberDoorSku] = useState(TIMBER_DOORS[0].sku)
  const [fdDelivery, setFdDelivery]           = useState(String(FRONT_DOOR_DEFAULTS.deliveryTimber))

  // Aluminium-specific
  const [fdAlumFramePrice, setFdAlumFramePrice] = useState('')
  const [fdDeliveryJambs, setFdDeliveryJambs]   = useState(String(FRONT_DOOR_DEFAULTS.deliveryJambs))
  const [fdDeliveryDoor, setFdDeliveryDoor]     = useState(String(FRONT_DOOR_DEFAULTS.deliveryAlumDoor))

  const selectedTimberDoor = useMemo(
    () => TIMBER_DOORS.find((d) => d.sku === fdTimberDoorSku) || TIMBER_DOORS[0],
    [fdTimberDoorSku]
  )

  const frontDoor = useMemo(() => {
    if (!hasFrontDoor) return null
    const shared = {
      jambCount: fdJambCount, jambCostEach: fdJambCostEach, extraJambCost: fdExtraJambCost,
      pivotCost: fdPivotCost, alumSheets: fdAlumSheets, alumSheetCostEach: fdAlumSheetCost,
      labourInstall: fdLabourInstall, labourClad: fdLabourClad,
      widthMm: fdW, heightMm: fdH,
      boardWidthMm: fdCladding.boardWidthMm, boardCostPerUnit: fdCladding.boardCost,
      horizontal: fdCladding.isHorizontal, marginPct: marginDecimal,
    }
    if (fdDoorCategory === 'Timber') {
      return calcFrontDoorTimber({ ...shared, timberDoorPrice: selectedTimberDoor.priceExGST, delivery: fdDelivery })
    }
    return calcFrontDoorAluminium({ ...shared, alumFramePrice: fdAlumFramePrice, deliveryJambs: fdDeliveryJambs, deliveryDoor: fdDeliveryDoor })
  }, [hasFrontDoor, fdDoorCategory, selectedTimberDoor, fdAlumFramePrice,
      fdJambCount, fdJambCostEach, fdExtraJambCost, fdPivotCost,
      fdDelivery, fdDeliveryJambs, fdDeliveryDoor,
      fdAlumSheets, fdAlumSheetCost, fdLabourInstall, fdLabourClad,
      fdW, fdH, fdCladding.boardWidthMm, fdCladding.boardCost, fdCladding.isHorizontal,
      marginDecimal])

  // ── Wall cladding (optional, multiple walls) ───────────────────────────────
  const [hasWall, setHasWall]     = useState(false)
  const [walls, setWalls]         = useState([{ id: 1, widthMm: '', heightMm: '' }])
  const [wallTopHats, setWallTopHats] = useState(true)
  const [wallLabour, setWallLabour]   = useState(String(WALL_DEFAULTS.defaultLabour))
  const [curvingCost, setCurvingCost] = useState('')
  const wallCladding = useCladding(CLADDING_TYPES[0].name)

  function addWall() {
    setWalls((w) => [...w, { id: Date.now(), widthMm: '', heightMm: '' }])
  }
  function removeWall(id) {
    if (walls.length <= 1) return
    setWalls((w) => w.filter((wall) => wall.id !== id))
  }
  function updateWall(id, field, value) {
    setWalls((w) => w.map((wall) => (wall.id === id ? { ...wall, [field]: value } : wall)))
  }

  const wallResult = useMemo(() => hasWall ? calcWallMulti({
    walls,
    boardWidthMm: wallCladding.boardWidthMm,
    boardCostPerUnit: wallCladding.boardCost,
    horizontal: wallCladding.isHorizontal,
    includeTopHats: wallTopHats,
    labourCost: wallLabour,
    curvingCost,
    marginPct: marginDecimal,
  }) : null, [hasWall, walls, wallCladding.boardWidthMm, wallCladding.boardCost,
               wallCladding.isHorizontal, wallTopHats, wallLabour, curvingCost, marginDecimal])

  // ── Totals ─────────────────────────────────────────────────────────────────
  const grandTotal = (garage?.total || 0) + (frontDoor?.total || 0) + (wallResult?.total || 0)
  const [overrideActive, setOverrideActive] = useState(false)
  const [priceOverride, setPriceOverride]   = useState('')
  const finalPrice = overrideActive && priceOverride !== '' ? parseFloat(priceOverride) : grandTotal
  const flash = useFlash(grandTotal)

  const [notes, setNotes] = useState('')

  // ── Quote summary text ─────────────────────────────────────────────────────
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
      lines.push(`Front Door — ${fdDoorCategory === 'Timber' ? 'Timber Supply & Install' : 'Aluminium Door'}`)
      if (fdW && fdH) lines.push(`Size: ${fdW}mm × ${fdH}mm`)
      if (frontDoor.boards > 0) lines.push(`  • Cladding: ${frontDoor.boards} boards (${fdCladding.claddingType})`)
      lines.push(`Price: ${fmt(frontDoor.total)} + GST`)
    }

    if (hasWall && wallResult) {
      lines.push(``)
      lines.push(`Wall Cladding`)
      if (walls.length > 1) {
        walls.forEach((w, i) => {
          if (w.widthMm || w.heightMm) lines.push(`  Wall ${i + 1}: ${w.widthMm || 0}mm × ${w.heightMm || 0}mm`)
        })
      } else if (walls[0]?.widthMm || walls[0]?.heightMm) {
        lines.push(`Size: ${walls[0].widthMm || 0}mm wide × ${walls[0].heightMm || 0}mm high`)
      }
      if (wallResult.totalBoards > 0) lines.push(`  • ${wallResult.totalBoards} boards (${wallCladding.claddingType})`)
      lines.push(`Price: ${fmt(wallResult.total)} + GST`)
    }

    lines.push(``)
    lines.push(`─────────────────────────────────────`)
    lines.push(`TOTAL: ${fmt(finalPrice)} + GST`)
    lines.push(`Quote valid for 30 days`)
    lines.push(`Payment: 50% deposit on acceptance, balance on completion`)
    if (notes) { lines.push(``); lines.push(`Notes: ${notes}`) }

    return lines.join('\n')
  }, [garage, frontDoor, wallResult, hasFrontDoor, hasWall, finalPrice, doorType,
      garageW, garageH, fdW, fdH, walls, fdDoorCategory,
      garageCladding.claddingType, fdCladding.claddingType, wallCladding.claddingType, notes])

  // ── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    try {
      const quoteNum = await generateQuoteNumber()

      const notesData = JSON.stringify({
        v: 3,
        userNotes: notes,
        marginPct: marginDecimal,
        garage: {
          claddingType: garageCladding.claddingType,
          boardWidthMm: garageCladding.boardWidthMm,
          boardCostPerUnit: garageCladding.boardCost,
          horizontal: garageCladding.isHorizontal,
          framePkgCost: garageFrameCost,
          ...garage,
        },
        frontDoor: hasFrontDoor && frontDoor ? {
          doorCategory: fdDoorCategory,
          timberDoorSku: fdDoorCategory === 'Timber' ? fdTimberDoorSku : null,
          timberDoorLabel: fdDoorCategory === 'Timber' ? selectedTimberDoor.label : null,
          timberDoorPrice: fdDoorCategory === 'Timber' ? selectedTimberDoor.priceExGST : null,
          alumFramePrice: fdDoorCategory === 'Aluminium' ? fdAlumFramePrice : null,
          jambCount: fdJambCount, jambCostEach: fdJambCostEach, extraJambCost: fdExtraJambCost,
          pivotCost: fdPivotCost,
          delivery: fdDoorCategory === 'Timber' ? fdDelivery : null,
          deliveryJambs: fdDoorCategory === 'Aluminium' ? fdDeliveryJambs : null,
          deliveryDoor: fdDoorCategory === 'Aluminium' ? fdDeliveryDoor : null,
          alumSheets: fdAlumSheets, alumSheetCostEach: fdAlumSheetCost,
          labourInstall: fdLabourInstall, labourClad: fdLabourClad,
          widthMm: fdW, heightMm: fdH,
          claddingType: fdCladding.claddingType,
          boardWidthMm: fdCladding.boardWidthMm,
          boardCostPerUnit: fdCladding.boardCost,
          horizontal: fdCladding.isHorizontal,
          ...frontDoor,
        } : null,
        wall: hasWall && wallResult ? {
          walls,
          claddingType: wallCladding.claddingType,
          boardWidthMm: wallCladding.boardWidthMm,
          boardCostPerUnit: wallCladding.boardCost,
          horizontal: wallCladding.isHorizontal,
          includeTopHats: wallTopHats,
          curvingCost,
          labourCost: wallLabour,
          ...wallResult,
        } : null,
      })

      const grandSubtotal = (garage?.subtotal || 0) + (frontDoor?.subtotal || 0) + (wallResult?.subtotal || 0)
      const payload = {
        quote_number:      quoteNum,
        status:            'Draft',
        customer_name:     '',
        customer_email:    '',
        customer_phone:    '',
        address,
        suburb,
        door_type:         doorType,
        width_mm:          parseFloat(garageW)  || null,
        height_mm:         parseFloat(garageH)  || null,
        frame_size:        garageCladding.claddingType,
        frame_cost:        garage.framePkgCost,
        cladding_sqm:      garage.boards,
        cladding_cost:     garage.claddingCost,
        doorjam_metres:    hasFrontDoor ? frontDoor?.boards || 0 : null,
        doorjam_cost:      hasFrontDoor ? frontDoor?.total  || 0 : 0,
        installation_cost: hasWall      ? wallResult?.total || 0 : 0,
        subtotal:          grandSubtotal,
        margin_pct:        marginDecimal,
        total_price:       finalPrice,
        notes:             notesData,
      }

      const { data, error } = await supabase.from('jobs').insert([payload]).select().single()
      if (error) throw error

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

  const mPctDisplay = Math.round(parseFloat(marginPct) || 0)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1f2e' }}>
      {/* Header */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: 'rgba(20,24,32,0.92)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/')}
            className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
            style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15,18 9,12 15,6" />
            </svg>
          </button>
          <h1 className="text-base font-semibold flex-1 m-0" style={{ fontFamily: "'Barlow', sans-serif", color: '#f1f5f9', letterSpacing: '0.01em' }}>New Quote</h1>
          <div className="text-xs font-mono px-2 py-1 rounded-md" style={{ backgroundColor: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' }}>
            FAB
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 pb-36 flex flex-col gap-5">

        {/* ── 1. Site Address ─────────────────────────────────────────────── */}
        <SectionCard number="1" title="Site Address">
          <div className="flex flex-col gap-4">
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
                <SizePresets label="Common Widths" presets={GARAGE_WIDTH_PRESETS} value={garageW} onSelect={setGarageW} />
                <NumIn value={garageW} onChange={setGarageW} placeholder="4930" unit="mm" />
              </Field>
              <Field label="Height">
                <SizePresets label="Common Heights" presets={GARAGE_HEIGHT_PRESETS} value={garageH} onSelect={setGarageH} />
                <NumIn value={garageH} onChange={setGarageH} placeholder="2400" unit="mm" />
              </Field>
            </div>

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

            <BoardInfo
              boards={garage.boards} widthMm={garageW} heightMm={garageH}
              boardWidthMm={garageCladding.boardWidthMm} boardCost={garageCladding.boardCost}
              horizontal={garageCladding.isHorizontal}
            />

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

            {(garageW || garageFrameCost) && (
              <MiniBreakdown
                label="Garage Breakdown"
                rows={[
                  garage.framePkgCost > 0 && { label: 'Frame / Motor Package', value: garage.framePkgCost },
                  garage.boards > 0 && { label: `Cladding (${garage.boards} boards × $${garageCladding.boardCost})`, value: garage.claddingCost },
                  { label: `Margin (${mPctDisplay}%)`, value: garage.margin },
                ]}
                total={garage.total}
              />
            )}
          </div>
        </SectionCard>

        {/* ── 3. Front Door (optional) ────────────────────────────────────── */}
        <SectionCard number="3" title="Front Door" accent={hasFrontDoor} complete={hasFrontDoor && frontDoor?.total > 0}>
          <Toggle
            label="Include Front Door?"
            description="Add front door to this quote"
            checked={hasFrontDoor}
            onChange={setHasFrontDoor}
          />

          {hasFrontDoor && (
            <div className="flex flex-col gap-4 pt-4">

              {/* Door type selector */}
              <div className="flex gap-2">
                {['Timber', 'Aluminium'].map((cat) => (
                  <button key={cat} type="button"
                    onClick={() => setFdDoorCategory(cat)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={fdDoorCategory === cat
                      ? { backgroundColor: '#f97316', color: 'white', border: '1px solid #f97316' }
                      : { backgroundColor: '#12172a', color: '#94a3b8', border: '1px solid #2d3448' }}>
                    {cat} Door
                  </button>
                ))}
              </div>

              {/* ── Type 1: Timber ── */}
              {fdDoorCategory === 'Timber' && (
                <>
                  <Field label="Select Door (Block Door Duracote)">
                    <SelectIn
                      value={fdTimberDoorSku}
                      onChange={setFdTimberDoorSku}
                      options={TIMBER_DOORS}
                    />
                    <div className="text-xs mt-1.5 font-mono" style={{ color: '#f97316' }}>
                      {selectedTimberDoor.label} — {formatCurrency(selectedTimberDoor.priceExGST)} ex GST
                      <span className="text-slate-500 ml-2">(listed ${(selectedTimberDoor.priceExGST * 1.1).toFixed(2)} incl GST)</span>
                    </div>
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Jamb lengths (7200mm each)">
                      <NumIn value={fdJambCount} onChange={setFdJambCount} placeholder="1" />
                    </Field>
                    <CostField label="Cost per length" value={fdJambCostEach} onChange={setFdJambCostEach} />
                  </div>

                  <CostField
                    label="Extra jamb cost (if additional length needed)"
                    value={fdExtraJambCost}
                    onChange={setFdExtraJambCost}
                    description="Enter cost of any additional jamb lengths"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <CostField label="Pivot hardware" value={fdPivotCost} onChange={setFdPivotCost} />
                    <CostField label="Delivery" value={fdDelivery} onChange={setFdDelivery} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Aluminium composite sheets">
                      <NumIn value={fdAlumSheets} onChange={setFdAlumSheets} placeholder="0" unit="sheets" />
                    </Field>
                    <CostField label="Cost per sheet" value={fdAlumSheetCost} onChange={setFdAlumSheetCost} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <CostField label="Labour — install door" value={fdLabourInstall} onChange={setFdLabourInstall} />
                    <CostField label="Labour — clad door" value={fdLabourClad} onChange={setFdLabourClad} />
                  </div>
                </>
              )}

              {/* ── Type 2: Aluminium ── */}
              {fdDoorCategory === 'Aluminium' && (
                <>
                  <CostField
                    label="Aluminium door frame price"
                    value={fdAlumFramePrice}
                    onChange={setFdAlumFramePrice}
                    description="Typical range $1,900 – $2,500"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Jamb lengths (7200mm each)">
                      <NumIn value={fdJambCount} onChange={setFdJambCount} placeholder="1" />
                    </Field>
                    <CostField label="Cost per length" value={fdJambCostEach} onChange={setFdJambCostEach} />
                  </div>

                  <CostField
                    label="Extra jamb cost (if additional length needed)"
                    value={fdExtraJambCost}
                    onChange={setFdExtraJambCost}
                    description="Enter cost of any additional jamb lengths"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <CostField label="Pivot hardware" value={fdPivotCost} onChange={setFdPivotCost} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <CostField label="Delivery — jambs" value={fdDeliveryJambs} onChange={setFdDeliveryJambs} />
                    <CostField label="Delivery — door" value={fdDeliveryDoor} onChange={setFdDeliveryDoor} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Aluminium composite sheets">
                      <NumIn value={fdAlumSheets} onChange={setFdAlumSheets} placeholder="0" unit="sheets" />
                    </Field>
                    <CostField label="Cost per sheet" value={fdAlumSheetCost} onChange={setFdAlumSheetCost} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <CostField label="Labour — install door" value={fdLabourInstall} onChange={setFdLabourInstall} />
                    <CostField label="Labour — clad door" value={fdLabourClad} onChange={setFdLabourClad} />
                  </div>
                </>
              )}

              {/* Shared: door dimensions + cladding */}
              <div style={{ borderTop: '1px solid #2d3448', paddingTop: '16px' }}>
                <Label>Door Dimensions (for cladding calculation)</Label>
                <div className="grid grid-cols-2 gap-3 mt-1.5">
                  <NumIn value={fdW} onChange={setFdW} placeholder="1200" unit="mm" />
                  <NumIn value={fdH} onChange={setFdH} placeholder="2700" unit="mm" />
                </div>
              </div>

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

              {(fdW || fdH) && (
                <BoardInfo
                  boards={frontDoor?.boards} widthMm={fdW} heightMm={fdH}
                  boardWidthMm={fdCladding.boardWidthMm} boardCost={fdCladding.boardCost}
                  horizontal={fdCladding.isHorizontal}
                />
              )}

              {frontDoor && (
                <MiniBreakdown
                  label="Front Door Breakdown"
                  rows={[
                    fdDoorCategory === 'Timber' && frontDoor.doorCost > 0 && { label: `Timber door (${selectedTimberDoor.label})`, value: frontDoor.doorCost },
                    fdDoorCategory === 'Aluminium' && frontDoor.frame > 0 && { label: 'Aluminium door frame', value: frontDoor.frame },
                    frontDoor.jambCost > 0 && { label: `Door jamb (${fdJambCount}× length${fdExtraJambCost ? ' + extra' : ''})`, value: frontDoor.jambCost },
                    frontDoor.pivot > 0 && { label: 'Pivot hardware', value: frontDoor.pivot },
                    fdDoorCategory === 'Timber' && frontDoor.deliv > 0 && { label: 'Delivery', value: frontDoor.deliv },
                    fdDoorCategory === 'Aluminium' && frontDoor.delivJ > 0 && { label: 'Delivery — jambs', value: frontDoor.delivJ },
                    fdDoorCategory === 'Aluminium' && frontDoor.delivD > 0 && { label: 'Delivery — door', value: frontDoor.delivD },
                    frontDoor.sheetCost > 0 && { label: `Alum composite sheets (${fdAlumSheets})`, value: frontDoor.sheetCost },
                    frontDoor.boards > 0 && { label: `Cladding (${frontDoor.boards} boards)`, value: frontDoor.claddingCost },
                    frontDoor.install > 0 && { label: 'Labour — install door', value: frontDoor.install },
                    frontDoor.clad > 0 && { label: 'Labour — clad door', value: frontDoor.clad },
                    { label: `Margin (${mPctDisplay}%)`, value: frontDoor.margin },
                  ]}
                  total={frontDoor.total}
                />
              )}
            </div>
          )}
        </SectionCard>

        {/* ── 4. Wall Cladding (optional, multiple walls) ──────────────────── */}
        <SectionCard number="4" title="Wall Cladding" accent={hasWall} complete={hasWall && wallResult?.totalBoards > 0}>
          <Toggle
            label="Include Wall Cladding?"
            description="Add wall cladding section to this quote"
            checked={hasWall}
            onChange={setHasWall}
          />

          {hasWall && (
            <div className="flex flex-col gap-4 pt-4">

              {/* Multiple walls */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Walls</Label>
                  <button type="button" onClick={addWall}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    style={{ backgroundColor: '#12172a', color: '#f97316', border: '1px solid #2d3448' }}>
                    + Add Wall
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {walls.map((wall, idx) => (
                    <div key={wall.id} className="rounded-xl p-3" style={{ backgroundColor: '#12172a', border: '1px solid #2d3448' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold" style={{ color: '#f97316' }}>Wall {idx + 1}</span>
                        {walls.length > 1 && (
                          <button type="button" onClick={() => removeWall(wall.id)}
                            className="text-xs text-slate-500 hover:text-red-400 transition-colors">
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Width</Label>
                          <NumIn value={wall.widthMm} onChange={(v) => updateWall(wall.id, 'widthMm', v)} placeholder="4200" unit="mm" />
                        </div>
                        <div>
                          <Label>Height</Label>
                          <NumIn value={wall.heightMm} onChange={(v) => updateWall(wall.id, 'heightMm', v)} placeholder="2700" unit="mm" />
                        </div>
                      </div>
                      {wallResult?.wallDetails?.[idx]?.boards > 0 && (
                        <div className="mt-2 text-xs font-mono" style={{ color: '#94a3b8' }}>
                          → {wallResult.wallDetails[idx].boards} boards
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {wallResult?.totalBoards > 0 && (
                  <div className="mt-2 flex items-center justify-between px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: '#12172a' }}>
                    <span className="text-slate-400">Total boards (all walls):</span>
                    <span className="font-bold font-mono text-white">{wallResult.totalBoards}</span>
                  </div>
                )}
              </div>

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

              <CostField
                label="Curving costs"
                value={curvingCost}
                onChange={setCurvingCost}
                description="Add allowance for any curved sections"
              />

              {wallResult && (
                <MiniBreakdown
                  label="Wall Breakdown"
                  rows={[
                    wallResult.totalBoards > 0 && { label: `Cladding (${wallResult.totalBoards} boards × $${wallCladding.boardCost})`, value: wallResult.claddingCost },
                    wallResult.topHatsCost > 0 && { label: 'Top hats', value: wallResult.topHatsCost },
                    { label: 'Trims', value: wallResult.trimsCost },
                    wallResult.labourCost > 0 && { label: 'Labour', value: wallResult.labourCost },
                    wallResult.curvingCost > 0 && { label: 'Curving allowance', value: wallResult.curvingCost },
                    { label: `Margin (${mPctDisplay}%)`, value: wallResult.margin },
                  ]}
                  total={wallResult.total}
                />
              )}
            </div>
          )}
        </SectionCard>

        {/* ── 5. Grand Total ──────────────────────────────────────────────── */}
        <section className="rounded-2xl p-5" style={{
          background: 'linear-gradient(135deg, #1e2438 0%, #1a2030 100%)',
          border: '1px solid rgba(249,115,22,0.2)',
          boxShadow: '0 0 32px rgba(249,115,22,0.08), 0 4px 24px rgba(0,0,0,0.4)',
        }}>
          <div className="label-condensed mb-4">Grand Total</div>

          {/* Section subtotals */}
          <div className="flex flex-col gap-1 mb-4">
            {garage.total > 0 && (
              <div className="flex justify-between text-sm py-1.5" style={{ borderBottom: '1px solid #2d3448' }}>
                <span className="text-slate-300">Garage Door</span>
                <span className="font-mono text-white">{formatCurrency(garage.total)}</span>
              </div>
            )}
            {hasFrontDoor && frontDoor && frontDoor.total > 0 && (
              <div className="flex justify-between text-sm py-1.5" style={{ borderBottom: '1px solid #2d3448' }}>
                <span className="text-slate-300">Front Door ({fdDoorCategory})</span>
                <span className="font-mono text-white">{formatCurrency(frontDoor.total)}</span>
              </div>
            )}
            {hasWall && wallResult && wallResult.total > 0 && (
              <div className="flex justify-between text-sm py-1.5" style={{ borderBottom: '1px solid #2d3448' }}>
                <span className="text-slate-300">Wall Cladding</span>
                <span className="font-mono text-white">{formatCurrency(wallResult.total)}</span>
              </div>
            )}
          </div>

          {/* Margin */}
          <div className="mb-4">
            <Label>Margin %</Label>
            <div className="relative">
              <input
                type="number" inputMode="numeric" value={marginPct}
                onChange={(e) => setMarginPct(e.target.value)}
                className="w-full pl-4 pr-10 py-3 rounded-xl text-white text-base outline-none font-mono"
                style={{ ...inputBase }}
                onFocus={(e) => (e.target.style.border = '1px solid #f97316')}
                onBlur={(e)  => (e.target.style.border = '1px solid #2d3448')}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">%</span>
            </div>
          </div>

          {/* Override toggle */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Price</span>
            <button type="button"
              onClick={() => { setOverrideActive(!overrideActive); if (!overrideActive) setPriceOverride(String(Math.round(grandTotal))) }}
              className="text-xs font-medium transition-colors"
              style={{ color: overrideActive ? '#f97316' : '#64748b' }}>
              {overrideActive ? 'Use Calculated' : 'Override Total'}
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
              className="rounded-xl px-5 py-4 flex items-center justify-between"
              style={{
                background: flash
                  ? 'linear-gradient(135deg, #7c2d00, #92350a)'
                  : 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(249,115,22,0.05))',
                border: `1px solid ${flash ? '#ff6b00' : 'rgba(249,115,22,0.4)'}`,
                boxShadow: flash ? '0 0 24px rgba(255,107,0,0.4)' : '0 0 16px rgba(249,115,22,0.15)',
                transition: 'all 0.2s',
              }}
            >
              <div>
                <div className="label-condensed" style={{ color: 'rgba(249,115,22,0.7)', fontSize: '10px' }}>TOTAL PRICE</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>+ GST</div>
              </div>
              <span className="font-mono text-3xl font-bold tabular-nums"
                style={{ color: flash ? '#ff6b00' : '#f97316', transition: 'color 0.2s', fontFamily: "'JetBrains Mono', monospace" }}>
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

          <button type="button" onClick={() => setShowSummary(true)}
            className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            style={{ backgroundColor: '#2d3448', color: '#94a3b8', border: '1px solid #3d4560' }}>
            <span>👁</span> Preview Quote Summary
          </button>
        </section>
      </div>

      {/* ── Quote Summary Modal ──────────────────────────────────────────────── */}
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

      {/* ── Sticky Save Bar ──────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-4 py-4"
        style={{ backgroundColor: 'rgba(20,24,32,0.95)', borderTop: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-2xl mx-auto">
          <button onClick={handleSave} disabled={saving}
            className="w-full py-4 rounded-2xl text-base font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              background: flash ? 'linear-gradient(135deg, #ff6b00, #e55a00)' : 'linear-gradient(135deg, #f97316, #ea6b0f)',
              color: 'white',
              boxShadow: saving ? 'none' : '0 4px 20px rgba(249,115,22,0.45)',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '17px',
              letterSpacing: '0.04em',
              transition: 'all 0.2s',
            }}>
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
