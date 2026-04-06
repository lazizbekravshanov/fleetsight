import { NextRequest } from "next/server";
import { getServerAuthSession } from "@/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return Response.json({ rosters: [] });
  }

  const rosters = await prisma.monitoredRoster.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { carriers: true } } },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({
    rosters: rosters.map((r) => ({
      id: r.id,
      name: r.name,
      carrierCount: r._count.carriers,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return jsonError("Sign in to create rosters", 401);
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 100) {
    return jsonError("Roster name is required (max 100 characters)", 400);
  }

  const roster = await prisma.monitoredRoster.create({
    data: {
      userId: session.user.id,
      name,
    },
  });

  return Response.json({ roster }, { status: 201 });
}
