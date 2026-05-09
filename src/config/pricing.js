// ─── Pricing Configuration ────────────────────────────────────────────────────
// All prices in AUD. Update here — they flow through the entire app.
// Source: MASTER GARAGE PRICE LIST 2026.xlsx (Sheet4 = working calculator, Sheet1 = frame components)
// See CLAUDE.md → "How to Update Prices" for instructions.

// ── Board / cladding defaults ─────────────────────────────────────────────────
export const BOARD_COST        = 180   // $ per board (default for new quotes)
export const BOARD_WIDTH_MM    = 150   // default board face width in mm
export const HEIGHT_CUT_THRESHOLD = 2900  // below this, 2 cuts per board saves material

// ── Margin ────────────────────────────────────────────────────────────────────
export const MARGIN_PCT = 0.30         // default 30% — user can override per quote

// ── Cladding types ────────────────────────────────────────────────────────────
// horizontal: true  → boards run across the door width (stacked vertically by height)
//                     board count = CEIL(height / boardWidthMm)
// horizontal: false → boards run vertically (stacked horizontally by width)
//                     board count = CEIL(width / boardWidthMm)
// defaultCostPerUnit: update these when supplier prices change
export const CLADDING_TYPES = [
  { name: 'Castellated Board',  boardWidthMm: 150, horizontal: true,  defaultCostPerUnit: 180 },
  { name: 'Batten 50×25',       boardWidthMm: 50,  horizontal: false, defaultCostPerUnit: 180 },
  { name: 'Batten 32×32',       boardWidthMm: 32,  horizontal: false, defaultCostPerUnit: 180 },
  { name: 'Batten 100×50',      boardWidthMm: 100, horizontal: false, defaultCostPerUnit: 180 },
  { name: 'Knotwood 50×25',     boardWidthMm: 50,  horizontal: false, defaultCostPerUnit: 180 },
  { name: 'Deco Battens 50×25', boardWidthMm: 50,  horizontal: false, defaultCostPerUnit: 180 },
  { name: 'Deco Clad',          boardWidthMm: 150, horizontal: false, defaultCostPerUnit: 180 },
  { name: 'WPC Board',          boardWidthMm: 150, horizontal: false, defaultCostPerUnit: 180 },
  { name: 'Woodex',             boardWidthMm: 150, horizontal: false, defaultCostPerUnit: 180 },
  { name: 'Composite',          boardWidthMm: 150, horizontal: false, defaultCostPerUnit: 180 },
  { name: 'Biowood 50×25',      boardWidthMm: 50,  horizontal: false, defaultCostPerUnit: 180 },
  { name: 'New Tech Wood',      boardWidthMm: 150, horizontal: false, defaultCostPerUnit: 180 },
  { name: 'Alumiclad',          boardWidthMm: 150, horizontal: false, defaultCostPerUnit: 180 },
  { name: 'Custom',             boardWidthMm: 150, horizontal: false, defaultCostPerUnit: 180 },
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
const FRAME_BRACKETS = [
  { maxMm: 2400,  costs: { 'Flush Mount': 4500,  'Rebate Mount': 4300,  'Sectional Panel Lift': 4800,  'Standard': 3800 } },
  { maxMm: 2800,  costs: { 'Flush Mount': 5000,  'Rebate Mount': 4800,  'Sectional Panel Lift': 5300,  'Standard': 4200 } },
  { maxMm: 3600,  costs: { 'Flush Mount': 6000,  'Rebate Mount': 5800,  'Sectional Panel Lift': 6200,  'Standard': 5000 } },
  { maxMm: 5200,  costs: { 'Flush Mount': 7500,  'Rebate Mount': 7200,  'Sectional Panel Lift': 7800,  'Standard': 6500 } },
  { maxMm: 6500,  costs: { 'Flush Mount': 9500,  'Rebate Mount': 9000,  'Sectional Panel Lift': 10000, 'Standard': 8500 } },
]

export function getFrameCost(doorType, widthMm) {
  const w = parseFloat(widthMm)
  if (!w || w <= 0 || doorType === 'Custom') return null
  const bracket = FRAME_BRACKETS.find((b) => w <= b.maxMm) || FRAME_BRACKETS[FRAME_BRACKETS.length - 1]
  return bracket.costs[doorType] ?? null
}

// ── Timber Door Catalogue (Block Door Duracote) ───────────────────────────────
// Source: blacktownbuildingsupplies.com.au — prices listed are INCL GST, stored here EX-GST (÷ 1.1)
// To update: change priceExGST values below. App shows all prices + GST.
export const TIMBER_DOORS = [
  { label: '2040 × 820 × 35mm',  sku: 'BDD82035',  priceExGST: 127.23 },
  { label: '2040 × 820 × 40mm',  sku: 'BDD82040',  priceExGST: 144.77 },
  { label: '2100 × 920 × 35mm',  sku: 'BD219',     priceExGST: 174.09 },
  { label: '2100 × 920 × 40mm',  sku: 'BD40219',   priceExGST: 219.09 },
  { label: '2100 × 1200 × 35mm', sku: 'BD2112',    priceExGST: 220.82 },
  { label: '2100 × 1200 × 40mm', sku: 'BD402112',  priceExGST: 240.91 },
  { label: '2400 × 920 × 35mm',  sku: 'BD249',     priceExGST: 215.45 },
  { label: '2400 × 920 × 40mm',  sku: 'BD40249',   priceExGST: 230.91 },
  { label: '2400 × 1200 × 35mm', sku: 'BD2412',    priceExGST: 227.73 },
  { label: '2400 × 1200 × 40mm', sku: 'BD402412',  priceExGST: 252.73 },
  { label: '2700 × 920 × 35mm',  sku: 'BD279',     priceExGST: 372.73 },
  { label: '2700 × 920 × 40mm',  sku: 'BD27940',   priceExGST: 390.91 },
  { label: '2700 × 1200 × 35mm', sku: 'BD271235',  priceExGST: 436.36 },
  { label: '2700 × 1200 × 40mm', sku: 'BD271240',  priceExGST: 468.18 },
]

// ── Front door component defaults ─────────────────────────────────────────────
export const FRONT_DOOR_DEFAULTS = {
  jambCostPerLength:  316,   // $ per 7200mm aluminium door jamb length
  pivotCost:          150,   // pivot hardware
  deliveryTimber:     155,   // delivery for timber door
  deliveryJambs:      155,   // delivery for jambs (aluminium door type)
  deliveryAlumDoor:   250,   // delivery for aluminium door frame
  alumSheetCost:      150,   // per aluminium composite sheet (ex-GST)
  labourInstall:     1300,   // labour to install door (ex-GST)
  labourClad:        1300,   // labour to clad door (ex-GST)
}

// ── Wall cladding defaults ────────────────────────────────────────────────────
export const WALL_DEFAULTS = {
  topHatCount:     6,
  topHatCostEach:  25,
  trimsCost:       100,
  defaultLabour:   2600,
}

// ─── Core calculation: board count ───────────────────────────────────────────
// horizontal = true  → Castellated Board style: boards span the full width, stacked by height
//   boards = CEIL(height / boardWidth)
//   cut optimised if width < 2900mm (can cut one board to get 2 spans)
// horizontal = false → Batten style: boards run vertically, stacked by width
//   boards = CEIL(width / boardWidth)
//   cut optimised if height < 2900mm (can cut one board to get 2 heights)
export function calcBoards(widthMm, heightMm, boardWidthMm = BOARD_WIDTH_MM, horizontal = false) {
  const w  = parseFloat(widthMm)      || 0
  const h  = parseFloat(heightMm)     || 0
  const bw = parseFloat(boardWidthMm) || BOARD_WIDTH_MM
  const primary   = horizontal ? h : w
  const secondary = horizontal ? w : h
  if (primary <= 0 || bw <= 0) return 0
  const raw = Math.ceil(primary / bw)
  return (secondary > 0 && secondary < HEIGHT_CUT_THRESHOLD) ? Math.ceil(raw / 2) : raw
}

// ─── Integer-cent arithmetic ──────────────────────────────────────────────────
// All dollar values are converted to integer cents at input so every addition
// and multiplication is exact integer arithmetic.
// The ONLY place Math.round is used is when computing the margin (integer × %).
// Output values are converted back to dollars (÷ 100) for storage/display.
function cents(val, fallback = 0) {
  const n = parseFloat(val)
  return Number.isFinite(n) ? Math.round(n * 100) : Math.round(fallback * 100)
}
function dollars(c) { return c / 100 }
function applyMargin(subtotalCents, mPct) {
  const marginCents = Math.round(subtotalCents * mPct)  // single rounding point
  return { marginCents, totalCents: subtotalCents + marginCents }
}

// ─── Garage door section ──────────────────────────────────────────────────────
export function calcGarage({ widthMm, heightMm, boardWidthMm, boardCostPerUnit, framePkgCost, horizontal, marginPct: mPctOverride }) {
  const bw          = parseFloat(boardWidthMm) || BOARD_WIDTH_MM
  const boards      = calcBoards(widthMm, heightMm, bw, horizontal || false)
  const bCostCents  = cents(boardCostPerUnit, BOARD_COST)
  const fCostCents  = cents(framePkgCost)
  const claddingCents = boards * bCostCents          // integer × integer = exact
  const subtotalCents = fCostCents + claddingCents   // integer + integer = exact
  const mPct = mPctOverride != null ? mPctOverride : MARGIN_PCT
  const { marginCents, totalCents } = applyMargin(subtotalCents, mPct)
  return {
    boards,
    boardWidthMm:    bw,
    boardCostPerUnit: dollars(bCostCents),
    framePkgCost:    dollars(fCostCents),
    claddingCost:    dollars(claddingCents),
    subtotal:        dollars(subtotalCents),
    margin:          dollars(marginCents),
    total:           dollars(totalCents),
  }
}

// ─── Front door (Type 1 — Timber) ────────────────────────────────────────────
export function calcFrontDoorTimber({
  timberDoorPrice, jambCount, jambCostEach, extraJambCost,
  pivotCost, delivery, alumSheets, alumSheetCostEach,
  labourInstall, labourClad,
  widthMm, heightMm, boardWidthMm, boardCostPerUnit, horizontal,
  marginPct: mPctOverride,
}) {
  const bw     = parseFloat(boardWidthMm) || BOARD_WIDTH_MM
  const boards = calcBoards(widthMm, heightMm, bw, horizontal || false)

  const bCostCents    = cents(boardCostPerUnit, BOARD_COST)
  const doorCostCents = cents(timberDoorPrice)
  const jambCostCents = Math.round(cents(jambCount, 1) / 100) * cents(jambCostEach, 316)
                       + cents(extraJambCost)
  const pivotCents    = cents(pivotCost,      FRONT_DOOR_DEFAULTS.pivotCost)
  const delivCents    = cents(delivery,       FRONT_DOOR_DEFAULTS.deliveryTimber)
  const sheetCents    = Math.round(cents(alumSheets) / 100) * cents(alumSheetCostEach, FRONT_DOOR_DEFAULTS.alumSheetCost)
  const installCents  = cents(labourInstall,  FRONT_DOOR_DEFAULTS.labourInstall)
  const cladCents     = cents(labourClad,     FRONT_DOOR_DEFAULTS.labourClad)
  const claddingCents = boards * bCostCents

  const subtotalCents = doorCostCents + jambCostCents + pivotCents + delivCents
                      + sheetCents + claddingCents + installCents + cladCents
  const mPct = mPctOverride != null ? mPctOverride : MARGIN_PCT
  const { marginCents, totalCents } = applyMargin(subtotalCents, mPct)
  return {
    boards,
    claddingCost: dollars(claddingCents),
    doorCost:     dollars(doorCostCents),
    jambCost:     dollars(jambCostCents),
    pivot:        dollars(pivotCents),
    deliv:        dollars(delivCents),
    sheetCost:    dollars(sheetCents),
    install:      dollars(installCents),
    clad:         dollars(cladCents),
    subtotal:     dollars(subtotalCents),
    margin:       dollars(marginCents),
    total:        dollars(totalCents),
  }
}

// ─── Front door (Type 2 — Aluminium) ─────────────────────────────────────────
export function calcFrontDoorAluminium({
  alumFramePrice, jambCount, jambCostEach, extraJambCost,
  pivotCost, deliveryJambs, deliveryDoor, alumSheets, alumSheetCostEach,
  labourInstall, labourClad,
  widthMm, heightMm, boardWidthMm, boardCostPerUnit, horizontal,
  marginPct: mPctOverride,
}) {
  const bw     = parseFloat(boardWidthMm) || BOARD_WIDTH_MM
  const boards = calcBoards(widthMm, heightMm, bw, horizontal || false)

  const bCostCents    = cents(boardCostPerUnit, BOARD_COST)
  const frameCents    = cents(alumFramePrice)
  const jambCostCents = Math.round(cents(jambCount, 1) / 100) * cents(jambCostEach, 316)
                       + cents(extraJambCost)
  const pivotCents    = cents(pivotCost,    FRONT_DOOR_DEFAULTS.pivotCost)
  const delivJCents   = cents(deliveryJambs, FRONT_DOOR_DEFAULTS.deliveryJambs)
  const delivDCents   = cents(deliveryDoor,  FRONT_DOOR_DEFAULTS.deliveryAlumDoor)
  const sheetCents    = Math.round(cents(alumSheets) / 100) * cents(alumSheetCostEach, FRONT_DOOR_DEFAULTS.alumSheetCost)
  const installCents  = cents(labourInstall, FRONT_DOOR_DEFAULTS.labourInstall)
  const cladCents     = cents(labourClad,    FRONT_DOOR_DEFAULTS.labourClad)
  const claddingCents = boards * bCostCents

  const subtotalCents = frameCents + jambCostCents + pivotCents + delivJCents + delivDCents
                      + sheetCents + claddingCents + installCents + cladCents
  const mPct = mPctOverride != null ? mPctOverride : MARGIN_PCT
  const { marginCents, totalCents } = applyMargin(subtotalCents, mPct)
  return {
    boards,
    claddingCost: dollars(claddingCents),
    frame:        dollars(frameCents),
    jambCost:     dollars(jambCostCents),
    pivot:        dollars(pivotCents),
    delivJ:       dollars(delivJCents),
    delivD:       dollars(delivDCents),
    sheetCost:    dollars(sheetCents),
    install:      dollars(installCents),
    clad:         dollars(cladCents),
    subtotal:     dollars(subtotalCents),
    margin:       dollars(marginCents),
    total:        dollars(totalCents),
  }
}

// ─── Wall cladding — multiple walls ──────────────────────────────────────────
export function calcWallMulti({ walls, boardWidthMm, boardCostPerUnit, horizontal, includeTopHats, labourCost, curvingCost, marginPct: mPctOverride }) {
  const bw         = parseFloat(boardWidthMm) || BOARD_WIDTH_MM
  const bCostCents = cents(boardCostPerUnit, BOARD_COST)

  const wallDetails = (walls || []).map((w) => {
    const boards = calcBoards(w.widthMm, w.heightMm, bw, horizontal || false)
    return { ...w, boards }
  })
  const totalBoards   = wallDetails.reduce((s, w) => s + w.boards, 0)
  const claddingCents = totalBoards * bCostCents   // integer × integer = exact
  const topHatsCents  = includeTopHats
    ? WALL_DEFAULTS.topHatCount * Math.round(WALL_DEFAULTS.topHatCostEach * 100) : 0
  const trimsCents    = Math.round(WALL_DEFAULTS.trimsCost * 100)
  const labourCents   = cents(labourCost)
  const curvingCents  = cents(curvingCost)

  const subtotalCents = claddingCents + topHatsCents + trimsCents + labourCents + curvingCents
  const mPct = mPctOverride != null ? mPctOverride : MARGIN_PCT
  const { marginCents, totalCents } = applyMargin(subtotalCents, mPct)
  return {
    wallDetails,
    totalBoards,
    claddingCost: dollars(claddingCents),
    topHatsCost:  dollars(topHatsCents),
    trimsCost:    dollars(trimsCents),
    labourCost:   dollars(labourCents),
    curvingCost:  dollars(curvingCents),
    subtotal:     dollars(subtotalCents),
    margin:       dollars(marginCents),
    total:        dollars(totalCents),
  }
}

// ─── Legacy single-wall calc (used for old v2 saved quotes) ──────────────────
export function calcWall({ widthMm, heightMm, boardWidthMm, boardCostPerUnit, includeTopHats, labourCost }) {
  const bw         = parseFloat(boardWidthMm) || BOARD_WIDTH_MM
  const bCostCents = cents(boardCostPerUnit, BOARD_COST)
  const boards     = calcBoards(widthMm, heightMm, bw)
  const claddingCents = boards * bCostCents
  const topHatsCents  = includeTopHats ? WALL_DEFAULTS.topHatCount * Math.round(WALL_DEFAULTS.topHatCostEach * 100) : 0
  const trimsCents    = Math.round(WALL_DEFAULTS.trimsCost * 100)
  const labourCents   = cents(labourCost)
  const subtotalCents = claddingCents + topHatsCents + trimsCents + labourCents
  const { marginCents, totalCents } = applyMargin(subtotalCents, MARGIN_PCT)
  return {
    boards,
    boardWidthMm: bw,
    boardCostPerUnit: dollars(bCostCents),
    claddingCost: dollars(claddingCents),
    topHatsCost:  dollars(topHatsCents),
    trimsCost:    dollars(trimsCents),
    labourCost:   dollars(labourCents),
    subtotal:     dollars(subtotalCents),
    margin:       dollars(marginCents),
    total:        dollars(totalCents),
  }
}

// ─── Legacy front door calc (used for old v2 saved quotes) ───────────────────
export function calcFrontDoor({ widthMm, heightMm, boardWidthMm, boardCostPerUnit, supplyDoor, includeLabour }) {
  const bw         = parseFloat(boardWidthMm) || BOARD_WIDTH_MM
  const bCostCents = cents(boardCostPerUnit, BOARD_COST)
  const d          = FRONT_DOOR_DEFAULTS
  const boards     = calcBoards(widthMm, heightMm, bw)
  const claddingCents   = boards * bCostCents
  const trimsCents      = 10000  // $100.00
  const doorCompCents   = supplyDoor
    ? Math.round((380 + d.jambCostPerLength + d.pivotCost + 139) * 100) : 0
  const labourCents     = includeLabour
    ? Math.round(((supplyDoor ? d.labourInstall : 0) + d.labourClad) * 100) : 0
  const subtotalCents   = claddingCents + trimsCents + doorCompCents + labourCents
  const { marginCents, totalCents } = applyMargin(subtotalCents, MARGIN_PCT)
  return {
    boards,
    boardWidthMm: bw,
    boardCostPerUnit: dollars(bCostCents),
    claddingCost:   dollars(claddingCents),
    trimsCost:      dollars(trimsCents),
    doorComponents: dollars(doorCompCents),
    labourCost:     dollars(labourCents),
    subtotal:       dollars(subtotalCents),
    margin:         dollars(marginCents),
    total:          dollars(totalCents),
  }
}

// ─── Build full quote summary text ───────────────────────────────────────────
export function buildQuoteSummaryText({ job, garageCalc, frontDoorCalc, wallCalc, parsed }) {
  const fmt = (n) => n != null ? `$${Number(n).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '$0'
  const lines = []

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

  if (frontDoorCalc && parsed?.frontDoor) {
    const fd = parsed.frontDoor
    lines.push(``)
    lines.push(`Front Door (${fd.doorCategory || 'Timber'})`)
    if (fd.widthMm && fd.heightMm) lines.push(`Size: ${fd.widthMm}mm × ${fd.heightMm}mm`)
    if (fd.boards > 0) lines.push(`  • Cladding: ${fd.boards} boards (${fd.claddingType || ''})`)
    lines.push(`Price: ${fmt(frontDoorCalc.total)} + GST`)
  }

  if (wallCalc && parsed?.wall) {
    const w = parsed.wall
    lines.push(``)
    lines.push(`Wall Cladding`)
    if (w.walls?.length > 1) {
      w.walls.forEach((wall, i) => lines.push(`  Wall ${i + 1}: ${wall.widthMm || 0}mm × ${wall.heightMm || 0}mm`))
    } else if (w.walls?.[0]) {
      lines.push(`Size: ${w.walls[0].widthMm || 0}mm wide × ${w.walls[0].heightMm || 0}mm high`)
    }
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
