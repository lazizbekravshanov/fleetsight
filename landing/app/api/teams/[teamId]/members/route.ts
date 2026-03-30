import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST /api/teams/[teamId]/members — invite a member by email
export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: params.teamId, userId: session.user.id } },
  });
  if (!membership || membership.role !== "admin") {
    return NextResponse.json({ error: "Only admins can invite members" }, { status: 403 });
  }

  const body = await req.json();
  const { email, role = "member" } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (!["member", "viewer"].includes(role)) {
    return NextResponse.json({ error: "Role must be member or viewer" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "No user found with that email" }, { status: 404 });
  }

  const existing = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: params.teamId, userId: user.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "User is already a team member" }, { status: 409 });
  }

  const member = await prisma.teamMember.create({
    data: { teamId: params.teamId, userId: user.id, role },
    include: { user: { select: { id: true, email: true } } },
  });

  return NextResponse.json({
    member: { id: member.user.id, email: member.user.email, role: member.role },
  }, { status: 201 });
}

// DELETE /api/teams/[teamId]/members — remove a member
export async function DELETE(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: params.teamId, userId: session.user.id } },
  });
  if (!membership || membership.role !== "admin") {
    return NextResponse.json({ error: "Only admins can remove members" }, { status: 403 });
  }

  const body = await req.json();
  const { userId } = body;

  if (userId === session.user.id) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  }

  await prisma.teamMember.deleteMany({
    where: { teamId: params.teamId, userId },
  });

  return NextResponse.json({ ok: true });
}
