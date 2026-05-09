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
  const margin = 18
  const cW     = pageW - margin * 2

  const navy      = [26, 31, 46]
  const orange    = [249, 115, 22]
  const white     = [255, 255, 255]
  const lightGrey = [241, 245, 249]
  const midGrey   = [100, 116, 139]
  const dark      = [30, 41, 59]
  const divider   = [203, 213, 225]

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
  if (job.address) { doc.text(job.address, margin, y); y += 5 }
  if (job.suburb)  { doc.text(job.suburb,  margin, y); y += 5 }

  y += 3
  doc.setDrawColor(...divider)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageW - margin, y)
  y += 8

  // ── Parse notes ──────────────────────────────────────────────────────────────
  const { userNotes, parsed } = parseNotes(job.notes)
  const isV3 = parsed?.v === 3
  const g  = parsed?.garage
  const fd = parsed?.frontDoor
  const w  = parsed?.wall
  const marginPct   = parsed?.marginPct ?? job.margin_pct ?? 0.30
  const marginLabel = `${Math.round(marginPct * 100)}%`

  // ── Section renderer ─────────────────────────────────────────────────────────
  function drawSection(title, lines, price) {
    doc.setFillColor(...lightGrey)
    doc.rect(margin, y - 4, cW, 8, 'F')
    doc.setTextColor(...navy)
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'bold')
    doc.text(title, margin + 2, y + 1)
    y += 9

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...dark)
    lines.forEach((line) => {
      if (line === '---') {
        doc.setDrawColor(...divider)
        doc.setLineWidth(0.2)
        doc.line(margin, y, pageW - margin, y)
        y += 4
      } else if (line && line.right != null) {
        doc.setFont('helvetica', line.bold ? 'bold' : 'normal')
        doc.setFontSize(line.bold ? 9.5 : 9)
        doc.setTextColor(...dark)
        doc.text(line.label, margin + 4, y)
        doc.text(line.right, pageW - margin, y, { align: 'right' })
        y += 5.5
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
      } else if (line) {
        doc.setTextColor(...dark)
        doc.text(String(line), margin + 4, y)
        y += 5
      }
    })

    doc.setFillColor(...navy)
    doc.rect(margin, y - 1, cW, 8, 'F')
    doc.setTextColor(...white)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Section Total', margin + 3, y + 4)
    doc.setTextColor(...orange)
    doc.setFontSize(10)
    doc.text(price + ' + GST', pageW - margin, y + 4.5, { align: 'right' })
    y += 13
  }

  // ── Garage ───────────────────────────────────────────────────────────────────
  const garageTitle = `Garage Door — ${job.door_type || ''}${job.width_mm ? `  ${job.width_mm}mm × ${job.height_mm}mm` : ''}`
  const garageLines = ['Includes:',
    '  • Doorman Motor',
    '  • 2 Remotes and 1 × wall button',
    '  • Custom aluminium frame',
    '  • Tracks and springs to suit',
  ]
  if (g?.boards > 0) garageLines.push(`  • Cladding: ${g.boards} boards (${job.frame_size || g.claddingType || ''})`)
  garageLines.push('---')
  if (g?.framePkgCost > 0) garageLines.push({ label: 'Frame / Motor Package', right: fmt(g.framePkgCost) })
  if (g?.claddingCost > 0) garageLines.push({ label: `Cladding (${g.boards} boards × $${g.boardCostPerUnit})`, right: fmt(g.claddingCost) })
  garageLines.push({ label: `Margin (${marginLabel})`, right: fmt(g?.margin) })
  drawSection(garageTitle, garageLines, fmt(g?.total))

  // ── Front Door — v3 format ───────────────────────────────────────────────────
  if (fd && isV3) {
    const cat = fd.doorCategory || 'Timber'
    const fdTitle = `Front Door — ${cat}${fd.widthMm ? `  ${fd.widthMm}mm × ${fd.heightMm}mm` : ''}`
    const fdLines = ['Includes:']

    if (cat === 'Timber' && fd.timberDoorLabel) {
      fdLines.push(`  • Timber door: ${fd.timberDoorLabel}`)
    }
    if (cat === 'Aluminium') {
      fdLines.push('  • Aluminium door frame')
    }
    fdLines.push(`  • Door jamb (${fd.jambCount || 1}× 7200mm length)`)
    fdLines.push('  • Pivot hardware')
    if (cat === 'Timber')    fdLines.push('  • Delivery to site')
    if (cat === 'Aluminium') fdLines.push('  • Delivery (jambs + door)')
    if (parseInt(fd.alumSheets) > 0) fdLines.push(`  • Aluminium composite sheets (${fd.alumSheets})`)
    if (fd.boards > 0) fdLines.push(`  • Cladding: ${fd.boards} boards (${fd.claddingType || ''})`)
    fdLines.push('  • Labour — install + clad')
    fdLines.push('---')

    if (cat === 'Timber'    && fd.doorCost   > 0) fdLines.push({ label: `Timber door (${fd.timberDoorLabel || ''})`, right: fmt(fd.doorCost) })
    if (cat === 'Aluminium' && fd.frame      > 0) fdLines.push({ label: 'Aluminium door frame', right: fmt(fd.frame) })
    if (fd.jambCost > 0)  fdLines.push({ label: `Door jamb (${fd.jambCount || 1}× length)`, right: fmt(fd.jambCost) })
    if (fd.pivot    > 0)  fdLines.push({ label: 'Pivot hardware', right: fmt(fd.pivot) })
    if (cat === 'Timber'    && fd.deliv  > 0) fdLines.push({ label: 'Delivery', right: fmt(fd.deliv) })
    if (cat === 'Aluminium' && fd.delivJ > 0) fdLines.push({ label: 'Delivery — jambs', right: fmt(fd.delivJ) })
    if (cat === 'Aluminium' && fd.delivD > 0) fdLines.push({ label: 'Delivery — door',  right: fmt(fd.delivD) })
    if (fd.sheetCost  > 0) fdLines.push({ label: `Alum composite sheets (${fd.alumSheets})`, right: fmt(fd.sheetCost) })
    if (fd.claddingCost > 0) fdLines.push({ label: `Cladding (${fd.boards} boards)`, right: fmt(fd.claddingCost) })
    if (fd.install    > 0) fdLines.push({ label: 'Labour — install door', right: fmt(fd.install) })
    if (fd.clad       > 0) fdLines.push({ label: 'Labour — clad door',   right: fmt(fd.clad) })
    fdLines.push({ label: `Margin (${marginLabel})`, right: fmt(fd.margin) })
    drawSection(fdTitle, fdLines, fmt(fd.total))
  }

  // ── Front Door — legacy v2 format ────────────────────────────────────────────
  if (fd && !isV3) {
    const fdTitle = `Front Door${fd.supplyDoor ? ' — Supply & Install' : ' — Cladding'}${fd.widthMm ? `  ${fd.widthMm}mm × ${fd.heightMm}mm` : ''}`
    const fdLines = ['Includes:']
    if (fd.supplyDoor) {
      fdLines.push('  • Timber door supply')
      fdLines.push('  • Aluminium door jamb + pivot hardware')
      fdLines.push('  • Delivery to site')
    }
    if (fd.boards > 0) fdLines.push(`  • Cladding: ${fd.boards} boards (${fd.claddingType || ''})`)
    fdLines.push('  • Trims')
    if (fd.includeLabour) fdLines.push('  • Installation labour')
    fdLines.push('---')
    if (fd.doorComponents > 0) fdLines.push({ label: 'Door components', right: fmt(fd.doorComponents) })
    if (fd.claddingCost > 0)   fdLines.push({ label: `Cladding (${fd.boards} boards)`, right: fmt(fd.claddingCost) })
    if (fd.trimsCost > 0)      fdLines.push({ label: 'Trims', right: fmt(fd.trimsCost) })
    if (fd.labourCost > 0)     fdLines.push({ label: 'Labour', right: fmt(fd.labourCost) })
    fdLines.push({ label: `Margin (${marginLabel})`, right: fmt(fd.margin) })
    drawSection(fdTitle, fdLines, fmt(fd.total))
  }

  // ── Wall — v3 multi-wall ──────────────────────────────────────────────────────
  if (w && isV3) {
    const wallCount = w.walls?.length || 1
    const wTitle = wallCount > 1 ? `Wall Cladding — ${wallCount} Walls` : `Wall Cladding${w.walls?.[0]?.widthMm ? `  ${w.walls[0].widthMm}mm × ${w.walls[0].heightMm}mm` : ''}`
    const wLines = ['Includes:']
    if (wallCount > 1 && w.walls) {
      w.walls.forEach((wall, i) => {
        const detail = w.wallDetails?.[i]
        wLines.push(`  • Wall ${i + 1}: ${wall.widthMm || 0}mm × ${wall.heightMm || 0}mm${detail ? ` (${detail.boards} boards)` : ''}`)
      })
    }
    if (w.totalBoards > 0) wLines.push(`  • Total: ${w.totalBoards} boards (${w.claddingType || ''})`)
    if (w.includeTopHats)  wLines.push('  • Top hats and trims')
    if (parseFloat(w.labourCost) > 0) wLines.push('  • Installation labour')
    if (parseFloat(w.curvingCost) > 0) wLines.push('  • Curving allowance')
    wLines.push('---')
    if (w.claddingCost > 0) wLines.push({ label: `Cladding (${w.totalBoards} boards × $${w.boardCostPerUnit})`, right: fmt(w.claddingCost) })
    if (w.topHatsCost  > 0) wLines.push({ label: 'Top hats', right: fmt(w.topHatsCost) })
    if (w.trimsCost    > 0) wLines.push({ label: 'Trims', right: fmt(w.trimsCost) })
    if (parseFloat(w.labourCost)  > 0) wLines.push({ label: 'Labour', right: fmt(w.labourCost) })
    if (parseFloat(w.curvingCost) > 0) wLines.push({ label: 'Curving allowance', right: fmt(w.curvingCost) })
    wLines.push({ label: `Margin (${marginLabel})`, right: fmt(w.margin) })
    drawSection(wTitle, wLines, fmt(w.total))
  }

  // ── Wall — legacy v2 single wall ─────────────────────────────────────────────
  if (w && !isV3) {
    const wTitle = `Wall Cladding${w.widthMm ? `  ${w.widthMm}mm × ${w.heightMm}mm` : ''}`
    const wLines = ['Includes:']
    if (w.boards > 0) wLines.push(`  • ${w.boards} boards (${w.claddingType || ''})`)
    if (w.includeTopHats) wLines.push('  • Top hats and trims')
    if (parseFloat(w.labourCost) > 0) wLines.push('  • Installation labour')
    wLines.push('---')
    if (w.claddingCost > 0) wLines.push({ label: `Cladding (${w.boards} boards)`, right: fmt(w.claddingCost) })
    if (w.topHatsCost  > 0) wLines.push({ label: 'Top hats', right: fmt(w.topHatsCost) })
    if (w.trimsCost    > 0) wLines.push({ label: 'Trims', right: fmt(w.trimsCost) })
    if (w.labourCost   > 0) wLines.push({ label: 'Labour', right: fmt(w.labourCost) })
    wLines.push({ label: `Margin (${marginLabel})`, right: fmt(w.margin) })
    drawSection(wTitle, wLines, fmt(w.total))
  }

  // ── Grand total ───────────────────────────────────────────────────────────────
  y += 2
  doc.setFillColor(...orange)
  doc.rect(margin, y - 4, cW, 12, 'F')
  doc.setTextColor(...white)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL', margin + 3, y + 4)
  doc.setFontSize(13)
  doc.text(fmt(job.total_price) + ' + GST', pageW - margin, y + 4.5, { align: 'right' })
  y += 18

  // ── User notes (free text only, not JSON) ─────────────────────────────────────
  if (userNotes) {
    doc.setTextColor(...midGrey)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text('NOTES', margin, y)
    y += 5
    doc.setTextColor(...dark)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    const noteLines = doc.splitTextToSize(userNotes, cW)
    doc.text(noteLines, margin, y)
    y += noteLines.length * 4.5 + 4
  }

  // ── Footer ────────────────────────────────────────────────────────────────────
  const footerY = 277
  doc.setFillColor(...lightGrey)
  doc.rect(0, footerY - 2, pageW, 20, 'F')
  doc.setTextColor(...midGrey)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.text('Quote valid for 30 days.  Payment: 50% deposit on acceptance, balance on completion.', pageW / 2, footerY + 7, { align: 'center' })

  return doc
}

// ── Download — filename is "Address Suburb.pdf" (no customer name) ────────────
export function downloadQuotePDF(job) {
  const doc = generateQuotePDF(job)
  const addressParts = [job.address, job.suburb].filter(Boolean).join(' ')
  const safeAddress  = (addressParts || 'Quote').replace(/[^a-zA-Z0-9 ]/g, '').trim()
  doc.save(`${safeAddress}.pdf`)
}
