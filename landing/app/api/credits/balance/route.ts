import { getServerAuthSession } from "@/auth";
import { jsonError } from "@/lib/http";
import { getCreditBalance } from "@/lib/credits";

export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return jsonError("Authentication required", 401);
  }

  const credits = await getCreditBalance(session.user.id);
  return Response.json({ credits });
}
