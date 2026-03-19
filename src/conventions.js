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

/** 12–14 HCP, balanced (e.g. opens 1♣/1♦/1♥, then rebids 1NT). */
function isBalanced12to14(hand) {
  const hcp = Hand.countMiltonHCP(hand)
  if (hcp < 12 || hcp > 14) return false
  return isBalanced(hand)
}

/**
 * After 1m, which major responder would bid with 4+ (standard: longer major; 4-4 → 1♥).
 */
function reverseResponderShownMajor(hand) {
  const s = Hand.countSuit(hand, 'S')
  const h = Hand.countSuit(hand, 'H')
  const hOk = h >= 4
  const sOk = s >= 4
  if (hOk && !sOk) return 'H'
  if (sOk && !hOk) return 'S'
  if (hOk && sOk) {
    if (h > s) return 'H'
    if (s > h) return 'S'
    return 'H'
  }
  return null
}

/** Hand type dropdown: standalone options or { group, options }. */
export const CONVENTION_OPTIONS = [
  {
    group: 'Custom',
    options: [
      { value: 'none', label: 'Custom' },
    ],
  },
  
  {
    group: '1NT & Responses',
    options: [
      { value: '1nt', label: '1NT opener (15–17 HCP; balanced)' },
      { value: 'stayman', label: 'Stayman (8+ HCP; 4+ in a major)' },
      { value: 'transfer_minor', label: 'Transfer to minor (0–7 HCP; 6+ in a minor)' },
      { value: 'jacoby_transfer', label: 'Jacoby transfer (5+ in a major)' },
      { value: 'texas_transfer', label: 'Texas transfer (9+ HCP; 6+ in a major)' },
    ],
  },
  {
    group: 'Game Force',
    options: [
      { value: 'two_over_one', label: '2 over 1 (opener opens major; responder 12+ HCP)' },
      { value: 'new_minor_forcing', label: 'New Minor Forcing (opener 12–14 HCP balanced; responder 12+ HCP)' },
      { value: 'fourth_suit_forcing', label: '4th Suit Forcing (opener not balanced; responder 12+ HCP)' },
      { value: 'reverse', label: 'Reverse (opener 17–19 HCP, not balanced, opens minor; responder 6+ HCP, 4+ in a major)' },
    ],
  },
  {
    group: 'Weak Bids',
    options: [
      { value: 'preempt_2', label: '2-level preemptive (5–10 HCP; 6\u2666, 6\u2665, or 6\u2660)' },
      { value: 'preempt_3', label: '3-level preemptive (5–10 HCP; 6+ \u2663, 7+ \u2666, 7+ \u2665, or 7+ \u2660)' },
    ],
  },
  {
    group: 'Cue Bids',
    options: [
      { value: 'michaels', label: 'Michaels (7+ HCP; 5-5 two suiter)' },
    ],
  },
  {
    group: 'Doubling',
    options: [
      { value: 'takeout_double', label: 'Takeout Double (11+ HCP; 3+ in unbid suits)' },
    ],
  },
  {
    group: 'Slam Bids',
    options: [
      { value: 'blackwood', label: 'Blackwood (30+ HCP combined; 8+ card fit)' },
    ],
  },
]

/** Returns the full display label for a hand type value (e.g. 'michaels' → 'Michaels (7+ HCP, 5-5 two suiter)'). */
export function getHandTypeLabel(value) {
  if (value == null) return null
  for (const item of CONVENTION_OPTIONS) {
    if (item.options) {
      const opt = item.options.find((o) => o.value === value)
      if (opt) return opt.label
    }
  }
  return null
}

