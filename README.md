# FleetSight

FleetSight is an open-source carrier-affiliation detection MVP built as an OpenClaw skill.

Tagline: **Make trucking great through transparent, explainable network intelligence.**

## What It Does

FleetSight analyzes carrier records and detects likely affiliated or chameleon networks by finding overlaps across identifiers:

- phone
- email
- email domain
- address
- IP

It outputs:

1. Ranked pairwise links with a score and explainable match reasons
2. Affiliation clusters (connected components over thresholded links)
3. Exportable reports (`JSON`, `CSV`, and a markdown summary)

## Why Open Source

This project is open source so carriers, brokers, compliance teams, and investigators can:

- inspect exactly how scoring works
- reproduce results locally
- extend and audit detection logic
- contribute improvements without vendor lock-in

License: **MIT** (see `LICENSE`)

## Project Structure

```text
.
├── LICENSE
├── README.md
├── app/
├── landing/
└── fleetsight/
    ├── Makefile
    ├── README.md
    ├── tests/
    └── skills/fleetsight/
        ├── fleetsight.py
        ├── skill.json
        └── skill.yaml
```

## Quick Start

Requirements:

- Python 3.11+ (3.9+ also works with current code)
- OpenClaw (self-hosted)

From repo root:

```bash
cd fleetsight
make verify
```

This runs unit tests and a deterministic end-to-end verify flow.

## Chat App (Signup + Chatbot + Upload)

A ChatGPT-style web interface is available in `app/`.

```bash
cd app
python3 -m pip install -r requirements.txt
make run
```

Open:

`http://127.0.0.1:8787`

Detailed setup:

- `app/README.md`

## New Marketing Landing (Next.js)

Redesigned product landing page built with App Router + Tailwind + Framer Motion.

```bash
cd landing
npm install
npm run dev
```

Open:

`http://localhost:3000`

## Replit Deployment

This repo includes `.replit` and `replit.nix` for deploying the Python app and serving the built landing page.

After importing to Replit:

1. Click **Run** to preview.
2. Click **Deploy** (Autoscale).
3. Build command is already configured:
   - `cd landing && npm ci && npm run build && cd ../app && python3 -m pip install -r requirements.txt`
4. Start command is already configured:
   - `cd app && FLEETSIGHT_APP_HOST=0.0.0.0 FLEETSIGHT_APP_PORT=$PORT python3 server.py`

Routes:

- Marketing landing page: `/`
- App console: `/app`
- Marketing landing page alias: `/landing`

## Vercel Deployment (Recommended for Landing)

Deploy the `landing/` app to Vercel from repo root:

```bash
npm i -g vercel
vercel
vercel --prod
```

This repo includes `vercel.json` configured to:

- install from `landing/`
- build with `next build`
- publish `landing/out`

Optional Vercel env for CTA links:

- `NEXT_PUBLIC_APP_URL=https://<your-app-host>`

Example app hosts:

- Railway / Render / Fly / any HTTPS backend running `app/server.py`

If your landing is on Vercel and backend is elsewhere, set backend CORS:

- `FLEETSIGHT_CORS_ORIGINS=https://<your-vercel-domain>`

## OpenClaw Usage

After installing the skill in your OpenClaw skills directory:

```bash
/fleetsight sample-data
/fleetsight analyze carriers.csv --top 50 --threshold 30
/fleetsight explain
```

For full setup and integration steps, see:

- `fleetsight/README.md`

## Contributing

Contributions are welcome.

1. Fork the repo
2. Create a feature branch
3. Add tests for behavior changes
4. Open a PR with a clear description
