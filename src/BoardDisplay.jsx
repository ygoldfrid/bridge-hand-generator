import { Board, Hand } from '@bridge-tools/core'
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

const VULN_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'ns', label: 'N-S' },
  { value: 'ew', label: 'E-W' },
  { value: 'both', label: 'Both' },
]

export default function BoardDisplay({
  deal,
  boardNum,
  displayIndex,
  handTypeLabel,
  vulnerability = 'none',
  onDelete,
  rearrangeMode = false,
  onEdit,
  staticVulnSelector = false,
  onVulnerabilityChange,
}) {
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

  const vulnExplicitLabel =
    VULN_OPTIONS.find((o) => o.value === vulnerability)?.label ?? 'None'

  return (
    <div className="board-display">
      <header className="board-display-header">
        <span className="board-display-title">
          Board {displayIndex}{handTypeLabel ? ` - ${handTypeLabel}` : ''}
        </span>
        <div className="board-display-actions">
          {staticVulnSelector && onVulnerabilityChange && (
            <select
              value={vulnerability}
              onChange={(e) => onVulnerabilityChange(e.target.value)}
              className="board-display-vuln-select"
              title="Vulnerability"
              aria-label="Board vulnerability"
            >
              {VULN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
          {!rearrangeMode && onDelete && (
            <button
              type="button"
              className="board-display-delete"
              onClick={onDelete}
              title="Remove board"
              aria-label="Remove board"
            >
              ×
            </button>
          )}
        </div>
      </header>
      <div className="board-display-table">
        <div className="board-vuln-stack">
          <div className={`board-vuln-square ${vulnClass}`}>
            <span className="vuln-board-num">{displayIndex}</span>
          </div>
          <div className="board-vuln-explicit" title="Vulnerability">
            Vul: {vulnExplicitLabel}
          </div>
        </div>
        <div
          className={`board-display-center${!rearrangeMode && onEdit ? ' board-display-center--interactive' : ''}`}
          aria-hidden={!(onEdit && !rearrangeMode)}
        >
          {!rearrangeMode && onEdit && (
            <button
              type="button"
              className="board-display-center-edit"
              onClick={onEdit}
              title="Edit cards on this board"
              aria-label="Edit cards on this board"
            >
              ✏️ Edit Cards
            </button>
          )}
        </div>
        {hands.map(({ compass, label, className }) => {
          const hcp = Hand.countMiltonHCP(deal[compass])
          return (
          <div key={compass} className={`board-display-hand ${className} ${compass === dealer ? 'hand-dealer' : ''}`}>
            <div className="hand-header">
              <span>
                {label}
                {compass === dealer ? ' (D)' : ''}
              </span>
            </div>
            <div className="hand-suits">
              {handBySuits(deal[compass]).map(({ suit, ranks }) => (
                <div key={suit.key} className="hand-suit-row">
                  <span className={`suit-symbol ${suit.red ? 'suit-red' : 'suit-black'}`}>
                    {suit.symbol}
                  </span>
                  <span className="suit-ranks">
                    {ranks || '—'}
                  </span>
                </div>
              ))}
            </div>
            <div className="hand-hcp-banner" title="High Card Points">
              {hcp} HCP
            </div>
          </div>
          )
        })}
      </div>
    </div>
  )
}