/** Returns the short name (before parenthesis) for board titles, e.g. 'stayman' → 'Stayman'. */
export function getHandTypeShortLabel(value) {
  const full = getHandTypeLabel(value)
  if (full == null) return null
  const paren = full.indexOf(' (')
  return paren >= 0 ? full.slice(0, paren) : full
}

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
      const openerHand = deal[dealer]
      if (!dealerCanOpen(openerHand)) return false
      const lho = getLHO(dealer)
      const lhoHand = deal[lho]
      if (Hand.countMiltonHCP(lhoHand) < minMichaelsHCP) return false
      const openingSuit = dealerOpeningSuit(openerHand)
      return lhoHasMichaelsShape(lhoHand, openingSuit)
    }
  }

  if (conventionId === '1nt') {
    return (deal) => is1NTOpenerHand(deal[dealer])
  }

  if (conventionId === 'stayman') {
    const minStaymanHCP = 8
    return (deal) => {
      if (!is1NTOpenerHand(deal[dealer])) return false
      const partner = getPartner(dealer)
      const hand = deal[partner]
      if (Hand.countMiltonHCP(hand) < minStaymanHCP) return false
      return Hand.countSuit(hand, 'S') >= 4 || Hand.countSuit(hand, 'H') >= 4
    }
  }

  if (conventionId === 'jacoby_transfer') {
    return (deal) => {
      if (!is1NTOpenerHand(deal[dealer])) return false
      const partner = getPartner(dealer)
      const hand = deal[partner]
      return Hand.countSuit(hand, 'S') >= 5 || Hand.countSuit(hand, 'H') >= 5
    }
  }

  const TRANSFER_MINOR_MIN_HCP = 0
  const TRANSFER_MINOR_MAX_HCP = 7

  if (conventionId === 'transfer_minor') {
    return (deal) => {
      if (!is1NTOpenerHand(deal[dealer])) return false
      const partner = getPartner(dealer)
      const hand = deal[partner]
      const hcp = Hand.countMiltonHCP(hand)
      if (hcp < TRANSFER_MINOR_MIN_HCP || hcp > TRANSFER_MINOR_MAX_HCP) return false
      const has6Clubs = Hand.countSuit(hand, 'C') >= 6
      const has6Diamonds = Hand.countSuit(hand, 'D') >= 6
      return has6Clubs || has6Diamonds
    }
  }

  const MIN_TEXAS_HCP = 9
  const MIN_TEXAS_SUIT = 6

  if (conventionId === 'texas_transfer') {
    return (deal) => {
      if (!is1NTOpenerHand(deal[dealer])) return false
      const partner = getPartner(dealer)
      const hand = deal[partner]
      if (Hand.countMiltonHCP(hand) < MIN_TEXAS_HCP) return false
      return Hand.countSuit(hand, 'S') >= MIN_TEXAS_SUIT || Hand.countSuit(hand, 'H') >= MIN_TEXAS_SUIT
    }
  }

  const BLACKWOOD_MIN_OPENER_HCP = 12
  const BLACKWOOD_MIN_COMBINED_HCP = 30
  const BLACKWOOD_MIN_FIT = 8

  if (conventionId === 'blackwood') {
    return (deal) => {
      const openerHand = deal[dealer]
      const partnerHand = deal[getPartner(dealer)]
      if (Hand.countMiltonHCP(openerHand) < BLACKWOOD_MIN_OPENER_HCP) return false
      const combinedHCP = Hand.countMiltonHCP(openerHand) + Hand.countMiltonHCP(partnerHand)
      if (combinedHCP < BLACKWOOD_MIN_COMBINED_HCP) return false
      const hasFit = SUITS.some(
        (s) => Hand.countSuit(openerHand, s) + Hand.countSuit(partnerHand, s) >= BLACKWOOD_MIN_FIT
      )
      return hasFit
    }
  }

  const PREEMPT_2_MIN_HCP = 5
  const PREEMPT_2_MAX_HCP = 10
  const PREEMPT_2_EXACT_SUIT = 6
  const PREEMPT_2_SUITS = ['S', 'H', 'D']

  if (conventionId === 'preempt_2') {
    return (deal) => {
      const hand = deal[dealer]
      const hcp = Hand.countMiltonHCP(hand)
      if (hcp < PREEMPT_2_MIN_HCP || hcp > PREEMPT_2_MAX_HCP) return false
      const hasExactlySixInNonClub = PREEMPT_2_SUITS.some((s) => Hand.countSuit(hand, s) === PREEMPT_2_EXACT_SUIT)
      return hasExactlySixInNonClub
    }
  }

  const PREEMPT_3_MIN_HCP = 5
  const PREEMPT_3_MAX_HCP = 10
  const PREEMPT_3_MAJOR_MIN = 7
  const PREEMPT_3_CLUB_MIN = 6

  if (conventionId === 'preempt_3') {
    return (deal) => {
      const hand = deal[dealer]
      const hcp = Hand.countMiltonHCP(hand)
      if (hcp < PREEMPT_3_MIN_HCP || hcp > PREEMPT_3_MAX_HCP) return false
      const has7InSHD = Hand.countSuit(hand, 'S') >= PREEMPT_3_MAJOR_MIN ||
        Hand.countSuit(hand, 'H') >= PREEMPT_3_MAJOR_MIN ||
        Hand.countSuit(hand, 'D') >= PREEMPT_3_MAJOR_MIN
      const has6InClubs = Hand.countSuit(hand, 'C') >= PREEMPT_3_CLUB_MIN
      return has7InSHD || has6InClubs
    }
  }

  const TAKEOUT_DOUBLE_MIN_LHO_HCP = 11
  const TAKEOUT_DOUBLE_MIN_IN_UNBID = 3

  if (conventionId === 'takeout_double') {
    return (deal) => {
      const openerHand = deal[dealer]
      if (!dealerCanOpen(openerHand)) return false
      const openingSuit = dealerOpeningSuit(openerHand)
      const lho = getLHO(dealer)
      const lhoHand = deal[lho]
      if (Hand.countMiltonHCP(lhoHand) < TAKEOUT_DOUBLE_MIN_LHO_HCP) return false
      const unbidSuits = SUITS.filter((s) => s !== openingSuit)
      const has3InAllUnbid = unbidSuits.every(
        (s) => Hand.countSuit(lhoHand, s) >= TAKEOUT_DOUBLE_MIN_IN_UNBID
      )
      return has3InAllUnbid
    }
  }

  const TWO_OVER_ONE_MIN_HCP = 12

  if (conventionId === 'two_over_one') {
    return (deal) => {
      const openerHand = deal[dealer]
      if (Hand.countMiltonHCP(openerHand) < TWO_OVER_ONE_MIN_HCP) return false
      const hasMajor = Hand.countSuit(openerHand, 'H') >= 5 || Hand.countSuit(openerHand, 'S') >= 5
      if (!hasMajor) return false
      const partner = getPartner(dealer)
      if (Hand.countMiltonHCP(deal[partner]) < TWO_OVER_ONE_MIN_HCP) return false
      return true
    }
  }

  const NMF_RESPONDER_MIN_HCP = 12
  const NMF_RESPONDER_MIN_SUIT = 4
  const NMF_OPENER_MAX_SPADES = 4
  const NMF_OPENER_MAX_IN_RESPONDER_SUIT = 3

  if (conventionId === 'new_minor_forcing') {
    return (deal) => {
      const openerHand = deal[dealer]
      if (!isBalanced12to14(openerHand)) return false
      if (Hand.countSuit(openerHand, 'S') > NMF_OPENER_MAX_SPADES) return false
      const partner = getPartner(dealer)
      const responderHand = deal[partner]
      if (Hand.countMiltonHCP(responderHand) < NMF_RESPONDER_MIN_HCP) return false
      const canBidD = Hand.countSuit(responderHand, 'D') >= NMF_RESPONDER_MIN_SUIT
      const canBidH = Hand.countSuit(responderHand, 'H') >= NMF_RESPONDER_MIN_SUIT
      const canBidS = Hand.countSuit(responderHand, 'S') >= NMF_RESPONDER_MIN_SUIT
      const openerNoFitD = Hand.countSuit(openerHand, 'D') <= NMF_OPENER_MAX_IN_RESPONDER_SUIT
      const openerNoFitH = Hand.countSuit(openerHand, 'H') <= NMF_OPENER_MAX_IN_RESPONDER_SUIT
      const openerNoFitS = Hand.countSuit(openerHand, 'S') <= NMF_OPENER_MAX_IN_RESPONDER_SUIT
      const canBidWithNoFit = (canBidD && openerNoFitD) || (canBidH && openerNoFitH) || (canBidS && openerNoFitS)
      return canBidWithNoFit
    }
  }

  const FOURTH_SUIT_MIN_HCP = 12

  if (conventionId === 'fourth_suit_forcing') {
    return (deal) => {
      const openerHand = deal[dealer]
      if (Hand.countMiltonHCP(openerHand) < FOURTH_SUIT_MIN_HCP) return false
      if (isBalanced(openerHand)) return false
      const partner = getPartner(dealer)
      if (Hand.countMiltonHCP(deal[partner]) < FOURTH_SUIT_MIN_HCP) return false
      return true
    }
  }

  const REVERSE_MIN_OPENER_HCP = 17
  const REVERSE_MAX_OPENER_HCP = 19
  const REVERSE_MAX_MAJOR = 4
  const REVERSE_MIN_RESPONDER_HCP = 6

  if (conventionId === 'reverse') {
    const REVERSE_MIN_MAJOR_RESPONSE = 4
    const REVERSE_MAX_OPENER_IN_RESPONDER_MAJOR = 3
    const REVERSE_MIN_OPENER_OTHER_MAJOR = 4
    const REVERSE_MIN_MINOR_LENGTH = 4
    return (deal) => {
      const openerHand = deal[dealer]
      const openerHcp = Hand.countMiltonHCP(openerHand)
      if (openerHcp < REVERSE_MIN_OPENER_HCP || openerHcp > REVERSE_MAX_OPENER_HCP) return false
      if (isBalanced(openerHand)) return false
      if (Hand.countSuit(openerHand, 'S') > REVERSE_MAX_MAJOR) return false
      if (Hand.countSuit(openerHand, 'H') > REVERSE_MAX_MAJOR) return false
      const openerClubs = Hand.countSuit(openerHand, 'C')
      const openerDiamonds = Hand.countSuit(openerHand, 'D')
      if (openerClubs < REVERSE_MIN_MINOR_LENGTH && openerDiamonds < REVERSE_MIN_MINOR_LENGTH) return false
      const partner = getPartner(dealer)
      const responderHand = deal[partner]
      if (Hand.countMiltonHCP(responderHand) < REVERSE_MIN_RESPONDER_HCP) return false
      const responderSpades = Hand.countSuit(responderHand, 'S')
      const responderHearts = Hand.countSuit(responderHand, 'H')
      if (responderSpades < REVERSE_MIN_MAJOR_RESPONSE && responderHearts < REVERSE_MIN_MAJOR_RESPONSE) return false
      const shownMajor = reverseResponderShownMajor(responderHand)
      if (shownMajor == null) return false
      if (Hand.countSuit(openerHand, shownMajor) > REVERSE_MAX_OPENER_IN_RESPONDER_MAJOR) return false
      const otherMajor = shownMajor === 'H' ? 'S' : 'H'
      if (Hand.countSuit(openerHand, otherMajor) < REVERSE_MIN_OPENER_OTHER_MAJOR) return false
      return true
    }
  }

  return null
}
