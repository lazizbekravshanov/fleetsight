import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";

async function getTeamMembership(teamId: string, userId: string) {
  return prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
}

// GET /api/teams/[teamId]/watchlist
export async function GET(
  _req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ carriers: [] });

  const membership = await getTeamMembership(params.teamId, session.user.id);
  if (!membership) return NextResponse.json({ error: "Not a team member" }, { status: 403 });

  const carriers = await prisma.teamWatchedCarrier.findMany({
    where: { teamId: params.teamId },
    orderBy: { addedAt: "desc" },
  });

  return NextResponse.json({ carriers });
}

// POST /api/teams/[teamId]/watchlist — add carrier
export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getTeamMembership(params.teamId, session.user.id);
  if (!membership || membership.role === "viewer") {
    return NextResponse.json({ error: "Viewers cannot modify the watchlist" }, { status: 403 });
  }

  let body: { dotNumber?: unknown; legalName?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { dotNumber, legalName } = body as {
    dotNumber?: string;
    legalName?: string;
  };

  if (!dotNumber || !legalName) {
    return NextResponse.json({ error: "dotNumber and legalName required" }, { status: 400 });
  }

  const carrier = await prisma.teamWatchedCarrier.upsert({
    where: { teamId_dotNumber: { teamId: params.teamId, dotNumber: String(dotNumber) } },
    create: {
      teamId: params.teamId,
      dotNumber: String(dotNumber),
      legalName,
      addedByUserId: session.user.id,
    },
    update: {},
  });

  return NextResponse.json({ carrier }, { status: 201 });
}

// DELETE /api/teams/[teamId]/watchlist — remove carrier
export async function DELETE(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getTeamMembership(params.teamId, session.user.id);
  if (!membership || membership.role === "viewer") {
    return NextResponse.json({ error: "Viewers cannot modify the watchlist" }, { status: 403 });
  }

  let body: { dotNumber?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { dotNumber } = body as { dotNumber?: string };

  await prisma.teamWatchedCarrier.deleteMany({
    where: { teamId: params.teamId, dotNumber: String(dotNumber) },
  });

  return NextResponse.json({ ok: true });
}
