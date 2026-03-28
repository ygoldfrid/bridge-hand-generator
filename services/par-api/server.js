import http from 'node:http'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const PORT = Number(process.env.PORT || 8080)
const DDS_ROOT = process.env.DDS_ROOT || '/opt/dds'
const DDS_PAR_CLI = process.env.DDS_PAR_CLI || '/usr/local/bin/dds-par-cli'
/** Browser calls from Vite dev / production frontend; set to your site origin in production if needed */
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'
const execFileAsync = promisify(execFile)

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function sendJson(res, statusCode, body) {
  const data = JSON.stringify(body)
  res.writeHead(statusCode, {
    ...corsHeaders(),
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
  })
  res.end(data)
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 2 * 1024 * 1024) {
        reject(new Error('Payload too large'))
      }
    })
    req.on('end', () => resolve(raw))
    req.on('error', reject)
  })
}

function isObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeRank(rank) {
  if (rank == null) return null
  const raw = String(rank).trim().toUpperCase()
  if (raw === '10') return 'T'
  const allowed = new Set(['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'])
  return allowed.has(raw) ? raw : null
}

const rankValue = {
  A: 14,
  K: 13,
  Q: 12,
  J: 11,
  T: 10,
  9: 9,
  8: 8,
  7: 7,
  6: 6,
  5: 5,
  4: 4,
  3: 3,
  2: 2,
}

function sortRanksDescending(ranks) {
  return [...ranks].sort((a, b) => rankValue[b] - rankValue[a])
}

function vulnerabilityToCode(vulnerability) {
  const v = String(vulnerability || '').toLowerCase()
  if (v === 'none') return 0
  if (v === 'both') return 1
  if (v === 'ns') return 2
  if (v === 'ew') return 3
  return null
}

function buildPbnForDds(deal) {
  const seats = ['N', 'E', 'S', 'W']
  const suits = ['S', 'H', 'D', 'C']
  const seatChunks = []
  const seenCards = new Set()

  for (const seat of seats) {
    const hand = deal[seat]
    const bySuit = { S: [], H: [], D: [], C: [] }

    for (const card of hand) {
      if (!isObject(card)) return { error: `${seat} contains an invalid card.` }
      const suit = String(card.suit || '').toUpperCase()
      if (!suits.includes(suit)) return { error: `${seat} has invalid suit "${card.suit}".` }
      const rank = normalizeRank(card.rank)
      if (!rank) return { error: `${seat} has invalid rank "${card.rank}".` }

      const key = `${suit}${rank}`
      if (seenCards.has(key)) return { error: `Duplicate card detected: ${key}.` }
      seenCards.add(key)
      bySuit[suit].push(rank)
    }

    const suitText = suits.map((s) => sortRanksDescending(bySuit[s]).join('')).join('.')
    seatChunks.push(suitText)
  }

  if (seenCards.size !== 52) {
    return { error: `Deal must contain 52 unique cards, got ${seenCards.size}.` }
  }

  // DDS PBN expects "<firstSeat>:<hand1> <hand2> <hand3> <hand4>".
  // Using N as first seat and N-E-S-W hand order.
  return { pbn: `N:${seatChunks.join(' ')}` }
}

function validateParPayload(payload) {
  if (!isObject(payload)) return 'Request body must be a JSON object.'
  if (!isObject(payload.deal)) return 'Missing "deal" object.'
  if (typeof payload.boardNum !== 'number') return '"boardNum" must be a number.'
  if (typeof payload.vulnerability !== 'string') return '"vulnerability" must be a string.'

  const requiredSeats = ['N', 'E', 'S', 'W']
  for (const seat of requiredSeats) {
    const hand = payload.deal[seat]
    if (!Array.isArray(hand)) {
      return `deal.${seat} must be an array of cards.`
    }
  }
  return null
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS' && (req.url === '/par' || req.url === '/health')) {
    res.writeHead(204, corsHeaders())
    res.end()
    return
  }

  if (req.method === 'GET' && req.url === '/health') {
    return sendJson(res, 200, {
      ok: true,
      service: 'par-api',
      ddsRoot: DDS_ROOT,
      note: 'DDS source is baked into this container during docker build.',
    })
  }

  if (req.method === 'POST' && req.url === '/par') {
    try {
      const raw = await collectBody(req)
      const payload = raw ? JSON.parse(raw) : {}
      const validationError = validateParPayload(payload)
      if (validationError) {
        return sendJson(res, 400, { ok: false, error: validationError })
      }

      const vulnerabilityCode = vulnerabilityToCode(payload.vulnerability)
      if (vulnerabilityCode == null) {
        return sendJson(res, 400, {
          ok: false,
          error: 'vulnerability must be one of: none, both, ns, ew.',
        })
      }

      const pbnResult = buildPbnForDds(payload.deal)
      if (pbnResult.error) {
        return sendJson(res, 400, { ok: false, error: pbnResult.error })
      }

      const { stdout, stderr } = await execFileAsync(
        DDS_PAR_CLI,
        [pbnResult.pbn, String(vulnerabilityCode)],
        { timeout: 15000, maxBuffer: 1024 * 1024 }
      )
      if (stderr && stderr.trim()) {
        return sendJson(res, 502, { ok: false, error: `DDS stderr: ${stderr.trim()}` })
      }

      let parsed
      try {
        parsed = JSON.parse(stdout)
      } catch {
        return sendJson(res, 502, {
          ok: false,
          error: 'Failed parsing DDS response.',
          raw: stdout.trim().slice(0, 300),
        })
      }

      if (!parsed.ok) {
        return sendJson(res, 502, {
          ok: false,
          error: parsed.error || 'DDS PAR calculation failed.',
          code: parsed.code ?? null,
        })
      }

      return sendJson(res, 200, {
        ok: true,
        boardNum: payload.boardNum,
        vulnerability: payload.vulnerability,
        pbn: pbnResult.pbn,
        par: {
          scoreNS: parsed.par.scoreNS,
          scoreEW: parsed.par.scoreEW,
          contractsNS: parsed.par.contractsNS,
          contractsEW: parsed.par.contractsEW,
        },
      })
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message })
    }
  }

  return sendJson(res, 404, { ok: false, error: 'Not found' })
})

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`par-api listening on :${PORT}`)
})
