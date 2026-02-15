import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      onboardingComplete: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    onboardingComplete: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
    onboardingComplete?: boolean;
  }
}
