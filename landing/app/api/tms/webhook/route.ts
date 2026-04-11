import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { screenCarrier } from "@/lib/tms/screen";
import crypto from "crypto";

export const runtime = "nodejs";
export const maxDuration = 30;

// POST /api/tms/webhook — receive events from TMS providers.
//
// Fails closed: we reject requests whenever TMS_WEBHOOK_SECRET is unset or the
// signature header is missing / invalid. Previously this soft-failed when the
// secret was not configured, which meant a misconfigured production env would
// accept spoofed carrier-assignment events and auto-trigger screenings on
// arbitrary DOT numbers.
export async function POST(req: NextRequest) {
  const secret = process.env.TMS_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[tms-webhook] TMS_WEBHOOK_SECRET not configured — rejecting");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  const body = await req.text();
  const signature = req.headers.get("x-tms-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  // Timing-safe comparison to prevent signature-oracle attacks.
  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (
    sigBuf.length !== expBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expBuf)
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { provider, event, data } = payload;

  // Store the webhook event
  await prisma.webhookEvent.create({
    data: {
      source: `tms:${provider ?? "unknown"}`,
      type: event ?? "unknown",
      payloadJson: body,
    },
  });

  // Auto-screen carrier on assignment
  if (
    (event === "carrier_assigned" || event === "load_tendered") &&
    data?.carrierDotNumber
  ) {
    const result = await screenCarrier(String(data.carrierDotNumber));

    // If carrier is flagged, return a warning
    if (!result.approved) {
      return NextResponse.json({
        action: "REVIEW_REQUIRED",
        screening: result,
        message: `Carrier ${result.legalName} (USDOT ${result.dotNumber}) requires review: ${result.flags.join(", ")}`,
      });
    }

    return NextResponse.json({
      action: "APPROVED",
      screening: result,
    });
  }

  return NextResponse.json({ received: true });
}
