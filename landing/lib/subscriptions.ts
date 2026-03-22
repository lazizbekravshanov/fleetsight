import { prisma } from "@/lib/prisma";

export type SubscriptionTier = "starter" | "professional" | "enterprise";

export type TierConfig = {
  name: string;
  tier: SubscriptionTier;
  priceCents: number;
  priceLabel: string;
  carrierLimit: number;
  stripePriceId: string;
};

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierConfig> = {
  starter: {
    name: "Starter",
    tier: "starter",
    priceCents: 4900,
    priceLabel: "$49/mo",
    carrierLimit: 50,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID ?? "",
  },
  professional: {
    name: "Professional",
    tier: "professional",
    priceCents: 14900,
    priceLabel: "$149/mo",
    carrierLimit: 200,
    stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID ?? "",
  },
  enterprise: {
    name: "Enterprise",
    tier: "enterprise",
    priceCents: 49900,
    priceLabel: "$499/mo",
    carrierLimit: Infinity,
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "",
  },
};

export function getTierByPriceId(priceId: string): TierConfig | null {
  for (const tier of Object.values(SUBSCRIPTION_TIERS)) {
    if (tier.stripePriceId === priceId) return tier;
  }
  return null;
}

export function getCarrierLimit(tier: string): number {
  const config = SUBSCRIPTION_TIERS[tier as SubscriptionTier];
  return config?.carrierLimit ?? 0;
}

export async function getUserSubscription(userId: string) {
  return prisma.subscription.findUnique({
    where: { userId },
  });
}

export async function getUserCarrierCount(userId: string): Promise<number> {
  const rosters = await prisma.monitoredRoster.findMany({
    where: { userId },
    select: { id: true },
  });
  if (rosters.length === 0) return 0;

  return prisma.rosterCarrier.count({
    where: { rosterId: { in: rosters.map((r) => r.id) } },
  });
}

export async function canAddCarriers(
  userId: string,
  tier: string,
  count: number
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const limit = getCarrierLimit(tier);
  const current = await getUserCarrierCount(userId);
  return {
    allowed: current + count <= limit,
    current,
    limit,
  };
}
