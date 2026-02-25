import type { VoipResult } from "@/components/carrier/types";

/**
 * Known VoIP provider NPA-NXX (6-digit) prefixes.
 * These are area-code + exchange combinations heavily associated with VoIP providers.
 */
const VOIP_NPA_NXX: Record<string, string> = {
  // Google Voice — common prefixes
  "205718": "Google Voice", "209751": "Google Voice", "213375": "Google Voice",
  "215987": "Google Voice", "224301": "Google Voice", "228388": "Google Voice",
  "231392": "Google Voice", "240751": "Google Voice", "248752": "Google Voice",
  "253215": "Google Voice", "260358": "Google Voice", "267312": "Google Voice",
  "269762": "Google Voice", "281940": "Google Voice", "302304": "Google Voice",
  "310849": "Google Voice", "312488": "Google Voice", "314325": "Google Voice",
  "316212": "Google Voice", "323522": "Google Voice", "347952": "Google Voice",
  "404418": "Google Voice", "407520": "Google Voice", "408634": "Google Voice",
  "412223": "Google Voice", "469327": "Google Voice", "502509": "Google Voice",
  "503395": "Google Voice", "507200": "Google Voice", "510358": "Google Voice",
  "513399": "Google Voice", "515996": "Google Voice", "518201": "Google Voice",
  "530272": "Google Voice", "540999": "Google Voice", "559368": "Google Voice",
  "562292": "Google Voice", "567318": "Google Voice", "602618": "Google Voice",
  "612886": "Google Voice", "614364": "Google Voice", "616980": "Google Voice",
  "619363": "Google Voice", "626379": "Google Voice", "628263": "Google Voice",
  "630381": "Google Voice", "646470": "Google Voice", "650681": "Google Voice",
  "657239": "Google Voice", "661384": "Google Voice", "702625": "Google Voice",
  "703297": "Google Voice", "707266": "Google Voice", "708320": "Google Voice",
  "712310": "Google Voice", "713429": "Google Voice", "714400": "Google Voice",
  "720630": "Google Voice", "724352": "Google Voice", "731200": "Google Voice",
  "737201": "Google Voice", "740236": "Google Voice", "747282": "Google Voice",
  "757208": "Google Voice", "760421": "Google Voice", "770686": "Google Voice",
  "773313": "Google Voice", "775238": "Google Voice", "786301": "Google Voice",
  "801613": "Google Voice", "804398": "Google Voice", "805219": "Google Voice",
  "806319": "Google Voice", "808791": "Google Voice", "812210": "Google Voice",
  "813440": "Google Voice", "816200": "Google Voice", "817203": "Google Voice",
  "818237": "Google Voice", "831226": "Google Voice", "843701": "Google Voice",
  "847791": "Google Voice", "848218": "Google Voice", "850739": "Google Voice",
  "854200": "Google Voice", "856285": "Google Voice", "862368": "Google Voice",
  "864561": "Google Voice", "872200": "Google Voice", "901300": "Google Voice",
  "904474": "Google Voice", "909292": "Google Voice", "910303": "Google Voice",
  "916538": "Google Voice", "917675": "Google Voice", "918248": "Google Voice",
  "919926": "Google Voice", "925399": "Google Voice", "929431": "Google Voice",
  "937203": "Google Voice", "940231": "Google Voice", "949432": "Google Voice",
  "951290": "Google Voice", "952222": "Google Voice", "954998": "Google Voice",
  "970238": "Google Voice", "972657": "Google Voice", "978684": "Google Voice",

  // TextNow
  "226788": "TextNow", "289301": "TextNow", "365240": "TextNow",
  "438788": "TextNow", "548788": "TextNow", "639788": "TextNow",

  // Bandwidth.com (bulk VoIP)
  "470788": "Bandwidth", "678788": "Bandwidth", "770788": "Bandwidth",

  // RingCentral
  "650264": "RingCentral", "669305": "RingCentral",

  // Grasshopper
  "800358": "Grasshopper", "844358": "Grasshopper", "855358": "Grasshopper",
  "866358": "Grasshopper", "877358": "Grasshopper", "888358": "Grasshopper",

  // OpenPhone
  "332200": "OpenPhone", "415937": "OpenPhone",

  // Vonage
  "201531": "Vonage", "732981": "Vonage",
};

/** NPA (area code) overlay codes heavily associated with VoIP services */
const VOIP_OVERLAY_NPAS = new Set([
  "329", "332", "346", "364", "380", "445", "463", "464",
  "548", "628", "656", "657", "667", "669", "726", "737",
  "743", "747", "762", "820", "826", "838", "854", "930",
  "934", "938", "945", "959", "980", "984",
]);

function normalize(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits[0] === "1") return digits.slice(1);
  if (digits.length === 10) return digits;
  return null;
}

export function checkVoipIndicators(phone: string | undefined): VoipResult {
  if (!phone) return { isLikelyVoip: false, reason: null, provider: null };

  const digits = normalize(phone);
  if (!digits) return { isLikelyVoip: false, reason: null, provider: null };

  const npaNxx = digits.slice(0, 6);
  const npa = digits.slice(0, 3);

  // Check specific NPA-NXX
  const provider = VOIP_NPA_NXX[npaNxx];
  if (provider) {
    return {
      isLikelyVoip: true,
      reason: `Phone prefix ${npaNxx} is assigned to ${provider}`,
      provider,
    };
  }

  // Check VoIP-heavy overlay codes
  if (VOIP_OVERLAY_NPAS.has(npa)) {
    return {
      isLikelyVoip: true,
      reason: `Area code ${npa} is a VoIP-heavy overlay code`,
      provider: null,
    };
  }

  return { isLikelyVoip: false, reason: null, provider: null };
}
