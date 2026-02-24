import { Board } from '@bridge-tools/core'
import './BoardDisplay.css'

const SUITS = [
  { key: 'S', symbol: '♠', name: 'Spades', red: false },
  { key: 'H', symbol: '♥', name: 'Hearts', red: true },
  { key: 'D', symbol: '♦', name: 'Diamonds', red: true },
  { key: 'C', symbol: '♣', name: 'Clubs', red: false },
]

function handBySuits(hand) {
  const bySuit = { S: [], H: [], D: [], C: [] }
  for (const card of hand) {
    if (bySuit[card.suit]) bySuit[card.suit].push(card.rank)
  }
  return SUITS.map((s) => ({ suit: s, ranks: (bySuit[s.key] || []).join('') }))
}

export default function BoardDisplay({ deal, boardNum, displayIndex, vulnerability = 'none', onDelete }) {
  const dealer = Board.calculateDealer(boardNum)

  const hands = [
    { compass: 'N', label: 'North', className: 'hand-north' },
    { compass: 'S', label: 'South', className: 'hand-south' },
    { compass: 'W', label: 'West', className: 'hand-west' },
    { compass: 'E', label: 'East', className: 'hand-east' },
  ]

  const vulnClass =
    vulnerability === 'both' ? 'vuln-all' :
    vulnerability === 'ns' ? 'vuln-ns' :
    vulnerability === 'ew' ? 'vuln-ew' : 'vuln-none'

  return (
    <div className="board-display">
      <header className="board-display-header">
        <span className="board-display-title">Board {displayIndex}</span>
        <div className="board-display-actions">
          <button
            type="button"
            className="board-display-delete"
            onClick={onDelete}
            title="Remove board"
            aria-label="Remove board"
          >
            ×
          </button>
        </div>
      </header>
      <div className={`board-vuln-square ${vulnClass}`}>
        <span className="vuln-board-num">{displayIndex}</span>
        <span className={`vuln-dealer-d vuln-d-${dealer.toLowerCase()}`}>D</span>
      </div>
      <div className="board-display-table">
        <div className="board-display-center" aria-hidden="true" />
        {hands.map(({ compass, label, className }) => (
          <div key={compass} className={`board-display-hand ${className} ${compass === dealer ? 'hand-dealer' : ''}`}>
            <div className="hand-header">
              {compass} {label}
            </div>
            <div className="hand-suits">
              {handBySuits(deal[compass]).map(({ suit, ranks }) => (
                <div key={suit.key} className="hand-suit-row">
                  <span className={`suit-symbol ${suit.red ? 'suit-red' : 'suit-black'}`}>
                    {suit.symbol}
                  </span>
                  <span className={`suit-ranks ${suit.red ? 'suit-red' : 'suit-black'}`}>
                    {ranks || '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
