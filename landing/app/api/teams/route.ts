import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/teams — list user's teams
export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ teams: [] });

  const memberships = await prisma.teamMember.findMany({
    where: { userId: session.user.id },
    include: {
      team: {
        include: {
          members: { include: { user: { select: { id: true, email: true } } } },
          _count: { select: { sharedWatchlist: true, sharedNotes: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const teams = memberships.map((m) => ({
    id: m.team.id,
    name: m.team.name,
    slug: m.team.slug,
    role: m.role,
    memberCount: m.team.members.length,
    members: m.team.members.map((tm) => ({
      id: tm.user.id,
      email: tm.user.email,
      role: tm.role,
    })),
    watchlistCount: m.team._count.sharedWatchlist,
    notesCount: m.team._count.sharedNotes,
  }));

  return NextResponse.json({ teams });
}

// POST /api/teams — create a team
export async function POST(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Team name must be at least 2 characters" }, { status: 400 });
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  const existing = await prisma.team.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "A team with a similar name already exists" }, { status: 409 });
  }

  const team = await prisma.team.create({
    data: {
      name: name.trim(),
      slug,
      members: {
        create: { userId: session.user.id, role: "admin" },
      },
    },
    include: { members: true },
  });

  return NextResponse.json({ team }, { status: 201 });
}
