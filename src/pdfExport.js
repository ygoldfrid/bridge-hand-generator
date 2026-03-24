/**
 * Build a simple black-and-white PDF of bridge boards for printing.
 * Boards stacked in a grid (4×6 per page) to reduce horizontal white space.
 * Cross layout: top-left dealer/vuln, top-center North, top-right board#,
 * center-left West, center-right East, bottom-center South.
 * Uses DejaVu Sans font so suit symbols (♠ ♥ ♦ ♣) render correctly.
 *
 * Wide viewports: hidden iframe + print() (same page).
 * Narrow (≤639px): open PDF in a new tab — mobile browsers block iframe.print()
 * on blob PDFs; user prints via Share (iOS) or the PDF viewer (Android).
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

/** Aligned with app mobile layout; iframe contentWindow.print() fails on many phones */
const MOBILE_PDF_NEW_TAB_MAX_WIDTH_PX = 639

function shouldOpenPdfInNewTab() {
  if (typeof window === 'undefined') return false
  try {
    return window.matchMedia(`(max-width: ${MOBILE_PDF_NEW_TAB_MAX_WIDTH_PX}px)`).matches
  } catch {
    return false
  }
}

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
 * Open PDF in a new tab for printing/sharing (required on most mobile browsers).
 */
function openPdfInNewTab(doc) {
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const revokeLater = () => {
    setTimeout(() => URL.revokeObjectURL(url), 120_000)
  }

  try {
    const win = window.open(url, '_blank', 'noopener,noreferrer')
    if (win) {
      revokeLater()
      return Promise.resolve()
    }
  } catch {
    /* fall through */
  }

  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  revokeLater()
  return Promise.resolve()
}

/**
 * Print the PDF via a hidden iframe so no new tab is opened (desktop-style).
 */
function openPdfForPrint(doc) {
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)

  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.setAttribute('aria-hidden', 'true')
    iframe.src = url

    let printed = false
    const cleanup = () => {
      URL.revokeObjectURL(url)
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
    }
    const tryPrint = () => {
      if (printed) return
      printed = true
      try {
        const w = iframe.contentWindow
        if (!w) throw new Error('Print frame failed to initialize.')
        w.focus()
        w.print()
      } catch (e) {
        cleanup()
        reject(e)
        return
      }
      resolve()
      const w = iframe.contentWindow
      if (w) w.addEventListener('afterprint', cleanup, { once: true })
      setTimeout(cleanup, 60000)
    }

    iframe.addEventListener('load', () => setTimeout(tryPrint, 350), { once: true })
    document.body.appendChild(iframe)
    setTimeout(tryPrint, 1500)
  })
}

/**
 * @param {{ deal: import('@bridge-tools/core').Types.Deal; boardNum: number; vulnerability: string }[]} boards
 * @returns {Promise<{ openedInNewTab: boolean }>} `openedInNewTab` when PDF opened in a new tab for Share / print
 */
export async function printBoardsPdf(boards) {
  if (!boards || boards.length === 0) return { openedInNewTab: false }

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

  if (shouldOpenPdfInNewTab()) {
    await openPdfInNewTab(doc)
    return { openedInNewTab: true }
  }
  await openPdfForPrint(doc)
  return { openedInNewTab: false }
}
