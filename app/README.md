# FleetSight Chat App MVP

This app adds a ChatGPT-style interface on top of the FleetSight detection engine.

## Features

- Email-required signup
- Email verification token flow
- Roles: `carrier`, `broker`, `usdot_official`
- Admin role support
- Role-based approval:
  - `carrier` / `broker`: auto-approved
  - `usdot_official`: auto-approved only for approved DOT domains
  - `usdot_official` non-approved domains: pending admin approval
- Chat interface for FleetSight commands
- Codex Assist panel (OpenAI API-backed)
- CSV upload + analysis execution
- JSON/CSV report download links
- Audit log table in SQLite

## Tech

- Backend: FastAPI + SQLite
- Frontend: static HTML/CSS/JS
- Engine: existing `fleetsight/skills/fleetsight/fleetsight.py` imported directly

## Setup

```bash
cd app
python3 -m pip install -r requirements.txt
cp .env.example .env  # optional
```

Set OpenAI key for Codex integration:

```bash
export OPENAI_API_KEY="your_api_key"
export OPENAI_MODEL="gpt-4.1-mini"  # optional override
```

## Run

```bash
cd app
make run
```

Open:

`http://127.0.0.1:8787`

Landing route (after building Next landing):

`http://127.0.0.1:8787/landing`

## First-Use Flow

1. Sign up with email + password
2. Copy verification token (shown in UI and saved to `app_data/mail_outbox/*.json`)
3. Verify email
4. Login
5. Upload carrier CSV
6. Click **Analyze Latest Upload** or chat:
   - `/fleetsight analyze latest --top 50 --threshold 30`
7. Use **Codex Assist** panel for technical guidance and workflow help.

## Admin Approval Flow

Set one or more admin bootstrap emails in env:

`FLEETSIGHT_ADMIN_EMAILS=admin@fleetsight.local`

When that email signs up and verifies, it gets `admin` role.

Admin can then:

1. Login
2. Open **Admin Review** panel in sidebar
3. Refresh pending USDOT accounts
4. Approve selected users

## FMCSA Open Data Sync

Fetch FMCSA/open-carrier metadata + dataset snapshots into local files:

```bash
cd app
make sync-fmcsa
```

Output files:

- `app_data/fmcsa/catalog.json`
- `app_data/fmcsa/<resource_id>.ndjson`
- `app_data/fmcsa/sync_report.json`

Default resources:

- `6qg9-x4f8` (UCR carrier daily difference)
- `6eyk-hxee` (UCR carrier full history)

You can pass custom IDs:

```bash
python3 fmcsa_sync.py --resource-id 6qg9-x4f8 --max-rows 100000
```

## Security Notes

- Uploaded files are scoped under `app_data/uploads/user_<id>/`
- FleetSight engine output is written under `app_data/workspace/`
- Report reads are restricted to `app_data/`
- Password hashing currently uses salted SHA-256 (MVP only)
- For production, replace auth/session/email with hardened providers

## Build Landing for App Route

To serve the redesigned landing from `/landing`:

```bash
cd ../landing
npm ci
npm run build
```

This generates `landing/out` which the FastAPI app serves.
