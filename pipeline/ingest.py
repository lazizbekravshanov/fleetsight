#!/usr/bin/env python3
"""FMCSA data ingestion pipeline.

Fetches carrier census, crash, and inspection data from the Socrata SODA API
and upserts into PostgreSQL (Prisma-owned schema).

Usage:
    python ingest.py --max-seeds 100 --expand-hops 1
    python ingest.py                              # full run
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

import psycopg2
import psycopg2.extras


# ── Socrata resource IDs ────────────────────────────────────────
CENSUS_RESOURCE = "az4n-8mr2"
CRASH_RESOURCE = "aayw-vxb3"
INSPECTION_RESOURCE = "fx4q-ay7w"

SOCRATA_BASE = "https://data.transportation.gov/resource"
PAGE_SIZE = 50000

CENSUS_SELECT = (
    "dot_number,legal_name,dba_name,phy_street,phy_city,phy_state,phy_zip,"
    "phone,fax,cell_phone,company_officer_1,company_officer_2,"
    "status_code,prior_revoke_flag,prior_revoke_dot_number,"
    "add_date,power_units,total_drivers,fleetsize,docket1prefix,docket1"
)


# ── Helpers ─────────────────────────────────────────────────────

def log(msg: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)


def get_database_url() -> str:
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        raise RuntimeError("DATABASE_URL environment variable is required")
    return url


def socrata_fetch(
    resource_id: str,
    where: str = "",
    select: str = "",
    limit: int = PAGE_SIZE,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    """Fetch a single page from the Socrata SODA API."""
    params: Dict[str, str] = {
        "$limit": str(limit),
        "$offset": str(offset),
        "$order": ":id",
    }
    if where:
        params["$where"] = where
    if select:
        params["$select"] = select

    url = f"{SOCRATA_BASE}/{resource_id}.json?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})

    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            if attempt < 2:
                wait = 2 ** (attempt + 1)
                log(f"  Retry {attempt+1}/3 after error: {e} (wait {wait}s)")
                time.sleep(wait)
            else:
                raise


def socrata_fetch_all(
    resource_id: str,
    where: str = "",
    select: str = "",
    max_rows: int = 0,
) -> List[Dict[str, Any]]:
    """Paginate through the full result set from SODA API."""
    all_rows: List[Dict[str, Any]] = []
    offset = 0
    while True:
        page = socrata_fetch(resource_id, where=where, select=select, offset=offset)
        if not page:
            break
        all_rows.extend(page)
        log(f"  Fetched {len(all_rows)} rows so far...")
        if max_rows and len(all_rows) >= max_rows:
            all_rows = all_rows[:max_rows]
            break
        if len(page) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
        time.sleep(0.5)  # polite pacing
    return all_rows


def safe_int(val: Any) -> Optional[int]:
    if val is None:
        return None
    try:
        return int(float(str(val)))
    except (ValueError, TypeError):
        return None


def safe_date(val: Any) -> Optional[str]:
    if not val:
        return None
    s = str(val).strip()
    # Socrata returns ISO timestamps; parse and return as date string
    for fmt in ("%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


# ── Upsert functions ────────────────────────────────────────────

def upsert_carriers(conn, rows: List[Dict[str, Any]]) -> int:
    """Upsert carrier census rows into FmcsaCarrier table."""
    if not rows:
        return 0

    values = []
    for r in rows:
        dot = safe_int(r.get("dot_number"))
        if not dot:
            continue
        values.append((
            dot,
            str(r.get("legal_name") or "")[:500],
            (r.get("dba_name") or "")[:500] or None,
            (r.get("phy_street") or "")[:500] or None,
            (r.get("phy_city") or "")[:200] or None,
            (r.get("phy_state") or "")[:10] or None,
            (r.get("phy_zip") or "")[:20] or None,
            (r.get("phone") or "")[:30] or None,
            (r.get("fax") or "")[:30] or None,
            (r.get("cell_phone") or "")[:30] or None,
            (r.get("company_officer_1") or "")[:300] or None,
            (r.get("company_officer_2") or "")[:300] or None,
            (r.get("status_code") or "")[:20] or None,
            (r.get("prior_revoke_flag") or "")[:5] or None,
            safe_int(r.get("prior_revoke_dot_number")),
            safe_date(r.get("add_date")),
            safe_int(r.get("power_units")),
            safe_int(r.get("total_drivers")),
            (r.get("fleetsize") or "")[:50] or None,
            (r.get("docket1prefix") or "")[:10] or None,
            (r.get("docket1") or "")[:20] or None,
        ))

    if not values:
        return 0

    sql = """
        INSERT INTO "FmcsaCarrier" (
            "id", "dotNumber", "legalName", "dbaName",
            "phyStreet", "phyCity", "phyState", "phyZip",
            "phone", "fax", "cellPhone",
            "companyOfficer1", "companyOfficer2",
            "statusCode", "priorRevokeFlag", "priorRevokeDot",
            "addDate", "powerUnits", "totalDrivers",
            "fleetSize", "docketPrefix", "docketNumber",
            "createdAt", "updatedAt"
        ) VALUES %s
        ON CONFLICT ("dotNumber") DO UPDATE SET
            "legalName" = EXCLUDED."legalName",
            "dbaName" = EXCLUDED."dbaName",
            "phyStreet" = EXCLUDED."phyStreet",
            "phyCity" = EXCLUDED."phyCity",
            "phyState" = EXCLUDED."phyState",
            "phyZip" = EXCLUDED."phyZip",
            "phone" = EXCLUDED."phone",
            "fax" = EXCLUDED."fax",
            "cellPhone" = EXCLUDED."cellPhone",
            "companyOfficer1" = EXCLUDED."companyOfficer1",
            "companyOfficer2" = EXCLUDED."companyOfficer2",
            "statusCode" = EXCLUDED."statusCode",
            "priorRevokeFlag" = EXCLUDED."priorRevokeFlag",
            "priorRevokeDot" = EXCLUDED."priorRevokeDot",
            "addDate" = EXCLUDED."addDate",
            "powerUnits" = EXCLUDED."powerUnits",
            "totalDrivers" = EXCLUDED."totalDrivers",
            "fleetSize" = EXCLUDED."fleetSize",
            "docketPrefix" = EXCLUDED."docketPrefix",
            "docketNumber" = EXCLUDED."docketNumber",
            "updatedAt" = NOW()
    """

    now = datetime.now(timezone.utc).isoformat()
    template = (
        "(gen_random_uuid()::text, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, "
        "%s, %s, %s, %s, %s, %s::timestamp, %s, %s, %s, %s, %s, "
        f"'{now}'::timestamp, '{now}'::timestamp)"
    )

    with conn.cursor() as cur:
        psycopg2.extras.execute_values(cur, sql, values, template=template, page_size=500)
    conn.commit()
    return len(values)


def upsert_crashes(conn, rows: List[Dict[str, Any]]) -> int:
    """Upsert crash records into FmcsaCrash table."""
    if not rows:
        return 0

    values = []
    for r in rows:
        dot = safe_int(r.get("dot_number"))
        if not dot:
            continue
        values.append((
            dot,
            safe_date(r.get("report_date")),
            (r.get("report_number") or "")[:100] or None,
            (r.get("report_state") or r.get("state") or "")[:10] or None,
            safe_int(r.get("fatalities")) or 0,
            safe_int(r.get("injuries")) or 0,
            str(r.get("tow_away") or "").upper() in ("Y", "YES", "TRUE", "1"),
        ))

    if not values:
        return 0

    now = datetime.now(timezone.utc).isoformat()
    sql = """
        INSERT INTO "FmcsaCrash" (
            "id", "dotNumber", "reportDate", "reportNumber", "state",
            "fatalities", "injuries", "towAway", "createdAt"
        ) VALUES %s
        ON CONFLICT DO NOTHING
    """
    template = (
        f"(gen_random_uuid()::text, %s, %s::timestamp, %s, %s, %s, %s, %s, '{now}'::timestamp)"
    )

    with conn.cursor() as cur:
        psycopg2.extras.execute_values(cur, sql, values, template=template, page_size=500)
    conn.commit()
    return len(values)


def upsert_inspections(conn, rows: List[Dict[str, Any]]) -> int:
    """Upsert inspection records into FmcsaInspection table."""
    if not rows:
        return 0

    values = []
    for r in rows:
        dot = safe_int(r.get("dot_number"))
        if not dot:
            continue
        values.append((
            dot,
            safe_date(r.get("inspection_date") or r.get("insp_date")),
            (r.get("vin") or "")[:30] or None,
            (r.get("insp_state") or r.get("state") or "")[:10] or None,
            safe_int(r.get("vehicle_oos_total") or r.get("veh_oos_total")) or 0,
            safe_int(r.get("driver_oos_total")) or 0,
        ))

    if not values:
        return 0

    now = datetime.now(timezone.utc).isoformat()
    sql = """
        INSERT INTO "FmcsaInspection" (
            "id", "dotNumber", "inspectionDate", "vin", "state",
            "vehicleOosTotal", "driverOosTotal", "createdAt"
        ) VALUES %s
        ON CONFLICT DO NOTHING
    """
    template = (
        f"(gen_random_uuid()::text, %s, %s::timestamp, %s, %s, %s, %s, '{now}'::timestamp)"
    )

    with conn.cursor() as cur:
        psycopg2.extras.execute_values(cur, sql, values, template=template, page_size=500)
    conn.commit()
    return len(values)


# ── Sync stages ─────────────────────────────────────────────────

def create_sync_run(conn, run_id: str, dataset: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO "SyncRun" ("id", "runId", "dataset", "status", "createdAt", "updatedAt")
               VALUES (gen_random_uuid()::text, %s, %s, 'running', %s::timestamp, %s::timestamp)
               ON CONFLICT ("runId") DO UPDATE SET "status" = 'running', "updatedAt" = NOW()""",
            (run_id, dataset, now, now),
        )
    conn.commit()


