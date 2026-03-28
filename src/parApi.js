/**
 * PAR API client with in-memory cache and in-flight deduplication.
 * @param {import('@bridge-tools/core').Types.Deal} deal
 */
export function parCacheKey(boardNum, vulnerability, deal) {
  const seats = ['N', 'E', 'S', 'W']
  const parts = seats.map((seat) => {
    const hand = deal[seat] || []
    return hand
      .map((c) => `${c.suit}${c.rank}`)
      .sort()
      .join(',')
  })
  return `${boardNum}|${vulnerability}|${parts.join('|')}`
}

const resultCache = new Map()
const inflight = new Map()

/**
 * @param {{ baseUrl: string, deal: import('@bridge-tools/core').Types.Deal, boardNum: number, vulnerability: string }} args
 * @returns {Promise<{ ok: true, boardNum: number, vulnerability: string, pbn?: string, par: { scoreNS: string, scoreEW: string, contractsNS: string, contractsEW: string } }>}
 */
export async function fetchParResult({ baseUrl, deal, boardNum, vulnerability }) {
  const root = String(baseUrl).replace(/\/$/, '')
  const key = parCacheKey(boardNum, vulnerability, deal)

  const cached = resultCache.get(key)
  if (cached) return cached

  const pending = inflight.get(key)
  if (pending) return pending

  const promise = (async () => {
    const res = await fetch(`${root}/par`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boardNum,
        vulnerability,
        deal: {
          N: deal.N,
          E: deal.E,
          S: deal.S,
          W: deal.W,
        },
      }),
    })
    const text = await res.text()
    let json
    try {
      json = text ? JSON.parse(text) : {}
    } catch {
      throw new Error(text.slice(0, 120) || 'Invalid PAR response')
    }
    if (!res.ok || !json.ok) {
      const msg = json.error || res.statusText || 'PAR request failed'
      throw new Error(msg)
    }
    resultCache.set(key, json)
    return json
  })()
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, promise)
  return promise
}
