/**
 * Bridge convention presets for hand generation.
 * Each convention defines constraints on the dealer and other players
 * so generated hands are suitable for teaching or practicing that convention.
 */

import { Hand } from '@bridge-tools/core'

const SUITS = ['S', 'H', 'D', 'C']
const MIN_OPENING_HCP = 12

/** Left-hand opponent of dealer (player to dealer's left, acts first after dealer). */
function getLHO(dealer) {
  if (dealer === 'N') return 'E'
  if (dealer === 'E') return 'S'
  if (dealer === 'S') return 'W'
  return 'N'
}

/** Rotation order starting from dealer: dealer, LHO, then LHO of LHO, then LHO^3. */
function rotationOrder(dealer) {
  const o = []
  let seat = dealer
  for (let i = 0; i < 4; i++) {
    o.push(seat)
    seat = getLHO(seat)
  }
  return o
}

/** First player in rotation who has 12+ HCP and can open (5+ major or 4+ minor), or null. */
function findOpener(deal, dealer) {
  for (const seat of rotationOrder(dealer)) {
    if (dealerCanOpen(deal[seat])) return seat
  }
  return null
}

/** Dealer has an opener: 12+ HCP and can open 1 of a suit (5+ major or 4+ minor). */
function dealerCanOpen(hand) {
  if (Hand.countMiltonHCP(hand) < MIN_OPENING_HCP) return false
  const s = Hand.countSuit(hand, 'S')
  const h = Hand.countSuit(hand, 'H')
  const d = Hand.countSuit(hand, 'D')
  const c = Hand.countSuit(hand, 'C')
  if (s >= 5 || h >= 5) return true
  if (d >= 4 || c >= 4) return true
  return false
}

/**
 * Determine dealer's opening suit for Michaels: 1♠, 1♥, 1♦, or 1♣.
 * Standard: open longest suit; we use 5+ spades → 1♠, else 5+ hearts → 1♥, else 4+ diamonds → 1♦, else 1♣.
 */
function dealerOpeningSuit(hand) {
  const s = Hand.countSuit(hand, 'S')
  const h = Hand.countSuit(hand, 'H')
  const d = Hand.countSuit(hand, 'D')
  if (s >= 5) return 'S'
  if (h >= 5) return 'H'
  if (d >= 4) return 'D'
  return 'C'
}

/**
 * LHO has Michaels shape for the given opening suit:
 * - If opener opened a major (1♥ or 1♠): LHO has 5 in the other major and 5 in a minor.
 * - If opener opened a minor (1♣ or 1♦): LHO has 5♠ and 5♥.
 */
function lhoHasMichaelsShape(hand, openingSuit) {
  const s = Hand.countSuit(hand, 'S')
  const h = Hand.countSuit(hand, 'H')
  const d = Hand.countSuit(hand, 'D')
  const c = Hand.countSuit(hand, 'C')
  const minor5 = d >= 5 || c >= 5
  if (openingSuit === 'S') return h >= 5 && minor5
  if (openingSuit === 'H') return s >= 5 && minor5
  if (openingSuit === 'D' || openingSuit === 'C') return s >= 5 && h >= 5
  return false
}

/** 1NT opener: 15-17 HCP, balanced (no void/singleton, at most one doubleton: 4-3-3-3, 4-4-3-2, 5-3-3-2). */
const NT_MIN_HCP = 15
const NT_MAX_HCP = 17

function isBalanced(hand) {
  const counts = SUITS.map((s) => Hand.countSuit(hand, s)).sort((a, b) => b - a)
  if (counts[3] === 0 || counts[3] === 1) return false
  const doubletons = counts.filter((c) => c === 2).length
  return doubletons <= 1
}

function is1NTOpenerHand(hand) {
  const hcp = Hand.countMiltonHCP(hand)
  if (hcp < NT_MIN_HCP || hcp > NT_MAX_HCP) return false
  return isBalanced(hand)
}

export const CONVENTION_OPTIONS = [
  { value: 'none', label: 'Custom (HCP & distribution)' },
  { value: '1nt', label: '1NT opener' },
  { value: 'michaels', label: 'Michaels (opener + cue-bidder)' },
]

/**
 * Returns a filter function for the given convention, or null if none.
 * The filter receives (deal) and returns true if the deal satisfies the convention
 * for the given dealer. Dealer rotates by board.
 */
export function getConventionFilter(conventionId, dealer, getPartner) {
  if (conventionId === 'none' || !dealer) return null

  if (conventionId === 'michaels') {
    const minMichaelsHCP = 7
    return (deal) => {
      const opener = findOpener(deal, dealer)
      if (opener == null) return false
      const openerHand = deal[opener]
      const lho = getLHO(opener)
      const lhoHand = deal[lho]
      if (Hand.countMiltonHCP(lhoHand) < minMichaelsHCP) return false
      const openingSuit = dealerOpeningSuit(openerHand)
      return lhoHasMichaelsShape(lhoHand, openingSuit)
    }
  }

  if (conventionId === '1nt') {
    return (deal) => {
      const opener = findOpener(deal, dealer)
      if (opener == null) return false
      return is1NTOpenerHand(deal[opener])
    }
  }

  return null
}
