import { NextRequest } from "next/server";
import { z } from "zod";
import { getServerAuthSession } from "@/auth";
import { ensureDbInitialized } from "@/lib/db-init";
import { extractCarrierRecord, FmcsaHttpError, getCarrierProfile } from "@/lib/fmcsa";
import { enforceSameOrigin, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  companyName: z.string().min(2).max(120),
  usdotNumber: z.string().regex(/^\d{1,10}$/)
});

export async function POST(req: NextRequest) {
  await ensureDbInitialized();
  if (!enforceSameOrigin(req)) {
    return jsonError("Invalid origin", 403);
  }

  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return jsonError("Unauthorized", 401);
  }

  const payload = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError("Invalid onboarding payload", 400, {
      issues: parsed.error.flatten()
    });
  }

  try {
    const profilePayload = await getCarrierProfile(parsed.data.usdotNumber);
    const carrier = extractCarrierRecord(profilePayload);
    if (!carrier) {
      return jsonError("USDOT record not found", 404);
    }

    const profile = await prisma.customerProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        companyName: parsed.data.companyName,
        usdotNumber: parsed.data.usdotNumber
      },
      update: {
        companyName: parsed.data.companyName,
        usdotNumber: parsed.data.usdotNumber
      }
    });

    return Response.json({ ok: true, profile, carrier });
  } catch (error) {
    if (error instanceof FmcsaHttpError) {
      return jsonError(error.message, error.status);
    }
    return jsonError("Unable to complete onboarding", 502);
  }
}
