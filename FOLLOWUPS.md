# FleetSight Follow-Up Workstream

This branch exists to track incremental fixes and improvements after the customer auth + FMCSA + OpenClaw rollout.

Primary tracking issue: #1

## Planned follow-ups

- Harden distributed rate limiting (replace in-memory limiter with Redis-based store)
- Add automated integration tests for auth/onboarding/api flows
- Add webhook replay protection and idempotency keys
- Improve FMCSA payload normalization across schema variants
- Add secure token rotation/revocation UX in dashboard
