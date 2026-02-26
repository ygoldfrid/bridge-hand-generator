import React, { useState } from 'react'
import { generate } from '@bridge-tools/generator'
import { Hand, Board } from '@bridge-tools/core'
import { boardsToLinFile } from './lin'
import BoardDisplay from './BoardDisplay'
import BridgeLogo from './BridgeLogo'
import './BridgeHandGenerator.css'

const COMPASS = ['N', 'S', 'E', 'W']
const SUITS = ['S', 'H', 'D', 'C']
const SUIT_LABELS = { S: '♠', H: '♥', D: '♦', C: '♣' }

const VULN_MODE_OPTIONS = [
  { value: 'rotating', label: 'Rotating' },
  { value: 'fixed', label: 'Fixed (choose per board)' },
]

const VULN_VALUES = [
  { value: 'none', label: 'None' },
  { value: 'ns', label: 'N-S' },
  { value: 'ew', label: 'E-W' },
  { value: 'both', label: 'Both' },
]

const HCP_MODE_OPTIONS = [
  { value: 'none', label: 'No HCP conditions' },
  { value: 'per_hand', label: 'HCP per player (N, S, E, W)' },
  { value: 'dealer_partner', label: 'HCP per Dealer' },
]

const DIST_MODE_OPTIONS = [
  { value: 'none', label: 'No distribution conditions' },
  { value: 'per_hand', label: 'Distribution per player (N, S, E, W)' },
  { value: 'dealer_only', label: 'Distribution per Dealer' },
]

function standardVulnerability(boardNum) {
  const v = Board.calculateVulnerability(boardNum)
  if (v === 'NvNv') return 'none'
  if (v === 'NvV') return 'ns'
  if (v === 'VNv') return 'ew'
  return 'both'
}

function getPartner(compass) {
  if (compass === 'N') return 'S'
  if (compass === 'S') return 'N'
  if (compass === 'E') return 'W'
  return 'E'
}

function hcpInRange(hcp, minVal, maxVal) {
  if (minVal != null && hcp < minVal) return false
  if (maxVal != null && hcp > maxVal) return false
  return true
}

