import crypto from "node:crypto";
import { ensureDbInitialized } from "@/lib/db-init";
import { prisma } from "@/lib/prisma";

function tokenSecret(): string {
  return process.env.TOKEN_SIGNING_SECRET || "";
}

export function generateScopedToken(input: { userId: string; scope: string }) {
  const secret = tokenSecret();
  if (!secret) {
    throw new Error("TOKEN_SIGNING_SECRET is not configured");
  }

  const raw = crypto.randomBytes(32).toString("base64url");
  const payload = `${input.userId}.${input.scope}.${raw}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  const token = `fsoc_${payload}.${sig}`;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export async function authenticateApiToken(authHeader: string | null) {
  await ensureDbInitialized();
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return null;
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const row = await prisma.apiToken.findFirst({
    where: {
      tokenHash,
      expiresAt: {
        gt: new Date()
      }
    },
    include: {
      user: {
        include: {
          profile: true
        }
      }
    }
  });

  return row;
}
