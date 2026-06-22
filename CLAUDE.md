# CLAUDE.md — FleetSight Operating Contract

You are working on **FleetSight**, a production FMCSA carrier-intelligence platform
(Next.js / TypeScript / Prisma / Neon Postgres / Vercel). Real users hit this.
Production data is not disposable. The environment wiring in this repo has caused
data-loss-class incidents before, so treat every action as if it can touch prod.

---

## 0. Ground truth before any state change — HIGHEST PRIORITY

Before ANY migration, schema change, branch reset, force-push, deploy, or destructive
command, do this first and show your work:

1. **Print the resolved target.** Which `DATABASE_URL`, which Vercel environment
   (Production / Preview / Development), which git branch + HEAD.
2. **Prove it — don't assume.** A connection string existing in settings is NOT proof
   it is production. Confirm with evidence: the env value's source, `prisma migrate status`,
   a log line / driver prefix, the Vercel env target. (We once migrated the *wrong* Neon
   DB by assuming a URL was prod.)
3. **State the blast radius.** What changes, and is it reversible? If it is irreversible,
   or it touches Production, **STOP and wait for my explicit "yes."**

**Never act on my stated premise if the repo contradicts it.** If I say "the platform is
deprecated, roll back," and the history shows active recent work, say so and do nothing
destructive until we agree. Challenging a wrong premise is part of the job.

---

## 1. Database & migrations

- Prod runs **Neon Postgres**. `schema.prisma` `provider` MUST be `postgresql`.
  Never silently switch providers.
- Deploys run **`prisma migrate deploy`**. NEVER `prisma db push`, and NEVER
  `--accept-data-loss`, in any build step, script, package.json, or CI workflow.
  If you find one, flag it and stop — do not run it.
- All schema changes are **additive**. No dropping or renaming columns/tables without
  an explicit, confirmed, reversible plan.
- Raw SQL must be Postgres-valid: `string_agg` (not `GROUP_CONCAT`), quoted identifiers,
  and explicit casts on text columns (`::numeric`) before aggregation.
- **Local dev must NEVER point `.env.local` at the prod Neon DB.** If the active database
  resolves to production, refuse to run any mutating command and tell me immediately.

---

## 2. Definition of done — run every time, in order

`tsc --noEmit` → `vitest` → local `next dev` render against the real dev DB →
prod build → deploy → confirm affected pages return **200 with ZERO error logs**
(Vercel logs API).

A change is not done until all six pass. **Never leave production knowingly broken.**

---

## 3. How to write code here

- **Test-first.** New analytics/compute ships with unit tests and is **guarded so it can
  never throw or 500 the page** — per-compute try/guards, graceful empty states.
- Keep pure / server helpers **out of `"use client"` modules.** Importing them on the
  server turns them into client-reference stubs and 500s the page
  (`TypeError: (0,x.Pv) is not a function`). Server-only logic lives in server-safe files.
- Additive and composable. Do not regress existing search / identifier dispatch paths.

---

## 4. Workflow

- Work on a branch, open a PR, let CI (`prisma generate` + `tsc` + `vitest`) gate it.
  **No direct pushes to `main`.**
- Commit per task step with clear messages, so any step is individually revertible.
- **Plan before building** anything that touches schema, infra, or env: write the plan,
  let me review it, then execute. Do not jump straight to edits on stateful work.

---

## 5. When to STOP and ask instead of act

- Anything destructive or irreversible.
- Anything that mutates production **data** or production **config**.
- Any time the resolved environment doesn't match what I asked for.
- Any time you'd be **inferring** which DB / branch / env is "the real one" — confirm, don't guess.

Default to the smallest reversible step. When unsure, ask.
**A blocked task is recoverable. A wrong migration against prod is not.**
