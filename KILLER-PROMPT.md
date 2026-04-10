# FleetSight Killer Build: Underwriter + Compliance Auditor Intelligence

## Who You Are

You are Claude, working on FleetSight — a free FMCSA carrier search and intelligence platform at `/Users/kali/fleetsight/landing`. The product is search-first: user searches a carrier by DOT/MC/name, clicks a result, lands on `/carrier/[dotNumber]` which shows a full scrollable intelligence page. No tabs, no dashboards, no agent consoles.

## What Already Exists

The carrier page (`landing/app/carrier/[dotNumber]/page.tsx`) already fetches 7 data sources in parallel and renders 10 sections: identity, summary stats, risk assessment, fraud signals, BASIC scores, inspections table, crashes table, insurance table, authority history table, equipment census.

The codebase has a mature data layer:
- `lib/socrata.ts` — carrier profiles, inspections, crashes, insurance, authority history, fleet units, peer benchmarks, officer/address search
- `lib/fmcsa.ts` — live BASIC scores, authority status, OOS records, safety ratings
- `lib/detection-signals.ts` — shell carrier detection, authority mill detection, broker reincarnation, insurance anomalies
- `lib/affiliation-detection.ts` + `lib/affiliation-scoring.ts` — 7-signal VIN-based chameleon scoring with Union-Find clustering
- `lib/voip-check.ts` — VoIP phone detection
- `lib/background/` — OFAC, SAM.gov, SEC EDGAR, CourtListener, OSHA, EPA, OpenCorporates, digital footprint, address intelligence
- `lib/intelligence/trust-score.ts` — 4-component trust scoring (safety 30%, compliance 25%, fraud 25%, stability 20%)
- `lib/intelligence/risk-signals.ts` — 25+ automated risk signals
- `lib/inspections/vulnerability.ts` — fleet vulnerability analysis with peer comparison
- `lib/inspections/cost-model.ts` — financial impact of violations
- `lib/inspections/driver-scorecard.ts` — per-CDL driver performance
- `lib/enablers/scoring.ts` — formation/BOC-3/insurance agent risk scoring
- `lib/graph/` — trust score with cluster analysis
- `components/carrier/shared.tsx` — BASIC score parsing helpers
- `components/carrier/types.ts` — all TypeScript types

Prisma schema includes: `DriverObservation` (CDL cross-carrier tracking), `CarrierAffiliation`, `AffiliationCluster`, `CarrierInsuranceRecord`, `Enabler`, `EnablerCarrierLink`, `CarrierAddress`, `CarrierPrincipal`, `CarrierAgent`, `VinObservation`, `CarrierVehicle`, `InspectionViolation`, `ViolationCode`, and more.

D3 (`d3@^7.9.0`) is installed but not currently used on the carrier page.

## The Mission

Build 7 new sections on the `/carrier/[dotNumber]` page that transform FleetSight from a good carrier lookup into a tool that insurance underwriters and USDOT compliance auditors cannot work without. Each feature targets the core need both personas share: **see through identity games and understand TRUE carrier risk by examining the network, history, and patterns — not just a current snapshot.**

Think like two people simultaneously:
- **Insurance underwriter** pricing a new policy. You need to know: Is this carrier real? Is this a reincarnation of a shut-down operation? What's the true loss probability? What signals predict a claim in the next 12 months?
- **USDOT compliance officer** investigating a carrier. You need to know: Is this carrier compliant with all FMCSRs? Is it connected to a network of related entities gaming the system? What's the timeline of events that led to the current state?

## The 7 Features to Build

Build these as NEW SECTIONS on the existing carrier page, below the current content. Each section fetches its own data server-side (add to the existing `Promise.allSettled` block or fetch within the section). Each section gracefully degrades when data is unavailable.

---

### Feature 1: Unified Event Timeline

**What:** A single chronological stream showing every significant event in this carrier's life, from authority grant to present. Events include: authority granted/revoked/suspended, inspections (with OOS highlighted), crashes (with severity), insurance filings (with gaps highlighted), MCS-150 updates, OOS orders.

**Why underwriters care:** They need to see the PATTERN over time. A carrier that had 3 clean years, then a spike in violations, then an insurance change, then a crash — that sequence tells a story that individual data points don't.

**Why auditors care:** The TIMING of events is where chameleon behavior lives. Old carrier placed OOS on March 1. New carrier at same address granted authority on March 15. That 14-day gap is the smoking gun — but only if you can see both events on one timeline.

