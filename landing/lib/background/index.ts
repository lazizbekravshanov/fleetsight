import type { SocrataCarrier } from "@/lib/socrata";
import { searchCarriersByOfficer, searchCarriersByMailingAddress } from "@/lib/socrata";
import { searchOfficers } from "@/lib/opencorporates";
import { screenOfac } from "./ofac";
import { searchSamExclusions } from "./sam";
import { searchEdgar } from "./edgar";
import { searchCourtListener } from "./courtlistener";
import type {
  BackgroundData,
  OfficerCrossRef,
  OcOfficerCompany,
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

  // Fan out all checks in parallel
  const [
    officerCrossRefResults,
    mailingAddressResult,
    ofacResult,
    samResult,
    edgarResult,
    courtResult,
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
      const state = carrier.carrier_mailing_state?.trim();
      if (!street || !city || !state) return [];
      const carriers = await searchCarriersByMailingAddress(street, city, state, 20);
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

    // 6. CourtListener
    searchCourtListener(allNames),

    // 7+. OpenCorporates officer search (one per officer)
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

  const corporateAffiliations: OcOfficerCompany[] = [];
  for (const r of ocResults) {
    if (r.status === "fulfilled") {
      const val = r.value as OcOfficerCompany;
      if (val.companies.length > 0) corporateAffiliations.push(val);
    } else {
      errors.push("OpenCorporates officer search failed");
    }
  }

  return {
    officerCrossRefs,
    mailingAddressMatches,
    ofacMatches,
    samExclusions,
    edgarFilings,
    courtCases,
    corporateAffiliations,
    errors,
  };
}
