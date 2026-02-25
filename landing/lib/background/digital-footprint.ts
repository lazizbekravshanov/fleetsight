import type { SocrataCarrier } from "@/lib/socrata";
import type { DigitalFootprint, SearchLink } from "@/components/carrier/types";

/** Known free email providers — if the carrier uses one, there's no company website. */
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
  "icloud.com", "mail.com", "protonmail.com", "zoho.com", "yandex.com",
  "live.com", "msn.com", "comcast.net", "att.net", "verizon.net",
  "sbcglobal.net", "bellsouth.net", "charter.net", "cox.net", "earthlink.net",
  "juno.com", "netzero.net", "optonline.net", "frontier.com", "windstream.net",
]);

/** State SoS business search URLs. */
const SOS_SEARCH_URLS: Record<string, string> = {
  AL: "https://arc-sos.state.al.us/cgi/corpname.mbr/output",
  AK: "https://www.commerce.alaska.gov/cbp/main/search/entities",
  AZ: "https://ecorp.azcc.gov/EntitySearch/Index",
  AR: "https://www.sos.arkansas.gov/corps/search_all.php",
  CA: "https://bizfileonline.sos.ca.gov/search/business",
  CO: "https://www.sos.state.co.us/biz/BusinessEntityCriteriaExt.do",
  CT: "https://service.ct.gov/business/s/onlinebusinesssearch",
  DE: "https://icis.corp.delaware.gov/ecorp/entitysearch/namesearch.aspx",
  FL: "https://search.sunbiz.org/Inquiry/CorporationSearch/ByName",
  GA: "https://ecorp.sos.ga.gov/BusinessSearch",
  HI: "https://hbe.ehawaii.gov/documents/search.html",
  ID: "https://sosbiz.idaho.gov/search/business",
  IL: "https://www.ilsos.gov/corporatellc/CorporateLlcController",
  IN: "https://bsd.sos.in.gov/publicbusinesssearch",
  IA: "https://sos.iowa.gov/search/business/(S(0))/search.aspx",
  KS: "https://www.sos.ks.gov/business/business-entities.html",
  KY: "https://web.sos.ky.gov/bussearchnew/search",
  LA: "https://coraweb.sos.la.gov/commercialsearch/commercialsearch.aspx",
  ME: "https://icrs.informe.org/nei-sos-icrs/ICRS",
  MD: "https://egov.maryland.gov/BusinessExpress/EntitySearch",
  MA: "https://corp.sec.state.ma.us/corpweb/CorpSearch/CorpSearch.aspx",
  MI: "https://cofs.lara.state.mi.us/corpweb/CorpSearch/CorpSearch.aspx",
  MN: "https://mblsportal.sos.state.mn.us/Business/Search",
  MS: "https://charities.sos.ms.gov/online/Portal/ch/page/charities-search/Portal.aspx",
  MO: "https://bsd.sos.mo.gov/BusinessEntity/BESearch.aspx",
  MT: "https://biz.sosmt.gov/search",
  NE: "https://www.nebraska.gov/sos/corp/corpsearch.cgi",
  NV: "https://esos.nv.gov/EntitySearch/OnlineEntitySearch",
  NH: "https://quickstart.sos.nh.gov/online/BusinessInquire",
  NJ: "https://www.njportal.com/DOR/BusinessNameSearch",
  NM: "https://portal.sos.state.nm.us/BFS/online/CorporationBusinessSearch",
  NY: "https://apps.dos.ny.gov/publicInquiry/",
  NC: "https://www.sosnc.gov/online_services/search/by_title/_Business_Registration",
  ND: "https://firststop.sos.nd.gov/search/business",
  OH: "https://businesssearch.ohiosos.gov",
  OK: "https://www.sos.ok.gov/corp/corpInquiryFind.aspx",
  OR: "https://sos.oregon.gov/business/pages/find.aspx",
  PA: "https://www.corporations.pa.gov/search/corpsearch",
  RI: "https://business.sos.ri.gov/CorpWeb/CorpSearch/CorpSearch.aspx",
  SC: "https://businessfilings.sc.gov/BusinessFiling/Entity/Search",
  SD: "https://sosenterprise.sd.gov/BusinessServices/Business/FilingSearch.aspx",
  TN: "https://tnbear.tn.gov/Ecommerce/FilingSearch.aspx",
  TX: "https://mycpa.cpa.state.tx.us/coa/",
  UT: "https://secure.utah.gov/bes/",
  VT: "https://bizfilings.vermont.gov/online/BusinessInquire",
  VA: "https://cis.scc.virginia.gov/EntitySearch/Index",
  WA: "https://ccfs.sos.wa.gov/#/",
  WV: "https://apps.wv.gov/SOS/BusinessEntity/",
  WI: "https://www.wdfi.org/apps/CorpSearch/Search.aspx",
  WY: "https://wyobiz.wyo.gov/Business/FilingSearch.aspx",
  DC: "https://corponline.dcra.dc.gov/BizEntity.aspx/Search",
};

