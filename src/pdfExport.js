/**
 * Export bridge boards to a simple black-and-white PDF for printing.
 * Boards stacked in a grid (4×6 per page) to reduce horizontal white space.
 * Cross layout: top-left dealer/vuln, top-center North, top-right board#,
 * center-left West, center-right East, bottom-center South.
 * Uses DejaVu Sans font so suit symbols (♠ ♥ ♦ ♣) render correctly.
 */

import { jsPDF } from 'jspdf'
import { Board, Hand } from '@bridge-tools/core'

const SUIT_KEYS = ['S', 'H', 'D', 'C']
const SUIT_SYMBOLS = { S: '\u2660', H: '\u2665', D: '\u2666', C: '\u2663' }

function handToSuits(hand) {
  const bySuit = { S: [], H: [], D: [], C: [] }
  for (const card of hand) {
    if (bySuit[card.suit]) bySuit[card.suit].push(card.rank)
  }
  return SUIT_KEYS.map((key) => ({
    key,
    symbol: SUIT_SYMBOLS[key],
    ranks: (bySuit[key] || []).join(''),
  }))
}

const VULN_LABELS = {
  none: 'None Vul',
  ns: 'N-S Vul',
  ew: 'E-W Vul',
  both: 'Both Vul',
}

const COLS = 4
const ROWS = 6
const BOARDS_PER_PAGE = COLS * ROWS

const FONT_NAME = 'DejaVuSans'
let fontLoaded = false

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(buffer).toString('base64')
}

async function ensureFont(doc) {
  if (fontLoaded) return
  const fontUrl = '/fonts/DejaVuSans.ttf'
  const res = await fetch(fontUrl)
  if (!res.ok) throw new Error('Could not load font for PDF')
  const buffer = await res.arrayBuffer()
  const base64 = arrayBufferToBase64(buffer)
  doc.addFileToVFS('DejaVuSans.ttf', base64)
  doc.addFont('DejaVuSans.ttf', FONT_NAME, 'normal', undefined, 'Identity-H')
  fontLoaded = true
}

/**
 * @param {{ deal: import('@bridge-tools/core').Types.Deal; boardNum: number; vulnerability: string }[]} boards
 * @returns {Promise<void>} resolves when PDF is downloaded
 */
export async function exportBoardsToPdf(boards) {
  if (!boards || boards.length === 0) return

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  await ensureFont(doc)

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 8
  const gutterH = 5
  const cellW = (pageW - 2 * margin - (COLS - 1) * gutterH) / COLS
  const columnWidth = (COLS * cellW + (COLS - 1) * gutterH) / COLS
  const cellH = (pageH - 2 * margin) / ROWS
  const pad = 1.8
  const lineH = 2.6
  const fontSmall = 6
  const fontBoardNum = 10

  const gridRight = margin + COLS * columnWidth
  const drawGrid = () => {
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.15)
    const gridBottom = margin + ROWS * cellH
    for (let c = 0; c <= COLS; c++) {
      const x = margin + c * columnWidth
      doc.line(x, margin, x, gridBottom)
    }
    for (let r = 0; r <= ROWS; r++) {
      const y = margin + r * cellH
      doc.line(margin, y, gridRight, y)
    }
  }

  doc.setFont(FONT_NAME, 'normal')

  boards.forEach((board, index) => {
    if (index > 0 && index % BOARDS_PER_PAGE === 0) {
      doc.addPage()
      drawGrid()
    } else if (index === 0) {
      drawGrid()
    }
    const col = index % COLS
    const row = Math.floor((index % BOARDS_PER_PAGE) / COLS)
    const cellLeft = margin + col * columnWidth
    const cellX = cellLeft + pad
    const cellY = margin + row * cellH + pad

    const cellW3 = columnWidth / 3
    const cellH3 = cellH / 3

    const deal = board.deal
    const boardNum = board.boardNum
    const vulnerability = board.vulnerability || 'none'
    const dealer = Board.calculateDealer(boardNum)

    const drawHand = (hand, x, y, align) => {
      handToSuits(hand).forEach((s, i) => {
        doc.setFontSize(fontSmall)
        doc.text(`${s.symbol} ${s.ranks || '—'}`, x, y + i * lineH, { align })
      })
      doc.setFontSize(fontSmall - 0.5)
      doc.text('HCP ' + String(Hand.countMiltonHCP(hand)), x, y + 4 * lineH, { align })
    }

    doc.setFontSize(fontSmall)

    const pad3 = 1.2

    doc.text(`${dealer} Deals`, cellX, cellY + lineH)
    doc.text(VULN_LABELS[vulnerability] || 'None Vul', cellX, cellY + lineH * 2)

    drawHand(deal.N, cellX + cellW3 + pad3, cellY + pad3, 'left')

    doc.setFontSize(fontBoardNum)
    doc.setFont(FONT_NAME, 'bold')
    doc.text(String(boardNum), cellX + 2 * cellW3 + cellW3 / 2, cellY + cellH3 / 2, { align: 'center' })
    doc.setFont(FONT_NAME, 'normal')
    doc.setFontSize(fontSmall)

    drawHand(deal.W, cellX + pad3, cellY + cellH3 + pad3, 'left')
    drawHand(deal.E, cellX + 2 * cellW3 + pad3, cellY + cellH3 + pad3, 'left')
    drawHand(deal.S, cellX + cellW3 + pad3, cellY + 2 * cellH3 + pad3, 'left')
  })

  doc.save('bridge_hands.pdf')
}