def update_sync_run(conn, run_id: str, status: str, rows_processed: int, error: Optional[str] = None) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """UPDATE "SyncRun"
               SET "status" = %s, "rowsProcessed" = %s, "errorMessage" = %s, "updatedAt" = NOW()
               WHERE "runId" = %s""",
            (status, rows_processed, error, run_id),
        )
    conn.commit()


def sync_census_seeds(conn, run_id: str, max_seeds: int = 0) -> List[int]:
    """Fetch carriers with prior_revoke_flag='Y' and upsert into DB."""
    log("Stage 1: Fetching prior-revoke seeds from Census...")
    create_sync_run(conn, f"{run_id}_census_seeds", "census_seeds")

    where = "prior_revoke_flag='Y'"
    rows = socrata_fetch_all(CENSUS_RESOURCE, where=where, select=CENSUS_SELECT, max_rows=max_seeds)
    log(f"  Retrieved {len(rows)} seed carriers")

    count = upsert_carriers(conn, rows)
    log(f"  Upserted {count} seed carriers")

    # Collect seed DOT numbers
    seed_dots: Set[int] = set()
    for r in rows:
        dot = safe_int(r.get("dot_number"))
        if dot:
            seed_dots.add(dot)
        # Also grab the prior revoke targets
        prior = safe_int(r.get("prior_revoke_dot_number"))
        if prior:
            seed_dots.add(prior)

    # Fetch the prior-revoke ancestor DOTs that weren't in the seeds
    ancestor_dots = seed_dots - {safe_int(r.get("dot_number")) for r in rows}
    if ancestor_dots:
        log(f"  Fetching {len(ancestor_dots)} prior-revoke ancestor carriers...")
        chunks = _chunk_list(sorted(ancestor_dots), 100)
        for chunk in chunks:
            dot_list = ",".join(str(d) for d in chunk)
            where_ancestors = f"dot_number in({dot_list})"
            ancestor_rows = socrata_fetch_all(CENSUS_RESOURCE, where=where_ancestors, select=CENSUS_SELECT)
            upsert_carriers(conn, ancestor_rows)

    update_sync_run(conn, f"{run_id}_census_seeds", "done", count)
    return sorted(seed_dots)


