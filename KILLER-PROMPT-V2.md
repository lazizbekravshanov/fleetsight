# FleetSight Killer Build V2: Full SAFER + SMS Replication

## Who You Are

You are Claude, working on FleetSight — a free FMCSA carrier search and intelligence platform at `/Users/kali/fleetsight/landing`. The product is search-first: user searches a carrier, clicks a result, lands on `/carrier/[dotNumber]` which shows a full scrollable intelligence page. No tabs, no dashboards.

## The Mission

Make FleetSight's carrier page an exact functional replica of FMCSA SAFER Company Snapshot + SMS Safety Measurement System, PLUS the 7 killer features already built (compliance score, entity graph, insurance continuity, event timeline, predecessor chain, enabler risk, driver migration). Every piece of public data the government makes available about a carrier should be on this one page.

## What Already Exists

The carrier page (`landing/app/carrier/[dotNumber]/page.tsx`) already has:
- Identity section (name, DOT, MC, address, phone, principals, operation type, cargo types, hazmat, fleet size, MCS-150, mileage)
- Summary stats bar (6 tiles)
- Risk assessment (PASS/WATCH/FAIL verdict)
- Compliance completeness score (12-check checklist)
- Fraud & anomaly signals
- Predecessor chain (chameleon lineage)
- BASIC scores (percentile bars)
- Event timeline
- Inspections table (summary + 25 most recent)
- Crashes table (summary + all)
- Insurance intelligence (continuity analysis + table)
- Authority history table
- Equipment census
- Driver migration
- Enabler risk intelligence (client component)
- Entity relationship graph (client component)

Data layer already has:
- `lib/socrata.ts` — 6 Socrata datasets: census (`az4n-8mr2`), inspections (`fx4q-ay7w`), crashes (`aayw-vxb3`), insurance (`qh9u-swkp`), authority history (`9mw4-x3tu`), fleet units (`wt8s-2hbx`)
- `lib/fmcsa.ts` — FMCSA API: carrier profile, BASIC scores, authority, OOS (requires FMCSA_WEBKEY)
- `lib/detection-signals.ts` — shell, authority mill, reincarnation, insurance anomalies
- `lib/affiliation-detection.ts` — 7-signal VIN-based chameleon scoring
- `lib/intelligence/trust-score.ts` — 4-component trust scoring
- `lib/intelligence/risk-signals.ts` — 25+ automated risk signals
- `lib/inspections/vulnerability.ts` — fleet vulnerability with peer comparison
- `lib/inspections/cost-model.ts` — financial impact modeling
- `lib/inspections/driver-scorecard.ts` — per-CDL driver performance
- `lib/inspections/violation-codes.ts` — 57KB violation code lookup table
- `lib/background/` — OFAC, SAM.gov, SEC EDGAR, CourtListener, OSHA, EPA, OpenCorporates
- `lib/enablers/scoring.ts` — formation/BOC-3/insurance agent risk
- `lib/voip-check.ts` — VoIP phone detection
- Prisma models for everything

## What's Missing (The Gap Analysis)

### Gap 1: Violation-Level Detail (CRITICAL)

**What SAFER/SMS shows:** Every individual violation found during an inspection — the CFR code, violation description, severity, whether it was OOS, which BASIC category it belongs to.

**What FleetSight shows today:** Only aggregate counts per inspection (viol_total, oos_total, driver_viol_total, vehicle_viol_total). No individual violation records in the carrier page.

**Data source:** Socrata `876r-jsdb` (Vehicle Inspections and Violations) — this dataset has individual violation rows joined to inspections. Also, FleetSight already has a `InspectionViolation` Prisma model and `lib/inspections/violation-codes.ts` with a 57KB lookup table. The data may already be ingested for some carriers.

