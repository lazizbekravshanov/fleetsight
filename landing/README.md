# FleetSight Customer App (Next.js 14)

Production auth + onboarding + FMCSA + OpenClaw integration.

## Stack

- Next.js 14 App Router + TypeScript + Tailwind
- NextAuth (Credentials)
- Prisma + PostgreSQL (required for production)
- FMCSA QCMobile API (server-side only)
- OpenClaw HTTP adapter + webhook ingest

## Environment

Copy `.env.example` to `.env.local`.

Required:

- `DATABASE_URL` (PostgreSQL)
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `FMCSA_WEBKEY`
- `OPENCLAW_WEBHOOK_SECRET`
- `OPENCLAW_ISSUER_ID` (optional)
- `TOKEN_SIGNING_SECRET`

## Local Run

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Open `http://localhost:3000`.

## Production (Vercel)

Use a persistent Postgres DB (Neon/Supabase/Railway/etc).

1. Set `DATABASE_URL` to your Postgres connection string.
2. Set all auth/OpenClaw/FMCSA env vars.
3. Deploy. Build runs `prisma migrate deploy` before `next build`.

## Routes

- `/login`
- `/signup`
- `/onboarding`
- `/dashboard`

## APIs

- `POST /api/auth/signup`
- `GET /api/auth/attempts`
- `POST /api/fmcsa/validate`
- `GET /api/fmcsa/carriers/:dotNumber`
- `GET /api/fmcsa/carriers/:dotNumber/basics`
- `POST /api/openclaw/token`
- `POST /api/openclaw/webhook`
- `GET /api/openclaw/carriers/:dotNumber`
- `GET /api/openclaw/carriers/:dotNumber/basics`

## Test Curl

```bash
curl -X POST https://<host>/api/fmcsa/validate \
  -H "Content-Type: application/json" \
  -d '{"dotNumber":"3875124"}'
```

```bash
BODY='{"source":"openclaw","type":"carrier.risk_changed","dotNumber":"3875124","riskScore":84}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$OPENCLAW_WEBHOOK_SECRET" -binary | xxd -p -c 256)

curl -X POST https://<host>/api/openclaw/webhook \
  -H "Content-Type: application/json" \
  -H "x-openclaw-signature: $SIG" \
  -d "$BODY"
```
