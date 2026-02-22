const BASE_URL = "https://mobile.fmcsa.dot.gov/qc/services";

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export class FmcsaHttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getWebKey(): string {
  const webKey = process.env.FMCSA_WEBKEY;
  if (!webKey) {
    throw new Error("FMCSA_WEBKEY is not configured");
  }
  return webKey;
}

async function fetchJson(pathname: string): Promise<unknown> {
  const cacheKey = pathname;
  const now = Date.now();
  const cached = CACHE.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const url = new URL(`${BASE_URL}/${pathname.replace(/^\/+/, "")}`);
  url.searchParams.set("webKey", getWebKey());

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!res.ok) {
    throw new FmcsaHttpError(res.status, `FMCSA request failed with status ${res.status}`);
  }

  const json = await res.json();
  CACHE.set(cacheKey, { value: json, expiresAt: now + CACHE_TTL_MS });
  return json;
}

export async function getCarrierProfile(dotNumber: string): Promise<unknown> {
  return fetchJson(`carriers/${encodeURIComponent(dotNumber)}`);
}

export async function getCarrierBasics(dotNumber: string): Promise<unknown> {
  return fetchJson(`carriers/${encodeURIComponent(dotNumber)}/basics`);
}

export async function getCarrierAuthority(dotNumber: string): Promise<unknown> {
  return fetchJson(`carriers/${encodeURIComponent(dotNumber)}/authority`);
}

export async function getCarrierOos(dotNumber: string): Promise<unknown> {
  return fetchJson(`carriers/${encodeURIComponent(dotNumber)}/oos`);
}

export function extractCarrierRecord(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Record<string, unknown>;

  if (candidate.content && typeof candidate.content === "object") {
    const content = candidate.content as Record<string, unknown>;

    if (Array.isArray(content.carrier) && content.carrier[0] && typeof content.carrier[0] === "object") {
      return content.carrier[0] as Record<string, unknown>;
    }

    if (content.carrier && typeof content.carrier === "object") {
      return content.carrier as Record<string, unknown>;
    }
  }

  if (candidate.carrier && typeof candidate.carrier === "object") {
    return candidate.carrier as Record<string, unknown>;
  }

  return null;
}

export function toRiskSummary(profile: unknown, basics: unknown): string {
  const carrier = extractCarrierRecord(profile) ?? {};
  const legalName = String(carrier.legalName || carrier.legal_name || "Unknown Carrier");
  const status = String(carrier.operatingStatus || carrier.status || "Unknown");

  let basicCount = 0;
  if (basics && typeof basics === "object") {
    const obj = basics as Record<string, unknown>;
    const measures = obj.content && typeof obj.content === "object"
      ? (obj.content as Record<string, unknown>).basics
      : obj.basics;

    if (Array.isArray(measures)) {
      basicCount = measures.length;
    }
  }

  return `${legalName} is currently marked as ${status}. Retrieved ${basicCount} BASIC measure records from FMCSA.`;
}
