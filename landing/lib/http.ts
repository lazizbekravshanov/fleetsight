import { NextRequest } from "next/server";

export function getClientIp(req: NextRequest): string {
  const fromForward = req.headers.get("x-forwarded-for");
  if (fromForward) {
    return fromForward.split(",")[0].trim();
  }
  const fromRealIp = req.headers.get("x-real-ip");
  return fromRealIp?.trim() || "unknown";
}

export function jsonError(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return Response.json({ error: message, ...extra }, { status });
}

export function enforceSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) {
    return true;
  }
  return origin === req.nextUrl.origin;
}
