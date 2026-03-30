import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { screenCarrier } from "@/lib/tms/screen";
import crypto from "crypto";

// POST /api/tms/webhook — receive events from TMS providers
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-tms-signature");

  // Verify HMAC signature if secret is configured
  const secret = process.env.TMS_WEBHOOK_SECRET;
  if (secret && signature) {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    if (signature !== expected) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
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
