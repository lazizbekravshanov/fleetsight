import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { getEnablerDetail } from "@/lib/enablers/scoring";

const paramSchema = z.object({
  id: z.string().min(1),
});

export async function GET(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  const parsed = paramSchema.safeParse(context.params);
  if (!parsed.success) {
    return jsonError("Invalid enabler ID", 400);
  }

  try {
    const detail = await getEnablerDetail(parsed.data.id);
    return Response.json(detail);
  } catch (err) {
    console.error("Enabler detail error:", err);
    return jsonError("Failed to load enabler detail", 500);
  }
}
