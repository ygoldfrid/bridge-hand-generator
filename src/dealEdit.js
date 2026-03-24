/**
 * Immutable helpers for editing a bridge deal (swap cards between hands).
 * @typedef {import('@bridge-tools/core').Types.Deal} Deal
 * @typedef {import('@bridge-tools/core').Types.Compass} Compass
 */

const COMPASS = ['N', 'E', 'S', 'W']

/**
 * @param {Deal} deal
 * @returns {Deal}
 */
export function cloneDeal(deal) {
  return {
    N: [...deal.N],
    E: [...deal.E],
    S: [...deal.S],
    W: [...deal.W],
  }
}

/**
 * @param {Deal} deal
 * @param {Compass} seatA
 * @param {number} indexA
 * @param {Compass} seatB
 * @param {number} indexB
 * @returns {Deal}
 */
export function swapCardsInDeal(deal, seatA, indexA, seatB, indexB) {
  if (seatA === seatB && indexA === indexB) return deal
  const next = cloneDeal(deal)
  const handA = next[seatA]
  const handB = next[seatB]
  const tmp = handA[indexA]
  handA[indexA] = handB[indexB]
  handB[indexB] = tmp
  return next
}

export const RANK_ORDER = 'AKQJT98765432'

/**
 * @param {string} rank
 */
export function rankOrderIndex(rank) {
  const i = RANK_ORDER.indexOf(rank)
  return i === -1 ? 99 : i
}

/** Display / export order: spades through clubs, high rank first within suit */
const SUIT_ORDER = ['S', 'H', 'D', 'C']

/**
 * @param {import('@bridge-tools/core').Types.Card[]} hand
 * @returns {import('@bridge-tools/core').Types.Card[]}
 */
export function sortHandByBridgeOrder(hand) {
  const bySuit = { S: [], H: [], D: [], C: [] }
  for (const card of hand) {
    if (bySuit[card.suit]) bySuit[card.suit].push(card)
  }
  for (const s of SUIT_ORDER) {
    bySuit[s].sort((a, b) => rankOrderIndex(a.rank) - rankOrderIndex(b.rank))
  }
  return SUIT_ORDER.flatMap((s) => bySuit[s])
}

/**
 * Reorder every seat so preview/PDF/LIN match edit-modal suit ordering.
 * @param {Deal} deal
 * @returns {Deal}
 */
export function normalizeDeal(deal) {
  return {
    N: sortHandByBridgeOrder(deal.N),
    E: sortHandByBridgeOrder(deal.E),
    S: sortHandByBridgeOrder(deal.S),
    W: sortHandByBridgeOrder(deal.W),
  }
}

/**
 * @param {string} rank
 */
export function formatRankForDisplay(rank) {
  return rank === 'T' ? '10' : rank
}

/**
 * @param {Deal} deal
 * @returns {boolean}
 */
export function isValidDeal(deal) {
  if (!deal) return false
  let total = 0
  const seen = new Set()
  for (const seat of COMPASS) {
    const hand = deal[seat]
    if (!Array.isArray(hand) || hand.length !== 13) return false
    for (const card of hand) {
      if (!card || !card.suit || !card.rank) return false
      const key = `${card.suit}${card.rank}`
      if (seen.has(key)) return false
      seen.add(key)
      total++
    }
  }
  return total === 52
}
