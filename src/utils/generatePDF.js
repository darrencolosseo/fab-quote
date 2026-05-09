import { jsPDF } from 'jspdf'
import { formatDate } from './format'

function fmt(n) {
  return '$' + Math.round(n || 0).toLocaleString('en-AU')
}

function parseNotes(raw) {
  if (!raw) return { userNotes: null, parsed: null }
  try {
    const obj = JSON.parse(raw)
    if (obj.v === 2 || obj.v === 3) return { userNotes: obj.userNotes || null, parsed: obj }
  } catch {}
  return { userNotes: raw, parsed: null }
}

export function generateQuotePDF(job) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW  = 210
  const pageH  = 297
  const margin = 18
  const cW     = pageW - margin * 2
  const bottomLimit = pageH - 14   // ~14mm bottom safety margin

  const navy      = [26,  31,  46 ]
  const orange    = [249, 115, 22 ]
  const white     = [255, 255, 255]
  const lightGrey = [241, 245, 249]
  const softGrey  = [226, 232, 240]
  const midGrey   = [100, 116, 139]
  const dark      = [30,  41,  59 ]
  const divider   = [203, 213, 225]

  // ── Page-break helper ────────────────────────────────────────────────────────
  // Call before drawing a block; if it won't fit, start a fresh page.
  function ensureSpace(neededMm) {
    if (y + neededMm > bottomLimit) {
      doc.addPage()
      y = 18
    }
  }

  // ── Header ───────────────────────────────────────────────────────────────────
  doc.setFillColor(...navy)
  doc.rect(0, 0, pageW, 38, 'F')

  doc.setTextColor(...orange)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('FAB GARAGE DOORS', margin, 22)

  doc.setTextColor(...orange)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('QUOTE', pageW - margin, 14, { align: 'right' })
  doc.setTextColor(...white)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.text(job.quote_number || '', pageW - margin, 21, { align: 'right' })
  doc.text(formatDate(job.created_at || new Date().toISOString()), pageW - margin, 28, { align: 'right' })

  // ── Address block ────────────────────────────────────────────────────────────
  let y = 48
  doc.setTextColor(...midGrey)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.text('PREPARED FOR', margin, y)

  y += 6
  doc.setTextColor(...dark)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  if (job.address) { doc.text(job.address, margin, y); y += 5.5 }
  if (job.suburb)  { doc.text(job.suburb,  margin, y); y += 5.5 }

  y += 3
  doc.setDrawColor(...divider)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageW - margin, y)
  y += 8

  // ── Parse notes ──────────────────────────────────────────────────────────────
  const { userNotes, parsed } = parseNotes(job.notes)
  const isV3       = parsed?.v === 3
  const g          = parsed?.garage
  const fd         = parsed?.frontDoor
  const w          = parsed?.wall
  const marginPct  = parsed?.marginPct ?? job.margin_pct ?? 0.30
  const marginLabel = `${Math.round(marginPct * 100)}%`

  // ── Helper: draw a full section ───────────────────────────────────────────────
  // rows: array of { label, value } | { label, value, bold } | 'divider' | 'subtotal-divider'
  function drawSection(title, subtitle, bulletLines, costRows, sectionTotal) {
    // Estimate: header (11) + bullets (~5×count + 7) + divider (5) + rows (~5×count) + total bar (15)
    const estHeight = 11
      + (bulletLines.length > 0 ? bulletLines.length * 4.5 + 7 : 0)
      + 5
      + costRows.length * 5.5
      + 16
    // Keep header + first few rows together — at minimum need ~40mm to start cleanly
    ensureSpace(Math.min(estHeight, 60))

    // Section header bar
    doc.setFillColor(...lightGrey)
    doc.rect(margin, y - 3, cW, 9, 'F')
    doc.setTextColor(...navy)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(title, margin + 3, y + 3)
    if (subtitle) {
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...midGrey)
      doc.text(subtitle, pageW - margin, y + 3, { align: 'right' })
    }
    y += 11

    // Bullet list (what's included)
    if (bulletLines.length > 0) {
      ensureSpace(7 + bulletLines.length * 4.5)
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...midGrey)
      doc.text('Includes:', margin + 3, y)
      y += 5
      bulletLines.forEach((b) => {
        ensureSpace(5)
        doc.setTextColor(...dark)
        doc.text('  ' + b, margin + 3, y)
        y += 4.5
      })
      y += 2
    }

    // Cost breakdown divider
    ensureSpace(5)
    doc.setDrawColor(...divider)
    doc.setLineWidth(0.2)
    doc.line(margin, y, pageW - margin, y)
    y += 5

    // Cost rows
    costRows.forEach((row) => {
      if (row === 'divider') {
        ensureSpace(3)
        doc.setDrawColor(...divider)
        doc.setLineWidth(0.15)
        doc.line(margin + cW * 0.45, y - 1, pageW - margin, y - 1)
        y += 2
        return
      }
      const isBold      = row.bold || false
      const isSubtotal  = row.subtotal || false
      const isMargin    = row.margin || false

      ensureSpace(isSubtotal ? 7 : 6)
      doc.setFontSize(isBold || isSubtotal ? 9.5 : 9)
      doc.setFont('helvetica', isBold || isSubtotal ? 'bold' : 'normal')
      doc.setTextColor(isMargin ? midGrey[0] : dark[0], isMargin ? midGrey[1] : dark[1], isMargin ? midGrey[2] : dark[2])

      doc.text(row.label, margin + 3, y)
      doc.text(row.value, pageW - margin, y, { align: 'right' })
      y += isSubtotal ? 6 : 5
    })

    y += 1

    // Section total bar (navy) — keep on same page as preceding rows
    ensureSpace(15)
    doc.setFillColor(...navy)
    doc.rect(margin, y, cW, 10, 'F')
    doc.setTextColor(...white)
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'bold')
    doc.text('SECTION TOTAL', margin + 4, y + 6.5)
    doc.setTextColor(...orange)
    doc.setFontSize(11)
    doc.text(sectionTotal + ' + GST', pageW - margin, y + 6.8, { align: 'right' })
    y += 15
  }

  // Track section totals for summary
  const sectionSummary = []

  // ── Garage section ────────────────────────────────────────────────────────────
  // Only render if it has meaningful data — supports "front door only" quotes.
  const hasGarage = (g?.total > 0) || (g?.framePkgCost > 0) || (g?.boards > 0) || (job.frame_cost > 0)
  if (hasGarage) {
    const garageTitle    = `Garage Door — ${job.door_type || ''}`
    const garageSubtitle = job.width_mm ? `${job.width_mm}mm × ${job.height_mm}mm` : ''
    const garageBullets  = [
      'Doorman Motor',
      '2 Remotes and 1 × wall button',
      'Custom aluminium frame',
      'Tracks and springs to suit',
    ]
    if (g?.boards > 0) garageBullets.push(`Cladding: ${g.boards} boards (${g.claddingType || job.frame_size || ''}, ${g.boardWidthMm || 150}mm)`)

    const garageCosts = []
    if (g?.framePkgCost > 0) garageCosts.push({ label: 'Frame / Motor Package', value: fmt(g.framePkgCost) })
    if (g?.claddingCost > 0) garageCosts.push({ label: `Cladding  ${g.boards} boards × $${g.boardCostPerUnit}`, value: fmt(g.claddingCost) })
    garageCosts.push('divider')
    garageCosts.push({ label: 'Subtotal', value: fmt(g?.subtotal), subtotal: true })
    garageCosts.push({ label: `Margin (${marginLabel})`, value: fmt(g?.margin), margin: true })

    drawSection(garageTitle, garageSubtitle, garageBullets, garageCosts, fmt(g?.total))
    sectionSummary.push({ label: `Garage Door${garageSubtitle ? `  (${garageSubtitle})` : ''}`, value: fmt(g?.total) })
  }

  // ── Front Door — v3 ───────────────────────────────────────────────────────────
  if (fd && isV3) {
    const cat      = fd.doorCategory || 'Timber'
    const fdTitle  = `Front Door — ${cat}`
    const fdSub    = fd.widthMm ? `${fd.widthMm}mm × ${fd.heightMm}mm` : ''
    const fdBullets = []

    if (cat === 'Timber' && fd.timberDoorLabel) fdBullets.push(`Timber door: ${fd.timberDoorLabel}`)
    if (cat === 'Aluminium') fdBullets.push('Aluminium door frame')
    fdBullets.push(`Door jamb (${fd.jambCount || 1}× 7200mm length)`)
    fdBullets.push('Pivot hardware')
    if (cat === 'Timber')    fdBullets.push('Delivery to site')
    if (cat === 'Aluminium') fdBullets.push('Delivery — jambs + door')
    if (parseInt(fd.alumSheets) > 0) fdBullets.push(`Aluminium composite sheets (${fd.alumSheets})`)
    if (fd.boards > 0) fdBullets.push(`Cladding: ${fd.boards} boards (${fd.claddingType || ''}, ${fd.boardWidthMm || 150}mm)`)
    fdBullets.push('Labour — install + clad')

    const fdCosts = []
    if (cat === 'Timber'    && fd.doorCost > 0) fdCosts.push({ label: `Timber door (${fd.timberDoorLabel || ''})`, value: fmt(fd.doorCost) })
    if (cat === 'Aluminium' && fd.frame    > 0) fdCosts.push({ label: 'Aluminium door frame', value: fmt(fd.frame) })
    if (fd.jambCost  > 0) fdCosts.push({ label: `Door jamb (${fd.jambCount || 1}× length)`, value: fmt(fd.jambCost) })
    if (fd.pivot     > 0) fdCosts.push({ label: 'Pivot hardware', value: fmt(fd.pivot) })
    if (cat === 'Timber'    && fd.deliv  > 0) fdCosts.push({ label: 'Delivery', value: fmt(fd.deliv) })
    if (cat === 'Aluminium' && fd.delivJ > 0) fdCosts.push({ label: 'Delivery — jambs', value: fmt(fd.delivJ) })
    if (cat === 'Aluminium' && fd.delivD > 0) fdCosts.push({ label: 'Delivery — door',  value: fmt(fd.delivD) })
    if (fd.sheetCost    > 0) fdCosts.push({ label: `Alum composite sheets (${fd.alumSheets})`, value: fmt(fd.sheetCost) })
    if (fd.claddingCost > 0) fdCosts.push({ label: `Cladding  ${fd.boards} boards × $${fd.boardCostPerUnit || ''}`, value: fmt(fd.claddingCost) })
    if (fd.install      > 0) fdCosts.push({ label: 'Labour — install door', value: fmt(fd.install) })
    if (fd.clad         > 0) fdCosts.push({ label: 'Labour — clad door',   value: fmt(fd.clad) })
    fdCosts.push('divider')
    fdCosts.push({ label: 'Subtotal', value: fmt(fd.subtotal), subtotal: true })
    fdCosts.push({ label: `Margin (${marginLabel})`, value: fmt(fd.margin), margin: true })

    drawSection(fdTitle, fdSub, fdBullets, fdCosts, fmt(fd.total))
    sectionSummary.push({ label: `Front Door — ${cat}${fdSub ? `  (${fdSub})` : ''}`, value: fmt(fd.total) })
  }

  // ── Front Door — legacy v2 ────────────────────────────────────────────────────
  if (fd && !isV3) {
    const fdTitle   = `Front Door${fd.supplyDoor ? ' — Supply & Install' : ' — Cladding'}`
    const fdSub     = fd.widthMm ? `${fd.widthMm}mm × ${fd.heightMm}mm` : ''
    const fdBullets = []
    if (fd.supplyDoor) {
      fdBullets.push('Timber door supply')
      fdBullets.push('Aluminium door jamb + pivot hardware')
      fdBullets.push('Delivery to site')
    }
    if (fd.boards > 0)    fdBullets.push(`Cladding: ${fd.boards} boards (${fd.claddingType || ''})`)
    fdBullets.push('Trims')
    if (fd.includeLabour) fdBullets.push('Installation labour')

    const fdCosts = []
    if (fd.doorComponents > 0) fdCosts.push({ label: 'Door components', value: fmt(fd.doorComponents) })
    if (fd.claddingCost   > 0) fdCosts.push({ label: `Cladding (${fd.boards} boards)`, value: fmt(fd.claddingCost) })
    if (fd.trimsCost      > 0) fdCosts.push({ label: 'Trims', value: fmt(fd.trimsCost) })
    if (fd.labourCost     > 0) fdCosts.push({ label: 'Labour', value: fmt(fd.labourCost) })
    fdCosts.push('divider')
    fdCosts.push({ label: 'Subtotal', value: fmt(fd.subtotal), subtotal: true })
    fdCosts.push({ label: `Margin (${marginLabel})`, value: fmt(fd.margin), margin: true })

    drawSection(fdTitle, fdSub, fdBullets, fdCosts, fmt(fd.total))
    sectionSummary.push({ label: `Front Door${fdSub ? `  (${fdSub})` : ''}`, value: fmt(fd.total) })
  }

  // ── Wall — v3 multi-wall ──────────────────────────────────────────────────────
  if (w && isV3) {
    const wallCount  = w.walls?.length || 1
    const wTitle     = wallCount > 1 ? `Wall Cladding — ${wallCount} Walls` : 'Wall Cladding'
    const wSub       = wallCount === 1 && w.walls?.[0]?.widthMm ? `${w.walls[0].widthMm}mm × ${w.walls[0].heightMm}mm` : ''
    const wBullets   = []
    if (wallCount > 1 && w.walls) {
      w.walls.forEach((wall, i) => {
        const detail = w.wallDetails?.[i]
        wBullets.push(`Wall ${i + 1}: ${wall.widthMm || 0}mm × ${wall.heightMm || 0}mm${detail?.boards ? ` — ${detail.boards} boards` : ''}`)
      })
    }
    if (w.totalBoards > 0) wBullets.push(`Total: ${w.totalBoards} boards (${w.claddingType || ''}, ${w.boardWidthMm || 150}mm)`)
    if (w.includeTopHats)  wBullets.push('Top hats and trims included')
    if (parseFloat(w.labourCost)  > 0) wBullets.push('Installation labour')
    if (parseFloat(w.curvingCost) > 0) wBullets.push('Curving allowance')

    const wCosts = []
    if (w.claddingCost  > 0) wCosts.push({ label: `Cladding  ${w.totalBoards} boards × $${w.boardCostPerUnit}`, value: fmt(w.claddingCost) })
    if (w.topHatsCost   > 0) wCosts.push({ label: 'Top hats', value: fmt(w.topHatsCost) })
    if (w.trimsCost     > 0) wCosts.push({ label: 'Trims', value: fmt(w.trimsCost) })
    if (parseFloat(w.labourCost)  > 0) wCosts.push({ label: 'Labour', value: fmt(w.labourCost) })
    if (parseFloat(w.curvingCost) > 0) wCosts.push({ label: 'Curving allowance', value: fmt(w.curvingCost) })
    wCosts.push('divider')
    wCosts.push({ label: 'Subtotal', value: fmt(w.subtotal), subtotal: true })
    wCosts.push({ label: `Margin (${marginLabel})`, value: fmt(w.margin), margin: true })

    drawSection(wTitle, wSub, wBullets, wCosts, fmt(w.total))
    sectionSummary.push({ label: `Wall Cladding${wSub ? `  (${wSub})` : ''}`, value: fmt(w.total) })
  }

  // ── Wall — legacy v2 ─────────────────────────────────────────────────────────
  if (w && !isV3) {
    const wTitle   = 'Wall Cladding'
    const wSub     = w.widthMm ? `${w.widthMm}mm × ${w.heightMm}mm` : ''
    const wBullets = []
    if (w.boards > 0)      wBullets.push(`${w.boards} boards (${w.claddingType || ''})`)
    if (w.includeTopHats)  wBullets.push('Top hats and trims included')
    if (parseFloat(w.labourCost) > 0) wBullets.push('Installation labour')

    const wCosts = []
    if (w.claddingCost > 0) wCosts.push({ label: `Cladding (${w.boards} boards)`, value: fmt(w.claddingCost) })
    if (w.topHatsCost  > 0) wCosts.push({ label: 'Top hats', value: fmt(w.topHatsCost) })
    if (w.trimsCost    > 0) wCosts.push({ label: 'Trims', value: fmt(w.trimsCost) })
    if (w.labourCost   > 0) wCosts.push({ label: 'Labour', value: fmt(w.labourCost) })
    wCosts.push('divider')
    wCosts.push({ label: 'Subtotal', value: fmt(w.subtotal), subtotal: true })
    wCosts.push({ label: `Margin (${marginLabel})`, value: fmt(w.margin), margin: true })

    drawSection(wTitle, wSub, wBullets, wCosts, fmt(w.total))
    sectionSummary.push({ label: `Wall Cladding${wSub ? `  (${wSub})` : ''}`, value: fmt(w.total) })
  }

  // ── Summary + Grand Total ─────────────────────────────────────────────────────
  y += 2

  // Reserve space for summary (if shown) + grand total — keep them together
  const summaryHeight = sectionSummary.length > 1 ? (6 + sectionSummary.length * 6 + 6) : 0
  const grandTotalHeight = 19
  ensureSpace(summaryHeight + grandTotalHeight)

  // If multiple sections, show a summary table first
  if (sectionSummary.length > 1) {
    doc.setFillColor(...softGrey)
    doc.rect(margin, y - 1, cW, 6 + sectionSummary.length * 6, 'F')
    doc.setTextColor(...midGrey)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text('SUMMARY', margin + 3, y + 3.5)
    y += 7
    sectionSummary.forEach((s) => {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...dark)
      doc.text(s.label, margin + 3, y)
      doc.text(s.value, pageW - margin, y, { align: 'right' })
      y += 6
    })
    y += 3
  }

  // Grand total bar — orange, large
  doc.setFillColor(...orange)
  doc.rect(margin, y, cW, 14, 'F')
  doc.setTextColor(...white)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL PRICE', margin + 4, y + 9)
  doc.setFontSize(15)
  doc.text(fmt(job.total_price) + ' + GST', pageW - margin, y + 9.5, { align: 'right' })
  y += 19

  // ── Notes ─────────────────────────────────────────────────────────────────────
  if (userNotes) {
    const noteLines = doc.splitTextToSize(userNotes, cW)
    ensureSpace(8 + noteLines.length * 4)
    y += 3
    doc.setTextColor(...midGrey)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text('NOTES', margin, y)
    y += 5
    doc.setTextColor(...dark)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.text(noteLines, margin, y)
  }

  return doc
}

export function downloadQuotePDF(job) {
  const doc = generateQuotePDF(job)
  const addressParts = [job.address, job.suburb].filter(Boolean).join(' ')
  const safeAddress  = (addressParts || 'Quote').replace(/[^a-zA-Z0-9 ]/g, '').trim()
  doc.save(`${safeAddress}.pdf`)
}
