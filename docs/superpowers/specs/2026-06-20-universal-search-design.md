# Universal Search — Design

## Goal
Let users search carriers by **any identifier**, not just name/DOT/MC: smart
auto-detect of what's typed/pasted, with explicit operators for ambiguous text.
Search-first, closes the multi-identifier gap vs competitors.

## Identifiers (verified feasible)
| Type | Detect | Backend | Live? |
|---|---|---|---|
| name | default text | `searchCarriers` (existing) | ✅ |
| dot | digits ≤8 | `searchCarriers` (existing) | ✅ |
| mc | `MC######` | `searchCarriers` (existing) | ✅ |
| officer | `officer:` | `searchCarriersByOfficer` (existing) | ✅ |
| address | `address:` (street, city, ST) | `searchCarriersByAddress` (existing) | ✅ |
| phone | 10 digits or `phone:` | **new** `searchCarriersByPhone` (census `phone`, stored as 10 digits) | ✅ |
| insurer | `insurer:` | **new** `searchCarriersByInsurer` (insurance `name_company` LIKE → DOTs → census) | ✅ |
| vin | 17-char VIN charset or `vin:` | `getVinCarriers` (DB CarrierVehicle) | ⚠️ empty until fleet data accrues — graceful |

**Excluded: license plate** — no queryable plate field. Stated, not faked.

## Architecture
1. **`lib/search/detect.ts` (pure, TDD — the core).** `detectQuery(raw) → { type, value }`.
   - Operators first (case-insensitive): `officer: address: insurer: phone: vin: dot: mc:`.
   - Else auto-detect: 17-char VIN charset → vin; 10/11 digits → phone (strip to 10);
     `MC` + digits → mc; pure digits ≤8 → dot; else → name.
   - Normalizes value (phone→digits, vin→upper).
2. **`lib/socrata.ts`** — add `searchCarriersByPhone(phone)` and
   `searchCarriersByInsurer(name)` (2-hop: insurance name LIKE → distinct DOTs →
   census). Reuse officer/address/vin. All return `SocrataCarrier[]` (insurer/phone)
   or carrier-lite (vin) → mapped to the existing `SearchResult`.
3. **`app/api/carrier/search/route.ts`** — after cache, run `detectQuery`. If type ∈
   {vin, phone, officer, address, insurer} → dispatch to that lookup, map, return with
   `searchMode = <type>`. Otherwise **fall through unchanged** to today's natural/AI/
   standard layers (name/dot/mc). Zero regression.
4. **`components/carrier/carrier-lookup.tsx`** — show a "Detected: <type>" chip + a
   one-line operator hint. Same result list; no new page.

## Testing / safety
- TDD `detectQuery` (operators, each auto-detect pattern, normalization, edge cases).
- Each new lookup guarded (failure → empty results, never 500).
- Verify: typecheck, `npm test`, local render. Ship via **feature branch → PR → CI → merge**.

## Out of scope
- License plate search (no data). Fleet-size cohort, etc. — unrelated.
- VIN search returns results only once `CarrierVehicle` is populated (accrues via the
  existing watch→ingest path); detection + routing ship now, results light up later.
