/**
 * SmartWay Transport Partnership — EPA partner lookup
 *
 * Source: EPA SmartWay Partner List
 * https://www.epa.gov/smartway/smartway-partner-list
 *
 * This is a best-effort static list of major SmartWay partner company names.
 * Matching is case-insensitive substring against the carrier's legal name.
 * Conservative matching: false negatives are acceptable, false positives are not.
 *
 * To update: download the latest EPA SmartWay partner Excel/CSV and refresh this list.
 */

const SMARTWAY_PARTNERS: string[] = [
  // Major truckload carriers
  "SWIFT TRANSPORTATION",
  "WERNER ENTERPRISES",
  "SCHNEIDER NATIONAL",
  "J.B. HUNT TRANSPORT",
  "JB HUNT TRANSPORT",
  "HEARTLAND EXPRESS",
  "KNIGHT TRANSPORTATION",
  "KNIGHT-SWIFT",
  "USA TRUCK",
  "MARTEN TRANSPORT",
  "PRIME INC",
  "CELADON TRUCKING",
  "COVENANT TRANSPORT",
  "COVENANT LOGISTICS",
  "RYDER SYSTEM",
  "RYDER TRUCK RENTAL",
  "RYDER INTEGRATED LOGISTICS",
  "PENSKE TRUCK LEASING",
  "PENSKE LOGISTICS",
  "OLD DOMINION FREIGHT LINE",
  "XPO LOGISTICS",
  "XPO CARTAGE",
  "SAIA INC",
  "SAIA MOTOR FREIGHT",
  "FEDEX FREIGHT",
  "FEDEX GROUND",
  "FEDEX CUSTOM CRITICAL",
  "FEDEX NATIONAL LTL",
  "UPS FREIGHT",
  "UPS GROUND FREIGHT",
  "UNITED PARCEL SERVICE",
  "ABF FREIGHT SYSTEM",
  "ARCBEST CORPORATION",
  "ESTES EXPRESS LINES",
  "SOUTHEASTERN FREIGHT LINES",
  "HOLLAND MOTOR EXPRESS",
  "YRC FREIGHT",
  "YRC INC",
  "YELLOW TRANSPORTATION",
  "USF HOLLAND",
  "NEW PENN MOTOR EXPRESS",
  "AVERITT EXPRESS",
  "ROADRUNNER TRANSPORTATION",
  "FORWARD AIR",
  "FORWARD AIR INC",
  "LANDSTAR SYSTEM",
  "LANDSTAR RANGER",
  "LANDSTAR INWAY",
  "LANDSTAR LIGON",
  "LANDSTAR GEMINI",
  "COYOTE LOGISTICS",
  "C.H. ROBINSON",
  "CH ROBINSON",
  "ECHO GLOBAL LOGISTICS",
  "TOTAL QUALITY LOGISTICS",
  "TQL",
  "TRANSPLACE",
  "CEVA LOGISTICS",
  "DHL SUPPLY CHAIN",
  "DHL EXPRESS",
  "KUEHNE + NAGEL",
  "KUEHNE AND NAGEL",
  "DB SCHENKER",
  "NIPPON EXPRESS",
  "DSV AIR & SEA",
  "GEODIS",

  // LTL / Regional
  "DAYTON FREIGHT LINES",
  "CENTRAL TRANSPORT",
  "AAA COOPER TRANSPORTATION",
  "WARD TRUCKING",
  "DUGAN TRUCK LINE",
  "CENTRAL FREIGHT LINES",
  "WATKINS MOTOR LINES",
  "CON-WAY FREIGHT",
  "CONWAY FREIGHT",
  "VITRAN EXPRESS",
  "R+L CARRIERS",
  "R & L CARRIERS",

  // Dedicated / Private fleet
  "WAL-MART",
  "WALMART",
  "TARGET CORPORATION",
  "SYSCO CORPORATION",
  "SYSCO FOOD SERVICES",
  "US FOODS",
  "MCLANE COMPANY",
  "PERFORMANCE FOOD GROUP",
  "CORE-MARK",
  "COCA-COLA",
  "PEPSI",
  "PEPSICO",
  "ANHEUSER-BUSCH",
  "PROCTER & GAMBLE",
  "PROCTER AND GAMBLE",
  "UNILEVER",
  "KIMBERLY-CLARK",
  "GENERAL MILLS",
  "NESTLE",
  "KRAFT HEINZ",
  "TYSON FOODS",
  "HORMEL FOODS",
  "DEAN FOODS",
  "SCHWAN",
  "HOME DEPOT",
  "LOWES",
  "LOWE'S",
  "MENARDS",
  "IKEA",
  "AMAZON LOGISTICS",
  "AMAZON.COM SERVICES",
  "BEST BUY",
  "COSTCO",

  // Intermodal / Drayage
  "HUB GROUP",
  "SCHNEIDER INTERMODAL",
  "J.B. HUNT INTERMODAL",

  // Tank / Bulk / Specialized
  "KENAN ADVANTAGE GROUP",
  "QUALITY CARRIERS",
  "TRIMAC TRANSPORTATION",
  "GROENDYKE TRANSPORT",
  "INDIAN RIVER TRANSPORT",

  // Temperature-controlled
  "AMERICOLD LOGISTICS",
  "LINEAGE LOGISTICS",
  "CR ENGLAND",
  "C.R. ENGLAND",
  "JOHN CHRISTNER TRUCKING",
  "MESILLA VALLEY TRANSPORTATION",
  "NAVAJO EXPRESS",
  "HIRSCHBACH MOTOR LINES",

  // Flatbed / Heavy haul
  "MERCER TRANSPORTATION",
  "TMC TRANSPORTATION",
  "MELTON TRUCK LINES",
  "ROEHL TRANSPORT",
  "DECKER TRUCK LINE",

  // Major carriers
  "CRETE CARRIER",
  "SHAFFER TRUCKING",
  "HUNT TRANSPORTATION",
  "CONTINENTAL CARRIERS",
  "INTERSTATE MOTOR FREIGHT",
  "PAM TRANSPORT",
  "HOGAN TRANSPORTS",
  "HOGAN TRUCK LEASING",
  "NFI INDUSTRIES",
  "NFIINDUSTRIES",
  "USXPRESS",
  "US XPRESS",
  "U.S. XPRESS",
  "WESTERN EXPRESS",
  "CRETE CARRIER CORPORATION",
  "CARRIERS CORP",
  "UNIVERSAL TRUCKLOAD SERVICES",
  "K & B TRANSPORTATION",
  "SEKO LOGISTICS",
  "KENCO LOGISTICS",
  "SADDLE CREEK LOGISTICS",
  "RUAN TRANSPORTATION",
  "DUPRE LOGISTICS",
  "SOUTHEASTERN FREIGHT",
];

// Pre-compute uppercase set for fast matching
const PARTNERS_UPPER = SMARTWAY_PARTNERS.map((p) => p.toUpperCase());

/**
 * Check if a carrier is a SmartWay partner by legal name.
 * Uses case-insensitive substring matching.
 * Conservative: may miss some partners, but should not produce false positives.
 */
export function isSmartWayPartner(legalName: string): boolean {
  if (!legalName) return false;
  const upper = legalName.toUpperCase();
  return PARTNERS_UPPER.some((partner) => upper.includes(partner));
}