**What to build:**
1. Add a new Socrata fetch function `getViolationsByDot(dotNumber, limit)` that queries the violations dataset for individual violations.
2. OR query the existing `InspectionViolation` Prisma table if data has been ingested.
3. Display violations grouped by inspection, expandable — click an inspection row to see its individual violations with CFR code, description, BASIC category, severity, OOS flag.
4. Show a "Top Violations" summary: the 10 most frequent violation codes for this carrier with counts and OOS rates.

### Gap 2: SAFER-Exact Inspection Summary Table

**What SAFER shows:**

| | Inspections | Out of Service | Out of Service % | Nat'l Average |
|---|---|---|---|---|
| Vehicle | 45 | 5 | 11.1% | 20.72% |
| Driver | 38 | 2 | 5.3% | 5.51% |
| Hazmat | 3 | 0 | 0.0% | 4.50% |

This is the EXACT table format SAFER uses. It separates vehicle inspections (levels 1+2+5+6), driver inspections (levels 1+2+3+6), and hazmat inspections, with OOS counts, OOS percentages, and national averages for comparison.

**What FleetSight shows today:** Total inspections, total violations, total OOS, driver OOS, vehicle OOS, OOS rate. No separation by inspection category, no national averages.

**What to build:**
1. Compute vehicle inspections (levels 1,2,5,6), driver inspections (levels 1,2,3,6), hazmat inspections from the `insp_level_id` field.
2. Compute OOS counts and percentages for each category.
3. Hard-code national averages (Vehicle OOS: ~21%, Driver OOS: ~5.5%, Hazmat OOS: ~4.5% — these are published by FMCSA and update annually).
4. Render in the exact SAFER table format with national average comparison column.
5. Color-code: green if below national average, red if above.

### Gap 3: SAFER-Exact Crash Summary Table

**What SAFER shows:**

| Crash Type | Fatal | Injury | Tow | Total |
|---|---|---|---|---|
| (counts) | 0 | 2 | 5 | 7 |

Plus the note: "Each crash is only recorded once and at its highest level of severity."

**What FleetSight shows today:** Fatalities total, injuries total, tow-aways total + a table of individual crashes. Missing: the crash hierarchy summary.

**What to build:**
1. Compute fatal crashes (any crash with fatalities > 0), injury crashes (fatalities = 0 but injuries > 0), tow-away crashes (fatalities = 0 and injuries = 0 but tow_away > 0).
2. Render in SAFER's exact format.
3. This is simple — just re-aggregate the existing crash data using SAFER's severity hierarchy.

### Gap 4: Operation Classification Grid

**What SAFER shows:** A grid with X marks:
```
Operation Classification | X
Authorized For Hire      | X
Exempt For Hire          |
Private (Property)       |
Private (Passenger Bus)  |
Private (Passenger Non-B)|
Migrant                  |
U.S. Mail                |
Federal Government       |
State Government         |
Local Government         |
Indian Tribe             |
```

**What FleetSight shows today:** A single decoded text like "Interstate Auth For-Hire".

**What to build:**
1. Parse `carrier.carrier_operation` and `carrier.classdef` to determine which operation classifications apply.
2. Render as a two-column grid with checkmarks, matching SAFER's layout.
3. Use `decodeOperation()` and `decodeClassdef()` from `lib/fmcsa-codes.ts` to map codes to labels.

### Gap 5: Cargo Carried Grid

**What SAFER shows:** A grid with X marks:
```
Cargo Carried            | X
General Freight          | X
Household Goods          |
Metal/Sheets/Coils       |
Motor Vehicles           | X
Passengers               |
... (26 categories total)
```

**What FleetSight shows today:** A comma-separated list of decoded cargo types.

**What to build:**
1. Parse `carrier.carship` to determine which cargo codes apply.
2. Render as a multi-column grid with checkmarks, matching SAFER's layout.
3. Use `decodeCarship()` from `lib/fmcsa-codes.ts` to map all 26 FMCSA cargo category codes.

### Gap 6: ISS Priority Score

**What SMS computes:** The Inspection Selection System assigns a numeric priority value (1-100) based on BASIC percentiles. Higher = more likely to be selected for roadside inspection.

