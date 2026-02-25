import type { SocrataCarrier } from "@/lib/socrata";
import type { AddressIntelligence } from "@/components/carrier/types";

/** Known virtual office / mail center providers. */
const VIRTUAL_OFFICE_PATTERNS: { pattern: RegExp; provider: string }[] = [
  { pattern: /\bregus\b/i, provider: "Regus" },
  { pattern: /\bwework\b/i, provider: "WeWork" },
  { pattern: /\bintelligent office/i, provider: "Intelligent Office" },
  { pattern: /\bdavinci virtual/i, provider: "Davinci Virtual" },
  { pattern: /\bservcorp\b/i, provider: "Servcorp" },
  { pattern: /\bups store\b/i, provider: "UPS Store" },
  { pattern: /\bpostal connections\b/i, provider: "Postal Connections" },
  { pattern: /\bpak mail\b/i, provider: "Pak Mail" },
  { pattern: /\bpostalannex\b/i, provider: "PostalAnnex" },
  { pattern: /\bmail boxes etc\b/i, provider: "Mail Boxes Etc" },
  { pattern: /\bmailboxes etc\b/i, provider: "Mail Boxes Etc" },
  { pattern: /\bthe ups store\b/i, provider: "UPS Store" },
  { pattern: /\bipostal1\b/i, provider: "iPostal1" },
  { pattern: /\bphysical address\b/i, provider: "PhysicalAddress.com" },
  { pattern: /\bearth class mail\b/i, provider: "Earth Class Mail" },
  { pattern: /\banytime mailbox/i, provider: "Anytime Mailbox" },
];

/** Patterns indicating a PO Box. */
const PO_BOX_PATTERNS = [
  /^p\.?\s*o\.?\s*box\b/i,
  /^po\s*box\b/i,
  /^post\s*office\s*box\b/i,
  /^pob\s+\d/i,
];

/** Patterns suggesting residential address. */
const RESIDENTIAL_PATTERNS = [
  /\bapt\.?\s*#?\d/i,
  /\bapartment\s*#?\d/i,
  /\bunit\s+[a-z]\b/i,
  /\b(lane|ln|court|ct|circle|cir|drive|dr|way|place|pl|terrace|ter)\b$/i,
];

/** Patterns suggesting commercial address. */
const COMMERCIAL_PATTERNS = [
  /\bsuite\s+\d/i,
  /\bste\.?\s+\d/i,
  /\bfloor\s+\d/i,
  /\bfl\.?\s+\d/i,
  /\bindustrial\b/i,
  /\bcommerce\b/i,
  /\bparkway\b/i,
  /\bhighway\b/i,
  /\bhwy\b/i,
  /\bblvd\b/i,
  /\bavenue\b/i,
  /\bave\b/i,
];

/**
 * Analyze a carrier's physical and mailing addresses for red flags.
 * Pure heuristic analysis + URL generation, no external API calls.
 */
export function analyzeAddress(carrier: SocrataCarrier): AddressIntelligence {
  const phyStreet = carrier.phy_street?.trim() ?? "";
  const phyCity = carrier.phy_city?.trim() ?? "";
  const phyState = carrier.phy_state?.trim() ?? "";
  const phyZip = carrier.phy_zip?.trim() ?? "";
  const mailStreet = carrier.carrier_mailing_street?.trim() ?? "";

  const fullPhyAddress = [phyStreet, phyCity, phyState, phyZip].filter(Boolean).join(", ");
  const allAddressText = `${phyStreet} ${mailStreet}`.toLowerCase();

  // PO Box check
  const isPoBox =
    PO_BOX_PATTERNS.some((p) => p.test(phyStreet)) ||
    PO_BOX_PATTERNS.some((p) => p.test(mailStreet));

  // Virtual office check
  let isLikelyVirtualOffice = false;
  let virtualOfficeProvider: string | null = null;
  for (const { pattern, provider } of VIRTUAL_OFFICE_PATTERNS) {
    if (pattern.test(allAddressText)) {
      isLikelyVirtualOffice = true;
      virtualOfficeProvider = provider;
      break;
    }
  }

  // Also flag PMB (Private Mailbox) numbers — common with virtual offices
  if (!isLikelyVirtualOffice && /\bpmb\s*#?\d/i.test(allAddressText)) {
    isLikelyVirtualOffice = true;
    virtualOfficeProvider = "Private Mailbox (PMB)";
  }

  // Residential vs commercial heuristic
  const hasResidentialSignal = RESIDENTIAL_PATTERNS.some((p) => p.test(phyStreet));
  const hasCommercialSignal = COMMERCIAL_PATTERNS.some((p) => p.test(phyStreet));
  const isLikelyResidential = hasResidentialSignal && !hasCommercialSignal;

  // Build flags
  const flags: string[] = [];
  if (isPoBox) flags.push("PO Box address detected");
  if (isLikelyVirtualOffice) flags.push(`Virtual office: ${virtualOfficeProvider}`);
  if (isLikelyResidential) flags.push("Likely residential address");

  // Check mailing vs physical mismatch
  if (mailStreet && phyStreet) {
    const normalizedMail = mailStreet.toLowerCase().replace(/[^a-z0-9]/g, "");
    const normalizedPhy = phyStreet.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalizedMail !== normalizedPhy) {
      flags.push("Mailing address differs from physical address");
    }
  }

  // Google Maps and Street View URLs
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullPhyAddress || carrier.legal_name)}`;
  const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(fullPhyAddress)}`;

  return {
    isPoBox,
    isLikelyVirtualOffice,
    virtualOfficeProvider,
    isLikelyResidential,
    googleMapsUrl,
    streetViewUrl,
    flags,
  };
}
