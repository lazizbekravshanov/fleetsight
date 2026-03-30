import { NextRequest, NextResponse } from "next/server";
import { authenticateApiToken } from "@/lib/api-token";
import { screenCarrier } from "@/lib/tms/screen";

// POST /api/tms/screen — screen a carrier for TMS integration
// Requires API token authentication
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const validation = await authenticateApiToken(auth);
  if (!validation) {
    return NextResponse.json({ error: "Invalid or expired API token" }, { status: 401 });
  }

  const body = await req.json();
  const { dotNumber, loadId, carriers } = body;

  // Support single carrier or batch
  if (carriers && Array.isArray(carriers)) {
    if (carriers.length > 10) {
      return NextResponse.json({ error: "Maximum 10 carriers per batch" }, { status: 400 });
    }

    const results = await Promise.all(
      carriers.map((c: { dotNumber: string }) => screenCarrier(String(c.dotNumber)))
    );

    return NextResponse.json({
      loadId: loadId ?? null,
      results,
      screenedAt: new Date().toISOString(),
    });
  }

  if (!dotNumber) {
    return NextResponse.json({ error: "dotNumber is required" }, { status: 400 });
  }

  const result = await screenCarrier(String(dotNumber));

  return NextResponse.json({
    loadId: loadId ?? null,
    ...result,
  });
}
