import { getServerAuthSession } from "@/auth";
import { deductCredit } from "@/lib/credits";

type GateResult =
  | { allowed: true; userId: string; remaining: number }
  | { allowed: false; reason: "not_authenticated" | "no_credits" };

export async function gateAiFeature(
  featureType: string,
  reference?: string
): Promise<GateResult> {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return { allowed: false, reason: "not_authenticated" };
  }

  const { success, remaining } = await deductCredit(session.user.id, featureType, reference);
  if (!success) {
    return { allowed: false, reason: "no_credits" };
  }

  return { allowed: true, userId: session.user.id, remaining };
}
