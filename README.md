# Render-ready IP echo service

Simple Node server that returns the visitor's IP address at `/api/ip` and serves a minimal HTML page that calls it. Designed for Render's free tier (512 MB RAM, 0.1 CPU) with no external dependencies.

## Run locally
```bash
node server.js
```
Visit http://localhost:3000 to see your detected IP.

## Deploy to Render
1. Create a new **Web Service** from this repo.
2. Environment: `Node` (>=18).
3. Build command: _leave empty_ (none needed).
4. Start command: `node server.js`.
5. After deploy, open the service URL and the page will show the inbound IP.

The IP is determined server-side using standard proxy headers (`cf-connecting-ip`, `x-real-ip`, `x-forwarded-for`) or the socket address. No API keys or extra setup required.
