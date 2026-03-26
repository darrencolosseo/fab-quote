// ─── Pricing Configuration ────────────────────────────────────────────────────
// All prices in AUD. Update here — they flow through the entire app.
// Source: MASTER GARAGE PRICE LIST 2026.xlsx (Sheet4 = working calculator, Sheet1 = frame components)
// See CLAUDE.md → "How to Update Prices" for instructions.

// ── Board / cladding defaults ─────────────────────────────────────────────────
export const BOARD_COST        = 180   // $ per board — Source: Sheet4, confirmed across cladding types
export const BOARD_WIDTH_MM    = 150   // default board face width in mm (Castellated Board)
export const HEIGHT_CUT_THRESHOLD = 2900  // Source: Sheet4 formula — below this, 2 cuts per board (halves waste)

// ── Margin ────────────────────────────────────────────────────────────────────
export const MARGIN_PCT = 0.30         // 30% applied to all sections (subtotal × 1.30 = total)

// ── Cladding types — auto-sets board width when selected ─────────────────────
export const CLADDING_TYPES = [
  { name: 'Castellated Board',  boardWidthMm: 150 },
  { name: 'Batten 50×25',       boardWidthMm: 50  },
  { name: 'Batten 32×32',       boardWidthMm: 32  },
  { name: 'Batten 100×50',      boardWidthMm: 100 },
  { name: 'Knotwood 50×25',     boardWidthMm: 50  },
  { name: 'Deco Battens 50×25', boardWidthMm: 50  },
  { name: 'Deco Clad',          boardWidthMm: 150 },
  { name: 'WPC Board',          boardWidthMm: 150 },
  { name: 'Woodex',             boardWidthMm: 150 },
  { name: 'Composite',          boardWidthMm: 150 },
  { name: 'Biowood 50×25',      boardWidthMm: 50  },
  { name: 'New Tech Wood',      boardWidthMm: 150 },
  { name: 'Alumiclad',          boardWidthMm: 150 },
  { name: 'Custom',             boardWidthMm: 150 },
]

// ── Door mount types ──────────────────────────────────────────────────────────
export const DOOR_TYPES = [
  'Flush Mount',
  'Rebate Mount',
  'Sectional Panel Lift',
  'Standard',
  'Custom',
]

// ── Frame / Motor Package cost table ─────────────────────────────────────────
// Source: MASTER GARAGE PRICE LIST 2026.xlsx
//   Anchor: Sheet4 → 4930mm Flush Mount = $7,500 (includes motor, tracks, springs, remotes)
//   Supporting data: Sheet1 frame component averages by width bracket
// Costs are PRE-MARGIN. Width brackets are upper limits (inclusive).
// To update: change values below, save — auto-estimate in NewQuote updates immediately.
const FRAME_BRACKETS = [
  { maxMm: 2400,  costs: { 'Flush Mount': 4500,  'Rebate Mount': 4300,  'Sectional Panel Lift': 4800,  'Standard': 3800 } },
  { maxMm: 2800,  costs: { 'Flush Mount': 5000,  'Rebate Mount': 4800,  'Sectional Panel Lift': 5300,  'Standard': 4200 } },
  { maxMm: 3600,  costs: { 'Flush Mount': 6000,  'Rebate Mount': 5800,  'Sectional Panel Lift': 6200,  'Standard': 5000 } },
  { maxMm: 5200,  costs: { 'Flush Mount': 7500,  'Rebate Mount': 7200,  'Sectional Panel Lift': 7800,  'Standard': 6500 } },  // ← Sheet4 anchor
  { maxMm: 6500,  costs: { 'Flush Mount': 9500,  'Rebate Mount': 9000,  'Sectional Panel Lift': 10000, 'Standard': 8500 } },
]

/**
 * Returns the auto-estimated frame/motor package cost for a given door type + width.
 * Returns null for 'Custom' or widths outside the table range.
 */
export function getFrameCost(doorType, widthMm) {
  const w = parseFloat(widthMm)
  if (!w || w <= 0 || doorType === 'Custom') return null
  const bracket = FRAME_BRACKETS.find((b) => w <= b.maxMm) || FRAME_BRACKETS[FRAME_BRACKETS.length - 1]
  return bracket.costs[doorType] ?? null
}

