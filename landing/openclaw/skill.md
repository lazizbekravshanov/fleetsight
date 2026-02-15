# FleetSight OpenClaw Skill

This adapter exposes FleetSight customer-scoped carrier intelligence to OpenClaw over HTTP.

## Prereqs

- FleetSight Next.js app running locally (`http://localhost:3000`)
- Customer account onboarded with USDOT in FleetSight
- `OPENCLAW_WEBHOOK_SECRET` configured in FleetSight

## 1) Generate a customer token

1. Login to FleetSight dashboard.
2. Click **Connect OpenClaw**.
3. Copy the returned bearer token.

The token is scoped (default `carrier:read`) and expires automatically.

## 2) Configure OpenClaw gateway runtime

Use environment variables in your OpenClaw self-hosted gateway:

- `FLEETSIGHT_BASE_URL=http://localhost:3000`
- `FLEETSIGHT_TOKEN=<copied token>`

## 3) Skill methods

Implemented in `openclaw/skill.ts`:

- `getCarrierProfile(dotNumber)` -> `GET /api/openclaw/carriers/:dotNumber`
- `getCarrierBasics(dotNumber)` -> `GET /api/openclaw/carriers/:dotNumber/basics`
- `summarizeRisk(dotNumber)` -> deterministic summary derived from profile + basics

## 4) Webhook events into FleetSight

FleetSight receives OpenClaw runtime events at:

- `POST /api/openclaw/webhook`

Header required:

- `x-openclaw-signature: <hex_hmac_sha256(raw_body, OPENCLAW_WEBHOOK_SECRET)>`

Supported event example:

- `carrier.risk_changed`

All events are stored in `WebhookEvent`.
