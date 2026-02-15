import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { ensureDbInitialized } from "@/lib/db-init";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");
  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

export async function POST(req: NextRequest) {
  await ensureDbInitialized();
  const secret = process.env.OPENCLAW_WEBHOOK_SECRET;
  if (!secret) {
    return jsonError("OPENCLAW_WEBHOOK_SECRET is not configured", 500);
  }

  const signature = req.headers.get("x-openclaw-signature") || "";
  const rawBody = await req.text();

  if (!signature || !verifySignature(rawBody, signature, secret)) {
    return jsonError("Invalid webhook signature", 401);
  }

  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return jsonError("Invalid webhook JSON", 400);
  }

  const eventType = typeof parsed.type === "string" ? parsed.type : "unknown";
  const source = typeof parsed.source === "string" ? parsed.source : "openclaw";

  await prisma.webhookEvent.create({
    data: {
      source,
      type: eventType,
      payloadJson: JSON.stringify(parsed)
    }
  });

  return Response.json({ ok: true, received: true });
}
