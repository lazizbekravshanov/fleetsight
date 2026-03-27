/**
 * Normalization utilities for graph entity matching.
 */

/** Normalize a person name: uppercase, strip suffixes, collapse whitespace */
export function normalizeName(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\b(JR|SR|II|III|IV|V|ESQ|PHD|MD)\b\.?/g, "")
    .replace(/[^A-Z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalize a CDL key: STATE-NUMBER, uppercase */
export function normalizeCdl(number: string, state: string): string {
  return `${state.toUpperCase()}-${number.toUpperCase().replace(/[^A-Z0-9]/g, "")}`;
}

/** Normalize a physical address for dedup matching */
export function normalizeAddress(street: string, city: string, state: string, zip?: string): string {
  const parts = [street, city, state, zip].filter(Boolean);
  return parts
    .join(", ")
    .toUpperCase()
    .replace(/\bSTREET\b/g, "ST")
    .replace(/\bAVENUE\b/g, "AVE")
    .replace(/\bBOULEVARD\b/g, "BLVD")
    .replace(/\bDRIVE\b/g, "DR")
    .replace(/\bLANE\b/g, "LN")
    .replace(/\bROAD\b/g, "RD")
    .replace(/\bSUITE\b/g, "STE")
    .replace(/\bAPARTMENT\b/g, "APT")
    .replace(/\bNORTH\b/g, "N")
    .replace(/\bSOUTH\b/g, "S")
    .replace(/\bEAST\b/g, "E")
    .replace(/\bWEST\b/g, "W")
    .replace(/[#.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalize phone number to digits only */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  // Strip leading 1 for US numbers
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}
