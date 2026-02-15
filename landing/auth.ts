import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { ensureDbInitialized } from "@/lib/db-init";
import { prisma } from "@/lib/prisma";
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
        await ensureDbInitialized();
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const email = parsed.data.email;
        const user = await prisma.user.findUnique({
          where: { email },
          include: { profile: true }
        });

        if (!user) {
          return null;
        }

        const now = new Date();
        if (user.lockoutUntil && user.lockoutUntil > now) {
          throw new Error("LOCKED_OUT");
        }

        const isValid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!isValid) {
          const nextFailedAttempts = user.failedLoginAttempts + 1;
          const shouldLock = nextFailedAttempts >= 5;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: shouldLock ? 0 : nextFailedAttempts,
              lockoutUntil: shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null
            }
          });
          return null;
        }

        if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: 0,
              lockoutUntil: null
            }
          });
        }

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
      await ensureDbInitialized();
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
