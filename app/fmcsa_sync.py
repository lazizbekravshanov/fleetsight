#!/usr/bin/env python3
"""Sync open FMCSA carrier-related data into lightweight local files.

This script intentionally stores:
1) A filtered metadata catalog of FMCSA carrier resources.
2) Paginated Socrata extracts for selected resource IDs as NDJSON.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Dict, Iterable, List


CATALOG_URL = "https://data.transportation.gov/data.json"
DEFAULT_RESOURCE_IDS = [
    # FMCSA carrier-oriented open datasets on data.transportation.gov (Socrata).
    "6qg9-x4f8",  # UCR Carrier Registration Data - Daily Difference
    "6eyk-hxee",  # UCR Carrier Registration Data - Full History
]
DEFAULT_DOMAIN = "data.transportation.gov"


def getenv(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


DATA_ROOT = Path(getenv("FLEETSIGHT_APP_DATA", "./app_data")).expanduser().resolve()


def fetch_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "FleetSight/0.2"})
    with urllib.request.urlopen(req, timeout=60) as resp:  # nosec B310
        return json.loads(resp.read().decode("utf-8"))


def normalize_text(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def catalog_matches(dataset: dict) -> bool:
    blob = " ".join(
        [
            normalize_text(dataset.get("title", "")),
            normalize_text(dataset.get("description", "")),
            normalize_text(dataset.get("keyword", "")),
            normalize_text(dataset.get("publisher", {}).get("name", "")),
        ]
    )
    if "fmcsa" in blob:
        return True
    return "carrier" in blob and "ucr" in blob


def extract_socrata_resources(dataset: dict) -> List[Dict[str, str]]:
    out: List[Dict[str, str]] = []
    for dist in dataset.get("distribution", []) or []:
        access_url = (dist.get("accessURL") or "").strip()
        download_url = (dist.get("downloadURL") or "").strip()
        candidate = access_url or download_url
        if not candidate:
            continue
        if DEFAULT_DOMAIN not in candidate:
            continue
        m = re.search(r"/([a-z0-9]{4}-[a-z0-9]{4})(?:$|[/?])", candidate, flags=re.I)
        if not m:
            continue
        rid = m.group(1).lower()
        out.append(
            {
                "resource_id": rid,
                "access_url": access_url,
                "download_url": download_url,
                "format": (dist.get("format") or "").strip(),
            }
        )
    dedup: Dict[str, Dict[str, str]] = {}
    for item in out:
        dedup[item["resource_id"]] = item
    return list(dedup.values())


def sync_catalog() -> Dict[str, object]:
    raw = fetch_json(CATALOG_URL)
    datasets = raw.get("dataset", []) or []
    items: List[dict] = []
    for ds in datasets:
        if not catalog_matches(ds):
            continue
        resources = extract_socrata_resources(ds)
        items.append(
            {
                "title": ds.get("title"),
                "description": ds.get("description"),
                "publisher": (ds.get("publisher") or {}).get("name"),
                "modified": ds.get("modified"),
                "keywords": ds.get("keyword", []),
                "resources": resources,
            }
        )
    items.sort(key=lambda x: (x.get("title") or ""))
    return {"source": CATALOG_URL, "count": len(items), "items": items}


def sodata_url(resource_id: str, offset: int, limit: int) -> str:
    query = urllib.parse.urlencode(
        {
            "$limit": str(limit),
            "$offset": str(offset),
            "$order": ":id",
        }
    )
    return f"https://{DEFAULT_DOMAIN}/resource/{resource_id}.json?{query}"


def sync_resource(resource_id: str, outdir: Path, page_size: int, max_rows: int) -> Dict[str, object]:
    outdir.mkdir(parents=True, exist_ok=True)
    outpath = outdir / f"{resource_id}.ndjson"
    count = 0
    offset = 0
    with outpath.open("w", encoding="utf-8") as f:
        while True:
            if max_rows > 0 and count >= max_rows:
                break
            limit = page_size
            if max_rows > 0:
                limit = min(limit, max_rows - count)
            url = sodata_url(resource_id=resource_id, offset=offset, limit=limit)
            rows = fetch_json(url)
            if not isinstance(rows, list) or not rows:
                break
            for row in rows:
                f.write(json.dumps(row, ensure_ascii=True) + "\n")
            got = len(rows)
            count += got
            offset += got
            if got < limit:
                break
    return {"resource_id": resource_id, "rows": count, "file": str(outpath)}


def parse_args(argv: Iterable[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="fmcsa_sync")
    p.add_argument("--out", default=str(DATA_ROOT / "fmcsa"), help="Output directory")
    p.add_argument("--page-size", type=int, default=5000)
    p.add_argument(
        "--max-rows",
        type=int,
        default=50000,
        help="Per-resource cap. Use -1 for unbounded.",
    )
    p.add_argument(
        "--resource-id",
        action="append",
        default=[],
        help="Socrata resource id to sync (repeatable).",
    )
    return p.parse_args(list(argv))


def main(argv: Iterable[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    outdir = Path(args.out).expanduser().resolve()
    outdir.mkdir(parents=True, exist_ok=True)

    catalog = sync_catalog()
    catalog_path = outdir / "catalog.json"
    catalog_path.write_text(json.dumps(catalog, indent=2), encoding="utf-8")

    resource_ids = [r.lower() for r in args.resource_id if r.strip()]
    if not resource_ids:
        resource_ids = list(DEFAULT_RESOURCE_IDS)

    results = []
    for rid in resource_ids:
        try:
            results.append(
                sync_resource(
                    resource_id=rid,
                    outdir=outdir,
                    page_size=max(100, int(args.page_size)),
                    max_rows=int(args.max_rows),
                )
            )
        except Exception as exc:  # pragma: no cover
            results.append({"resource_id": rid, "error": str(exc)})

    report = {"catalog_file": str(catalog_path), "resources": results}
    report_path = outdir / "sync_report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

