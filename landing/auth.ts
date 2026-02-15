import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { verifyPassword } from "@/lib/password";

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8)
});

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login"
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const email = parsed.data.email;
        const ip = (req?.headers?.["x-forwarded-for"] || req?.headers?.["x-real-ip"] || "unknown") as string;
        const key = `login:${email}:${ip.split(",")[0].trim()}`;
        const gate = checkRateLimit(key, {
          windowMs: 10 * 60 * 1000,
          maxAttempts: 5,
          lockMs: 15 * 60 * 1000
        });

        if (!gate.allowed) {
          throw new Error("LOCKED_OUT");
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { profile: true }
        });

        if (!user) {
          return null;
        }

        const isValid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        resetRateLimit(key);

        return {
          id: user.id,
          email: user.email,
          onboardingComplete: Boolean(user.profile)
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.onboardingComplete = user.onboardingComplete;
      }
      if (trigger === "update" && session?.user) {
        token.onboardingComplete = session.user.onboardingComplete;
      }
      if (token.sub && typeof token.onboardingComplete !== "boolean") {
        const profile = await prisma.customerProfile.findUnique({
          where: { userId: token.sub },
          select: { id: true }
        });
        token.onboardingComplete = Boolean(profile);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.onboardingComplete = Boolean(token.onboardingComplete);
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET
};

export function getServerAuthSession() {
  return getServerSession(authOptions);
}