def sync_census_expand(conn, seed_dots: List[int], run_id: str) -> List[int]:
    """Expand 1 hop: find carriers sharing phone/address/officer with seeds."""
    log("Stage 2: Expanding 1-hop neighbors...")
    create_sync_run(conn, f"{run_id}_census_expand", "census_expand")

    # Get identifiers of seed carriers from DB
    with conn.cursor() as cur:
        placeholders = ",".join(["%s"] * len(seed_dots))
        cur.execute(
            f"""SELECT "dotNumber", "phone", "phyStreet", "phyCity", "phyState",
                       "companyOfficer1", "companyOfficer2"
                FROM "FmcsaCarrier"
                WHERE "dotNumber" IN ({placeholders})""",
            seed_dots,
        )
        seed_rows = cur.fetchall()

    phones: Set[str] = set()
    addresses: Set[Tuple[str, str, str]] = set()
    officers: Set[str] = set()

    for row in seed_rows:
        _, phone, street, city, state, officer1, officer2 = row
        if phone and len(phone.strip()) >= 7:
            phones.add(phone.strip())
        if street and city and state:
            addresses.add((street.strip().upper(), city.strip().upper(), state.strip().upper()))
        if officer1 and len(officer1.strip()) > 3:
            officers.add(officer1.strip().upper())
        if officer2 and len(officer2.strip()) > 3:
            officers.add(officer2.strip().upper())

    all_new_dots: Set[int] = set()
    total_upserted = 0

    # Expand by phone
    if phones:
        phone_list = sorted(phones)[:200]  # cap to avoid huge queries
        log(f"  Expanding by {len(phone_list)} phone numbers...")
        for chunk in _chunk_list(phone_list, 20):
            conditions = " OR ".join(f"phone='{_escape_soda(p)}'" for p in chunk)
            where = f"({conditions})"
            rows = socrata_fetch_all(CENSUS_RESOURCE, where=where, select=CENSUS_SELECT)
            count = upsert_carriers(conn, rows)
            total_upserted += count
            for r in rows:
                d = safe_int(r.get("dot_number"))
                if d:
                    all_new_dots.add(d)

    # Expand by officer name
    if officers:
        officer_list = sorted(officers)[:100]
        log(f"  Expanding by {len(officer_list)} officer names...")
        for chunk in _chunk_list(officer_list, 10):
            conditions = " OR ".join(
                f"upper(company_officer_1)='{_escape_soda(o)}' OR upper(company_officer_2)='{_escape_soda(o)}'"
                for o in chunk
            )
            where = f"({conditions})"
            rows = socrata_fetch_all(CENSUS_RESOURCE, where=where, select=CENSUS_SELECT)
            count = upsert_carriers(conn, rows)
            total_upserted += count
            for r in rows:
                d = safe_int(r.get("dot_number"))
                if d:
                    all_new_dots.add(d)

    # Expand by address
    if addresses:
        addr_list = sorted(addresses)[:100]
        log(f"  Expanding by {len(addr_list)} addresses...")
        for chunk in _chunk_list(addr_list, 10):
            conditions = " OR ".join(
                f"(upper(phy_street)='{_escape_soda(s)}' AND upper(phy_city)='{_escape_soda(c)}' AND upper(phy_state)='{_escape_soda(st)}')"
                for s, c, st in chunk
            )
            where = f"({conditions})"
            rows = socrata_fetch_all(CENSUS_RESOURCE, where=where, select=CENSUS_SELECT)
            count = upsert_carriers(conn, rows)
            total_upserted += count
            for r in rows:
                d = safe_int(r.get("dot_number"))
                if d:
                    all_new_dots.add(d)

    log(f"  Expansion found {len(all_new_dots)} total related carriers, upserted {total_upserted}")
    update_sync_run(conn, f"{run_id}_census_expand", "done", total_upserted)
    return sorted(all_new_dots | set(seed_dots))