function downloadLin(content, filename = 'hands.lin') {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const emptyPerHand = () => ({ N: { min: '', max: '' }, S: { min: '', max: '' }, E: { min: '', max: '' }, W: { min: '', max: '' } })

const emptyDistribution = () =>
  Object.fromEntries(
    COMPASS.map((h) => [h, Object.fromEntries(SUITS.map((s) => [s, { min: '', max: '' }]))])
  )

const emptyDealerDistribution = () =>
  Object.fromEntries(SUITS.map((s) => [s, { min: '', max: '' }]))

export default function BridgeHandGenerator() {
  const [numBoards, setNumBoards] = useState(3)
  const [vulnMode, setVulnMode] = useState('rotating')
  const [defaultFixedVuln, setDefaultFixedVuln] = useState('none')
  const [hcpMode, setHcpMode] = useState('none')
  const [perHandHcp, setPerHandHcp] = useState(emptyPerHand())
  const [dealerHcpMin, setDealerHcpMin] = useState('')
  const [dealerHcpMax, setDealerHcpMax] = useState('')
  const [partnerHcpMin, setPartnerHcpMin] = useState('')
  const [partnerHcpMax, setPartnerHcpMax] = useState('')
  const [perHandDistribution, setPerHandDistribution] = useState(emptyDistribution())
  const [distMode, setDistMode] = useState('none')
  const [dealerDistribution, setDealerDistribution] = useState(emptyDealerDistribution())
  const [partnerDistribution, setPartnerDistribution] = useState(emptyDealerDistribution())
  const [generatedBoards, setGeneratedBoards] = useState([])
  const [error, setError] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [rearrangeMode, setRearrangeMode] = useState(false)
  const [dragSourceIndex, setDragSourceIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const getVulnerabilityForNewBoard = (boardNum) => {
    if (vulnMode === 'rotating') return standardVulnerability(boardNum)
    return defaultFixedVuln
  }

  const updatePerHandHcp = (hand, field, value) => {
    setPerHandHcp((prev) => ({
      ...prev,
      [hand]: { ...prev[hand], [field]: value },
    }))
  }

  const updateDistribution = (hand, suit, field, value) => {
    setPerHandDistribution((prev) => ({
      ...prev,
      [hand]: {
        ...prev[hand],
        [suit]: { ...prev[hand][suit], [field]: value },
      },
    }))
  }

  const updateDealerDistribution = (suit, field, value) => {
    setDealerDistribution((prev) => ({
      ...prev,
      [suit]: { ...prev[suit], [field]: value },
    }))
  }

  const updatePartnerDistribution = (suit, field, value) => {
    setPartnerDistribution((prev) => ({
      ...prev,
      [suit]: { ...prev[suit], [field]: value },
    }))
  }

  const handleHcpModeChange = (value) => {
    setPerHandHcp(emptyPerHand())
    setDealerHcpMin('')
    setDealerHcpMax('')
    setPartnerHcpMin('')
    setPartnerHcpMax('')
    setHcpMode(value)
  }

  const handleDistModeChange = (value) => {
    setPerHandDistribution(emptyDistribution())
    setDealerDistribution(emptyDealerDistribution())
    setPartnerDistribution(emptyDealerDistribution())
    setDistMode(value)
  }

  const buildDistributionFilter = (dealer) => {
    if (distMode === 'none') return () => true

    if (distMode === 'dealer_only' && dealer != null) {
      const partner = getPartner(dealer)
      const dealerConstraints = {}
      const partnerConstraints = {}
      for (const s of SUITS) {
        const d = dealerDistribution[s] || { min: '', max: '' }
        const dMin = d.min === '' ? null : parseInt(d.min, 10)
        const dMax = d.max === '' ? null : parseInt(d.max, 10)
        const dMinOk = dMin != null && !isNaN(dMin) && dMin >= 0 && dMin <= 13
        const dMaxOk = dMax != null && !isNaN(dMax) && dMax >= 0 && dMax <= 13
        if (dMinOk || dMaxOk) dealerConstraints[s] = { min: dMinOk ? dMin : null, max: dMaxOk ? dMax : null }
        const p = partnerDistribution[s] || { min: '', max: '' }
        const pMin = p.min === '' ? null : parseInt(p.min, 10)
        const pMax = p.max === '' ? null : parseInt(p.max, 10)
        const pMinOk = pMin != null && !isNaN(pMin) && pMin >= 0 && pMin <= 13
        const pMaxOk = pMax != null && !isNaN(pMax) && pMax >= 0 && pMax <= 13
        if (pMinOk || pMaxOk) partnerConstraints[s] = { min: pMinOk ? pMin : null, max: pMaxOk ? pMax : null }
      }
      const hasDealer = Object.keys(dealerConstraints).length > 0
      const hasPartner = Object.keys(partnerConstraints).length > 0
      if (!hasDealer && !hasPartner) return () => true
      return (deal) => {
        if (hasDealer) {
          const hand = deal[dealer]
          for (const s of SUITS) {
            if (!dealerConstraints[s]) continue
            const count = Hand.countSuit(hand, s)
            const { min, max } = dealerConstraints[s]
            if (min != null && count < min) return false
            if (max != null && count > max) return false
          }
        }
        if (hasPartner) {
          const hand = deal[partner]
          for (const s of SUITS) {
            if (!partnerConstraints[s]) continue
            const count = Hand.countSuit(hand, s)
            const { min, max } = partnerConstraints[s]
            if (min != null && count < min) return false
            if (max != null && count > max) return false
          }
        }
        return true
      }
    }

    if (distMode === 'per_hand') {
      const constraints = {}
      for (const h of COMPASS) {
        for (const s of SUITS) {
          const { min: minStr, max: maxStr } = perHandDistribution[h][s] || { min: '', max: '' }
          const min = minStr === '' ? null : parseInt(minStr, 10)
          const max = maxStr === '' ? null : parseInt(maxStr, 10)
          const minOk = min != null && !isNaN(min) && min >= 0 && min <= 13
          const maxOk = max != null && !isNaN(max) && max >= 0 && max <= 13
          if (minOk || maxOk) {
            if (!constraints[h]) constraints[h] = {}
            constraints[h][s] = { min: minOk ? min : null, max: maxOk ? max : null }
          }
        }
      }
      if (Object.keys(constraints).length === 0) return () => true
      return (deal) => {
        for (const h of COMPASS) {
          if (!constraints[h]) continue
          for (const s of SUITS) {
            if (!constraints[h][s]) continue
            const count = Hand.countSuit(deal[h], s)
            const { min, max } = constraints[h][s]
            if (min != null && count < min) return false
            if (max != null && count > max) return false
          }
        }
        return true
      }
    }

    return () => true
  }

  const hasDistributionConstraints = () => {
    if (distMode === 'none') return false
    if (distMode === 'dealer_only') {
      return SUITS.some((s) => {
        const d = dealerDistribution[s]
        const p = partnerDistribution[s]
        return (d && (d.min !== '' || d.max !== '')) || (p && (p.min !== '' || p.max !== ''))
      })
    }
    return COMPASS.some((h) =>
      SUITS.some((s) => {
        const cell = perHandDistribution[h]?.[s]
        return cell && (cell.min !== '' || cell.max !== '')
      })
    )
  }

  const buildPerHandFilter = () => {
    const ranges = {}
    for (const h of COMPASS) {
      const min = perHandHcp[h].min === '' ? null : parseInt(perHandHcp[h].min, 10)
      const max = perHandHcp[h].max === '' ? null : parseInt(perHandHcp[h].max, 10)
      if (min != null || max != null) ranges[h] = { min, max }
    }
    if (Object.keys(ranges).length === 0) return () => true
    return (deal) => {
      for (const h of COMPASS) {
        if (!ranges[h]) continue
        const points = Hand.countMiltonHCP(deal[h])
        if (!hcpInRange(points, ranges[h].min, ranges[h].max)) return false
      }
      return true
    }
  }

  const handleGenerate = (e) => {
    e.preventDefault()
    setError(null)
    setGenerating(true)

    const num = Math.max(1, Math.min(32, Number(numBoards) || 3))

    setTimeout(() => {
      try {
        let deals

        if (hcpMode === 'dealer_partner') {
          const dMin = dealerHcpMin === '' ? null : parseInt(dealerHcpMin, 10)
          const dMax = dealerHcpMax === '' ? null : parseInt(dealerHcpMax, 10)
          const pMin = partnerHcpMin === '' ? null : parseInt(partnerHcpMin, 10)
          const pMax = partnerHcpMax === '' ? null : parseInt(partnerHcpMax, 10)
          const hasConstraint = dMin != null || dMax != null || pMin != null || pMax != null

          const hasDist = hasDistributionConstraints()
          const hasZeroSuit = hasDist && (distMode === 'dealer_only'
            ? SUITS.some((s) => dealerDistribution[s]?.max === '0' || partnerDistribution[s]?.max === '0')
            : COMPASS.some((h) => SUITS.some((s) => perHandDistribution[h]?.[s]?.max === '0')))
          const maxAttempts = hasConstraint && hasDist ? (hasZeroSuit ? 80000 : 15000) : 5000
          deals = []
          for (let i = 0; i < num; i++) {
            const boardNum = i + 1
            const dealer = Board.calculateDealer(boardNum)
            const partner = getPartner(dealer)
            const hcpFilter = hasConstraint
              ? (deal) => {
                  const dealerHcp = Hand.countMiltonHCP(deal[dealer])
                  const partnerHcp = Hand.countMiltonHCP(deal[partner])
                  return hcpInRange(dealerHcp, dMin, dMax) && hcpInRange(partnerHcp, pMin, pMax)
                }
              : () => true
            const distFilter = buildDistributionFilter(dealer)
            const filter = (deal) => hcpFilter(deal) && distFilter(deal)
            const [oneDeal] = generate({ num: 1, filter, maxAttempts })
            deals.push(oneDeal)
          }
        } else if (distMode === 'dealer_only') {
          const hcpFilter = hcpMode === 'per_hand' ? buildPerHandFilter() : () => true
          const hasHcp = hcpMode === 'per_hand' && Object.keys(perHandHcp).some((h) => perHandHcp[h].min !== '' || perHandHcp[h].max !== '')
          const hasDist = hasDistributionConstraints()
          const hasZeroSuit = hasDist && SUITS.some((s) => dealerDistribution[s]?.max === '0' || partnerDistribution[s]?.max === '0')
          const maxAttempts = hasHcp && hasDist ? (hasZeroSuit ? 80000 : 15000) : 5000
          deals = []
          for (let i = 0; i < num; i++) {
            const dealer = Board.calculateDealer(i + 1)
            const distFilter = buildDistributionFilter(dealer)
            const filter = (deal) => hcpFilter(deal) && distFilter(deal)
            const [oneDeal] = generate({ num: 1, filter, maxAttempts })
            deals.push(oneDeal)
          }
        } else {
          const hcpFilter = hcpMode === 'per_hand' ? buildPerHandFilter() : () => true
          const distFilter = buildDistributionFilter()
          const filter = (deal) => hcpFilter(deal) && distFilter(deal)
          const hasHcp = hcpMode === 'per_hand' && Object.keys(perHandHcp).some((h) => perHandHcp[h].min !== '' || perHandHcp[h].max !== '')
          const hasDist = hasDistributionConstraints()
          const hasZeroSuit = hasDist && COMPASS.some((h) => SUITS.some((s) => perHandDistribution[h]?.[s]?.max === '0'))
          const maxAttempts = hasHcp && hasDist ? (hasZeroSuit ? 80000 : 15000) : 5000
          deals = generate({ num, filter, maxAttempts })
        }

        setGeneratedBoards((prev) => {
          const startNum = prev.length + 1
          const newBoards = deals.map((deal, i) => ({
            deal,
            boardNum: startNum + i,
            vulnerability: getVulnerabilityForNewBoard(startNum + i),
          }))
          return [...prev, ...newBoards]
        })
      } catch (err) {
        const msg = err.message || ''
        const friendly = msg.includes('Failed to generate a deal within')
          ? 'No deal satisfied all constraints in time. Combinations like "0 spades" or "0 diamonds" are very rare. Try loosening (e.g. 1 or fewer), or generate 1 board.'
          : (msg || 'Failed to generate hands. Try fewer or looser constraints.')
        setError(friendly)
      } finally {
        setGenerating(false)
      }
    }, 0)
  }

  const handleDeleteBoard = (index) => {
    setGeneratedBoards((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((board, i) => ({
          ...board,
          boardNum: i + 1,
          vulnerability: vulnMode === 'rotating' ? standardVulnerability(i + 1) : board.vulnerability,
        }))
    )
  }

  const handleClearAll = () => {
    setGeneratedBoards([])
    setRearrangeMode(false)
    setDragSourceIndex(null)
    setDragOverIndex(null)
  }

  const setRearrangeModeWithDrag = (value) => {
    setRearrangeMode(value)
    if (!value) {
      setDragSourceIndex(null)
      setDragOverIndex(null)
    }
  }

  const handleReorderBoards = (sourceIndex, targetIndex) => {
    if (sourceIndex === targetIndex) return
    setGeneratedBoards((prev) => {
      const reordered = [...prev]
      const [removed] = reordered.splice(sourceIndex, 1)
      reordered.splice(targetIndex, 0, removed)
      return reordered.map((board, i) => ({
        ...board,
        boardNum: i + 1,
        vulnerability: vulnMode === 'rotating' ? standardVulnerability(i + 1) : board.vulnerability,
      }))
    })
  }

  const handleSetBoardVulnerability = (index, value) => {
    setGeneratedBoards((prev) =>
      prev.map((b, i) => (i === index ? { ...b, vulnerability: value } : b))
    )
  }

  const handleDownload = () => {
    if (generatedBoards.length === 0) return
    const content = boardsToLinFile(generatedBoards)
    downloadLin(content, 'bridge_hands.lin')
  }

  return (
    <div className="bridge-hand-generator">
      <header className="app-header">
        <BridgeLogo className="app-logo" size={52} />
        <div className="app-header-text">
          <h1>Bridge Hand Generator</h1>
          <p className="subtitle">Prepare hands for your classes and download a LIN file for BBO.</p>
        </div>
      </header>

      <form onSubmit={handleGenerate} className="generator-form">
        <section className="form-section form-section-vulnerability" aria-labelledby="vulnerability-section-heading">
          <h2 id="vulnerability-section-heading" className="form-section-title">Vulnerability</h2>
          <label>
            <select
              value={vulnMode}
              onChange={(e) => {
                const next = e.target.value
                setVulnMode(next)
                if (next === 'rotating') {
                  setGeneratedBoards((prev) =>
                    prev.map((b) => ({ ...b, vulnerability: standardVulnerability(b.boardNum) }))
                  )
                }
              }}
            >
              {VULN_MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="form-section form-section-boards" aria-labelledby="boards-section-heading">
          <h2 id="boards-section-heading" className="form-section-title">Boards</h2>

        <label>
          Boards to add
          <input
            type="number"
            min={1}
            max={32}
            value={numBoards}
            onChange={(e) => setNumBoards(e.target.value)}
            title="Number of boards to add each time you click the button"
          />
        </label>

        {vulnMode === 'fixed' && (
          <label>
            Vulnerability
            <select value={defaultFixedVuln} onChange={(e) => setDefaultFixedVuln(e.target.value)}>
              {VULN_VALUES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <label>
          HCP conditions
          <select value={hcpMode} onChange={(e) => handleHcpModeChange(e.target.value)}>
            {HCP_MODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {hcpMode === 'per_hand' && (
          <div className="hcp-section">
            <>
              <p className="hint hcp-hint">
                Min/max HCP per player.<br />
                Leave blank for no conditions.
              </p>
              <div className="hcp-grid">
                <div className="hcp-header-row">
                  <span className="hcp-cell hcp-spacer" aria-hidden="true">&nbsp;</span>
                  <span className="hcp-cell hcp-minmax-label">Min</span>
                  <span className="hcp-cell hcp-minmax-label">Max</span>
                </div>
                {COMPASS.map((hand) => (
                  <div key={hand} className="hcp-row">
                    <span className="hcp-cell hcp-player">{hand}</span>
                    <input
                      type="number"
                      min={0}
                      max={37}
                      placeholder="—"
                      value={perHandHcp[hand].min}
                      onChange={(e) => updatePerHandHcp(hand, 'min', e.target.value)}
                      className="hcp-cell hcp-input"
                      aria-label={`${hand} HCP min`}
                    />
                    <input
                      type="number"
                      min={0}
                      max={37}
                      placeholder="—"
                      value={perHandHcp[hand].max}
                      onChange={(e) => updatePerHandHcp(hand, 'max', e.target.value)}
                      className="hcp-cell hcp-input"
                      aria-label={`${hand} HCP max`}
                    />
                  </div>
                ))}
              </div>
            </>
          </div>
        )}

        {hcpMode === 'dealer_partner' && (
          <div className="hcp-section">
            <>
              <p className="hint hcp-hint">
                Dealer rotates (board 1=S, 2=W, 3=N, 4=E), so which pair has these points alternates each board.<br />
                Leave blank for no conditions.
              </p>
              <div className="hcp-grid">
                <div className="hcp-header-row">
                  <span className="hcp-cell hcp-spacer" aria-hidden="true">&nbsp;</span>
                  <span className="hcp-cell hcp-minmax-label">Min</span>
                  <span className="hcp-cell hcp-minmax-label">Max</span>
                </div>
                <div className="hcp-row">
                  <span className="hcp-cell hcp-player">Dealer</span>
                  <input
                    type="number"
                    min={0}
                    max={37}
                    placeholder="—"
                    value={dealerHcpMin}
                    onChange={(e) => setDealerHcpMin(e.target.value)}
                    className="hcp-cell hcp-input"
                    aria-label="Dealer HCP min"
                  />
                  <input
                    type="number"
                    min={0}
                    max={37}
                    placeholder="—"
                    value={dealerHcpMax}
                    onChange={(e) => setDealerHcpMax(e.target.value)}
                    className="hcp-cell hcp-input"
                    aria-label="Dealer HCP max"
                  />
                </div>
                <div className="hcp-row">
                  <span className="hcp-cell hcp-player">Partner</span>
                  <input
                    type="number"
                    min={0}
                    max={37}
                    placeholder="—"
                    value={partnerHcpMin}
                    onChange={(e) => setPartnerHcpMin(e.target.value)}
                    className="hcp-cell hcp-input"
                    aria-label="Partner HCP min"
                  />
                  <input
                    type="number"
                    min={0}
                    max={37}
                    placeholder="—"
                    value={partnerHcpMax}
                    onChange={(e) => setPartnerHcpMax(e.target.value)}
                    className="hcp-cell hcp-input"
                    aria-label="Partner HCP max"
                  />
                </div>
              </div>
            </>
          </div>
        )}

        <label>
          Distribution conditions
          <select value={distMode} onChange={(e) => handleDistModeChange(e.target.value)}>
            {DIST_MODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {distMode === 'per_hand' && (
          <div className="distribution-section">
            <p className="hint distribution-hint">
              Min and max cards per suit for each player (e.g. min 5 = 5 or more, max 1 = 1 or less).<br />
              Leave blank for no conditions.
            </p>
            <div className="distribution-grid">
              <div className="distribution-header-row">
                <span className="dist-cell dist-player" aria-hidden="true">&nbsp;</span>
                {SUITS.map((s, i) => (
                  <React.Fragment key={s}>
                    {i > 0 && <span className="dist-cell dist-gap" aria-hidden="true" />}
                    <span className={`dist-cell dist-suit dist-suit-span dist-suit-${s}`} title={s}>
                      {SUIT_LABELS[s]}
                    </span>
                  </React.Fragment>
                ))}
              </div>
              <div className="distribution-minmax-row">
                <span className="dist-cell dist-header-spacer" aria-hidden="true" />
                {SUITS.map((s, i) => (
                  <React.Fragment key={s}>
                    {i > 0 && <span className="dist-cell dist-gap" aria-hidden="true" />}
                    <span className="dist-cell dist-minmax-label">Min</span>
                    <span className="dist-cell dist-minmax-label">Max</span>
                  </React.Fragment>
                ))}
              </div>
              {COMPASS.map((hand) => (
                <div key={hand} className="distribution-row">
                  <span className="dist-cell dist-player">{hand}</span>
                  {SUITS.map((suit, i) => (
                    <React.Fragment key={suit}>
                      {i > 0 && <span className="dist-cell dist-gap" aria-hidden="true" />}
                      <input
                        type="number"
                        min={0}
                        max={13}
                        placeholder="—"
                        value={perHandDistribution[hand][suit].min}
                        onChange={(e) => updateDistribution(hand, suit, 'min', e.target.value)}
                        className="dist-cell dist-input"
                        aria-label={`${hand} ${suit} min`}
                      />
                      <input
                        type="number"
                        min={0}
                        max={13}
                        placeholder="—"
                        value={perHandDistribution[hand][suit].max}
                        onChange={(e) => updateDistribution(hand, suit, 'max', e.target.value)}
                        className="dist-cell dist-input"
                        aria-label={`${hand} ${suit} max`}
                      />
                    </React.Fragment>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {distMode === 'dealer_only' && (
          <div className="distribution-section distribution-section--dealer-partner">
            <p className="hint distribution-hint">
              Dealer rotates (board 1=S, 2=W, 3=N, 4=E), so which pair has these conditions alternates each board.<br />
              Leave blank for no conditions.
            </p>
            <div className="distribution-grid">
              <div className="distribution-header-row">
                <span className="dist-cell dist-player" aria-hidden="true">&nbsp;</span>
                {SUITS.map((s, i) => (
                  <React.Fragment key={s}>
                    {i > 0 && <span className="dist-cell dist-gap" aria-hidden="true" />}
                    <span className={`dist-cell dist-suit dist-suit-span dist-suit-${s}`} title={s}>
                      {SUIT_LABELS[s]}
                    </span>
                  </React.Fragment>
                ))}
              </div>
              <div className="distribution-minmax-row">
                <span className="dist-cell dist-header-spacer" aria-hidden="true" />
                {SUITS.map((s, i) => (
                  <React.Fragment key={s}>
                    {i > 0 && <span className="dist-cell dist-gap" aria-hidden="true" />}
                    <span className="dist-cell dist-minmax-label">Min</span>
                    <span className="dist-cell dist-minmax-label">Max</span>
                  </React.Fragment>
                ))}
              </div>
              <div className="distribution-row">
                <span className="dist-cell dist-player">Dealer</span>
                {SUITS.map((suit, i) => (
                  <React.Fragment key={suit}>
                    {i > 0 && <span className="dist-cell dist-gap" aria-hidden="true" />}
                    <input
                      type="number"
                      min={0}
                      max={13}
                      placeholder="—"
                      value={dealerDistribution[suit].min}
                      onChange={(e) => updateDealerDistribution(suit, 'min', e.target.value)}
                      className="dist-cell dist-input"
                      aria-label={`Dealer ${suit} min`}
                    />
                    <input
                      type="number"
                      min={0}
                      max={13}
                      placeholder="—"
                      value={dealerDistribution[suit].max}
                      onChange={(e) => updateDealerDistribution(suit, 'max', e.target.value)}
                      className="dist-cell dist-input"
                      aria-label={`Dealer ${suit} max`}
                    />
                  </React.Fragment>
                ))}
              </div>
              <div className="distribution-row">
                <span className="dist-cell dist-player">Partner</span>
                {SUITS.map((suit, i) => (
                  <React.Fragment key={suit}>
                    {i > 0 && <span className="dist-cell dist-gap" aria-hidden="true" />}
                    <input
                      type="number"
                      min={0}
                      max={13}
                      placeholder="—"
                      value={partnerDistribution[suit].min}
                      onChange={(e) => updatePartnerDistribution(suit, 'min', e.target.value)}
                      className="dist-cell dist-input"
                      aria-label={`Partner ${suit} min`}
                    />
                    <input
                      type="number"
                      min={0}
                      max={13}
                      placeholder="—"
                      value={partnerDistribution[suit].max}
                      onChange={(e) => updatePartnerDistribution(suit, 'max', e.target.value)}
                      className="dist-cell dist-input"
                      aria-label={`Partner ${suit} max`}
                    />
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}

        <button type="submit" disabled={generating} className="btn btn-primary">
          {generating ? 'Adding…' : `Add ${numBoards} board${numBoards !== 1 ? 's' : ''}`}
        </button>
        </section>
      </form>

      {error && <p className="error">{error}</p>}

      <div className="result">
        <h2 className="result-title">Preview Boards</h2>
        {generatedBoards.length === 0 ? (
          <p className="result-intro result-empty">
            No boards yet. Set conditions and click &quot;Add boards&quot; to generate. When you have enough, remove any you don&apos;t want and download.
          </p>
        ) : (
          <>
            <p className="result-intro">
              {generatedBoards.length} board(s) total. Remove any you don&apos;t want, rearrange the order if needed, then download.
            </p>
            <div className="result-actions result-actions--top">
              <button type="button" onClick={handleDownload} className="btn btn-download">
                Download LIN file
              </button>
              <button type="button" onClick={() => setRearrangeModeWithDrag(!rearrangeMode)} className="btn btn-rearrange">
                {rearrangeMode ? 'Done rearranging' : 'Rearrange boards'}
              </button>
              <button type="button" onClick={handleClearAll} className="btn btn-clear">
                Clear all boards
              </button>
            </div>
            <div className={`boards-list ${rearrangeMode ? 'boards-list--rearrange' : ''}`}>
            {(() => {
              const n = generatedBoards.length
              const identity = Array.from({ length: n }, (_, i) => i)
              const displayOrder =
                rearrangeMode && dragSourceIndex != null && dragOverIndex != null && dragSourceIndex !== dragOverIndex
                  ? (() => {
                      const a = [...identity]
                      const [removed] = a.splice(dragSourceIndex, 1)
                      a.splice(dragOverIndex, 0, removed)
                      return a
                    })()
                  : identity

              return (rearrangeMode ? displayOrder : identity).map((originalIndex, displayPos) => {
                const board = generatedBoards[originalIndex]
                const isDropTarget = dragOverIndex === displayPos
                const boardEl = (
                  <BoardDisplay
                    key={originalIndex}
                    deal={board.deal}
                    boardNum={board.boardNum}
                    displayIndex={displayPos + 1}
                    vulnerability={board.vulnerability}
                    onDelete={rearrangeMode ? undefined : () => handleDeleteBoard(originalIndex)}
                    rearrangeMode={rearrangeMode}
                    staticVulnSelector={vulnMode === 'fixed'}
                    onVulnerabilityChange={vulnMode === 'fixed' ? (v) => handleSetBoardVulnerability(originalIndex, v) : undefined}
                  />
                )
                if (!rearrangeMode) return boardEl
                return (
                  <div
                    key={originalIndex}
                    className={`board-draggable-wrapper${isDropTarget ? ' board-drop-target' : ''}`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(originalIndex))
                      e.dataTransfer.effectAllowed = 'move'
                      e.currentTarget.classList.add('board-dragging')
                      setDragSourceIndex(originalIndex)
                    }}
                    onDragEnd={(e) => {
                      e.currentTarget.classList.remove('board-dragging')
                      setDragSourceIndex(null)
                      setDragOverIndex(null)
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      setDragOverIndex(displayPos)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
                      const targetIndex = displayPos
                      if (!isNaN(sourceIndex)) handleReorderBoards(sourceIndex, targetIndex)
                      setDragSourceIndex(null)
                      setDragOverIndex(null)
                    }}
                    data-board-index={originalIndex}
                  >
                    <div className="board-drag-overlay" aria-hidden="true">
                      <span className="board-drag-hand-icon" role="img" aria-hidden="true">&#128400;</span>
                    </div>
                    {isDropTarget ? <div className="board-drop-placeholder" aria-hidden="true" /> : boardEl}
                  </div>
                )
              })
            })()}
          </div>
          <div className="result-actions">
              <button type="button" onClick={handleDownload} className="btn btn-download">
                Download LIN file
              </button>
              <button type="button" onClick={() => setRearrangeModeWithDrag(!rearrangeMode)} className="btn btn-rearrange">
                {rearrangeMode ? 'Done rearranging' : 'Rearrange boards'}
              </button>
              <button type="button" onClick={handleClearAll} className="btn btn-clear">
                Clear all boards
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
