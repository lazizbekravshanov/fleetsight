#!/usr/bin/env python3
"""FleetSight web app: auth + chat interface + analysis bridge."""

from __future__ import annotations

import csv
import hashlib
import hmac
import json
import os
import secrets
import shutil
import sqlite3
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


ROOT = Path(__file__).resolve().parents[1]
FLEETSIGHT_ENGINE_DIR = ROOT / "fleetsight" / "skills" / "fleetsight"
WEB_DIR = Path(__file__).resolve().parent / "web"
DEFAULT_DATA_DIR = (Path(__file__).resolve().parent / "app_data").resolve()


def getenv(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


APP_SECRET = getenv("FLEETSIGHT_APP_SECRET", "change-this-secret")
APP_DATA = Path(getenv("FLEETSIGHT_APP_DATA", str(DEFAULT_DATA_DIR))).expanduser().resolve()
APP_DB = Path(getenv("FLEETSIGHT_APP_DB", str(APP_DATA / "fleetsight_app.db"))).expanduser().resolve()
APP_HOST = getenv("FLEETSIGHT_APP_HOST", "127.0.0.1")
APP_PORT = int(getenv("FLEETSIGHT_APP_PORT", "8787"))
EMAIL_FROM = getenv("FLEETSIGHT_EMAIL_FROM", "no-reply@fleetsight.local")
DOT_DOMAINS = {
    d.strip().lower()
    for d in getenv(
        "FLEETSIGHT_APPROVED_DOT_EMAIL_DOMAINS", "dot.gov,fmcsa.dot.gov,usdot.gov"
    ).split(",")
    if d.strip()
}
ADMIN_EMAILS = {
    e.strip().lower()
    for e in getenv("FLEETSIGHT_ADMIN_EMAILS", "admin@fleetsight.local").split(",")
    if e.strip()
}

APP_DATA.mkdir(parents=True, exist_ok=True)
(APP_DATA / "uploads").mkdir(parents=True, exist_ok=True)
(APP_DATA / "mail_outbox").mkdir(parents=True, exist_ok=True)
(APP_DATA / "workspace").mkdir(parents=True, exist_ok=True)

# Ensure the analysis engine writes into app-controlled workspace.
os.environ.setdefault("OPENCLAW_WORKSPACE", str((APP_DATA / "workspace").resolve()))
os.environ.setdefault(
    "FLEETSIGHT_ALLOWED_INPUT_DIRS",
    str((APP_DATA / "uploads").resolve()),
)

import sys

sys.path.insert(0, str(FLEETSIGHT_ENGINE_DIR))
import fleetsight as engine  # noqa: E402


app = FastAPI(title="FleetSight App", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=str(WEB_DIR)), name="static")


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def utc_iso(ts: Optional[datetime] = None) -> str:
    ts = ts or now_utc()
    return ts.isoformat()


def hash_password(password: str, salt: Optional[str] = None) -> Tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
    return salt, digest


def verify_password(password: str, salt: str, digest: str) -> bool:
    _, candidate = hash_password(password=password, salt=salt)
    return hmac.compare_digest(candidate, digest)


