import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Board, Hand } from '@bridge-tools/core'
import {
  cloneDeal,
  swapCardsInDeal,
  isValidDeal,
  rankOrderIndex,
  formatRankForDisplay,
} from './dealEdit'
import './BoardEditModal.css'

const SUITS = [
  { key: 'S', symbol: '♠', red: false },
  { key: 'H', symbol: '♥', red: true },
  { key: 'D', symbol: '♦', red: true },
  { key: 'C', symbol: '♣', red: false },
]

const HANDS = [
  { compass: 'N', label: 'North', className: 'board-edit-hand-north' },
  { compass: 'S', label: 'South', className: 'board-edit-hand-south' },
  { compass: 'W', label: 'West', className: 'board-edit-hand-west' },
  { compass: 'E', label: 'East', className: 'board-edit-hand-east' },
]

function handEntriesBySuit(hand) {
  const bySuit = { S: [], H: [], D: [], C: [] }
  hand.forEach((card, handIndex) => {
    if (bySuit[card.suit]) bySuit[card.suit].push({ card, handIndex })
  })
  for (const k of Object.keys(bySuit)) {
    bySuit[k].sort((a, b) => rankOrderIndex(a.card.rank) - rankOrderIndex(b.card.rank))
  }
  return SUITS.map((s) => ({ suit: s, entries: bySuit[s.key] || [] }))
}

/**
 * @param {{
 *   deal: import('@bridge-tools/core').Types.Deal
 *   boardNum: number
 *   title: string
 *   onClose: () => void
 *   onSave: (deal: import('@bridge-tools/core').Types.Deal) => void
 * }} props
 */
export default function BoardEditModal({ deal: initialDeal, boardNum, title, onClose, onSave }) {
  const [deal, setDeal] = useState(() => cloneDeal(initialDeal))
  const [selection, setSelection] = useState(null)
  const selectionRef = useRef(null)

  useEffect(() => {
    setDeal(cloneDeal(initialDeal))
    setSelection(null)
    selectionRef.current = null
  }, [initialDeal])

  useEffect(() => {
    selectionRef.current = selection
  }, [selection])

  const dealer = Board.calculateDealer(boardNum)

  const handlePick = useCallback((seat, handIndex) => {
    const prev = selectionRef.current
    if (prev && prev.seat === seat && prev.index === handIndex) {
      selectionRef.current = null
      setSelection(null)
      return
    }
    if (!prev) {
      const next = { seat, index: handIndex }
      selectionRef.current = next
      setSelection(next)
      return
    }
    setDeal((d) => {
      const swapped = swapCardsInDeal(d, prev.seat, prev.index, seat, handIndex)
      return isValidDeal(swapped) ? swapped : d
    })
    selectionRef.current = null
    setSelection(null)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleDone = () => {
    if (isValidDeal(deal)) onSave(deal)
    onClose()
  }

  return (
    <div
      className="board-edit-modal-backdrop"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        className="board-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="board-edit-modal-title"
      >
        <header className="board-edit-modal-header">
          <h2 id="board-edit-modal-title" className="board-edit-modal-title">
            {title}
          </h2>
          <p className="board-edit-modal-hint">
            Tap two cards to swap them. Tap the same card again to deselect.
          </p>
          <button
            type="button"
            className="board-edit-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="board-edit-modal-table">
          <div className="board-edit-modal-center" aria-hidden="true" />
          {HANDS.map(({ compass, label, className }) => {
            const hcp = Hand.countMiltonHCP(deal[compass])
            const isDealer = compass === dealer
            return (
              <div
                key={compass}
                className={`board-edit-hand ${className}${isDealer ? ' board-edit-hand--dealer' : ''}`}
              >
                <div className="board-edit-hand-header">{label}{isDealer ? ' (dealer)' : ''}</div>
                <div className="board-edit-hand-chips">
                  {handEntriesBySuit(deal[compass]).map(({ suit, entries }) => (
                    <div key={suit.key} className="board-edit-suit-row">
                      <div className="board-edit-suit-chips">
                        {entries.map(({ card, handIndex }) => {
                          const selected =
                            selection && selection.seat === compass && selection.index === handIndex
                          return (
                            <button
                              key={`${compass}-${handIndex}`}
                              type="button"
                              className={`card-chip ${suit.red ? 'card-chip--red' : 'card-chip--black'}${
                                selected ? ' card-chip--selected' : ''
                              }`}
                              onClick={() => handlePick(compass, handIndex)}
                              aria-pressed={selected}
                            >
                              <span className="card-chip-inner">
                                <span className="card-chip-rank">{formatRankForDisplay(card.rank)}</span>
                                <span className="card-chip-suit">{suit.symbol}</span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="board-edit-hand-hcp">{hcp} HCP</div>
              </div>
            )
          })}
        </div>

        <footer className="board-edit-modal-footer">
          <button type="button" className="btn board-edit-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn board-edit-btn-done" onClick={handleDone}>
            Done
          </button>
        </footer>
      </div>
    </div>
  )
}
