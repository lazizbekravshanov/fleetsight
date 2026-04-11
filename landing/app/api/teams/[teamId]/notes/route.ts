import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/teams/[teamId]/notes?dotNumber=xxx
export async function GET(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ notes: [] });

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: params.teamId, userId: session.user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Not a team member" }, { status: 403 });

  const dotNumber = req.nextUrl.searchParams.get("dotNumber");

  const notes = await prisma.teamNote.findMany({
    where: {
      teamId: params.teamId,
      ...(dotNumber ? { dotNumber } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ notes });
}

// POST /api/teams/[teamId]/notes — create note
export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to create notes" }, { status: 401 });

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: params.teamId, userId: session.user.id } },
  });
  if (!membership || membership.role === "viewer") {
    return NextResponse.json({ error: "Viewers cannot create notes" }, { status: 403 });
  }

  let body: { dotNumber?: unknown; content?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { dotNumber, content } = body as { dotNumber?: string; content?: string };

  if (!dotNumber || !content?.trim()) {
    return NextResponse.json({ error: "dotNumber and content required" }, { status: 400 });
  }

  const note = await prisma.teamNote.create({
    data: {
      teamId: params.teamId,
      userId: session.user.id,
      dotNumber: String(dotNumber),
      content: content.trim(),
    },
  });

  return NextResponse.json({ note }, { status: 201 });
}
