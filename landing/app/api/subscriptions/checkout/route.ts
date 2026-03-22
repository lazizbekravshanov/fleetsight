import { NextRequest } from "next/server";
import { getServerAuthSession } from "@/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createSubscriptionCheckout, getStripe } from "@/lib/stripe";
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from "@/lib/subscriptions";

export async function POST(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return jsonError("Unauthorized", 401);
  }

  const body = await req.json().catch(() => ({}));
  const tier = body.tier as string;
  if (!tier || !(tier in SUBSCRIPTION_TIERS)) {
    return jsonError("Invalid tier", 400);
  }

  const tierConfig = SUBSCRIPTION_TIERS[tier as SubscriptionTier];
  if (!tierConfig.stripePriceId) {
    return jsonError("Stripe price not configured for this tier", 500);
  }

  // Check for existing active subscription
  const existing = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });
  if (existing && existing.status === "active") {
    return jsonError("You already have an active subscription. Use the portal to upgrade.", 409);
  }

  // Get or create Stripe customer
  let stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { userId: session.user.id },
  });
  if (!stripeCustomer) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });
    const customer = await getStripe().customers.create({
      email: user?.email ?? undefined,
      metadata: { userId: session.user.id },
    });
    stripeCustomer = await prisma.stripeCustomer.create({
      data: {
        userId: session.user.id,
        stripeCustomerId: customer.id,
      },
    });
  }

  const origin = req.headers.get("origin") ?? "https://fleetsight.vercel.app";
  const checkoutSession = await createSubscriptionCheckout({
    customerId: stripeCustomer.stripeCustomerId,
    priceId: tierConfig.stripePriceId,
    userId: session.user.id,
    successUrl: `${origin}/dashboard?subscription=success`,
    cancelUrl: `${origin}/dashboard?subscription=cancelled`,
  });

  return Response.json({ url: checkoutSession.url });
}