**What FleetSight has today:** Nothing.

**What to build:**
1. Implement ISS score calculation based on published FMCSA methodology:
   - Safety Algorithm: weighted sum of BASIC percentiles above threshold
   - Insufficient Data Algorithm: for carriers without enough inspections
2. The algorithm is documented at `https://ai.fmcsa.dot.gov/sms/helpfiles/iss_algorithm.pdf`
3. Display as a gauge or score badge next to the BASIC scores section.
4. Color code: green (1-30 = low priority), amber (31-60), red (61-100 = high priority for inspection).

### Gap 7: BASIC Violation Drill-Down

**What SMS shows:** Click a BASIC category → see every violation in that category for the past 24 months, with inspection date, location, CFR section, description, severity weight, time weight, and whether it resulted in OOS.

**What FleetSight has today:** Just the percentile bar per BASIC. No drill-down.

**What to build:**
1. Query violations by BASIC category for this carrier.
2. Map each violation code to its BASIC category using the FMCSA violation-to-BASIC mapping (partially available in `lib/inspections/violation-codes.ts`).
3. Render as an expandable section under each BASIC bar — click to expand and see the violation list.
4. This requires a client component for the expand/collapse interactivity.

### Gap 8: Safety Review / Investigation History

**What SAFER shows:**
```
Safety Rating: Satisfactory
Rating Date: 01/15/2024
Review Type: Compliance Review
```

**What FleetSight has today:** Shows the safety rating badge from FMCSA API but not the review type or date.

**What to build:**
1. The FMCSA profile API already returns `safetyRating`, `safetyRatingDate`, and `safetyReviewDate`.
2. Extract and display these fields in a "Safety Review History" mini-section.
3. Also show `reviewType` if available in the FMCSA response.

### Gap 9: Complaint Count

**What the FMCSA API provides:** `complaintCount` — total complaints filed against this carrier.

**What FleetSight has today:** Nothing — this field is available in the API but not extracted or displayed.

**What to build:**
1. Extract `complaintCount` from the FMCSA carrier profile API response.
2. Display in the summary stats bar as a 7th tile, or in the identity section.

### Gap 10: Canadian Inspection/Crash Data

**What SAFER shows:** Separate tables for Canadian inspections and crashes (CCMTA reciprocity data).

**What FleetSight has today:** Only US data.

**What to build:**
1. Check if the Socrata inspection dataset includes Canadian records (report_state = Canadian province codes).
2. If so, separate US vs Canada inspections in the display.
3. If not, note "Canadian data not yet available" for carriers operating cross-border.

### Gap 11: Full FMCSA API Field Extraction

**What the FMCSA API returns that FleetSight doesn't display:**

From `/carriers/{dot}`:
- `allowToOperate` (Y/N) — displayed but could be more prominent
- `outOfServiceDate` — exact OOS date
- `complaintCount` — complaints
- `busVehicle`, `limoVehicle`, `miniBusVehicle`, `motorCoachVehicle`, `vanVehicle`, `passengerVehicle` — passenger vehicle fleet breakdown

From `/carriers/{dot}/basics`:
- `rdsvDeficient` — carrier exceeded intervention threshold (DIFFERENT from rdDeficient)
- `svDeficient` — serious violation cited within last 12 months during investigation
- `snapShotDate` — when BASIC data was last updated
- `totalInspectionWithViolation` — inspections WITH violations (not total inspections)
- `totalViolation` — total violations in this BASIC

From `/carriers/{dot}/cargo-carried`:
- Full cargo classification list from the API (may be more current than Socrata census)

From `/carriers/{dot}/operation-classification`:
- Full operation classification list from the API

From `/carriers/{dot}/oos`:
- Detailed OOS order information

From `/carriers/{dot}/docket-numbers`:
- All docket numbers (MC, MX, FF) with their statuses

From `/carriers/{dot}/authority`:
- Detailed authority status per docket (common, contract, broker)

