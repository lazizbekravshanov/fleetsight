export type OpenClawSkillClient = {
  baseUrl: string;
  token: string;
};

async function request(client: OpenClawSkillClient, path: string) {
  const res = await fetch(`${client.baseUrl}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${client.token}`,
      Accept: "application/json"
    }
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`FleetSight API error (${res.status}): ${body}`);
  }

  return res.json();
}

export async function getCarrierProfile(client: OpenClawSkillClient, dotNumber: string) {
  return request(client, `/api/openclaw/carriers/${dotNumber}`);
}

export async function getCarrierBasics(client: OpenClawSkillClient, dotNumber: string) {
  return request(client, `/api/openclaw/carriers/${dotNumber}/basics`);
}

export async function summarizeRisk(client: OpenClawSkillClient, dotNumber: string) {
  const [profilePayload, basicsPayload] = await Promise.all([
    getCarrierProfile(client, dotNumber),
    getCarrierBasics(client, dotNumber)
  ]);

  const carrier = profilePayload?.carrier || {};
  const legalName = carrier.legalName || carrier.legal_name || "Unknown Carrier";
  const status = carrier.operatingStatus || carrier.status || "Unknown";
  const basics = basicsPayload?.basics?.content?.basics || basicsPayload?.basics || [];
  const basicsCount = Array.isArray(basics) ? basics.length : 0;

  return {
    dotNumber,
    summary: `${legalName} status=${status}; basics_records=${basicsCount}`,
    profile: profilePayload,
    basics: basicsPayload
  };
}
