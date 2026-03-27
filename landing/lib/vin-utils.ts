/**
 * VIN normalization, validation, and utilities.
 *
 * Modern VINs (post-1981) are 17 characters. Older vehicles may have shorter VINs.
 * We accept 11+ characters and always store uppercase, stripped of spaces/dashes.
 */

const TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};

const POSITION_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/**
 * Normalize a VIN: uppercase, strip whitespace/dashes, remove quotes.
 * Returns null if the result is too short or contains invalid characters.
 */
export function normalizeVin(raw: string): string | null {
  const cleaned = raw
    .toUpperCase()
    .replace(/[\s\-'"]/g, "")
    .replace(/[^A-HJ-NPR-Z0-9]/g, ""); // VINs exclude I, O, Q

  if (cleaned.length < 11) return null;
  if (cleaned.length > 17) return null;

  return cleaned;
}

/**
 * Check if a VIN is valid format. For 17-char VINs, also validates the check digit.
 */
export function isValidVin(vin: string): boolean {
  const normalized = normalizeVin(vin);
  if (!normalized) return false;

  // For 17-char VINs, validate check digit (position 9)
  if (normalized.length === 17) {
    return validateCheckDigit(normalized);
  }

  // Shorter VINs (pre-1981) just need to be alphanumeric and >= 11 chars
  return normalized.length >= 11;
}

function validateCheckDigit(vin: string): boolean {
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const char = vin[i];
    const value = /\d/.test(char)
      ? parseInt(char, 10)
      : (TRANSLITERATION[char] ?? 0);
    sum += value * POSITION_WEIGHTS[i];
  }
  const remainder = sum % 11;
  const expected = remainder === 10 ? "X" : String(remainder);
  return vin[8] === expected;
}

/**
 * Extract World Manufacturer Identifier (first 3 chars of VIN).
 */
export function extractWmi(vin: string): string {
  return vin.slice(0, 3);
}

/**
 * Determine if a VIN likely belongs to a trailer vs a power unit.
 * Trailer VINs often start with certain WMI prefixes.
 * This is a heuristic — not 100% accurate.
 */
export function isLikelyTrailer(vin: string): boolean {
  const wmi = extractWmi(vin);
  // Common trailer manufacturers
  const trailerWmis = [
    "1GR", "1JJ", "1TT", "1WK", "3BZ", "4V4",
    "5DY", "5LU", "1DW", "1H2", "1M1", "1M2",
  ];
  return trailerWmis.some((t) => wmi.startsWith(t.slice(0, 2)));
}

/**
 * Batch normalize VINs, filtering out invalid ones.
 */
export function normalizeVinBatch(raws: string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const raw of raws) {
    const normalized = normalizeVin(raw);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result;
}
