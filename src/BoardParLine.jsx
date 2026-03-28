import { useEffect, useState } from 'react'
import { fetchParResult, parCacheKey } from './parApi'

const SUIT_SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣' }

/**
 * Split DDS bid text into contracts. Concatenated levels with one strain (e.g. "34NT") → one token per digit.
 * Also walks the rest (e.g. "4S5H" → 4S, 5H).
 */
function splitBidPartIntoTokens(bidPart) {
  const tokens = []
  let s = bidPart.trimStart()
  while (s.length) {
    s = s.replace(/^\s+/, '')
    if (!s) break
    const m = s.match(/^([1-7]+)(NT|[SHDCN])(x{1,2})?/i)
    if (!m) {
      tokens.push(s.trim())
      break
    }
    const levels = m[1]
    const strain = m[2]
    const dbl = m[3] ?? ''
    if (levels.length > 1) {
      for (const ch of levels) {
        tokens.push(`${ch}${strain}${dbl}`)
      }
    } else {
      tokens.push(m[0])
    }
    s = s.slice(m[0].length)
  }
  return tokens
}

/**
 * Format one contract token: S/H/D/C → symbols, lone N → NT.
 */
function formatContractToken(token) {
  return token.replace(/([1-7])(NT|[SHDCN])(x{1,2})?/gi, (match, level, strain, dbl = '') => {
    const u = strain.toUpperCase()
    if (u === 'NT') return `${level}NT${dbl}`
    if (u === 'N') return `${level}NT${dbl}`
    const sym = SUIT_SYMBOL[u]
    if (sym) return `${level}${sym}${dbl}`
    return match
  })
}

/**
 * Leading side/pair for one comma-separated DDS segment (NS/EW before single compass letter).
 */
function splitSegmentPrefix(segment) {
  const s = segment.trim()
  if (/^NS\b/i.test(s)) {
    return { prefix: 'NS', bidPart: s.slice(2).trimStart() }
  }
  if (/^EW\b/i.test(s)) {
    return { prefix: 'EW', bidPart: s.slice(2).trimStart() }
  }
  const m = s.match(/^([NESW])\s*/i)
  if (m && s.length > m[0].length) {
    return { prefix: m[1].toUpperCase(), bidPart: s.slice(m[0].length) }
  }
  return { prefix: '', bidPart: s }
}

/**
 * Single line: all contracts separated by "; ".
 * e.g. "NS 12S,N 123C" → "NS 1♠; NS 2♠; N 1♣; N 2♣; N 3♣"
 */
function formatContractsDisplayString(line) {
  if (line == null || line === '' || line === '—') return line
  const segments = line.split(',').map((x) => x.trim()).filter(Boolean)
  const parts = []
  for (const seg of segments) {
    const { prefix, bidPart } = splitSegmentPrefix(seg)
    const tokens = splitBidPartIntoTokens(bidPart)
    const pfx = prefix ? `${prefix} ` : ''
    for (const t of tokens) {
      parts.push(pfx + formatContractToken(t))
    }
  }
  return parts.length > 0 ? parts.join('; ') : line
}

/**
 * DDS par contract strings look like "NS:EW 4Cx" — text after the first colon is the contract line.
 */
function contractLineAfterColon(contractsNS, contractsEW) {
  const raw =
    (contractsNS && String(contractsNS).trim()) ||
    (contractsEW && String(contractsEW).trim()) ||
    ''
  const colon = raw.indexOf(':')
  if (colon === -1) return null
  const line = raw.slice(colon + 1).trim()
  return line || null
}

function parPanelFields({ scoreNS, scoreEW, contractsNS, contractsEW }) {
  return {
    contractText: contractLineAfterColon(contractsNS, contractsEW) || '—',
    scoreNSText: (scoreNS && String(scoreNS).trim()) || '—',
    scoreEWText: (scoreEW && String(scoreEW).trim()) || '—',
  }
}

/**
 * Fetches and shows PAR for one board when parApiBaseUrl is set.
 * Parent should remount via key when deal / boardNum / vulnerability changes.
 */
export default function BoardParLine({ parApiBaseUrl, deal, boardNum, vulnerability }) {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    const key = parCacheKey(boardNum, vulnerability, deal)
    let cancelled = false

    fetchParResult({
      baseUrl: parApiBaseUrl,
      deal,
      boardNum,
      vulnerability,
    })
      .then((data) => {
        if (cancelled) return
        if (parCacheKey(boardNum, vulnerability, deal) !== key) return
        setState({ status: 'ok', key, data })
      })
      .catch((err) => {
        if (cancelled) return
        if (parCacheKey(boardNum, vulnerability, deal) !== key) return
        setState({ status: 'error', key, message: err.message || 'PAR failed' })
      })

    return () => {
      cancelled = true
    }
  }, [parApiBaseUrl, boardNum, vulnerability, deal])

  if (state.status === 'loading') {
    return (
      <div className="board-par-block board-par-block--loading" aria-live="polite">
        <p className="board-par-placeholder">Loading…</p>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="board-par-block board-par-block--error" role="status">
        <p className="board-par-error" title={state.message}>
          Unavailable
        </p>
      </div>
    )
  }

  if (state.status === 'ok' && state.data?.par) {
    const { contractText, scoreNSText, scoreEWText } = parPanelFields(state.data.par)
    return (
      <div
        className="board-par-block board-par-block--ok"
        role="region"
        aria-label="Par contracts and NS and EW scores"
      >
        <div className="board-par-tables">
          <div className="board-par-mini-table-wrap">
            <table className="board-par-mini-table">
              <thead>
                <tr>
                  <th scope="col">Contracts</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="board-par-contract-cell">
                    {formatContractsDisplayString(contractText)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="board-par-mini-table-wrap">
            <table className="board-par-mini-table">
              <thead>
                <tr>
                  <th scope="col">Par</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="board-par-par-cell">
                    {scoreNSText}
                    <br />
                    {scoreEWText}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  return null
}
