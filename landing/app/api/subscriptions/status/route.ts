import { getServerAuthSession } from "@/auth";
import { jsonError } from "@/lib/http";
import { getUserSubscription, getUserCarrierCount, getCarrierLimit } from "@/lib/subscriptions";

export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return jsonError("Unauthorized", 401);
  }

  const subscription = await getUserSubscription(session.user.id);
  if (!subscription || subscription.status !== "active") {
    return Response.json({
      active: false,
      tier: null,
      carrierCount: 0,
      carrierLimit: 0,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
  }

  const carrierCount = await getUserCarrierCount(session.user.id);
  const carrierLimit = getCarrierLimit(subscription.tier);

  return Response.json({
    active: true,
    tier: subscription.tier,
    carrierCount,
    carrierLimit: carrierLimit === Infinity ? "unlimited" : carrierLimit,
    currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  });
}
