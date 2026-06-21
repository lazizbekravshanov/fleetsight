/* ── Universal search query detection ─────────────────────────────────
   Pure: classifies what the user typed/pasted into a search type + a
   normalized value. Operators win; otherwise auto-detect by pattern.
   The heart of universal search — fully unit-tested. */

export type SearchType = "dot" | "mc" | "vin" | "phone" | "officer" | "address" | "insurer" | "name";

export type DetectedQuery = { type: SearchType; value: string };

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i; // 17 chars, no I/O/Q

const OPERATORS: Record<string, SearchType> = {
  officer: "officer",
  address: "address",
  insurer: "insurer",
  phone: "phone",
  vin: "vin",
  dot: "dot",
  mc: "mc",
  name: "name",
};

function normalizePhone(s: string): string | null {
  const d = s.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) return d.slice(1);
  if (d.length === 10) return d;
  return null;
}

function finalize(type: SearchType, value: string): DetectedQuery {
  if (type === "phone") return { type, value: normalizePhone(value) ?? value.replace(/\D/g, "") };
  if (type === "vin") return { type, value: value.toUpperCase() };
  return { type, value };
}

export function detectQuery(raw: string): DetectedQuery {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { type: "name", value: "" };

  // Explicit operator wins: "officer:smith", "vin:...", etc.
  const op = trimmed.match(/^([a-zA-Z]+):\s*(.+)$/);
  if (op && op[1].toLowerCase() in OPERATORS) {
    return finalize(OPERATORS[op[1].toLowerCase()], op[2].trim());
  }

  // Auto-detect by shape.
  if (VIN_RE.test(trimmed)) return { type: "vin", value: trimmed.toUpperCase() };

  if (!/[a-zA-Z]/.test(trimmed)) {
    const phone = normalizePhone(trimmed);
    if (phone) return { type: "phone", value: phone };
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length >= 1 && digits.length <= 8) return { type: "dot", value: digits };
  }

  if (/^MC[-\s]?\d{1,8}$/i.test(trimmed)) return { type: "mc", value: trimmed };

  return { type: "name", value: trimmed };
}