/** State UCC search URLs. */
const UCC_SEARCH_URLS: Record<string, string> = {
  AL: "https://arc-sos.state.al.us/cgi/uccname.mbr/output",
  CA: "https://bizfileonline.sos.ca.gov/search/ucc",
  CO: "https://www.sos.state.co.us/UCC/Pages/Results.aspx",
  DE: "https://icis.corp.delaware.gov/ucc/uccsearch.aspx",
  FL: "https://search.sunbiz.org/Inquiry/UCCFiling/SearchByName",
  GA: "https://ecorp.sos.ga.gov/UCCSearch",
  IL: "https://www.ilsos.gov/UCC/UCCSearch.html",
  IN: "https://bsd.sos.in.gov/publicuccsearch",
  MD: "https://egov.maryland.gov/BusinessExpress/UCCSearch",
  MI: "https://cofs.lara.state.mi.us/uccweb/UCCSearch/UCCSearch.aspx",
  MN: "https://mblsportal.sos.state.mn.us/UCC/Search",
  MO: "https://bsd.sos.mo.gov/UCC/UCCSearch.aspx",
  NV: "https://esos.nv.gov/UCCSearch/OnlineUCCSearch",
  NJ: "https://www.njportal.com/DOR/UCCSearch",
  NY: "https://appext20.dos.ny.gov/pls/ucc_public/web_search.main_frame",
  NC: "https://www.sosnc.gov/online_services/search/by_title/_UCC",
  OH: "https://www5.sos.state.oh.us/ords/f?p=UCC",
  PA: "https://www.corporations.pa.gov/ucc/uccsearch",
  TX: "https://direct.sos.state.tx.us/ucc/ucc-fs.asp",
  VA: "https://cis.scc.virginia.gov/UCCSearch/Index",
  WA: "https://ccfs.sos.wa.gov/#/UCCSearch",
  WI: "https://www.wdfi.org/apps/UCCSearch/Search.aspx",
};

/**
 * Build a digital footprint for a carrier: website, social links, D&B, BBB, SoS, UCC.
 * Pure computation + URL generation, no external API calls.
 */
export function buildDigitalFootprint(carrier: SocrataCarrier): DigitalFootprint {
  const companyName = carrier.legal_name ?? "";
  const state = carrier.phy_state?.trim().toUpperCase() ?? "";
  const encodedName = encodeURIComponent(companyName);

  // Extract domain from email
  let emailDomain: string | null = null;
  let websiteDomain: string | null = null;
  let websiteUrl: string | null = null;

  const email = carrier.email_address?.trim();
  if (email && email.includes("@")) {
    emailDomain = email.split("@")[1].toLowerCase();
    if (!FREE_EMAIL_DOMAINS.has(emailDomain)) {
      websiteDomain = emailDomain;
      websiteUrl = `https://${emailDomain}`;
    }
  }

  // D&B
  const dnbNumber = carrier.dun_bradstreet_no?.trim() || null;
  const dnbUrl = dnbNumber
    ? `https://www.dnb.com/business-directory/company-profiles.${dnbNumber}.html`
    : null;

  // BBB
  const bbbSearchUrl = companyName
    ? `https://www.bbb.org/search?find_text=${encodedName}${state ? `&find_loc=${state}` : ""}`
    : null;

  // SoS deep link
  const sosDeepLink = state && SOS_SEARCH_URLS[state] ? SOS_SEARCH_URLS[state] : null;

  // UCC search link
  const uccSearchUrl = state && UCC_SEARCH_URLS[state] ? UCC_SEARCH_URLS[state] : null;

  // Company search links
  const companySearchLinks: SearchLink[] = [
    {
      label: "Google",
      url: `https://www.google.com/search?q=${encodedName}+${state}+trucking`,
      category: "search",
    },
    {
      label: "LinkedIn",
      url: `https://www.linkedin.com/search/results/companies/?keywords=${encodedName}`,
      category: "social",
    },
    {
      label: "Facebook",
      url: `https://www.facebook.com/search/pages/?q=${encodedName}`,
      category: "social",
    },
    {
      label: "Google Maps",
      url: buildGoogleMapsUrl(carrier),
      category: "search",
    },
    {
      label: "Yelp",
      url: `https://www.yelp.com/search?find_desc=${encodedName}&find_loc=${state}`,
      category: "search",
    },
    {
      label: "Carrier411",
      url: `https://www.carrier411.com/search/?mc=&dot=${carrier.dot_number}&searchtype=carrier`,
      category: "business",
    },
  ];

  if (dnbUrl) {
    companySearchLinks.push({ label: "D&B", url: dnbUrl, category: "business" });
  }
  if (bbbSearchUrl) {
    companySearchLinks.push({ label: "BBB", url: bbbSearchUrl, category: "business" });
  }

  // Officer search links
  const officers: string[] = [];
  if (carrier.company_officer_1?.trim()) officers.push(carrier.company_officer_1.trim());
  if (carrier.company_officer_2?.trim()) officers.push(carrier.company_officer_2.trim());

  const officerSearchLinks = officers.map((name) => {
    const encName = encodeURIComponent(name);
    const links: SearchLink[] = [
      {
        label: "LinkedIn",
        url: `https://www.linkedin.com/search/results/people/?keywords=${encName}`,
        category: "social",
      },
      {
        label: "Google",
        url: `https://www.google.com/search?q="${encName}"+${encodedName}`,
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
    ];
    return { officerName: name, links };
  });

  return {
    websiteDomain,
    websiteUrl,
    emailDomain,
    dnbNumber,
    dnbUrl,
    bbbSearchUrl,
    companySearchLinks,
    officerSearchLinks,
    sosDeepLink,
    uccSearchUrl,
  };
}

function buildGoogleMapsUrl(carrier: SocrataCarrier): string {
  const parts = [
    carrier.phy_street,
    carrier.phy_city,
    carrier.phy_state,
    carrier.phy_zip,
  ].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts || carrier.legal_name)}`;
}