**Data sources:**
- `inspections[]` — already fetched, use `insp_date`
- `crashes[]` — already fetched, use `report_date`
- `insurance[]` — already fetched, use `effective_date`
- `authorityHistory[]` — already fetched, use `orig_served_date`, `disp_served_date`
- `carrier.add_date` — authority grant date
- `carrier.mcs150_date` — last MCS-150 update

**Implementation:**
1. Merge all events into a single array with `{ date: Date, type: string, severity: string, summary: string }`.
2. Sort by date descending (newest first).
3. Render as a vertical timeline with colored dots: green (clean inspection, insurance filed), amber (violation, MCS-150 update), red (crash, OOS, revocation, insurance gap).
4. Each event is a single line: date on the left, colored dot, summary text on the right.
5. Group by year with year headers.
6. Show most recent 50 events with a "Show all N events" expansion.

**Styling:** Vertical line on the left (2px, `var(--border)`), dots positioned on the line, content to the right. Same inline style + CSS variable pattern as existing sections.

---

### Feature 2: Entity Relationship Graph

**What:** A visual network showing every entity connected to this carrier through shared principals, shared addresses, shared VINs, shared phone numbers, or shared enablers. Rendered as a D3 force-directed graph.

**Why underwriters care:** When they see that the carrier they're about to insure shares its company officer with 4 other carriers — 2 of which are OOS — that changes the risk calculation entirely. No other tool shows this.

**Why auditors care:** This IS their investigation. They need to pull the thread: carrier A shares an address with carrier B, which shares a principal with carrier C, which shares VINs with carrier D. The graph shows the cluster in one view.

**Data source:** Call the existing API route `/api/carrier/[dotNumber]/network` which returns: VIN affiliations, address co-location matches, principal matches, phone matches. This endpoint already aggregates all network edges.

**Implementation:**
1. Create a client component `CarrierGraph` (needs `"use client"` for D3 interactivity).
2. Fetch data from `/api/carrier/${dotNumber}/network` client-side (lazy load — the graph is expensive and not every user needs it).
3. Build a D3 force-directed graph:
   - Center node: current carrier (large, accent-colored).
   - Connected nodes: other carriers (sized by connection strength, colored by status: green=active, red=OOS/revoked, gray=inactive).
   - Edges: colored by connection type (blue=shared VIN, orange=shared address, purple=shared principal, gray=shared phone).
   - Node labels: legal name + DOT number.
   - Edge labels on hover: "3 shared VINs" or "same physical address".
4. Clicking a connected carrier node navigates to `/carrier/[thatDot]`.
5. If no connections found, show: "No network connections detected. This carrier appears to operate independently."

**Styling:** Fixed-height container (400px) with rounded border, dark background (`var(--surface-2)`). Legend below the graph showing edge color meanings.

---

### Feature 3: Insurance Continuity Analysis

**What:** A dedicated insurance intelligence section that goes beyond the current table. Shows: current coverage status (adequate/inadequate/lapsed), coverage timeline with gap detection, insurer change history, coverage amount trend, cross-carrier policy matching (same policy number on multiple carriers = red flag).

**Why underwriters care:** This IS their domain. They need to see: Has this carrier maintained continuous coverage? Have they been dropped by insurers? Is their coverage at minimums? Do they share a policy with another carrier (indicating a shared insurance arrangement that may mask risk)?

**Why auditors care:** Insurance lapses correlate with compliance deterioration. A carrier that has changed insurers 4 times in 2 years is likely being non-renewed for claims or non-payment — both are risk signals.

**Data sources:**
- `insurance[]` — already fetched
- `getInsuranceByPolicy(policyNo)` from `lib/socrata.ts` — for cross-carrier policy matching (fetch for each unique policy number)

**Implementation:**
1. **Coverage Status Card:** Summarize current state. Active BIPD? Coverage amount vs. minimum ($750K general, $5M hazmat). Days since last filing. Active/lapsed/expired badge.
2. **Coverage Gap Analysis:** Sort insurance filings by `effective_date`. Identify gaps where no filing is active. Render as a simple horizontal bar chart showing covered vs. gap periods over the last 3 years.
3. **Insurer Change History:** List of unique insurers with dates. Flag: "Changed insurers N times in M months."
4. **Cross-Carrier Policy Match:** For each unique `policy_no`, call `getInsuranceByPolicy()` to find other carriers on the same policy. If found, show as a red-flag card: "Policy #XYZ-123 is also filed for DOT 54321 (Smith Trucking LLC)."
5. Render below the existing insurance table.

---

### Feature 4: Compliance Completeness Score

**What:** A visual checklist showing every dimension of regulatory compliance, with each item scored as PASS (green check), WARN (amber), or FAIL (red X). Produces a composite percentage score: "This carrier is 73% compliant."

