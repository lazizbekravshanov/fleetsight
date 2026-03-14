# FleetSight Follow-Up Workstream

This branch exists to track incremental fixes and improvements after the customer auth + FMCSA + OpenClaw rollout.

Primary tracking issue: #1

## Completed

- ~~Harden distributed rate limiting~~ — Redis-backed via @upstash/ratelimit with in-memory fallback
- ~~Add Redis caching layer~~ — Upstash Redis for FMCSA + Socrata with in-memory fallback
- ~~Add error monitoring~~ — Sentry integration (client + server + edge)

## Planned follow-ups

- Add automated integration tests for auth/onboarding/api flows
- Add webhook replay protection and idempotency keys
- Improve FMCSA payload normalization across schema variants
- Add secure token rotation/revocation UX in dashboard
