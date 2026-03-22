import { NextRequest } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { grantCredits } from "@/lib/credits";
import { getTierByPriceId } from "@/lib/subscriptions";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(`Webhook signature verification failed: ${message}`, {
      status: 400,
    });
  }

  // Log webhook event
  await prisma.webhookEvent.create({
    data: {
      source: "stripe",
      type: event.type,
      payloadJson: JSON.stringify(event.data),
    },
  });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;

    // Handle credit pack purchases (mode: "payment")
    if (session.mode === "payment") {
      const credits = parseInt(session.metadata?.credits ?? "0", 10);
      const packId = session.metadata?.packId;

      if (!userId || !credits || !packId) {
        return new Response("Missing metadata", { status: 400 });
      }

      const existing = await prisma.creditPurchase.findUnique({
        where: { stripeCheckoutSessionId: session.id },
      });

      if (!existing) {
        const pack = (await import("@/lib/stripe")).CREDIT_PACKS.find(
          (p) => p.id === packId
        );

        await prisma.creditPurchase.create({
          data: {
            userId,
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : null,
            packCredits: credits,
            packPriceCents: pack?.priceCents ?? 0,
            status: "completed",
          },
        });

        await grantCredits(userId, credits, "purchase", session.id);
      }
    }
    // Subscription checkouts are handled via customer.subscription.created
  }

  // ── Subscription lifecycle events ───────────────────────────

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const sub = event.data.object as unknown as Record<string, unknown>;
    const metadata = sub.metadata as Record<string, string> | undefined;
    const userId = metadata?.userId;
    if (!userId) return new Response("ok", { status: 200 });

    const items = sub.items as { data?: { price?: { id?: string } }[] } | undefined;
    const priceId = items?.data?.[0]?.price?.id;
    const tierConfig = priceId ? getTierByPriceId(priceId) : null;
    const tier = tierConfig?.tier ?? "starter";

    const periodStart = typeof sub.current_period_start === "number" ? sub.current_period_start : Math.floor(Date.now() / 1000);
    const periodEnd = typeof sub.current_period_end === "number" ? sub.current_period_end : Math.floor(Date.now() / 1000) + 30 * 86400;

    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        tier,
        status: String(sub.status ?? "active"),
        stripeSubscriptionId: String(sub.id),
        stripePriceId: priceId ?? "",
        currentPeriodStart: new Date(periodStart * 1000),
        currentPeriodEnd: new Date(periodEnd * 1000),
        cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      },
      update: {
        tier,
        status: String(sub.status ?? "active"),
        stripePriceId: priceId ?? "",
        currentPeriodStart: new Date(periodStart * 1000),
        currentPeriodEnd: new Date(periodEnd * 1000),
        cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      },
    });
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as unknown as Record<string, unknown>;
    const metadata = sub.metadata as Record<string, string> | undefined;
    const userId = metadata?.userId;
    if (userId) {
      await prisma.subscription.updateMany({
        where: { userId, stripeSubscriptionId: String(sub.id) },
        data: { status: "canceled" },
      });
    }
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as unknown as Record<string, unknown>;
    const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;
    if (subscriptionId) {
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscriptionId },
        data: { status: "past_due" },
      });
    }
  }

  return new Response("ok", { status: 200 });
}