**Why underwriters care:** A single number that answers "how compliant is this carrier?" with drill-down into what's failing. Faster than reading 10 tables.

**Why auditors care:** This is literally their checklist. They walk through every FMCSR requirement. FleetSight should do it automatically.

**Compliance dimensions to check (server-side, from already-fetched data):**

| # | Check | Pass Condition | Data Source |
|---|-------|---------------|-------------|
| 1 | Active USDOT Status | `status_code === "A"` | carrier |
| 2 | Active Operating Authority | At least one non-revoked authority | authorityHistory |
| 3 | Current BIPD Insurance | BIPD filing with `effective_date` < 1 year | insurance |
| 4 | Adequate Coverage | BIPD >= $750K (or $5M if hazmat) | insurance + carrier.hm_ind |
| 5 | MCS-150 Current | `mcs150_date` within 24 months | carrier |
| 6 | No Active OOS Order | `status_code !== "OOS"` and no active OOS from FMCSA | carrier + fmcsaProfile |
| 7 | No BASIC Alerts | No BASIC categories exceeding intervention threshold | basics |
| 8 | Acceptable OOS Rate | Vehicle + driver OOS rate below national average (~6%) | inspections |
| 9 | No Recent Fatal Crashes | Zero fatalities in last 24 months | crashes |
| 10 | No Chameleon Signals | Zero critical/high anomaly flags | signals |
| 11 | Phone Verification | Not flagged as VoIP-only | voip |
| 12 | Fleet-Driver Ratio | Power units and drivers > 0, ratio is reasonable | carrier |

**Implementation:**
1. Compute each check as `{ label, status: "pass" | "warn" | "fail", detail: string }`.
2. Score = (passes / total) * 100, rounded.
3. Render as a vertical checklist with colored icons. Score displayed as a large number at the top: "Compliance: 73%".
4. Place this section right after the Risk Assessment section (before fraud signals) since it's a high-level summary.

---

### Feature 5: Predecessor Chain (Chameleon Lineage)

**What:** A visual chain showing this carrier's lineage — every predecessor entity detected through shared VINs, addresses, principals, and the FMCSA `prior_revoke_dot` field. Not just one level back, but the full chain: Carrier C ← Carrier B ← Carrier A.

**Why underwriters care:** If the carrier applying for insurance is the third reincarnation of an operation that's been shut down twice, the underwriter needs to see the FULL chain, not just "prior revoke flag = Y."

**Why auditors care:** The chain IS the investigation. Following the lineage back through multiple registrations is the core of chameleon enforcement.

**Data sources:**
- `carrier.prior_revoke_flag` and `carrier.prior_revoke_dot` — FMCSA self-reported
- Affiliations from `/api/carrier/[dotNumber]/affiliations` — VIN-based connections with chameleon scoring
- `signals.brokerReincarnation` — already computed in the current page

**Implementation:**
1. Start with current carrier.
2. If `prior_revoke_dot` is set, fetch that carrier's profile. Recurse up to 5 levels (avoid infinite loops).
3. Also check affiliations: any affiliated carrier with `type === "POSSIBLE_CHAMELEON"` and `score >= 70` is a likely predecessor.
4. Render as a horizontal chain: boxes connected by arrows, left-to-right (oldest to newest).
   - Each box: legal name, DOT, status badge (active/OOS/revoked), authority date, match signals (icons for shared VINs, address, principal).
   - The current carrier is highlighted with accent border.
5. If no predecessors found, don't render this section at all (most carriers are clean).

---

### Feature 6: Enabler Risk Intelligence

**What:** Show which formation agent, BOC-3 agent, and insurance agent service this carrier, with risk scores for each. An enabler that has filed for hundreds of carriers with an 18% OOS rate among its clients is a risk signal the underwriter and auditor both need.

**Why underwriters care:** If the carrier's formation agent is a known authority mill operator, the probability that this carrier is a chameleon goes up dramatically. That changes the premium or triggers a decline.

**Why auditors care:** Enabler networks are how they dismantle fraud rings. One bad formation agent can be the thread that connects dozens of problematic carriers.

**Data source:** Call existing API `/api/carriers/[dot]/enablers` which returns `{ enablers: EnablerRiskInfo[], warnings: string[] }`.

**Implementation:**
1. Fetch enabler data client-side (lazy, not every carrier has enabler data in the database).
2. Render as cards, one per enabler:
   - Name, type (Formation Agent / BOC-3 / Insurance Agent), relationship
   - Risk score (0-100) with color bar
   - Risk tier badge (LOW/MODERATE/HIGH/CRITICAL)
   - Client count: "Services N active carriers"
   - Warning text if present
