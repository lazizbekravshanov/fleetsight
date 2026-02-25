import { NextRequest } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { grantCredits } from "@/lib/credits";

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
    const credits = parseInt(session.metadata?.credits ?? "0", 10);
    const packId = session.metadata?.packId;

    if (!userId || !credits || !packId) {
      return new Response("Missing metadata", { status: 400 });
    }

    // Idempotency: check if already processed
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

  return new Response("ok", { status: 200 });
}