**What to build:**
1. Call `/carriers/{dot}/cargo-carried` and `/carriers/{dot}/operation-classification` in the existing `Promise.allSettled` block.
2. Call `/carriers/{dot}/docket-numbers` to get ALL docket numbers, not just the first one.
3. Extract ALL fields from the carrier profile response (complaintCount, vehicle breakdown, etc.).
4. Display `svDeficient` and `rdsvDeficient` as additional alert badges on BASIC scores.
5. Show `snapShotDate` as "BASIC data as of [date]".

## All Public Data Sources to Integrate

### Currently Used (6 Socrata + 4 FMCSA API):
| Source | Resource/Endpoint | Used For |
|--------|-------------------|----------|
| Socrata Census | `az4n-8mr2` | Carrier profile, identity |
| Socrata Inspections | `fx4q-ay7w` | Inspection history |
| Socrata Crashes | `aayw-vxb3` | Crash history |
| Socrata Insurance | `qh9u-swkp` | Insurance filings |
| Socrata Authority | `9mw4-x3tu` | Authority history |
| Socrata Fleet Units | `wt8s-2hbx` | VINs from inspections |
| FMCSA API Profile | `/carriers/{dot}` | Live status, OOS |
| FMCSA API BASICs | `/carriers/{dot}/basics` | BASIC percentiles |
| FMCSA API Authority | `/carriers/{dot}/authority` | Authority status |
| FMCSA API OOS | `/carriers/{dot}/oos` | OOS details |

### To Add (5 new sources):
| Source | Resource/Endpoint | What It Provides |
|--------|-------------------|------------------|
| Socrata Violations | `876r-jsdb` | Individual violation records per inspection |
| FMCSA API Cargo | `/carriers/{dot}/cargo-carried` | Cargo classification (API-fresh) |
| FMCSA API Operations | `/carriers/{dot}/operation-classification` | Operation types (API-fresh) |
| FMCSA API Dockets | `/carriers/{dot}/docket-numbers` | All MC/MX/FF dockets |
| NHTSA Recalls | Already integrated | Vehicle-level recall data |
| NHTSA Complaints | Already integrated | Vehicle complaint data |
| OFAC | Already integrated | Sanctions screening |
| SAM.gov | Already integrated | Exclusion list |
| SEC EDGAR | Already integrated | Financial filings |
| CourtListener | Already integrated | Federal court records |
| OSHA | Already integrated | Workplace violations |
| EPA | Already integrated | Environmental enforcement |
| OpenCorporates | Already integrated | State business registrations |

### Not Available via Public API (note for users):
- State DMV vehicle registrations (no public API in most states)
- FMCSA private BASIC data (Crash Indicator, HM Compliance percentiles restricted to law enforcement)
- Driver-level PII (excluded from all public datasets per privacy law)
- Pending DataQs challenges (not in public API)

## Implementation Order

Build in this order:

### Phase 1 — SAFER Parity (High Impact, Low-Medium Effort)
1. **SAFER Inspection Summary Table** — Vehicle/Driver/Hazmat OOS rates with national averages
2. **SAFER Crash Summary Table** — Fatal/Injury/Tow hierarchy
3. **Operation Classification Grid** — Checkbox-style grid
4. **Cargo Carried Grid** — Checkbox-style grid
5. **Safety Review History** — Rating, date, review type
6. **Complaint Count** — Extract from FMCSA API, add to stats bar

### Phase 2 — SMS Depth (High Impact, Medium Effort)
7. **Violation-Level Detail** — Individual violations per inspection, expandable
8. **Top Violations Summary** — 10 most frequent CFR codes with counts and OOS rates
9. **ISS Priority Score** — Compute from BASICs, display as gauge
10. **BASIC Drill-Down** — Violations grouped by BASIC category, expandable
11. **BASIC Additional Flags** — svDeficient, rdsvDeficient, snapShotDate