3. If no enablers found in database, show: "Enabler data not yet analyzed for this carrier."

---

### Feature 7: Driver Migration Signal

**What:** Show where this carrier's drivers came from and where they went. When drivers (by CDL) move from a recently-closed carrier to this carrier, that's a chameleon signal. When drivers leave this carrier for another, that may indicate safety culture problems.

**Why underwriters care:** Driver quality predicts loss. If 60% of the drivers at this carrier previously drove for a carrier with a 40% OOS rate, the new carrier inherits that risk regardless of its own short track record.

**Why auditors care:** Driver migration patterns reveal the true operational continuity between entities. Same drivers + same trucks = same operation, regardless of the name on the authority.

**Data source:**
- Prisma `DriverObservation` table — tracks CDLs across carriers by inspection
- `lib/inspections/driver-scorecard.ts` — per-CDL performance data

**Implementation:**
1. Query `DriverObservation` for all CDLs associated with this carrier's DOT number.
2. For each CDL, find other DOT numbers where that CDL appears.
3. Aggregate: "N drivers also observed at DOT XXXXX (Carrier Name)" with counts.
4. Flag if the source carrier is OOS, revoked, or has a high-risk score.
5. Render as a table: Source/Destination Carrier, DOT, Status, Shared Driver Count, Overlap Period.
6. If the carrier shares 50%+ of its drivers with a single other carrier, highlight as a chameleon signal.
7. This requires Prisma queries, so it must run server-side. Add to `Promise.allSettled` block with a try/catch wrapper.

---

## Implementation Order

Build in this order (each builds on the previous):

1. **Feature 4: Compliance Completeness Score** — Lowest effort, highest immediate value. Uses only already-fetched data. Add right after the Risk Assessment section.
2. **Feature 3: Insurance Continuity Analysis** — Low effort, high underwriter value. Extends the existing insurance section.
3. **Feature 1: Unified Event Timeline** — Medium effort. Merges already-fetched data into a timeline. No new API calls.
4. **Feature 5: Predecessor Chain** — Medium effort. Requires recursive carrier fetching but the pattern exists.
5. **Feature 6: Enabler Risk Intelligence** — Low effort. Uses existing API endpoint. Client-side lazy load.
6. **Feature 7: Driver Migration Signal** — Medium effort. Requires Prisma queries on DriverObservation.
7. **Feature 2: Entity Relationship Graph** — Highest effort (D3 client component). Uses existing network API. Build last.

## Technical Constraints

- The carrier page is a **server component** (`page.tsx`, no `"use client"`). Features that need interactivity (graph, expand/collapse) must be separate client components imported into the page.
- Use `Promise.allSettled` for all new data fetching — never let one failed source crash the page.
- All styling uses the existing CSS variable system: `var(--surface-0)`, `var(--surface-1)`, `var(--border)`, `var(--ink)`, `var(--ink-soft)`, `var(--ink-muted)`, `var(--accent)`, `var(--accent-soft)`, `var(--font-serif)`.
- Max width is `max-w-5xl` (already set).
- D3 is already installed (`d3@^7.9.0`).
- Each section must show a graceful empty state when its data is unavailable.
- This is a SEARCH-FIRST product. No tabs. No dashboards. Everything on one scrollable page.

## File Structure

```
landing/app/carrier/[dotNumber]/page.tsx    — main server component (modify)
landing/components/carrier/network-graph.tsx — NEW client component for D3 graph (Feature 2)
landing/components/carrier/event-timeline.tsx — could be server or client (Feature 1)
```

Most features add sections directly to `page.tsx`. Only the D3 graph needs a separate client component.

## Verification

After building each feature:
1. `npx tsc --noEmit` — typecheck
2. `npx next build` — build
3. Test with real DOT numbers:
   - **69495** (Swift Transportation — large carrier, full data, should have BASICs, inspections, crashes)
   - **80321** (small carrier — may have sparse data, test empty states)
   - A broker-only entity (classdef without carrier — no inspections expected)
   - A carrier with `prior_revoke_flag = "Y"` (test predecessor chain)
   - A recently-registered carrier (test new authority signals)

## How to Run This Prompt

Open Claude Code in `/Users/kali/fleetsight` and paste:

```
Read KILLER-PROMPT.md and implement all 7 features in the order specified. Build each feature, typecheck, verify it compiles, then move to the next. Commit after each feature is verified. At the end, push to origin/main.
```
