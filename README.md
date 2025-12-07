# Render-ready IP intelligence playground

Node server that returns the visitor's IP address at `/api/ip` and performs multi-provider lookups at `/api/lookup?target=<host>`. The public UI renders a premium-styled dashboard for querying IPs or domains and surfaces geo/ASN details from several free providers.

## Run locally
```bash
node server.js
```
Then open http://localhost:3000 to see your detected IP and aggregated cards.

## Deploy to Render
1. Create a new **Web Service** from this repo.
2. Environment: `Node` (>=18).
3. Build command: _leave empty_ (none needed).
4. Start command: `node server.js`.
5. After deploy, open the service URL and the page will show the inbound IP and lookup grid. No API keys are required for the bundled free providers.

The IP is determined server-side using standard proxy headers (`cf-connecting-ip`, `x-real-ip`, `x-forwarded-for`) or the socket address. Lookups run server-side against public APIs to avoid CORS issues.
