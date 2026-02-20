#!/usr/bin/env python3
"""Chameleon carrier detection engine.

Reads FMCSA data from PostgreSQL, computes pairwise affiliation links,
clusters carriers into chameleon networks, and writes risk scores back to DB.

Usage:
    python detect.py
    python detect.py --threshold 30 --run-id manual_001
"""

from __future__ import annotations

import argparse
import json
import os
import re
import string
from collections import defaultdict
from datetime import datetime, timezone
from itertools import combinations
from typing import Any, Dict, List, Optional, Set, Tuple

import psycopg2
import psycopg2.extras


# ── Feature weights ─────────────────────────────────────────────

FEATURE_WEIGHTS = {
    "vin":             60.0,   # Shared vehicle across DOTs
    "officer":         55.0,   # Shared principal/officer name
    "prior_revoke":    50.0,   # Direct FMCSA prior-revocation link
    "phone":           40.0,   # Shared phone number
    "fax":             35.0,   # Shared fax
    "cell_phone":      35.0,   # Shared cell
    "address":         25.0,   # Shared physical address
    "address_new_dot": 40.0,   # New DOT at same address within 180 days of another going OOS
    "fleet_anomaly":   30.0,   # New entrant with suspiciously large fleet
}

FEATURE_ORDER = [
    "vin", "officer", "prior_revoke", "phone", "fax",
    "cell_phone", "address", "address_new_dot", "fleet_anomaly",
]

ADDRESS_SUFFIX_MAP = {
    "street": "st", "st.": "st",
    "avenue": "ave", "ave.": "ave",
    "road": "rd", "rd.": "rd",
    "drive": "dr", "dr.": "dr",
    "lane": "ln", "ln.": "ln",
    "boulevard": "blvd", "blvd.": "blvd",
    "court": "ct", "ct.": "ct",
    "circle": "cir", "cir.": "cir",
    "highway": "hwy", "hwy.": "hwy",
}


# ── Helpers ─────────────────────────────────────────────────────

def log(msg: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)


def get_database_url() -> str:
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        raise RuntimeError("DATABASE_URL environment variable is required")
    return url


def normalize_phone(value: str) -> str:
    digits = re.sub(r"\D+", "", value or "")
    if not digits or len(digits) < 7:
        return ""
    return digits[-10:]