def sync_crashes(conn, dot_numbers: List[int], run_id: str) -> int:
    """Fetch crash records for known DOT numbers."""
    log(f"Stage 3: Fetching crashes for {len(dot_numbers)} carriers...")
    create_sync_run(conn, f"{run_id}_crashes", "crashes")

    total = 0
    for chunk in _chunk_list(dot_numbers, 100):
        dot_list = ",".join(str(d) for d in chunk)
        where = f"dot_number in({dot_list})"
        rows = socrata_fetch_all(CRASH_RESOURCE, where=where)
        count = upsert_crashes(conn, rows)
        total += count

    log(f"  Upserted {total} crash records")
    update_sync_run(conn, f"{run_id}_crashes", "done", total)
    return total


def sync_inspections(conn, dot_numbers: List[int], run_id: str) -> int:
    """Fetch inspection records (with VINs) for known DOT numbers."""
    log(f"Stage 4: Fetching inspections for {len(dot_numbers)} carriers...")
    create_sync_run(conn, f"{run_id}_inspections", "inspections")

    total = 0
    for chunk in _chunk_list(dot_numbers, 100):
        dot_list = ",".join(str(d) for d in chunk)
        where = f"dot_number in({dot_list})"
        rows = socrata_fetch_all(INSPECTION_RESOURCE, where=where)
        count = upsert_inspections(conn, rows)
        total += count

    log(f"  Upserted {total} inspection records")
    update_sync_run(conn, f"{run_id}_inspections", "done", total)
    return total


