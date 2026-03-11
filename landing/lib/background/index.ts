import type { SocrataCarrier } from "@/lib/socrata";
import { searchCarriersByOfficer, searchCarriersByMailingAddress } from "@/lib/socrata";
import { searchOfficers } from "@/lib/opencorporates";
import { screenOfac } from "./ofac";
import { searchSamExclusions } from "./sam";
import { searchEdgar } from "./edgar";
import { searchCourtListener, searchBankruptcy } from "./courtlistener";
import { buildDigitalFootprint } from "./digital-footprint";
import { searchOshaViolations } from "./osha";
import { searchEpaEnforcement } from "./epa";
import { analyzeAddress } from "./address-intel";
import type {
  BackgroundData,
  OfficerCrossRef,
  OfficerProfile,
  OcOfficerCompany,
  DigitalFootprint,
  AddressIntelligence,
  OshaViolation,
  EpaEnforcement,
  BankruptcyCase,
  SearchLink,
} from "@/components/carrier/types";

/**
 * Extract officer names and company name from a carrier record.
 */
function extractNames(carrier: SocrataCarrier): {
  companyName: string;
  officers: string[];
  allNames: string[];
} {
  const companyName = carrier.legal_name ?? "";
  const officers: string[] = [];
  if (carrier.company_officer_1?.trim()) officers.push(carrier.company_officer_1.trim());
  if (carrier.company_officer_2?.trim()) officers.push(carrier.company_officer_2.trim());
  const allNames = [companyName, ...officers].filter(Boolean);
  return { companyName, officers, allNames };
}

/**
 * Run all background checks in parallel via Promise.allSettled.
 * Returns partial results even when some external APIs fail.
 */