### Phase 3 — Additional FMCSA API Data (Medium Impact, Low Effort)
12. **All Docket Numbers** — MC, MX, FF with statuses
13. **Full Vehicle Fleet Breakdown** — Buses, limos, minibuses, motorcoaches, vans
14. **API-Fresh Cargo/Operations** — From FMCSA API instead of stale census

## Technical Notes

### New Socrata Resource to Add
Add to `lib/socrata.ts`:
```typescript
const VIOLATION_RESOURCE = "876r-jsdb";

export type SocrataViolation = {
  inspection_id?: string;
  dot_number: string;
  insp_date?: string;
  report_state?: string;
  viol_code?: string;
  viol_desc?: string;
  oos?: string;           // "Y" or "N"
  basic?: string;         // BASIC category
  unit_type?: string;
  unit_number?: string;
  section?: string;       // CFR section
  group_desc?: string;    // Violation group
};

export async function getViolationsByDot(dotNumber: number, limit = 200): Promise<SocrataViolation[]> {
  return socrataFetch<SocrataViolation>(VIOLATION_RESOURCE, {
    $where: `dot_number='${dotNumber}'`,
    $limit: String(limit),
    $order: "insp_date DESC",
  });
}
```

### New FMCSA API Endpoints to Add
Add to `lib/fmcsa.ts`:
```typescript
export async function getCarrierCargoCarried(dotNumber: string) {
  return fmcsaFetch(`/carriers/${dotNumber}/cargo-carried`);
}

export async function getCarrierOperationClassification(dotNumber: string) {
  return fmcsaFetch(`/carriers/${dotNumber}/operation-classification`);
}

export async function getCarrierDocketNumbers(dotNumber: string) {
  return fmcsaFetch(`/carriers/${dotNumber}/docket-numbers`);
}
```

### National Average OOS Rates (Hard-coded, updated annually)
These come from FMCSA's annual reports:
```typescript
const NATIONAL_AVG = {
  vehicleOosRate: 20.72,  // % of vehicle inspections resulting in OOS
  driverOosRate: 5.51,    // % of driver inspections resulting in OOS
  hazmatOosRate: 4.50,    // % of hazmat inspections resulting in OOS
};
```

### ISS Score Algorithm (Simplified)
Based on FMCSA published methodology:
```typescript
function computeIssScore(basics: BasicScore[]): number {
  // Weight each BASIC that exceeds threshold
  let score = 0;
  for (const b of basics) {
    if (b.percentile >= 75) score += b.percentile * 0.15;
    else if (b.percentile >= 50) score += b.percentile * 0.05;
  }
  // Normalize to 1-100
  return Math.min(100, Math.max(1, Math.round(score)));
}
```

### Client Components Needed
- `components/carrier/violation-drill-down.tsx` — expandable violation list per inspection (needs "use client" for toggle state)
- `components/carrier/basic-drill-down.tsx` — expandable violations per BASIC category

### File Modifications
- `landing/lib/socrata.ts` — add getViolationsByDot + SocrataViolation type
- `landing/lib/fmcsa.ts` — add cargo/operations/docket endpoints
- `landing/app/carrier/[dotNumber]/page.tsx` — add new sections + data fetching
- `landing/components/carrier/violation-drill-down.tsx` — NEW
- `landing/components/carrier/basic-drill-down.tsx` — NEW

## Verification

After building each phase:
1. `npx tsc --noEmit` — typecheck
2. `npx next build` — build
3. Test with DOT numbers:
   - **69495** (Swift — large carrier, should have violations, BASICs, everything)
   - **2247837** (Prime Inc — large carrier)
   - **80321** (small carrier — test sparse data)
   - A hazmat carrier (test hazmat inspection category)
   - A passenger carrier (test bus/motorcoach vehicle counts)
   - A broker-only entity (test no inspections scenario)

## How to Run

```
Read KILLER-PROMPT-V2.md and implement all 3 phases in order. Build each feature, typecheck, verify it compiles, then move to the next. Commit after each phase. Push to origin/main at the end.
```