// ── Front door component costs ────────────────────────────────────────────────
// Source: MASTER GARAGE PRICE LIST 2026.xlsx, Sheet4
export const FRONT_DOOR_DEFAULTS = {
  timberDoor:      380,   // timber door supply
  doorJamb:        316,   // aluminium door jamb
  pivotBox:        150,   // pivot hardware box
  delivery:        139,   // delivery to site
  trims:           100,   // trims (always included)
  labourDoor:     1100,   // installation labour — door fit (only if supplyDoor = true)
  labourCladding:  650,   // installation labour — cladding
}

// ── Wall cladding defaults ────────────────────────────────────────────────────
// Source: MASTER GARAGE PRICE LIST 2026.xlsx, Sheet4
export const WALL_DEFAULTS = {
  topHatCount:     6,     // number of top hats
  topHatCostEach:  25,    // $ per top hat
  trimsCost:       100,   // trims (always included)
  defaultLabour:   2600,  // default installation labour
}

// ─── Core calculation: board count ───────────────────────────────────────────
// Formula from Sheet4:
//   boards = CEIL(width ÷ boardWidth)
//   if height < 2900mm → boards = CEIL(boards ÷ 2)   [2 cuts per full board]
export function calcBoards(widthMm, heightMm, boardWidthMm = BOARD_WIDTH_MM) {
  const w  = parseFloat(widthMm)    || 0
  const h  = parseFloat(heightMm)   || 0
  const bw = parseFloat(boardWidthMm) || BOARD_WIDTH_MM
  if (w <= 0 || bw <= 0) return 0
  const raw = Math.ceil(w / bw)
  return (h > 0 && h < HEIGHT_CUT_THRESHOLD) ? Math.ceil(raw / 2) : raw
}

function round2(n) { return Math.round(n * 100) / 100 }

// ─── Garage door section ──────────────────────────────────────────────────────
export function calcGarage({ widthMm, heightMm, boardWidthMm, boardCostPerUnit, framePkgCost }) {
  const bw      = parseFloat(boardWidthMm)    || BOARD_WIDTH_MM
  const bCost   = parseFloat(boardCostPerUnit) || BOARD_COST
  const fCost   = parseFloat(framePkgCost)     || 0
  const boards  = calcBoards(widthMm, heightMm, bw)
  const claddingCost = round2(boards * bCost)
  const subtotal     = round2(fCost + claddingCost)
  const margin       = round2(subtotal * MARGIN_PCT)
  const total        = round2(subtotal + margin)
  return { boards, boardWidthMm: bw, boardCostPerUnit: bCost, framePkgCost: fCost, claddingCost, subtotal, margin, total }
}

// ─── Front door section ───────────────────────────────────────────────────────
export function calcFrontDoor({ widthMm, heightMm, boardWidthMm, boardCostPerUnit, supplyDoor, includeLabour }) {
  const bw      = parseFloat(boardWidthMm)    || BOARD_WIDTH_MM
  const bCost   = parseFloat(boardCostPerUnit) || BOARD_COST
  const d       = FRONT_DOOR_DEFAULTS
  const boards  = calcBoards(widthMm, heightMm, bw)
  const claddingCost   = round2(boards * bCost)
  const trimsCost      = d.trims
  const doorComponents = supplyDoor ? d.timberDoor + d.doorJamb + d.pivotBox + d.delivery : 0
  const labourCost     = includeLabour ? (supplyDoor ? d.labourDoor : 0) + d.labourCladding : 0
  const subtotal = round2(claddingCost + trimsCost + doorComponents + labourCost)
  const margin   = round2(subtotal * MARGIN_PCT)
  const total    = round2(subtotal + margin)
  return { boards, boardWidthMm: bw, boardCostPerUnit: bCost, claddingCost, trimsCost, doorComponents, labourCost, subtotal, margin, total }
}

