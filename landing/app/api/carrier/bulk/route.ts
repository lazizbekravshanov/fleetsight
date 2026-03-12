import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { jsonError } from "@/lib/http";
import { getCarrierByDot } from "@/lib/socrata";
import { getCarrierProfile, getCarrierAuthority, extractCarrierRecord } from "@/lib/fmcsa";
import { z } from "zod";

export const maxDuration = 60;

const bodySchema = z.object({
  dotNumbers: z.array(z.string().regex(/^\d{1,10}$/)).min(1).max(50),
});

type BulkResult = {
  dotNumber: string;
  legalName: string | null;
  usdotStatus: string | null;
  authorityStatus: string | null;
  powerUnits: number | null;
  phyState: string | null;
  riskGrade: "A" | "B" | "C" | "D" | "F" | null;
  riskScore: number | null;
  error?: string;
};

/** POST /api/carrier/bulk — screen multiple carriers by DOT number */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid request: " + parsed.error.issues[0]?.message, 400);

  const { dotNumbers } = parsed.data;

  // Process in parallel (up to 10 at a time)
  const results: BulkResult[] = await Promise.all(
    dotNumbers.map(async (dot): Promise<BulkResult> => {
      try {
        const dotNum = parseInt(dot, 10);
        const [carrier, profile, authority] = await Promise.all([
          getCarrierByDot(dotNum).catch(() => null),
          getCarrierProfile(dot).catch(() => null),
          getCarrierAuthority(dot).catch(() => null),
        ]);

        if (!carrier) {
          return { dotNumber: dot, legalName: null, usdotStatus: null, authorityStatus: null, powerUnits: null, phyState: null, riskGrade: null, riskScore: null, error: "Not found" };
        }

        // Extract FMCSA status
        let usdotStatus: string | null = null;
        const carrierRecord = extractCarrierRecord(profile);
        if (carrierRecord?.allowedToOperate === "Y") usdotStatus = "AUTHORIZED";
        else if (carrierRecord?.allowedToOperate === "N") usdotStatus = carrierRecord.oosDate ? "OUT-OF-SERVICE" : "NOT AUTHORIZED";

        // Extract authority status
        let authorityStatus: string | null = null;
        if (authority && typeof authority === "object") {
          const content = (authority as Record<string, unknown>).content;
          if (Array.isArray(content) && content.length > 0) {
            let hasActive = false;
            for (const entry of content) {
              const ca = (entry as Record<string, unknown>).carrierAuthority as Record<string, unknown> | undefined;
              if (ca?.commonAuthorityStatus === "A" || ca?.contractAuthorityStatus === "A" || ca?.brokerAuthorityStatus === "A") {
                hasActive = true;
                break;
              }
            }
            authorityStatus = hasActive ? "ACTIVE" : "NONE ACTIVE";
          }
        }

        // Quick risk scoring
        const { score, grade } = quickRiskScore(carrier, usdotStatus);

        return {
          dotNumber: dot,
          legalName: carrier.legal_name,
          usdotStatus,
          authorityStatus,
          powerUnits: carrier.power_units ? parseInt(carrier.power_units, 10) : null,
          phyState: carrier.phy_state ?? null,
          riskGrade: grade,
          riskScore: score,
        };
      } catch (err) {
        return { dotNumber: dot, legalName: null, usdotStatus: null, authorityStatus: null, powerUnits: null, phyState: null, riskGrade: null, riskScore: null, error: String(err) };
      }
    })
  );

  return Response.json({ results });
}

function quickRiskScore(
  carrier: Awaited<ReturnType<typeof getCarrierByDot>>,
  usdotStatus: string | null
): { score: number; grade: "A" | "B" | "C" | "D" | "F" } {
  if (!carrier) return { score: 0, grade: "F" };
  let score = 100;

  // Status penalties
  if (usdotStatus === "OUT-OF-SERVICE") score -= 50;
  else if (usdotStatus === "NOT AUTHORIZED") score -= 40;
  else if (!usdotStatus && carrier.status_code !== "A") score -= 30;

  // Prior revocation
  if (carrier.prior_revoke_flag === "Y") score -= 20;

  // New authority (<90 days)
  if (carrier.add_date) {
    const days = Math.floor((Date.now() - new Date(carrier.add_date).getTime()) / 86400000);
    if (days < 90) score -= 15;
    else if (days < 180) score -= 5;
  }

  // Hazmat without sufficient documentation
  if (carrier.hm_ind === "Y") score = Math.min(score, 85);

  score = Math.max(0, Math.min(100, score));

  const grade: "A" | "B" | "C" | "D" | "F" =
    score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : score >= 35 ? "D" : "F";

  return { score, grade };
}