def normalize_address(street: str, city: str, state: str) -> str:
    parts = []
    for v in [street, city, state]:
        text = (v or "").strip().lower()
        text = re.sub(rf"[{re.escape(string.punctuation)}]", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        if text:
            tokens = [ADDRESS_SUFFIX_MAP.get(tok, tok) for tok in text.split(" ")]
            parts.append(" ".join(tokens))
    result = " | ".join(parts)
    return result if len(result) > 5 else ""


def normalize_officer(name: str) -> str:
    text = (name or "").strip().upper()
    text = re.sub(r"[^A-Z\s]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text if len(text) > 3 else ""


def rarity_weight(freq: int) -> float:
    if freq <= 1:
        return 0.0
    return 2.0 / float(freq)


# ── Data loading ────────────────────────────────────────────────

def load_carriers_from_db(conn) -> Dict[int, Dict[str, Any]]:
    """Load all carriers with aggregated VINs and crash counts."""
    carriers: Dict[int, Dict[str, Any]] = {}

    with conn.cursor() as cur:
        cur.execute("""
            SELECT "dotNumber", "legalName", "dbaName",
                   "phyStreet", "phyCity", "phyState", "phyZip",
                   "phone", "fax", "cellPhone",
                   "companyOfficer1", "companyOfficer2",
                   "statusCode", "priorRevokeFlag", "priorRevokeDot",
                   "addDate", "powerUnits", "totalDrivers"
            FROM "FmcsaCarrier"
        """)
        for row in cur.fetchall():
            dot = row[0]
            carriers[dot] = {
                "dot": dot,
                "legal_name": row[1],
                "dba_name": row[2],
                "phy_street": row[3],
                "phy_city": row[4],
                "phy_state": row[5],
                "phy_zip": row[6],
                "phone": row[7],
                "fax": row[8],
                "cell_phone": row[9],
                "officer1": row[10],
                "officer2": row[11],
                "status_code": row[12],
                "prior_revoke_flag": row[13],
                "prior_revoke_dot": row[14],
                "add_date": row[15],
                "power_units": row[16],
                "total_drivers": row[17],
                "vins": set(),
                "crash_count": 0,
                "fatalities": 0,
            }

    # Load VINs from inspections
    with conn.cursor() as cur:
        cur.execute("""
            SELECT "dotNumber", "vin"
            FROM "FmcsaInspection"
            WHERE "vin" IS NOT NULL AND "vin" != ''
        """)
        for dot, vin in cur.fetchall():
            if dot in carriers:
                carriers[dot]["vins"].add(vin.strip().upper())

    # Load crash counts
    with conn.cursor() as cur:
        cur.execute("""
            SELECT "dotNumber", COUNT(*), SUM("fatalities")
            FROM "FmcsaCrash"
            GROUP BY "dotNumber"
        """)
        for dot, count, fatalities in cur.fetchall():
            if dot in carriers:
                carriers[dot]["crash_count"] = count
                carriers[dot]["fatalities"] = fatalities or 0

    log(f"Loaded {len(carriers)} carriers from DB")
    return carriers


# ── Inverted index & scoring ────────────────────────────────────

def build_inverted_index(carriers: Dict[int, Dict[str, Any]]) -> Dict[str, Dict[str, Set[int]]]:
    """Map each feature value to set of DOT numbers."""
    index: Dict[str, Dict[str, Set[int]]] = defaultdict(lambda: defaultdict(set))

    for dot, c in carriers.items():
        # Phone
        phone = normalize_phone(c["phone"] or "")
        if phone:
            index["phone"][phone].add(dot)

        # Fax
        fax = normalize_phone(c["fax"] or "")
        if fax:
            index["fax"][fax].add(dot)

        # Cell phone
        cell = normalize_phone(c["cell_phone"] or "")
        if cell:
            index["cell_phone"][cell].add(dot)

        # Address
        addr = normalize_address(c["phy_street"] or "", c["phy_city"] or "", c["phy_state"] or "")
        if addr:
            index["address"][addr].add(dot)

        # Officers
        off1 = normalize_officer(c["officer1"] or "")
        if off1:
            index["officer"][off1].add(dot)
        off2 = normalize_officer(c["officer2"] or "")
        if off2:
            index["officer"][off2].add(dot)

        # VINs
        for vin in c["vins"]:
            if len(vin) >= 5:
                index["vin"][vin].add(dot)

        # Prior revoke direct links
        if c["prior_revoke_flag"] == "Y" and c["prior_revoke_dot"]:
            target = c["prior_revoke_dot"]
            if target in carriers:
                key = f"{min(dot, target)}_{max(dot, target)}"
                index["prior_revoke"][key].add(dot)
                index["prior_revoke"][key].add(target)

    return index


def score_pairwise_links(
    index: Dict[str, Dict[str, Set[int]]],
    carriers: Dict[int, Dict[str, Any]],
) -> Tuple[Dict[Tuple[int, int], float], Dict[Tuple[int, int], List[Dict]]]:
    """Score all pairwise carrier links from inverted index."""
    pair_scores: Dict[Tuple[int, int], float] = defaultdict(float)
    pair_reasons: Dict[Tuple[int, int], List[Dict]] = defaultdict(list)

    for feature in FEATURE_ORDER:
        if feature in ("address_new_dot", "fleet_anomaly"):
            continue  # handled separately
        weight = FEATURE_WEIGHTS[feature]
        feat_index = index.get(feature, {})

        for value, members in feat_index.items():
            if len(members) < 2:
                continue
            rw = rarity_weight(len(members))
            contribution = weight * rw
            if contribution <= 0:
                continue

            member_list = sorted(members)
            for a, b in combinations(member_list, 2):
                pair = (a, b) if a < b else (b, a)
                pair_scores[pair] += contribution
                pair_reasons[pair].append({
                    "feature": feature,
                    "value": value[:100],
                    "frequency": len(members),
                    "contribution": round(contribution, 4),
                })

    return pair_scores, pair_reasons


def detect_temporal_signals(
    carriers: Dict[int, Dict[str, Any]],
    pair_scores: Dict[Tuple[int, int], float],
    pair_reasons: Dict[Tuple[int, int], List[Dict]],
) -> None:
    """Add bonus scores for temporal patterns (mutates pair_scores/pair_reasons)."""
    # Build address-to-carriers mapping with dates
    addr_carriers: Dict[str, List[Tuple[int, Any, str]]] = defaultdict(list)
    for dot, c in carriers.items():
        addr = normalize_address(c["phy_street"] or "", c["phy_city"] or "", c["phy_state"] or "")
        if addr:
            addr_carriers[addr].append((dot, c.get("add_date"), c.get("status_code") or ""))

    # address_new_dot: new DOT at same address within 180 days of another going inactive
    for addr, members in addr_carriers.items():
        if len(members) < 2:
            continue
        for i, (dot_a, date_a, status_a) in enumerate(members):
            for dot_b, date_b, status_b in members[i + 1:]:
                if dot_a == dot_b:
                    continue
                # Check if one is inactive and other is newer
                inactive_statuses = {"NOT AUTHORIZED", "OUT OF SERVICE", "REVOKED"}
                a_inactive = status_a.upper() in inactive_statuses if status_a else False
                b_inactive = status_b.upper() in inactive_statuses if status_b else False

                if not (a_inactive or b_inactive):
                    continue
                if not (date_a and date_b):
                    continue

                try:
                    da = date_a if isinstance(date_a, datetime) else datetime.fromisoformat(str(date_a))
                    db = date_b if isinstance(date_b, datetime) else datetime.fromisoformat(str(date_b))
                    diff_days = abs((da - db).days)
                except (ValueError, TypeError):
                    continue

                if diff_days <= 180:
                    pair = (min(dot_a, dot_b), max(dot_a, dot_b))
                    contribution = FEATURE_WEIGHTS["address_new_dot"]
                    pair_scores[pair] += contribution
                    pair_reasons[pair].append({
                        "feature": "address_new_dot",
                        "value": f"Same address, {diff_days}d apart, one inactive",
                        "frequency": 2,
                        "contribution": round(contribution, 4),
                    })


def compute_clusters(
    pair_scores: Dict[Tuple[int, int], float],
    all_dots: Set[int],
    threshold: float = 30.0,
) -> List[Dict[str, Any]]:
    """Union-find clustering of carriers above score threshold."""
    parent: Dict[int, int] = {}
    rank: Dict[int, int] = {}

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: int, b: int) -> None:
        ra, rb = find(a), find(b)
        if ra == rb:
            return
        if rank[ra] < rank[rb]:
            parent[ra] = rb
        elif rank[ra] > rank[rb]:
            parent[rb] = ra
        else:
            parent[rb] = ra
            rank[ra] += 1

    for dot in all_dots:
        parent[dot] = dot
        rank[dot] = 0

    qualifying = {pair: score for pair, score in pair_scores.items() if score >= threshold}
    for (a, b) in qualifying:
        union(a, b)

    members_by_root: Dict[int, List[int]] = defaultdict(list)
    for dot in all_dots:
        members_by_root[find(dot)].append(dot)

    clusters: List[Dict[str, Any]] = []
    for root, members in sorted(members_by_root.items(), key=lambda x: (-len(x[1]), x[0])):
        members = sorted(members)
        scores = []
        edge_count = 0
        for a, b in combinations(members, 2):
            pair = (a, b) if a < b else (b, a)
            if pair in qualifying:
                edge_count += 1
                scores.append(qualifying[pair])

        avg_score = round(sum(scores) / len(scores), 4) if scores else 0.0
        max_score = round(max(scores), 4) if scores else 0.0

        clusters.append({
            "cluster_id": "",  # assigned below
            "size": len(members),
            "members": members,
            "edge_count": edge_count,
            "avg_link_score": avg_score,
            "max_link_score": max_score,
        })

    # Sort: multi-member clusters first, then by size desc
    clusters.sort(key=lambda c: (-c["size"], -c["max_link_score"]))
    for idx, cluster in enumerate(clusters, start=1):
        cluster["cluster_id"] = f"C{idx:04d}"

    return clusters


def compute_risk_scores(
    carriers: Dict[int, Dict[str, Any]],
    clusters: List[Dict[str, Any]],
    pair_scores: Dict[Tuple[int, int], float],
    pair_reasons: Dict[Tuple[int, int], List[Dict]],
) -> Dict[int, Dict[str, Any]]:
    """Compute composite risk score 0-100 for each carrier."""
    # Build cluster membership lookup
    dot_to_cluster: Dict[int, Dict] = {}
    for cluster in clusters:
        for dot in cluster["members"]:
            dot_to_cluster[dot] = cluster

    # Build per-carrier max link score and shared VIN count
    dot_max_link: Dict[int, float] = defaultdict(float)
    dot_shared_vins: Dict[int, int] = defaultdict(int)
    for (a, b), reasons in pair_reasons.items():
        for r in reasons:
            if r["feature"] == "vin":
                dot_shared_vins[a] += 1
                dot_shared_vins[b] += 1
        score = pair_scores.get((a, b), 0)
        dot_max_link[a] = max(dot_max_link[a], score)
        dot_max_link[b] = max(dot_max_link[b], score)

    risk_scores: Dict[int, Dict[str, Any]] = {}

    for dot, c in carriers.items():
        signals: List[str] = []
        chameleon = 0.0
        safety = 0.0

        # Chameleon score components
        if c.get("prior_revoke_flag") == "Y":
            chameleon += 40
            signals.append("prior_revoke_flag")

        cluster = dot_to_cluster.get(dot)
        cluster_size = cluster["size"] if cluster else 1
        if cluster_size >= 3:
            chameleon += 20
            signals.append(f"cluster_size_{cluster_size}")

        if dot_max_link[dot] > 50:
            chameleon += 10
            signals.append(f"max_link_{dot_max_link[dot]:.0f}")

        vin_bonus = min(dot_shared_vins[dot] * 10, 30)
        if vin_bonus > 0:
            chameleon += vin_bonus
            signals.append(f"shared_vins_{dot_shared_vins[dot]}")

        chameleon = min(chameleon, 100)

        # Safety score components
        crash_count = c.get("crash_count", 0)
        if crash_count > 0:
            safety += min(20 + 5 * crash_count, 50)
            signals.append(f"crashes_{crash_count}")

        fatalities = c.get("fatalities", 0)
        if fatalities > 0:
            safety += 30
            signals.append(f"fatalities_{fatalities}")

        power_units = c.get("power_units") or 0
        if power_units > 0 and crash_count > 0:
            ratio = crash_count / power_units
            if ratio > 0.5:
                safety += 20
                signals.append("high_crash_ratio")

        safety = min(safety, 100)

        composite = round(0.7 * chameleon + 0.3 * safety, 2)

        risk_scores[dot] = {
            "dot": dot,
            "chameleon_score": round(chameleon, 2),
            "safety_score": round(safety, 2),
            "composite_score": composite,
            "signals": signals,
            "cluster_size": cluster_size,
        }

    return risk_scores


# ── DB write-back ───────────────────────────────────────────────

def write_links_to_db(
    conn,
    pair_scores: Dict[Tuple[int, int], float],
    pair_reasons: Dict[Tuple[int, int], List[Dict]],
    run_id: str,
) -> int:
    """Write CarrierLink records to DB."""
    if not pair_scores:
        return 0

    # Clear previous run's links
    with conn.cursor() as cur:
        cur.execute('DELETE FROM "CarrierLink" WHERE "runId" = %s', (run_id,))

    values = []
    for (a, b), score in pair_scores.items():
        reasons = pair_reasons.get((a, b), [])
        values.append((a, b, round(score, 4), json.dumps(reasons), run_id))

    sql = """
        INSERT INTO "CarrierLink" ("id", "dotNumberA", "dotNumberB", "score", "reasonsJson", "runId")
        VALUES %s
        ON CONFLICT ("dotNumberA", "dotNumberB", "runId") DO UPDATE SET
            "score" = EXCLUDED."score",
            "reasonsJson" = EXCLUDED."reasonsJson"
    """
    template = "(gen_random_uuid()::text, %s, %s, %s, %s, %s)"

    with conn.cursor() as cur:
        psycopg2.extras.execute_values(cur, sql, values, template=template, page_size=500)
    conn.commit()
    log(f"  Wrote {len(values)} carrier links")
    return len(values)


def write_clusters_to_db(conn, clusters: List[Dict[str, Any]], run_id: str) -> int:
    """Write CarrierCluster and ClusterMember records to DB."""
    # Clear previous run
    with conn.cursor() as cur:
        cur.execute("""
            DELETE FROM "ClusterMember" WHERE "clusterId" IN (
                SELECT "id" FROM "CarrierCluster" WHERE "runId" = %s
            )
        """, (run_id,))
        cur.execute('DELETE FROM "CarrierCluster" WHERE "runId" = %s', (run_id,))
    conn.commit()

    multi_member_clusters = [c for c in clusters if c["size"] > 1]
    if not multi_member_clusters:
        return 0

    for cluster in multi_member_clusters:
        cluster_db_id = None
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO "CarrierCluster" ("id", "clusterId", "size", "edgeCount",
                   "avgLinkScore", "maxLinkScore", "runId")
                   VALUES (gen_random_uuid()::text, %s, %s, %s, %s, %s, %s)
                   RETURNING "id" """,
                (cluster["cluster_id"], cluster["size"], cluster["edge_count"],
                 cluster["avg_link_score"], cluster["max_link_score"], run_id),
            )
            cluster_db_id = cur.fetchone()[0]

        member_values = [(cluster_db_id, dot) for dot in cluster["members"]]
        sql = """
            INSERT INTO "ClusterMember" ("id", "clusterId", "dotNumber")
            VALUES %s
            ON CONFLICT ("clusterId", "dotNumber") DO NOTHING
        """
        template = "(gen_random_uuid()::text, %s, %s)"
        with conn.cursor() as cur:
            psycopg2.extras.execute_values(cur, sql, member_values, template=template, page_size=500)

    conn.commit()
    log(f"  Wrote {len(multi_member_clusters)} clusters")
    return len(multi_member_clusters)


def write_risk_scores_to_db(conn, risk_scores: Dict[int, Dict[str, Any]]) -> int:
    """Write CarrierRiskScore records to DB."""
    if not risk_scores:
        return 0

    # Truncate and re-insert
    with conn.cursor() as cur:
        cur.execute('DELETE FROM "CarrierRiskScore"')

    values = []
    for dot, rs in risk_scores.items():
        values.append((
            dot,
            rs["chameleon_score"],
            rs["safety_score"],
            rs["composite_score"],
            json.dumps(rs["signals"]),
            rs["cluster_size"],
        ))

    now = datetime.now(timezone.utc).isoformat()
    sql = """
        INSERT INTO "CarrierRiskScore" ("id", "dotNumber", "chameleonScore", "safetyScore",
            "compositeScore", "signalsJson", "clusterSize", "updatedAt")
        VALUES %s
        ON CONFLICT ("dotNumber") DO UPDATE SET
            "chameleonScore" = EXCLUDED."chameleonScore",
            "safetyScore" = EXCLUDED."safetyScore",
            "compositeScore" = EXCLUDED."compositeScore",
            "signalsJson" = EXCLUDED."signalsJson",
            "clusterSize" = EXCLUDED."clusterSize",
            "updatedAt" = NOW()
    """
    template = f"(gen_random_uuid()::text, %s, %s, %s, %s, %s, %s, '{now}'::timestamp)"

    with conn.cursor() as cur:
        psycopg2.extras.execute_values(cur, sql, values, template=template, page_size=500)
    conn.commit()
    log(f"  Wrote {len(values)} risk scores")
    return len(values)


# ── Main ────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(description="Chameleon carrier detection engine")
    parser.add_argument("--threshold", type=float, default=30.0, help="Link score threshold for clustering")
    parser.add_argument("--run-id", type=str, default="", help="Run ID (auto-generated if empty)")
    args = parser.parse_args()

    run_id = args.run_id or datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    log(f"Starting detection run {run_id}")

    db_url = get_database_url()
    conn = psycopg2.connect(db_url)

    try:
        # Load data
        carriers = load_carriers_from_db(conn)
        if not carriers:
            log("No carriers found in DB. Run ingest.py first.")
            return 1

        # Build index and score
        log("Building inverted index...")
        index = build_inverted_index(carriers)
        for feat, vals in index.items():
            log(f"  {feat}: {len(vals)} unique values")

        log("Scoring pairwise links...")
        pair_scores, pair_reasons = score_pairwise_links(index, carriers)
        log(f"  Found {len(pair_scores)} raw pairs")

        log("Detecting temporal signals...")
        detect_temporal_signals(carriers, pair_scores, pair_reasons)

        # Filter to meaningful links
        meaningful = {p: s for p, s in pair_scores.items() if s >= 5.0}
        log(f"  {len(meaningful)} pairs above 5.0 score")

        log("Computing clusters...")
        clusters = compute_clusters(pair_scores, set(carriers.keys()), threshold=args.threshold)
        multi = [c for c in clusters if c["size"] > 1]
        log(f"  {len(multi)} multi-member clusters")

        log("Computing risk scores...")
        risk_scores = compute_risk_scores(carriers, clusters, pair_scores, pair_reasons)
        high_risk = sum(1 for rs in risk_scores.values() if rs["composite_score"] >= 70)
        log(f"  {high_risk} high-risk carriers (composite >= 70)")

        # Write results
        log("Writing results to DB...")
        write_links_to_db(conn, meaningful, pair_reasons, run_id)
        write_clusters_to_db(conn, clusters, run_id)
        write_risk_scores_to_db(conn, risk_scores)

        # Top 10 summary
        top = sorted(risk_scores.values(), key=lambda x: -x["composite_score"])[:10]
        log("Top 10 risk scores:")
        for rs in top:
            log(f"  DOT {rs['dot']}: composite={rs['composite_score']}, "
                f"chameleon={rs['chameleon_score']}, safety={rs['safety_score']}, "
                f"cluster_size={rs['cluster_size']}")

        log("Detection complete!")
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
