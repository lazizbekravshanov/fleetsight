# FleetSight Customer App (Next.js 14)

Production-style customer auth + onboarding + FMCSA + OpenClaw integration.

## Stack

- Next.js 14 App Router + TypeScript + Tailwind
- NextAuth (Credentials)
- Prisma + SQLite (local) + schema ready for Postgres migration
- FMCSA QCMobile API via server-only route handlers
- OpenClaw HTTP skill adapter + webhook ingestion

## Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Required vars:

- `DATABASE_URL` (local default: `file:./dev.db`)
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `FMCSA_WEBKEY`
- `OPENCLAW_WEBHOOK_SECRET`
- `OPENCLAW_ISSUER_ID` (optional)
- `TOKEN_SIGNING_SECRET`

## Run Locally

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Open `http://localhost:3000`.

## Main Routes

- `/login`
- `/signup`
- `/onboarding`
- `/dashboard`

## Auth Flow

1. Sign up on `/signup`
2. Auto sign-in with credentials
3. On `/onboarding`, submit company + USDOT
4. Server validates USDOT using FMCSA `carriers/:dotNumber`
5. Customer profile saved in DB
6. Redirect to `/dashboard`

Rate limiting is enabled for signup and login attempts.

## FMCSA Integration

All FMCSA calls are server-side only and use:

- Base URL: `https://mobile.fmcsa.dot.gov/qc/services/`
- Query auth: `?webKey=<FMCSA_WEBKEY>`

Implemented APIs:

- `GET /api/fmcsa/carriers/:dotNumber`
- `GET /api/fmcsa/carriers/:dotNumber/basics`
- `POST /api/fmcsa/validate`

A short-lived server cache is used in `lib/fmcsa.ts`.

## OpenClaw Integration

### FleetSight endpoints

- `POST /api/openclaw/token` (customer-scoped token generation)
- `POST /api/openclaw/webhook` (event ingest, HMAC verified)
- `GET /api/openclaw/carriers/:dotNumber` (bearer token)
- `GET /api/openclaw/carriers/:dotNumber/basics` (bearer token)

### Skill adapter files

- `openclaw/skill.md`
- `openclaw/skill.ts`

Functions:

- `getCarrierProfile(dotNumber)`
- `getCarrierBasics(dotNumber)`
- `summarizeRisk(dotNumber)`

## Curl Tests

### 1) Validate USDOT route

```bash
curl -X POST http://localhost:3000/api/fmcsa/validate \
  -H "Content-Type: application/json" \
  -d '{"dotNumber":"3875124"}'
```

### 2) Simulate OpenClaw webhook

```bash
BODY='{"source":"openclaw","type":"carrier.risk_changed","dotNumber":"3875124","riskScore":84}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$OPENCLAW_WEBHOOK_SECRET" -binary | xxd -p -c 256)

curl -X POST http://localhost:3000/api/openclaw/webhook \
  -H "Content-Type: application/json" \
  -H "x-openclaw-signature: $SIG" \
  -d "$BODY"
```

## Postgres Migration Note

For Postgres deployment:

1. Change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma`
2. Set `DATABASE_URL` to your Postgres DSN
3. Run migrations with `npm run prisma:deploy`