export async function runBackgroundChecks(
  carrier: SocrataCarrier
): Promise<BackgroundData> {
  const { companyName, officers, allNames } = extractNames(carrier);
  const errors: string[] = [];
  const dotNumber = carrier.dot_number;
  const state = carrier.phy_state?.trim();

  // Synchronous checks (no API calls)
  let digitalFootprint: DigitalFootprint | null = null;
  let addressIntelligence: AddressIntelligence | null = null;
  try {
    digitalFootprint = buildDigitalFootprint(carrier);
  } catch {
    errors.push("Digital footprint analysis failed");
  }
  try {
    addressIntelligence = analyzeAddress(carrier);
  } catch {
    errors.push("Address intelligence failed");
  }

  // Fan out all async checks in parallel
  const [
    officerCrossRefResults,
    mailingAddressResult,
    ofacResult,
    samResult,
    edgarResult,
    courtResult,
    bankruptcyResult,
    oshaResult,
    epaResult,
    ...ocResults
  ] = await Promise.allSettled([
    // 1. Officer cross-references (one query per officer)
    Promise.all(
      officers.map(async (name): Promise<OfficerCrossRef> => {
        const carriers = await searchCarriersByOfficer(name, 20);
        return {
          officerName: name,
          carriers: carriers
            .filter((c) => c.dot_number !== dotNumber)
            .map((c) => ({
              dotNumber: c.dot_number,
              legalName: c.legal_name,
              statusCode: c.status_code,
            })),
        };
      })
    ),

    // 2. Mailing address cross-reference
    (async () => {
      const street = carrier.carrier_mailing_street?.trim();
      const city = carrier.carrier_mailing_city?.trim();
      const mailState = carrier.carrier_mailing_state?.trim();
      if (!street || !city || !mailState) return [];
      const carriers = await searchCarriersByMailingAddress(street, city, mailState, 20);
      return carriers
        .filter((c) => c.dot_number !== dotNumber)
        .map((c) => ({
          dotNumber: c.dot_number,
          legalName: c.legal_name,
          statusCode: c.status_code,
        }));
    })(),

    // 3. OFAC screening (pure in-process)
    Promise.resolve(screenOfac(allNames)),

    // 4. SAM.gov exclusions
    searchSamExclusions(allNames),

    // 5. SEC EDGAR
    searchEdgar(companyName, officers),

    // 6. CourtListener (federal litigation)
    searchCourtListener(allNames),

    // 7. Bankruptcy search
    searchBankruptcy(allNames),

    // 8. OSHA violations
    searchOshaViolations(companyName, state),

    // 9. EPA enforcement
    searchEpaEnforcement(companyName, state),

    // 10+. OpenCorporates officer search (one per officer)
    ...officers.map((name) => searchOfficers(name, 5)),
  ]);

  // Collect results with error tracking
  let officerCrossRefs: OfficerCrossRef[] = [];
  if (officerCrossRefResults.status === "fulfilled") {
    officerCrossRefs = officerCrossRefResults.value;
  } else {
    errors.push("Officer cross-reference search failed");
  }

  let mailingAddressMatches: { dotNumber: string; legalName: string; statusCode?: string }[] = [];
  if (mailingAddressResult.status === "fulfilled") {
    mailingAddressMatches = mailingAddressResult.value;
  } else {
    errors.push("Mailing address search failed");
  }

  const ofacMatches = ofacResult.status === "fulfilled" ? ofacResult.value : [];
  if (ofacResult.status === "rejected") errors.push("OFAC screening failed");

  const samExclusions = samResult.status === "fulfilled" ? samResult.value : [];
  if (samResult.status === "rejected") errors.push("SAM.gov search failed");

  const edgarFilings = edgarResult.status === "fulfilled" ? edgarResult.value : [];
  if (edgarResult.status === "rejected") errors.push("SEC EDGAR search failed");

  const courtCases = courtResult.status === "fulfilled" ? courtResult.value : [];
  if (courtResult.status === "rejected") errors.push("Court records search failed");

  const bankruptcyCases: BankruptcyCase[] = bankruptcyResult.status === "fulfilled" ? bankruptcyResult.value : [];
  if (bankruptcyResult.status === "rejected") errors.push("Bankruptcy search failed");

  const oshaViolations: OshaViolation[] = oshaResult.status === "fulfilled" ? oshaResult.value : [];
  if (oshaResult.status === "rejected") errors.push("OSHA violation search failed");

  const epaEnforcements: EpaEnforcement[] = epaResult.status === "fulfilled" ? epaResult.value : [];
  if (epaResult.status === "rejected") errors.push("EPA enforcement search failed");

  const corporateAffiliations: OcOfficerCompany[] = [];
  for (const r of ocResults) {
    if (r.status === "fulfilled") {
      const val = r.value as OcOfficerCompany;
      if (val.companies.length > 0) corporateAffiliations.push(val);
    } else {
      errors.push("OpenCorporates officer search failed");
    }
  }

  // Build consolidated per-officer profiles
  const officerProfiles: OfficerProfile[] = officers.map((name, i) => {
    // Carrier cross-refs for this officer
    const crossRef = officerCrossRefs.find((r) => r.officerName === name);
    const carrierRefs = crossRef?.carriers ?? [];

    // Corporate roles (OpenCorporates, with position/dates)
    const ocEntry = ocResults[i];
    const corporateRoles =
      ocEntry?.status === "fulfilled"
        ? (ocEntry.value as OcOfficerCompany).companies
        : [];

    // OFAC matches attributed to this officer by queriedName
    const ofacForOfficer = ofacMatches.filter((m) => m.queriedName === name);

    // SAM exclusions where officer name appears
    const nameLower = name.toLowerCase();
    const samForOfficer = samExclusions.filter((e) =>
      e.name.toLowerCase().includes(nameLower)
    );

    // Federal court cases mentioning this officer's name in the case title
    const courtsForOfficer = courtCases.filter((c) =>
      c.caseName.toLowerCase().includes(nameLower)
    );

    // Bankruptcy cases mentioning this officer
    const bankruptciesForOfficer = bankruptcyCases.filter((c) =>
      c.caseName.toLowerCase().includes(nameLower)
    );

    // Government & public record search links for this officer
    const encName = encodeURIComponent(name);
    const searchLinks: SearchLink[] = [
      {
        label: "LinkedIn",
        url: `https://www.linkedin.com/search/results/people/?keywords=${encName}`,
        category: "social",
      },
      {
        label: "Google",
        url: `https://www.google.com/search?q="${encName}"+trucking+carrier`,
        category: "search",
      },
      {
        label: "OpenCorporates",
        url: `https://opencorporates.com/officers?q=${encName}&jurisdiction_code=us`,
        category: "registry",
      },
      {
        label: "CourtListener",
        url: `https://www.courtlistener.com/?q="${encName}"&type=r`,
        category: "search",
      },
      {
        label: "SAM.gov",
        url: `https://sam.gov/search/?keywords=${encName}&index=ei`,
        category: "registry",
      },
      {
        label: "OFAC Search",
        url: `https://sanctionssearch.ofac.treas.gov/`,
        category: "registry",
      },
      {
        label: "DOL Enforcement",
        url: `https://enforcedata.dol.gov/views/data_catalogs.php`,
        category: "registry",
      },
    ];

    return {
      name,
      carrierRefs,
      corporateRoles,
      ofacMatches: ofacForOfficer,
      samExclusions: samForOfficer,
      courtCases: courtsForOfficer,
      bankruptcyCases: bankruptciesForOfficer,
      searchLinks,
    };
  });

  return {
    officerProfiles,
    officerCrossRefs,
    mailingAddressMatches,
    ofacMatches,
    samExclusions,
    edgarFilings,
    courtCases,
    corporateAffiliations,
    digitalFootprint,
    addressIntelligence,
    oshaViolations,
    epaEnforcements,
    bankruptcyCases,
    riskNarrative: null,
    errors,
  };
}
