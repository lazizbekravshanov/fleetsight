import { NextRequest } from "next/server";
import { z } from "zod";
import { getServerAuthSession } from "@/auth";
import { jsonError } from "@/lib/http";
import { getStripe, CREDIT_PACKS } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  packId: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return jsonError("Authentication required", 401);
  }

  const payload = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError("Invalid request body", 400);
  }

  const pack = CREDIT_PACKS.find((p) => p.id === parsed.data.packId);
  if (!pack) {
    return jsonError("Invalid pack ID", 400);
  }

  const stripe = getStripe();

  // Look up or create Stripe customer
  let stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { userId: session.user.id },
  });

  if (!stripeCustomer) {
    const customer = await stripe.customers.create({
      email: session.user.email ?? undefined,
      metadata: { userId: session.user.id },
    });
    stripeCustomer = await prisma.stripeCustomer.create({
      data: {
        userId: session.user.id,
        stripeCustomerId: customer.id,
      },
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomer.stripeCustomerId,
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: pack.priceCents,
          product_data: {
            name: `FleetSight ${pack.label}`,
            description: `${pack.credits} AI credits for FleetSight`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: session.user.id,
      packId: pack.id,
      credits: String(pack.credits),
    },
    success_url: `${appUrl}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/credits/cancel`,
  });

  return Response.json({ url: checkoutSession.url });
}
