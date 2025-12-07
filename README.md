# CheckHost static lookup

A static IP/ASN lookup page that calls public APIs directly from the browser. Designed to deploy on GitHub Pages via Actions with no servers required.

## Features
- Client-side lookup of IP address, hostname, and ASN data via `ipapi.co` with `ipwho.is` as fallback.
- Auto-detects the visitor's public IP on load.
- Responsive, single-page UI built with HTML/CSS/JS only.
- Ready-to-ship GitHub Actions workflow for GitHub Pages.

## Running locally
Open `index.html` in your browser or serve the repo with any static file server, e.g.:

```bash
python -m http.server 8000
```

## Deployment
GitHub Actions workflow `.github/workflows/deploy.yml` builds and publishes the static site to GitHub Pages.

Steps:
1. Enable Pages in the repository settings with the "GitHub Actions" source.
2. Push changes to the `main` branch.
3. Actions will build and deploy automatically to the Pages environment.

To use a custom domain (e.g., `check.hiend.shop`), add a `CNAME` file at the repo root with the domain and set the same domain in the Pages settings.
