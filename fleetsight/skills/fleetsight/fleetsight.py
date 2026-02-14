#!/usr/bin/env python3
"""FleetSight OpenClaw skill entrypoint.

Commands:
  analyze <path_to_csv> [--top N] [--threshold SCORE]
  sample-data
  explain
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import os
import re
import string
import sys
from collections import defaultdict
from dataclasses import dataclass
from itertools import combinations
from pathlib import Path
from typing import Dict, Iterable, List, Set, Tuple


REQUIRED_COLUMNS = [
    "carrier_id",
    "legal_name",
    "dot",
    "mc",
    "phone",
    "email",
    "address",
    "ip",
    "timestamp",
]

FEATURE_WEIGHTS = {
    "phone": 40.0,
    "email": 35.0,
    "email_domain": 15.0,
    "address": 25.0,
    "ip": 20.0,
}

FEATURE_ORDER = ["phone", "email", "email_domain", "address", "ip"]


@dataclass(frozen=True)
class CarrierRecord:
    carrier_id: str
    legal_name: str
    dot: str
    mc: str
    phone: str
    email: str
    address: str
    ip: str
    timestamp: str


def get_workspace_path() -> Path:
    value = Path.home() / ".openclaw" / "workspace"
    env = _safe_env("OPENCLAW_WORKSPACE")
    if env:
        value = Path(env).expanduser()
    return value.resolve()


def _safe_env(name: str) -> str:
    return os.environ.get(name, "").strip()


def is_allow_outside_workspace() -> bool:
    return _safe_env("FLEETSIGHT_ALLOW_OUTSIDE_WORKSPACE") == "1"


def get_allowed_input_dirs(workspace: Path) -> List[Path]:
    dirs: List[Path] = [workspace.resolve()]
    raw = _safe_env("FLEETSIGHT_ALLOWED_INPUT_DIRS")
    if not raw:
        return dirs
    for chunk in raw.split(os.pathsep):
        value = chunk.strip()
        if not value:
            continue
        dirs.append(Path(value).expanduser().resolve())
    unique_dirs: List[Path] = []
    seen: Set[Path] = set()
    for d in dirs:
        if d in seen:
            continue
        seen.add(d)
        unique_dirs.append(d)
    return unique_dirs


def _is_in_dir(target: Path, base: Path) -> bool:
    target_resolved = target.resolve()
    base_resolved = base.resolve()
    return target_resolved == base_resolved or base_resolved in target_resolved.parents


def ensure_input_allowed(target: Path, workspace: Path) -> None:
    if is_allow_outside_workspace():
        return
    target_resolved = target.resolve()
    allowed_dirs = get_allowed_input_dirs(workspace)
    for allowed in allowed_dirs:
        if _is_in_dir(target_resolved, allowed):
            return
    joined = ", ".join(str(p) for p in allowed_dirs)
    raise ValueError(
        f"Refusing to read outside allowed input directories: {target_resolved}. "
        f"Allowed directories: {joined}. "
        "Set FLEETSIGHT_ALLOWED_INPUT_DIRS for specific extra roots "
        "or FLEETSIGHT_ALLOW_OUTSIDE_WORKSPACE=1 to override."
    )


def normalize_phone(value: str) -> str:
    digits = re.sub(r"\D+", "", value or "")
    if not digits:
        return ""
    return digits[-10:]


def normalize_email(value: str) -> str:
    email = (value or "").strip().lower()
    if "@" not in email:
        return ""
    left, right = email.rsplit("@", 1)
    if not left or not right:
        return ""
    return f"{left}@{right}"


def email_domain(email: str) -> str:
    if "@" not in email:
        return ""
    return email.rsplit("@", 1)[1]


ADDRESS_SUFFIX_MAP = {
    "street": "st",
    "st.": "st",
    "avenue": "ave",
    "ave.": "ave",
    "road": "rd",
    "rd.": "rd",
}


def normalize_address(value: str) -> str:
    text = (value or "").strip().lower()
    if not text:
        return ""
    text = re.sub(rf"[{re.escape(string.punctuation)}]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return ""
    tokens = [ADDRESS_SUFFIX_MAP.get(tok, tok) for tok in text.split(" ")]
    return " ".join(tokens)


def normalize_ip(value: str) -> str:
    return (value or "").strip()


def rarity_weight(freq: int) -> float:
    if freq <= 1:
        return 0.0
    return 2.0 / float(freq)


def load_carriers(csv_path: Path) -> List[CarrierRecord]:
    rows: List[CarrierRecord] = []
    with csv_path.open("r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise ValueError("CSV appears to be missing a header row.")
        missing = [c for c in REQUIRED_COLUMNS if c not in reader.fieldnames]
        if missing:
            raise ValueError(f"CSV missing required columns: {', '.join(missing)}")
        for raw in reader:
            carrier_id = (raw.get("carrier_id") or "").strip()
            if not carrier_id:
                continue
            rows.append(
                CarrierRecord(
                    carrier_id=carrier_id,
                    legal_name=(raw.get("legal_name") or "").strip(),
                    dot=(raw.get("dot") or "").strip(),
                    mc=(raw.get("mc") or "").strip(),
                    phone=(raw.get("phone") or "").strip(),
                    email=(raw.get("email") or "").strip(),
                    address=(raw.get("address") or "").strip(),
                    ip=(raw.get("ip") or "").strip(),
                    timestamp=(raw.get("timestamp") or "").strip(),
                )
            )
    rows.sort(key=lambda r: r.carrier_id)
    return rows


def build_identifier_values(record: CarrierRecord) -> Dict[str, Set[str]]:
    out: Dict[str, Set[str]] = {k: set() for k in FEATURE_ORDER}

    phone = normalize_phone(record.phone)
    if phone:
        out["phone"].add(phone)

    email = normalize_email(record.email)
    if email:
        out["email"].add(email)
        domain = email_domain(email)
        if domain:
            out["email_domain"].add(domain)

    address = normalize_address(record.address)
    if address:
        out["address"].add(address)

    ip = normalize_ip(record.ip)
    if ip:
        out["ip"].add(ip)

    return out


def build_inverted_indices(
    carrier_values: Dict[str, Dict[str, Set[str]]]
) -> Dict[str, Dict[str, List[str]]]:
    indices: Dict[str, Dict[str, List[str]]] = {
        feat: defaultdict(list) for feat in FEATURE_ORDER
    }
    for carrier_id, feat_map in carrier_values.items():
        for feat in FEATURE_ORDER:
            for value in sorted(feat_map.get(feat, set())):
                indices[feat][value].append(carrier_id)
    for feat in FEATURE_ORDER:
        for value, members in indices[feat].items():
            members.sort()
    return indices


def analyze_links(
    carriers: List[CarrierRecord],
) -> Tuple[List[dict], Dict[str, str]]:
    id_to_name = {c.carrier_id: c.legal_name for c in carriers}
    carrier_values = {c.carrier_id: build_identifier_values(c) for c in carriers}
    indices = build_inverted_indices(carrier_values)

    pair_scores: Dict[Tuple[str, str], float] = defaultdict(float)
    pair_reasons: Dict[Tuple[str, str], List[dict]] = defaultdict(list)

    for feature in FEATURE_ORDER:
        for value, members in indices[feature].items():
            if len(members) < 2:
                continue
            weight = FEATURE_WEIGHTS[feature] * rarity_weight(len(members))
            if weight <= 0:
                continue
            for a, b in combinations(members, 2):
                pair = (a, b) if a <= b else (b, a)
                pair_scores[pair] += weight
                pair_reasons[pair].append(
                    {
                        "feature": feature,
                        "value": value,
                        "frequency": len(members),
                        "contribution": round(weight, 4),
                    }
                )

    links: List[dict] = []
    for pair, score in pair_scores.items():
        reasons = sorted(
            pair_reasons[pair],
            key=lambda x: (
                -x["contribution"],
                FEATURE_ORDER.index(x["feature"]),
                x["value"],
            ),
        )
        links.append(
            {
                "carrier_a": pair[0],
                "carrier_b": pair[1],
                "carrier_a_name": id_to_name.get(pair[0], ""),
                "carrier_b_name": id_to_name.get(pair[1], ""),
                "score": round(score, 4),
                "reasons": reasons,
            }
        )

    links.sort(key=lambda x: (-x["score"], x["carrier_a"], x["carrier_b"]))
    return links, id_to_name


def compute_clusters(
    links: List[dict], all_carrier_ids: Iterable[str], threshold: float
) -> List[dict]:
    parent: Dict[str, str] = {}
    rank: Dict[str, int] = {}
    all_ids = sorted(set(all_carrier_ids))

    def find(x: str) -> str:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: str, b: str) -> None:
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

    for cid in all_ids:
        parent[cid] = cid
        rank[cid] = 0

    qualifying = [l for l in links if l["score"] >= threshold]
    for link in qualifying:
        union(link["carrier_a"], link["carrier_b"])

    members_by_root: Dict[str, List[str]] = defaultdict(list)
    for cid in all_ids:
        members_by_root[find(cid)].append(cid)

    edge_map: Dict[Tuple[str, str], float] = {}
    for link in qualifying:
        key = (
            link["carrier_a"]
            if link["carrier_a"] <= link["carrier_b"]
            else link["carrier_b"],
            link["carrier_b"]
            if link["carrier_a"] <= link["carrier_b"]
            else link["carrier_a"],
        )
        edge_map[key] = link["score"]

    clusters: List[dict] = []
    for _, members in sorted(
        members_by_root.items(), key=lambda x: (-len(x[1]), x[0], tuple(x[1]))
    ):
        members = sorted(members)
        scores = []
        edge_count = 0
        for a, b in combinations(members, 2):
            key = (a, b) if a <= b else (b, a)
            if key in edge_map:
                edge_count += 1
                scores.append(edge_map[key])
        avg_score = round(sum(scores) / len(scores), 4) if scores else 0.0
        max_score = round(max(scores), 4) if scores else 0.0
        clusters.append(
            {
                "size": len(members),
                "members": members,
                "edge_count": edge_count,
                "avg_link_score": avg_score,
                "max_link_score": max_score,
            }
        )

    clusters.sort(
        key=lambda c: (-c["size"], -c["max_link_score"], tuple(c["members"]))
    )
    for idx, cluster in enumerate(clusters, start=1):
        cluster["cluster_id"] = f"C{idx:03d}"
    return clusters


def write_links_reports(links: List[dict], outdir: Path) -> Tuple[Path, Path]:
    links_json = outdir / "links.json"
    links_csv = outdir / "links.csv"

    with links_json.open("w", encoding="utf-8") as f:
        json.dump(links, f, indent=2, ensure_ascii=True)

    with links_csv.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "carrier_a",
                "carrier_b",
                "carrier_a_name",
                "carrier_b_name",
                "score",
                "reason_count",
                "reasons",
            ],
        )
        writer.writeheader()
        for link in links:
            summary = "; ".join(
                f"{r['feature']}={r['value']} ({r['contribution']:.2f}, freq={r['frequency']})"
                for r in link["reasons"]
            )
            writer.writerow(
                {
                    "carrier_a": link["carrier_a"],
                    "carrier_b": link["carrier_b"],
                    "carrier_a_name": link["carrier_a_name"],
                    "carrier_b_name": link["carrier_b_name"],
                    "score": f"{link['score']:.4f}",
                    "reason_count": len(link["reasons"]),
                    "reasons": summary,
                }
            )
    return links_json, links_csv


def write_clusters_reports(clusters: List[dict], outdir: Path) -> Tuple[Path, Path]:
    clusters_json = outdir / "clusters.json"
    clusters_csv = outdir / "clusters.csv"

    with clusters_json.open("w", encoding="utf-8") as f:
        json.dump(clusters, f, indent=2, ensure_ascii=True)

    with clusters_csv.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "cluster_id",
                "size",
                "edge_count",
                "avg_link_score",
                "max_link_score",
                "members",
            ],
        )
        writer.writeheader()
        for c in clusters:
            writer.writerow(
                {
                    "cluster_id": c["cluster_id"],
                    "size": c["size"],
                    "edge_count": c["edge_count"],
                    "avg_link_score": f"{c['avg_link_score']:.4f}",
                    "max_link_score": f"{c['max_link_score']:.4f}",
                    "members": "|".join(c["members"]),
                }
            )
    return clusters_json, clusters_csv


def summarize_markdown(
    links: List[dict],
    clusters: List[dict],
    out_paths: Dict[str, Path],
    top: int,
) -> str:
    lines: List[str] = []
    lines.append("# FleetSight Analysis")
    lines.append("")
    lines.append("## Top Links")
    lines.append("")
    top_links = links[: min(top, 10)]
    if not top_links:
        lines.append("- No links found.")
    else:
        for idx, link in enumerate(top_links, start=1):
            reason_bits = [
                f"{r['feature']} ({r['contribution']:.1f})" for r in link["reasons"][:3]
            ]
            lines.append(
                f"{idx}. `{link['carrier_a']}` <-> `{link['carrier_b']}` "
                f"score={link['score']:.2f} | reasons: {', '.join(reason_bits)}"
            )

    lines.append("")
    lines.append("## Top Clusters")
    lines.append("")
    dense_clusters = [c for c in clusters if c["size"] > 1][:3]
    if not dense_clusters:
        lines.append("- No clusters above threshold.")
    else:
        for idx, cluster in enumerate(dense_clusters, start=1):
            preview = ", ".join(cluster["members"][:6])
            if cluster["size"] > 6:
                preview += ", ..."
            lines.append(
                f"{idx}. `{cluster['cluster_id']}` size={cluster['size']} "
                f"max_link={cluster['max_link_score']:.2f} members: {preview}"
            )

    lines.append("")
    lines.append("## Reports")
    lines.append("")
    lines.append(f"- Links JSON: `{out_paths['links_json']}`")
    lines.append(f"- Links CSV: `{out_paths['links_csv']}`")
    lines.append(f"- Clusters JSON: `{out_paths['clusters_json']}`")
    lines.append(f"- Clusters CSV: `{out_paths['clusters_csv']}`")
    lines.append(f"- Summary MD: `{out_paths['summary_md']}`")
    return "\n".join(lines)


def run_analyze(csv_arg: str, top: int, threshold: float) -> int:
    workspace = get_workspace_path()
    csv_path = Path(csv_arg).expanduser()
    if not csv_path.is_absolute():
        csv_path = (Path.cwd() / csv_path).resolve()
    else:
        csv_path = csv_path.resolve()

    if not csv_path.exists() or not csv_path.is_file():
        print(f"Input CSV not found: {csv_path}", file=sys.stderr)
        return 2

    try:
        ensure_input_allowed(csv_path, workspace)
    except ValueError as e:
        print(str(e), file=sys.stderr)
        return 2

    try:
        carriers = load_carriers(csv_path)
    except ValueError as e:
        print(f"Invalid CSV: {e}", file=sys.stderr)
        return 2

    links, _ = analyze_links(carriers)
    clusters = compute_clusters(links, [c.carrier_id for c in carriers], threshold)

    run_id = dt.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    outdir = workspace / "fleetsight_reports" / run_id
    outdir.mkdir(parents=True, exist_ok=True)

    links_json, links_csv = write_links_reports(links, outdir)
    clusters_json, clusters_csv = write_clusters_reports(clusters, outdir)

    summary_paths = {
        "links_json": links_json,
        "links_csv": links_csv,
        "clusters_json": clusters_json,
        "clusters_csv": clusters_csv,
        "summary_md": outdir / "summary.md",
    }

    summary = summarize_markdown(links, clusters, summary_paths, top=top)
    summary_paths["summary_md"].write_text(summary + "\n", encoding="utf-8")
    print(summary)
    return 0


def generate_sample_rows() -> List[dict]:
    rows = [
        {
            "carrier_id": "C001",
            "legal_name": "North Route Logistics LLC",
            "dot": "100001",
            "mc": "200001",
            "phone": "(555) 100-0001",
            "email": "ops@northroute.com",
            "address": "100 Main Street, Dallas, TX",
            "ip": "10.0.1.1",
            "timestamp": "2026-01-01T10:00:00Z",
        },
        {
            "carrier_id": "C002",
            "legal_name": "NR Transport Services",
            "dot": "100002",
            "mc": "200002",
            "phone": "5551000001",
            "email": "dispatch@northroute.com",
            "address": "100 Main St Dallas TX",
            "ip": "10.0.1.2",
            "timestamp": "2026-01-02T10:00:00Z",
        },
        {
            "carrier_id": "C003",
            "legal_name": "Blue Freight Holdings",
            "dot": "100003",
            "mc": "200003",
            "phone": "555-100-3333",
            "email": "ops@bluefreight.net",
            "address": "44 Harbor Road, Houston, TX",
            "ip": "10.0.1.1",
            "timestamp": "2026-01-03T10:00:00Z",
        },
        {
            "carrier_id": "C004",
            "legal_name": "Blue Freight TX LLC",
            "dot": "100004",
            "mc": "200004",
            "phone": "555-100-4444",
            "email": "billing@bluefreight.net",
            "address": "44 Harbor Rd Houston TX",
            "ip": "10.0.3.4",
            "timestamp": "2026-01-04T10:00:00Z",
        },
        {
            "carrier_id": "C005",
            "legal_name": "Harborline Carriers",
            "dot": "100005",
            "mc": "200005",
            "phone": "555-800-0005",
            "email": "team@harborline.com",
            "address": "900 Market Avenue, Phoenix, AZ",
            "ip": "172.20.10.5",
            "timestamp": "2026-01-05T10:00:00Z",
        },
        {
            "carrier_id": "C006",
            "legal_name": "Harborline West",
            "dot": "100006",
            "mc": "200006",
            "phone": "555-800-0006",
            "email": "team@harborline.com",
            "address": "900 Market Ave Phoenix AZ",
            "ip": "172.20.10.6",
            "timestamp": "2026-01-06T10:00:00Z",
        },
        {
            "carrier_id": "C007",
            "legal_name": "Summit Bulk Transit",
            "dot": "100007",
            "mc": "200007",
            "phone": "555-777-7700",
            "email": "contact@summitbulk.io",
            "address": "11 Ridge Road, Reno, NV",
            "ip": "192.168.33.7",
            "timestamp": "2026-01-07T10:00:00Z",
        },
        {
            "carrier_id": "C008",
            "legal_name": "Summit Bulk Nevada",
            "dot": "100008",
            "mc": "200008",
            "phone": "5557777700",
            "email": "contact@summitbulk.io",
            "address": "11 Ridge Rd Reno NV",
            "ip": "192.168.33.8",
            "timestamp": "2026-01-08T10:00:00Z",
        },
        {
            "carrier_id": "C009",
            "legal_name": "Lone Pine Freight",
            "dot": "100009",
            "mc": "200009",
            "phone": "555-000-9000",
            "email": "hello@lonepine.org",
            "address": "500 Cedar Street, Boise, ID",
            "ip": "203.0.113.9",
            "timestamp": "2026-01-09T10:00:00Z",
        },
        {
            "carrier_id": "C010",
            "legal_name": "Oakfield Cartage",
            "dot": "100010",
            "mc": "200010",
            "phone": "",
            "email": "",
            "address": "",
            "ip": "",
            "timestamp": "2026-01-10T10:00:00Z",
        },
    ]
    rows.sort(key=lambda r: r["carrier_id"])
    return rows


def run_sample_data() -> int:
    workspace = get_workspace_path()
    outdir = workspace / "fleetsight_samples"
    outdir.mkdir(parents=True, exist_ok=True)
    outpath = outdir / "carriers_sample.csv"

    rows = generate_sample_rows()
    with outpath.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=REQUIRED_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Sample dataset written: {outpath}")
    return 0


def run_explain() -> int:
    lines = [
        "# FleetSight Scoring",
        "",
        "Feature weights:",
        "- phone: 40",
        "- email: 35",
        "- email_domain: 15",
        "- address: 25",
        "- ip: 20",
        "",
        "Normalization:",
        "- phone: digits only, keep last 10",
        "- email: lowercase, parse domain",
        "- address: lowercase, remove punctuation, collapse spaces, street->st, avenue->ave, road->rd",
        "- ip: exact string match",
        "",
        "Rarity down-weighting:",
        "- rarity_weight(freq) = 2 / freq for freq >= 2",
        "- contribution = feature_weight * rarity_weight(freq)",
        "- freq=2 keeps full feature weight; higher freq reduces contribution",
        "",
        "Input path safety:",
        "- default allowed input root: OPENCLAW_WORKSPACE (or ~/.openclaw/workspace)",
        "- additional allowed roots: FLEETSIGHT_ALLOWED_INPUT_DIRS",
        "- emergency override: FLEETSIGHT_ALLOW_OUTSIDE_WORKSPACE=1",
    ]
    print("\n".join(lines))
    return 0


def verify_outputs_in_workspace(workspace: Path, run_id: str) -> bool:
    outdir = workspace / "fleetsight_reports" / run_id
    expected = [
        outdir / "links.json",
        outdir / "links.csv",
        outdir / "clusters.json",
        outdir / "clusters.csv",
        outdir / "summary.md",
    ]
    return all(p.exists() and p.is_file() for p in expected)


def run_verify() -> int:
    workspace = get_workspace_path()
    sample_dir = workspace / "fleetsight_samples"
    sample_dir.mkdir(parents=True, exist_ok=True)
    sample_csv = sample_dir / "carriers_sample.csv"

    rows = generate_sample_rows()
    with sample_csv.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=REQUIRED_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    links, _ = analyze_links(load_carriers(sample_csv))
    clusters = compute_clusters(links, [r["carrier_id"] for r in rows], threshold=30.0)

    run_id = "verify_run"
    outdir = workspace / "fleetsight_reports" / run_id
    outdir.mkdir(parents=True, exist_ok=True)
    write_links_reports(links, outdir)
    write_clusters_reports(clusters, outdir)
    summary_paths = {
        "links_json": outdir / "links.json",
        "links_csv": outdir / "links.csv",
        "clusters_json": outdir / "clusters.json",
        "clusters_csv": outdir / "clusters.csv",
        "summary_md": outdir / "summary.md",
    }
    summary = summarize_markdown(links, clusters, summary_paths, top=50)
    summary_paths["summary_md"].write_text(summary + "\n", encoding="utf-8")

    if not verify_outputs_in_workspace(workspace, run_id):
        print("verify: missing expected output files", file=sys.stderr)
        return 1

    print("verify: ok")
    print(f"sample_csv={sample_csv}")
    print(f"report_dir={outdir}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="fleetsight")
    sub = parser.add_subparsers(dest="command", required=True)

    analyze = sub.add_parser("analyze", help="Analyze carriers CSV")
    analyze.add_argument("csv_path", help="Path to carriers CSV")
    analyze.add_argument("--top", type=int, default=50, help="Top N links to return")
    analyze.add_argument(
        "--threshold",
        type=float,
        default=30.0,
        help="Score threshold for cluster edges",
    )

    sub.add_parser("sample-data", help="Generate deterministic sample data")
    sub.add_parser("explain", help="Explain scoring")
    sub.add_parser("verify", help="Run deterministic local verification")
    return parser


def main(argv: List[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "analyze":
        top = max(1, int(args.top))
        threshold = float(args.threshold)
        return run_analyze(args.csv_path, top=top, threshold=threshold)
    if args.command == "sample-data":
        return run_sample_data()
    if args.command == "explain":
        return run_explain()
    if args.command == "verify":
        return run_verify()
    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
