const STATE_MAP: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
  montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
  ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX",
  utah: "UT", vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV",
  wisconsin: "WI", wyoming: "WY", "district of columbia": "DC",
  // Abbreviations (for passthrough)
  al: "AL", ak: "AK", az: "AZ", ar: "AR", ca: "CA", co: "CO", ct: "CT",
  de: "DE", fl: "FL", ga: "GA", hi: "HI", id: "ID", il: "IL", in: "IN",
  ia: "IA", ks: "KS", ky: "KY", la: "LA", me: "ME", md: "MD", ma: "MA",
  mi: "MI", mn: "MN", ms: "MS", mo: "MO", mt: "MT", ne: "NE", nv: "NV",
  nh: "NH", nj: "NJ", nm: "NM", ny: "NY", nc: "NC", nd: "ND", oh: "OH",
  ok: "OK", or: "OR", pa: "PA", ri: "RI", sc: "SC", sd: "SD", tn: "TN",
  tx: "TX", ut: "UT", vt: "VT", va: "VA", wa: "WA", wv: "WV", wi: "WI",
  wy: "WY", dc: "DC",
};

function resolveState(input: string): string | null {
  return STATE_MAP[input.toLowerCase()] ?? null;
}

export type NaturalQueryResult = {
  soqlWhere: string;
  limit: number;
  description: string;
};

export function parseNaturalQuery(query: string): NaturalQueryResult | null {
  const q = query.trim();

  // Pattern: "X+ trucks in STATE"
  let m = q.match(/^(\d+)\+?\s*(?:trucks?|units?|power\s*units?)\s+in\s+(.+)$/i);
  if (m) {
    const count = parseInt(m[1], 10);
    const state = resolveState(m[2].trim());
    if (state) {
      return {
        soqlWhere: `power_units >= ${count} AND phy_state = '${state}' AND status_code = 'A'`,
        limit: 50,
        description: `Active carriers with ${count}+ power units in ${state}`,
      };
    }
  }

  // Pattern: "X-Y trucks in STATE"
  m = q.match(/^(\d+)\s*[-–]\s*(\d+)\s*(?:trucks?|units?|power\s*units?)\s+in\s+(.+)$/i);
  if (m) {
    const min = parseInt(m[1], 10);
    const max = parseInt(m[2], 10);
    const state = resolveState(m[3].trim());
    if (state) {
      return {
        soqlWhere: `power_units >= ${min} AND power_units <= ${max} AND phy_state = '${state}' AND status_code = 'A'`,
        limit: 50,
        description: `Active carriers with ${min}-${max} power units in ${state}`,
      };
    }
  }

  // Pattern: "hazmat carriers in STATE"
  m = q.match(/^hazmat\s+(?:carriers?|companies?|trucking)\s+in\s+(.+)$/i);
  if (m) {
    const state = resolveState(m[1].trim());
    if (state) {
      return {
        soqlWhere: `hm_ind = 'Y' AND phy_state = '${state}' AND status_code = 'A'`,
        limit: 50,
        description: `Active hazmat carriers in ${state}`,
      };
    }
  }

  // Pattern: "brokers in STATE"
  m = q.match(/^(?:freight\s+)?brokers?\s+in\s+(.+)$/i);
  if (m) {
    const state = resolveState(m[1].trim());
    if (state) {
      return {
        soqlWhere: `upper(classdef) like '%BROKER%' AND phy_state = '${state}' AND status_code = 'A'`,
        limit: 50,
        description: `Active brokers in ${state}`,
      };
    }
  }

  // Pattern: "carriers in CITY, STATE"
  m = q.match(/^(?:carriers?|companies?|trucking)\s+in\s+([a-zA-Z\s]+),\s*([a-zA-Z\s]+)$/i);
  if (m) {
    const city = m[1].trim().toUpperCase().replace(/'/g, "''");
    const state = resolveState(m[2].trim());
    if (state) {
      return {
        soqlWhere: `upper(phy_city) = '${city}' AND phy_state = '${state}' AND status_code = 'A'`,
        limit: 50,
        description: `Active carriers in ${m[1].trim()}, ${state}`,
      };
    }
  }

  // Pattern: "carriers in STATE" (must come after city,state pattern)
  m = q.match(/^(?:carriers?|companies?|trucking)\s+in\s+(.+)$/i);
  if (m) {
    const state = resolveState(m[1].trim());
    if (state) {
      return {
        soqlWhere: `phy_state = '${state}' AND status_code = 'A'`,
        limit: 50,
        description: `Active carriers in ${state}`,
      };
    }
  }

  return null;
}
