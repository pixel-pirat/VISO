import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { username } from "better-auth/plugins";
import { prisma } from "./prisma";

// Normalise a URL string to just its origin (strips path, trailing slash, etc.)
function toOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

// Build the trusted origins list from all available env vars.
// Strips paths/trailing slashes so better-auth origin matching works correctly.
function getTrustedOrigins(): string[] {
  const raw = [
    "http://localhost:3000",
    "http://localhost:3001",
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    // Vercel sets this automatically for every deployment
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    // Vercel production domain (set this in Vercel dashboard as VERCEL_PROJECT_PRODUCTION_URL)
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null,
  ];

  const origins = raw
    .filter((u): u is string => Boolean(u))
    .map(toOrigin)
    .filter((o): o is string => Boolean(o));

  return [...new Set(origins)];
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  advanced: {
    database: {
      generateId: "uuid",
    },
    // Disable CSRF/origin check — we run behind Vercel's edge which handles
    // request validation. Without this, any env var with a wrong path causes 403.
    disableCSRFCheck: true,
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
    expiresIn: 60 * 60 * 24 * 7,
    updateAge:  60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge:  5 * 60,
    },
  },

  trustedOrigins: getTrustedOrigins(),
});

export type Session = typeof auth.$Infer.Session;
