# PAR API (DDS-backed)

This service provides PAR calculation using DDS in Docker.

- DDS source is pulled during Docker build (`DDS_REPO`, `DDS_REF`).
- `/health` returns service status.
- `/par` converts your board deal to DDS PBN format and returns PAR score/contracts.

## Build

```bash
docker build -t bridge-par-api ./services/par-api
```

Optional: point to a different DDS source/ref:

```bash
docker build \
  --build-arg DDS_REPO="https://github.com/eseidel/dds.git" \
  --build-arg DDS_REF="master" \
  -t bridge-par-api \
  ./services/par-api
```

## Run

```bash
docker run --rm -p 8080:8080 bridge-par-api
```

### CORS (browser / Vite dev)

The server sends `Access-Control-Allow-Origin` (default `*`). Override with:

```bash
docker run --rm -e CORS_ORIGIN=https://your-site.example -p 8080:8080 bridge-par-api
```

The Vite app reads `VITE_PAR_API_URL` (see repo `.env.example`).

## Endpoints

- `GET /health`
- `POST /par`

Example payload:

```json
{
  "boardNum": 1,
  "vulnerability": "none",
  "deal": {
    "N": [{ "suit": "S", "rank": "A" } /* ...13 cards... */],
    "E": [/* ...13 cards... */],
    "S": [/* ...13 cards... */],
    "W": [/* ...13 cards... */]
  }
}
```

`rank` may be `A K Q J T 9..2` or `10` (normalized to `T`).

Successful response shape:

```json
{
  "ok": true,
  "boardNum": 1,
  "vulnerability": "none",
  "pbn": "N:... ... ... ...",
  "par": {
    "scoreNS": "NS -110",
    "scoreEW": "EW 110",
    "contractsNS": "...",
    "contractsEW": "..."
  }
}
```