# ── Utilities ───────────────────────────────────────────────────

def _escape_soda(val: str) -> str:
    """Escape single quotes for Socrata SoQL."""
    return val.replace("'", "''")


def _chunk_list(lst: list, size: int) -> List[list]:
    return [lst[i:i + size] for i in range(0, len(lst), size)]


# ── Main ────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(description="FMCSA data ingestion pipeline")
    parser.add_argument("--max-seeds", type=int, default=0, help="Limit seed carriers (0=unlimited)")
    parser.add_argument("--expand-hops", type=int, default=1, help="Number of expansion hops (0 or 1)")
    parser.add_argument("--skip-crashes", action="store_true", help="Skip crash sync")
    parser.add_argument("--skip-inspections", action="store_true", help="Skip inspection sync")
    args = parser.parse_args()

    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    log(f"Starting ingestion run {run_id}")

    db_url = get_database_url()
    conn = psycopg2.connect(db_url)

    try:
        # Stage 1: seed with prior-revoked carriers
        seed_dots = sync_census_seeds(conn, run_id, max_seeds=args.max_seeds)
        log(f"  Seed DOT count: {len(seed_dots)}")

        # Stage 2: expand 1 hop
        all_dots = seed_dots
        if args.expand_hops >= 1 and seed_dots:
            all_dots = sync_census_expand(conn, seed_dots, run_id)
        log(f"  Total carriers in scope: {len(all_dots)}")

        # Stage 3: crashes
        if not args.skip_crashes and all_dots:
            sync_crashes(conn, all_dots, run_id)

        # Stage 4: inspections
        if not args.skip_inspections and all_dots:
            sync_inspections(conn, all_dots, run_id)

        log("Ingestion complete!")
        return 0

    except Exception as e:
        log(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