// ─── Wall cladding section ────────────────────────────────────────────────────
export function calcWall({ widthMm, heightMm, boardWidthMm, boardCostPerUnit, includeTopHats, labourCost }) {
  const bw      = parseFloat(boardWidthMm)    || BOARD_WIDTH_MM
  const bCost   = parseFloat(boardCostPerUnit) || BOARD_COST
  const boards  = calcBoards(widthMm, heightMm, bw)
  const claddingCost = round2(boards * bCost)
  const topHatsCost  = includeTopHats ? WALL_DEFAULTS.topHatCount * WALL_DEFAULTS.topHatCostEach : 0
  const trimsCost    = WALL_DEFAULTS.trimsCost
  const labour       = parseFloat(labourCost) || 0
  const subtotal     = round2(claddingCost + topHatsCost + trimsCost + labour)
  const margin       = round2(subtotal * MARGIN_PCT)
  const total        = round2(subtotal + margin)
  return { boards, boardWidthMm: bw, boardCostPerUnit: bCost, claddingCost, topHatsCost, trimsCost, labourCost: labour, subtotal, margin, total }
}

// ─── Build full quote summary text (image-3 format) ──────────────────────────
export function buildQuoteSummaryText({ job, garageCalc, frontDoorCalc, wallCalc, parsed }) {
  const fmt = (n) => n != null ? `$${Number(n).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '$0'
  const lines = []

  // Garage
  lines.push(`Garage door — ${job.door_type || ''}`)
  if (job.width_mm && job.height_mm) lines.push(`Size: ${job.width_mm}mm × ${job.height_mm}mm`)
  lines.push(`Includes:`)
  lines.push(`  • Doorman Motor`)
  lines.push(`  • 2 Remotes and 1 × wall button`)
  lines.push(`  • Custom aluminium frame`)
  lines.push(`  • Tracks and springs to suit`)
  if (garageCalc?.boards > 0) {
    lines.push(`  • Cladding: ${garageCalc.boards} boards (${job.frame_size || parsed?.garage?.claddingType || ''})`)
  }
  lines.push(`Price: ${fmt(garageCalc?.total || job.frame_cost)} + GST`)

  // Front door
  if (frontDoorCalc && parsed?.frontDoor) {
    const fd = parsed.frontDoor
    lines.push(``)
    lines.push(`Front Door${fd.supplyDoor ? ' — Supply & Install' : ' — Cladding'}`)
    if (fd.widthMm && fd.heightMm) lines.push(`Size: ${fd.widthMm}mm × ${fd.heightMm}mm`)
    lines.push(`Includes:`)
    if (fd.supplyDoor) {
      lines.push(`  • Timber door supply`)
      lines.push(`  • Aluminium door jamb + pivot hardware`)
      lines.push(`  • Delivery to site`)
    }
    lines.push(`  • Cladding: ${frontDoorCalc.boards} boards (${fd.claddingType || ''})`)
    lines.push(`  • Trims`)
    if (fd.includeLabour) lines.push(`  • Installation labour`)
    lines.push(`Price: ${fmt(frontDoorCalc.total)} + GST`)
  }

  // Wall
  if (wallCalc && parsed?.wall) {
    const w = parsed.wall
    lines.push(``)
    lines.push(`Wall Cladding`)
    if (w.widthMm && w.heightMm) lines.push(`Size: ${w.widthMm}mm wide × ${w.heightMm}mm high`)
    lines.push(`Includes:`)
    lines.push(`  • ${wallCalc.boards} boards (${w.claddingType || ''})`)
    if (w.includeTopHats) lines.push(`  • Top hats and trims`)
    if (w.labourCost > 0) lines.push(`  • Installation labour`)
    lines.push(`Price: ${fmt(wallCalc.total)} + GST`)
  }

  lines.push(``)
  lines.push(`─────────────────────────────────────`)
  lines.push(`TOTAL: ${fmt(job.total_price)} + GST`)
  lines.push(`Quote valid for 30 days`)
  lines.push(`Payment: 50% deposit on acceptance, balance on completion`)

  if (parsed?.userNotes) {
    lines.push(``)
    lines.push(`Notes: ${parsed.userNotes}`)
  }

  return lines.join('\n')
}
