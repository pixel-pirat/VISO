import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { username } from "better-auth/plugins";
import { prisma } from "./prisma";

// Build trusted origins from env — covers localhost, Vercel preview URLs, and production
function getTrustedOrigins(): string[] {
  const origins: string[] = ["http://localhost:3000"];

  if (process.env.BETTER_AUTH_URL) {
    origins.push(process.env.BETTER_AUTH_URL);
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.push(process.env.NEXT_PUBLIC_APP_URL);
  }
  // Vercel automatically sets VERCEL_URL for preview deployments
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }

  // Deduplicate
  return [...new Set(origins)];
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Use proper UUIDs — our schema columns are @db.Uuid
  advanced: {
    database: {
      generateId: "uuid",
    },
    // Disable cross-site check in dev; keep it on in prod
    disableCSRFCheck: process.env.NODE_ENV === "development",
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },

  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
    }),
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7,  // 7 days
    updateAge:  60 * 60 * 24,      // extend if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge:  5 * 60,             // cache for 5 min — eliminates most DB round-trips
    },
  },

  trustedOrigins: getTrustedOrigins(),
});

export type Session = typeof auth.$Infer.Session;
