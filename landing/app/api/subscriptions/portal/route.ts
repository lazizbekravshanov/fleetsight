import { NextRequest } from "next/server";
import { getServerAuthSession } from "@/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createPortalSession } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return jsonError("Unauthorized", 401);
  }

  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { userId: session.user.id },
  });
  if (!stripeCustomer) {
    return jsonError("No billing account found", 404);
  }

  const origin = req.headers.get("origin") ?? "https://fleetsight.vercel.app";
  const portalSession = await createPortalSession({
    customerId: stripeCustomer.stripeCustomerId,
    returnUrl: `${origin}/dashboard`,
  });

  return Response.json({ url: portalSession.url });
}
