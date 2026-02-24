/**
 * Convert a bridge deal to BBO LIN format (matches BBO / good_hand.LIN).
 * Format: qx|o{boardNum}|md|{dealer}{S,W,N hands}|rh||ah|Board {boardNum}|sv|{vuln}|pg||
 * Hands order: South, West, North (East implied). Each hand: S...H...D...C...
 * Dealer in md is 1=S, 2=W, 3=N, 4=E.
 */

import { Board } from '@bridge-tools/core'

const SUITS = ['S', 'H', 'D', 'C']

/** BBO LIN dealer code: 1=South, 2=West, 3=North, 4=East */
const COMPASS_TO_DEALER = { S: '1', W: '2', N: '3', E: '4' }

/**
 * @param {Array<{ suit: string; rank: string }>} hand
 * @returns {string} e.g. "SQ9HAKT2DAT3CJT53"
 */
export function handToLinString(hand) {
  const bySuit = { S: [], H: [], D: [], C: [] }
  for (const card of hand) {
    if (bySuit[card.suit]) bySuit[card.suit].push(card.rank)
  }
  return SUITS.map((s) => s + (bySuit[s] || []).join('')).join('')
}

/**
 * @param {import('@bridge-tools/core').Types.Deal} deal
 * @param {number} boardNumber board number (1-based)
 * @param {string} dealerCompass dealer direction from Board.calculateDealer (N/E/S/W)
 * @param {'none'|'ns'|'ew'|'both'} vulnerability
 * @returns {string} one board in LIN format
 */
export function dealToLin(deal, boardNumber, dealerCompass, vulnerability) {
  const south = handToLinString(deal.S)
  const west = handToLinString(deal.W)
  const north = handToLinString(deal.N)
  const dealerNum = COMPASS_TO_DEALER[dealerCompass] ?? '1'
  const md = `md|${dealerNum}${south},${west},${north}|`
  const svMap = { none: '0', ns: 'n', ew: 'e', both: 'b' }
  const sv = `sv|${svMap[vulnerability] ?? '0'}|`
  return `qx|o${boardNumber}|${md}rh||ah|Board ${boardNumber}|${sv}pg||`
}

/**
 * @param {import('@bridge-tools/core').Types.Deal[]} deals
 * @param {number} startBoard
 * @param {(boardIndex: number) => 'none'|'ns'|'ew'|'both'} getVulnerability
 * @returns {string} full LIN file content (one line per board)
 */
export function dealsToLinFile(deals, startBoard = 1, getVulnerability = () => 'none') {
  const lines = deals.map((deal, i) => {
    const boardNum = startBoard + i
    const vuln = getVulnerability(boardNum)
    const dealer = Board.calculateDealer(boardNum)
    return dealToLin(deal, boardNum, dealer, vuln)
  })
  return lines.join('\n')
}

/**
 * Build LIN file from an array of board entries (e.g. after user deleted some).
 * Uses sequential board numbers 1,2,3... and each entry's stored vulnerability.
 * @param {{ deal: import('@bridge-tools/core').Types.Deal; boardNum: number; vulnerability: string }[]} boards
 * @returns {string} full LIN file content
 */
export function boardsToLinFile(boards) {
  const lines = boards.map((b, i) => {
    const seqNum = i + 1
    const dealer = Board.calculateDealer(seqNum)
    return dealToLin(b.deal, seqNum, dealer, b.vulnerability)
  })
  return lines.join('\n')
}
