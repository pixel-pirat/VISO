import { PrismaClient } from "@/app/generated/prisma";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Cap connections — critical for serverless (Vercel spins up many instances)
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Secrets never leave the database unless a query opts back in with
    // `omit: { field: false }` (e.g. the join route checking a passcode).
    omit: {
      room: { passcode: true, inviteToken: true },
      user: { passwordHash: true },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
