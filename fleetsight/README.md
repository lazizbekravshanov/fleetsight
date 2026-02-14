# FleetSight MVP (OpenClaw Skill)

FleetSight is a minimal, local-first OpenClaw skill for detecting likely affiliated/chameleon carrier networks by scoring identifier overlaps.

## What It Does

Given a CSV with:

`carrier_id, legal_name, dot, mc, phone, email, address, ip, timestamp`

it produces:

1. Ranked pairwise links with score + explainable reasons
2. Clusters (connected components) based on thresholded link scores
3. Exportable reports (`JSON` + `CSV`) and a concise markdown chat summary

## Folder Layout

```text
fleetsight/
  Makefile
  README.md
  skills/
    fleetsight/
      __init__.py
      fleetsight.py
      skill.json
```

## OpenClaw Skill Registration

This repo ships a skill folder at:

`skills/fleetsight`

It contains `skill.json` metadata and a Python entrypoint (`fleetsight.py`).

If your OpenClaw install expects skills in a central directory, copy or symlink this folder there.

Example:

1. Copy `fleetsight/skills/fleetsight` into your OpenClaw skills directory.
2. Ensure Python 3.11+ is available to OpenClaw.
3. Reload/restart OpenClaw so it picks up new skills.

## Commands

### 1) Analyze

```bash
/fleetsight analyze carriers.csv --top 50 --threshold 30
```

- Reads CSV
- Scores pairwise overlaps using weighted features + rarity down-weighting
- Writes reports into OpenClaw workspace
- Prints markdown summary for chat reply

### 2) Generate Sample Data

```bash
/fleetsight sample-data
```

- Writes deterministic synthetic dataset with obvious clusters + noise
- Prints file path in workspace

### 3) Explain Scoring

```bash
/fleetsight explain
```

- Prints normalization, feature weights, and rarity logic

## Security Guardrails

- No shell execution from the skill.
- Reads only the specified CSV path.
- Writes only under workspace output folders.
- By default, refuses analyzing files outside workspace.
- To allow specific external input roots, set:
  - `FLEETSIGHT_ALLOWED_INPUT_DIRS=/path/one:/path/two` (uses OS path separator)
- Last-resort override:
  - `FLEETSIGHT_ALLOW_OUTSIDE_WORKSPACE=1`

## Workspace + Output Paths

Workspace resolution order:

1. `OPENCLAW_WORKSPACE` env var (if set)
2. `~/.openclaw/workspace`

Analyze output directory:

`<workspace>/fleetsight_reports/<run_id>/`

Files created per run:

- `links.json`
- `links.csv`
- `clusters.json`
- `clusters.csv`
- `summary.md`

Sample data path:

`<workspace>/fleetsight_samples/carriers_sample.csv`

## Verify

Run:

```bash
make verify
```

`make verify` performs:

1. unit tests (`python -m unittest`)
2. deterministic sample generation
3. deterministic analysis and output file existence checks

By default, `make` commands set:

`OPENCLAW_WORKSPACE=<repo>/fleetsight/.workspace`

so verification works without writing to `~/.openclaw/workspace`.

## Chat Response Shape

The skill returns a concise markdown message containing:

- top 10 links
- top 3 clusters
- generated report paths

## Notes

- Deterministic ordering is enforced for links and clusters.
- Required columns are validated.
- Blank fields are handled safely.
