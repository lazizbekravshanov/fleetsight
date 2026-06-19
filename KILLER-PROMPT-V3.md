# KILLER PROMPT V3 — Cohort-Relative Safety Benchmarking

## Goal
Upgrade the Peer Benchmark section so a carrier's **safety** metrics are compared to a
**peer cohort**, not only the fixed national averages. Specifically the two OOS metrics:

1. **Vehicle OOS rate** vs cohort
2. **Driver OOS rate** vs cohort

This closes the limitation noted after Phase 2: cohort context today is only
*operational* (fleet-size band peer count + avg power units/drivers via the live census);
safety stayed vs national constants.

## Key constraint (verified, 2026-06-19)
- The census (`az4n-8mr2`) has `fleetsize` but **no safety fields**.
- Inspections (`fx4q-ay7w`) have `report_state`, `vehicle_oos_total`, `driver_oos_total`
  but **no `fleetsize`**. Socrata has no cross-dataset joins.
- Therefore a **fleet-size-band** safety cohort is NOT possible live — it would require
  ingesting inspections for a carrier corpus (a separate, costly project: OUT OF SCOPE).
- A **geographic (state)** safety cohort IS possible live. Verified aggregate:
  `GET fx4q-ay7w?$where=report_state='CA'&$select=count(*) as n, sum(case(vehicle_oos_total::number>0,1,true,0)) as veh, sum(case(driver_oos_total::number>0,1,true,0)) as drv`
  → CA n=1,291,593 veh_oos≈169,538 (≈13.1%). Works with `::number` + `case(...)`.

**Decision:** ship the **live state cohort** (cheap, cached, no ingestion). Carrier's
domicile state (`carrier.phy_state`) is the cohort key.

## Design

### 1. Data — `lib/socrata.ts`
`getStateSafetyBenchmark(state): Promise<{ state; vehicleOosRate; driverOosRate; sampleSize } | null>`
- One aggregate query on the inspection resource filtered by `report_state`.
- OOS-rate definition = % of inspections with a vehicle/driver OOS — **identical** to the
  carrier-side `oosRates()` definition so the comparison is apples-to-apples.
- Cache via existing `cacheGet/cacheSet` (key `state-safety:<state>`, TTL 24h) — state
  aggregates are stable; never hammer Socrata per page load.
- Returns `null` on missing state / query error (graceful).

### 2. Compute — `lib/intelligence/benchmarking.ts`
- Add `BenchmarkInput.stateCohort?: { state; vehicleOosRate; driverOosRate; sampleSize }`.
- Add output `Benchmark.stateCohort: StateCohort | null` where
  `StateCohort = { state; sampleSize; rows: { metric; value; cohortAvg; better }[] }`.
- `better = value < cohortAvg` (lower OOS is better). Only build rows for metrics the
  carrier actually has. National rows + `cohort` (operational) stay unchanged.
- Pure + deterministic. **TDD**: cohort rows built only when input present; better/worse;
  null when absent; existing national tests unaffected.

### 3. Adapter — `lib/intelligence/adapters.ts`
- `IntelligenceInput.stateCohort?` threaded into `computeBenchmark` (guarded, like cohort).

### 4. Page — `app/carrier/[dotNumber]/page.tsx`
- Fetch `getStateSafetyBenchmark(carrier.phy_state)` (guarded, cached), pass to
  `buildIntelligence`. Additive; no existing logic touched.

### 5. UI — `components/carrier/intelligence.tsx`
- In `BenchmarkCard`, render a "vs {STATE} peers" block under the national rows:
  `Vehicle OOS 12.0% vs 13.1% in CA · better`. Server component, defensive.

## Verification gate (same as prior phases)
- Unit tests (TDD, watch RED→GREEN) for the benchmarking cohort-safety logic.
- `tsc --noEmit` clean; full `vitest run` green.
- Local `next dev` render against the prod DB: carrier page 200, state-cohort block
  populated, no server errors.
- Prod build clean → deploy → confirm prod 200 + state cohort live + zero error logs +
  search/health unaffected.

## Cost / safety
- **Zero ingestion, zero new Neon rows.** Live cached Socrata aggregates only.
- Purely additive; benchmark degrades to national-only if the state query fails.

## Explicitly out of scope (future, needs a corpus)
- Fleet-size-band safety percentiles (true peer-group percentile on OOS/crash).
- Crash-rate cohort (needs per-state active-carrier denominator; can add later).
- These require a bounded inspection-corpus ingestion — a separate scoped project.