def sign_token(raw: str) -> str:
    sig = hmac.new(APP_SECRET.encode("utf-8"), raw.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{raw}.{sig}"


def verify_signed_token(signed: str) -> Optional[str]:
    if "." not in signed:
        return None
    raw, sig = signed.rsplit(".", 1)
    expected = hmac.new(APP_SECRET.encode("utf-8"), raw.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        return None
    return raw


def db() -> sqlite3.Connection:
    conn = sqlite3.connect(APP_DB)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with db() as conn:
        conn.executescript(
            """
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              email TEXT UNIQUE NOT NULL,
              role TEXT NOT NULL,
              password_salt TEXT NOT NULL,
              password_hash TEXT NOT NULL,
              email_verified INTEGER NOT NULL DEFAULT 0,
              approved INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS email_tokens (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              token TEXT UNIQUE NOT NULL,
              expires_at TEXT NOT NULL,
              used INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL,
              FOREIGN KEY(user_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS sessions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              session_token TEXT UNIQUE NOT NULL,
              expires_at TEXT NOT NULL,
              created_at TEXT NOT NULL,
              FOREIGN KEY(user_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS conversations (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              title TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY(user_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS messages (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              conversation_id INTEGER NOT NULL,
              role TEXT NOT NULL,
              content TEXT NOT NULL,
              created_at TEXT NOT NULL,
              FOREIGN KEY(conversation_id) REFERENCES conversations(id)
            );
            CREATE TABLE IF NOT EXISTS analyses (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              conversation_id INTEGER,
              input_csv_path TEXT NOT NULL,
              report_dir TEXT NOT NULL,
              summary_path TEXT NOT NULL,
              top_n INTEGER NOT NULL,
              threshold REAL NOT NULL,
              created_at TEXT NOT NULL,
              FOREIGN KEY(user_id) REFERENCES users(id),
              FOREIGN KEY(conversation_id) REFERENCES conversations(id)
            );
            CREATE TABLE IF NOT EXISTS audit_logs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER,
              action TEXT NOT NULL,
              details_json TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            """
        )


def emit_verification_email(email: str, token: str) -> None:
    outbox = APP_DATA / "mail_outbox"
    outbox.mkdir(parents=True, exist_ok=True)
    payload = {
        "to": email,
        "from": EMAIL_FROM,
        "subject": "Verify your FleetSight account",
        "verify_token": token,
        "verify_url_hint": f"/verify?token={token}",
        "created_at": utc_iso(),
    }
    out = outbox / f"mail_{int(time.time())}_{secrets.token_hex(4)}.json"
    out.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def log_action(user_id: Optional[int], action: str, details: Dict[str, Any]) -> None:
    with db() as conn:
        conn.execute(
            "INSERT INTO audit_logs(user_id, action, details_json, created_at) VALUES (?, ?, ?, ?)",
            (user_id, action, json.dumps(details, ensure_ascii=True), utc_iso()),
        )


def get_user_from_session(session_token: Optional[str]) -> sqlite3.Row:
    if not session_token:
        raise HTTPException(status_code=401, detail="Missing session token")
    raw = verify_signed_token(session_token)
    if not raw:
        raise HTTPException(status_code=401, detail="Invalid session token")
    with db() as conn:
        row = conn.execute(
            """
            SELECT s.user_id, s.expires_at, u.email, u.role, u.email_verified, u.approved
            FROM sessions s JOIN users u ON u.id = s.user_id
            WHERE s.session_token = ?
            """,
            (raw,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Unknown session")
    if datetime.fromisoformat(row["expires_at"]) < now_utc():
        raise HTTPException(status_code=401, detail="Session expired")
    return row


def require_admin(session_token: Optional[str]) -> sqlite3.Row:
    user = get_user_from_session(session_token)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def create_conversation(user_id: int, title: str) -> int:
    ts = utc_iso()
    with db() as conn:
        cur = conn.execute(
            "INSERT INTO conversations(user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (user_id, title[:120], ts, ts),
        )
        return int(cur.lastrowid)


def append_message(conversation_id: int, role: str, content: str) -> None:
    ts = utc_iso()
    with db() as conn:
        conn.execute(
            "INSERT INTO messages(conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)",
            (conversation_id, role, content, ts),
        )
        conn.execute(
            "UPDATE conversations SET updated_at = ? WHERE id = ?",
            (ts, conversation_id),
        )


def list_conversations(user_id: int) -> List[Dict[str, Any]]:
    with db() as conn:
        rows = conn.execute(
            "SELECT id, title, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC",
            (user_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def conversation_messages(user_id: int, conversation_id: int) -> List[Dict[str, Any]]:
    with db() as conn:
        owner = conn.execute(
            "SELECT id FROM conversations WHERE id = ? AND user_id = ?",
            (conversation_id, user_id),
        ).fetchone()
        if not owner:
            raise HTTPException(status_code=404, detail="Conversation not found")
        rows = conn.execute(
            "SELECT id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY id ASC",
            (conversation_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def parse_chat_for_analyze(prompt: str) -> Optional[Dict[str, Any]]:
    parts = prompt.strip().split()
    if not parts:
        return None
    top = 50
    threshold = 30.0
    if "--top" in parts:
        try:
            top = int(parts[parts.index("--top") + 1])
        except Exception:
            top = 50
    if "--threshold" in parts:
        try:
            threshold = float(parts[parts.index("--threshold") + 1])
        except Exception:
            threshold = 30.0
    if parts[0] == "/fleetsight":
        if len(parts) >= 3 and parts[1] == "analyze":
            return {"cmd": "analyze", "csv": parts[2], "top": top, "threshold": threshold}
        if len(parts) >= 2 and parts[1] == "explain":
            return {"cmd": "explain"}
    lowered = prompt.lower()
    if "analy" in lowered and ".csv" in lowered:
        for token in parts:
            if token.endswith(".csv"):
                return {"cmd": "analyze", "csv": token, "top": top, "threshold": threshold}
    if "explain" in lowered and "score" in lowered:
        return {"cmd": "explain"}
    return None


def recent_report_dir() -> Optional[Path]:
    base = engine.get_workspace_path() / "fleetsight_reports"
    if not base.exists():
        return None
    dirs = [p for p in base.iterdir() if p.is_dir()]
    if not dirs:
        return None
    dirs.sort(key=lambda p: p.name, reverse=True)
    return dirs[0]


def latest_uploaded_csv(user_id: int) -> Optional[Path]:
    user_dir = APP_DATA / "uploads" / f"user_{user_id}"
    if not user_dir.exists():
        return None
    files = [p for p in user_dir.iterdir() if p.is_file() and p.suffix.lower() == ".csv"]
    if not files:
        return None
    files.sort(key=lambda p: p.name, reverse=True)
    return files[0]


def run_engine_analyze(csv_path: Path, top: int, threshold: float) -> Dict[str, Any]:
    code = engine.run_analyze(str(csv_path), top=top, threshold=threshold)
    if code != 0:
        raise HTTPException(status_code=400, detail="FleetSight analysis failed")
    report_dir = recent_report_dir()
    if not report_dir:
        raise HTTPException(status_code=500, detail="No report output found")
    summary_path = report_dir / "summary.md"
    summary = summary_path.read_text(encoding="utf-8") if summary_path.exists() else ""
    return {
        "report_dir": str(report_dir),
        "summary": summary,
        "links_json": str(report_dir / "links.json"),
        "links_csv": str(report_dir / "links.csv"),
        "clusters_json": str(report_dir / "clusters.json"),
        "clusters_csv": str(report_dir / "clusters.csv"),
        "summary_md": str(summary_path),
    }


def relative_to_data(path: str) -> str:
    p = Path(path).resolve()
    try:
        return str(p.relative_to(APP_DATA))
    except ValueError:
        return str(p)


@app.on_event("startup")
def _startup() -> None:
    init_db()


@app.get("/")
def root_page() -> FileResponse:
    return FileResponse(str(WEB_DIR / "index.html"))


@app.get("/healthz")
def healthz() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/api/auth/signup")
def signup(payload: Dict[str, Any]) -> Dict[str, Any]:
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    requested_role = (payload.get("role") or "carrier").strip().lower()
    role = requested_role if requested_role in {"carrier", "broker", "usdot_official"} else "carrier"
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email is required")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 chars")
    approved = 0
    domain = email.rsplit("@", 1)[1]
    if role == "usdot_official" and domain in DOT_DOMAINS:
        approved = 1
    if role in {"carrier", "broker"}:
        approved = 1
    if email in ADMIN_EMAILS:
        role = "admin"
        approved = 1
    salt, digest = hash_password(password)
    created = utc_iso()
    with db() as conn:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Email already exists")
        cur = conn.execute(
            """
            INSERT INTO users(email, role, password_salt, password_hash, email_verified, approved, created_at)
            VALUES (?, ?, ?, ?, 0, ?, ?)
            """,
            (email, role, salt, digest, approved, created),
        )
        user_id = int(cur.lastrowid)
        token = secrets.token_urlsafe(24)
        expires = utc_iso(now_utc() + timedelta(hours=24))
        conn.execute(
            "INSERT INTO email_tokens(user_id, token, expires_at, used, created_at) VALUES (?, ?, ?, 0, ?)",
            (user_id, token, expires, created),
        )
    emit_verification_email(email, token)
    log_action(user_id, "signup", {"email": email, "role": role, "approved": approved})
    return {
        "ok": True,
        "message": "Signup created. Verify email using token from outbox file.",
        "approved": bool(approved),
        "role": role,
        "debug_verify_token": token,
    }


@app.post("/api/auth/verify-email")
def verify_email(payload: Dict[str, Any]) -> Dict[str, Any]:
    token = (payload.get("token") or "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="token is required")
    with db() as conn:
        row = conn.execute(
            "SELECT id, user_id, expires_at, used FROM email_tokens WHERE token = ?",
            (token,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Invalid token")
        if row["used"]:
            raise HTTPException(status_code=400, detail="Token already used")
        if datetime.fromisoformat(row["expires_at"]) < now_utc():
            raise HTTPException(status_code=400, detail="Token expired")
        conn.execute("UPDATE email_tokens SET used = 1 WHERE id = ?", (row["id"],))
        conn.execute("UPDATE users SET email_verified = 1 WHERE id = ?", (row["user_id"],))
    log_action(int(row["user_id"]), "verify_email", {"token_id": int(row["id"])})
    return {"ok": True}


@app.post("/api/auth/login")
def login(payload: Dict[str, Any]) -> Dict[str, Any]:
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    with db() as conn:
        user = conn.execute(
            "SELECT id, role, password_salt, password_hash, email_verified, approved FROM users WHERE email = ?",
            (email,),
        ).fetchone()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(password, user["password_salt"], user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user["email_verified"]:
        raise HTTPException(status_code=403, detail="Email not verified")
    if not user["approved"]:
        raise HTTPException(status_code=403, detail="Account pending approval")
    raw = secrets.token_urlsafe(32)
    expires = utc_iso(now_utc() + timedelta(days=7))
    with db() as conn:
        conn.execute(
            "INSERT INTO sessions(user_id, session_token, expires_at, created_at) VALUES (?, ?, ?, ?)",
            (int(user["id"]), raw, expires, utc_iso()),
        )
    signed = sign_token(raw)
    log_action(int(user["id"]), "login", {})
    return {
        "ok": True,
        "session_token": signed,
        "role": user["role"],
        "user_id": int(user["id"]),
        "expires_at": expires,
    }


@app.get("/api/admin/pending-usdot")
def admin_pending_usdot(
    x_session_token: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    admin = require_admin(x_session_token)
    with db() as conn:
        rows = conn.execute(
            """
            SELECT id, email, role, email_verified, approved, created_at
            FROM users
            WHERE role = 'usdot_official' AND approved = 0
            ORDER BY created_at ASC
            """
        ).fetchall()
    log_action(int(admin["user_id"]), "admin_list_pending_usdot", {"count": len(rows)})
    return {"items": [dict(r) for r in rows]}


@app.post("/api/admin/approve-user")
def admin_approve_user(
    payload: Dict[str, Any], x_session_token: Optional[str] = Header(default=None)
) -> Dict[str, Any]:
    admin = require_admin(x_session_token)
    target_user_id = int(payload.get("user_id") or 0)
    approve = bool(payload.get("approve", True))
    if target_user_id <= 0:
        raise HTTPException(status_code=400, detail="user_id is required")
    with db() as conn:
        target = conn.execute(
            "SELECT id, role, email_verified, approved FROM users WHERE id = ?",
            (target_user_id,),
        ).fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="User not found")
        if target["role"] not in {"usdot_official", "carrier", "broker"}:
            raise HTTPException(status_code=400, detail="Cannot change approval for this role")
        conn.execute(
            "UPDATE users SET approved = ? WHERE id = ?",
            (1 if approve else 0, target_user_id),
        )
    log_action(
        int(admin["user_id"]),
        "admin_approve_user",
        {"target_user_id": target_user_id, "approve": approve},
    )
    return {"ok": True, "user_id": target_user_id, "approved": approve}


@app.post("/api/analysis/upload")
async def upload_csv(
    file: UploadFile = File(...),
    x_session_token: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    user = get_user_from_session(x_session_token)
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="CSV file required")
    user_dir = APP_DATA / "uploads" / f"user_{user['user_id']}"
    user_dir.mkdir(parents=True, exist_ok=True)
    dst = user_dir / f"{int(time.time())}_{Path(file.filename).name}"
    with dst.open("wb") as out:
        shutil.copyfileobj(file.file, out)
    log_action(int(user["user_id"]), "upload_csv", {"path": str(dst)})
    return {"ok": True, "path": str(dst), "display_path": relative_to_data(str(dst))}


@app.get("/api/conversations")
def get_conversations(x_session_token: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    user = get_user_from_session(x_session_token)
    return {"items": list_conversations(int(user["user_id"]))}


@app.get("/api/conversations/{conversation_id}")
def get_conversation(
    conversation_id: int, x_session_token: Optional[str] = Header(default=None)
) -> Dict[str, Any]:
    user = get_user_from_session(x_session_token)
    return {"messages": conversation_messages(int(user["user_id"]), conversation_id)}


@app.post("/api/chat/message")
def chat_message(
    payload: Dict[str, Any], x_session_token: Optional[str] = Header(default=None)
) -> Dict[str, Any]:
    user = get_user_from_session(x_session_token)
    user_id = int(user["user_id"])
    prompt = (payload.get("message") or "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="message is required")
    convo_id = payload.get("conversation_id")
    if convo_id is None:
        convo_id = create_conversation(user_id, prompt[:80] or "FleetSight Chat")
    append_message(int(convo_id), "user", prompt)

    parsed = parse_chat_for_analyze(prompt)
    if parsed and parsed.get("cmd") == "explain":
        lines = [
            "FleetSight scoring uses normalized identifiers and weighted overlap:",
            "- phone: 40",
            "- email: 35",
            "- email_domain: 15",
            "- address: 25",
            "- ip: 20",
            "Rarity down-weighting: contribution = weight * (2/freq).",
        ]
        reply = "\n".join(lines)
    elif parsed and parsed.get("cmd") == "analyze":
        csv_arg = str(parsed["csv"])
        if csv_arg in {"latest", "last", "@latest", "@upload"}:
            latest = latest_uploaded_csv(user_id=user_id)
            if not latest:
                reply = "No uploaded CSV found. Upload first via the Upload CSV button."
                append_message(int(convo_id), "assistant", reply)
                return {"ok": True, "conversation_id": int(convo_id), "reply": reply}
            csv_path = latest
        else:
            csv_path = Path(csv_arg).expanduser()
        if not csv_path.is_absolute():
            csv_path = (APP_DATA / csv_path).resolve()
        else:
            csv_path = csv_path.resolve()
        if not csv_path.exists():
            reply = f"Input CSV not found: {csv_path}"
        else:
            report = run_engine_analyze(csv_path=csv_path, top=int(parsed["top"]), threshold=float(parsed["threshold"]))
            with db() as conn:
                conn.execute(
                    """
                    INSERT INTO analyses(user_id, conversation_id, input_csv_path, report_dir, summary_path, top_n, threshold, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        user_id,
                        int(convo_id),
                        str(csv_path),
                        report["report_dir"],
                        report["summary_md"],
                        int(parsed["top"]),
                        float(parsed["threshold"]),
                        utc_iso(),
                    ),
                )
            reply = report["summary"] + "\n\n" + (
                "Download links:\n"
                f"- /api/reports/file?path={relative_to_data(report['links_json'])}\n"
                f"- /api/reports/file?path={relative_to_data(report['links_csv'])}\n"
                f"- /api/reports/file?path={relative_to_data(report['clusters_json'])}\n"
                f"- /api/reports/file?path={relative_to_data(report['clusters_csv'])}\n"
            )
    else:
        reply = (
            "Upload a CSV first, then run:\n"
            "`/fleetsight analyze <path_to_csv> --top 50 --threshold 30`\n\n"
            "You can also ask: `explain scoring`."
        )
    append_message(int(convo_id), "assistant", reply)
    log_action(user_id, "chat_message", {"conversation_id": int(convo_id)})
    return {"ok": True, "conversation_id": int(convo_id), "reply": reply}


@app.get("/api/reports/file")
def read_report_file(path: str, x_session_token: Optional[str] = Header(default=None)) -> FileResponse:
    user = get_user_from_session(x_session_token)
    _ = user
    rel = path.strip().lstrip("/")
    target = (APP_DATA / rel).resolve()
    if APP_DATA.resolve() not in target.parents:
        raise HTTPException(status_code=403, detail="Invalid path")
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(target))


@app.get("/api/fmcsa/catalog")
def fmcsa_catalog(x_session_token: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    user = get_user_from_session(x_session_token)
    _ = user
    path = APP_DATA / "fmcsa" / "catalog.json"
    if not path.exists():
        return {"items": [], "hint": "Run sync script first: python app/fmcsa_sync.py"}
    data = json.loads(path.read_text(encoding="utf-8"))
    return data


def main() -> None:
    import uvicorn

    uvicorn.run("server:app", host=APP_HOST, port=APP_PORT, reload=False, log_level="info")


if __name__ == "__main__":
    main()
