import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/health — trivial DB touch, unauthenticated on purpose.
// Meant to be pinged every few minutes by an external cron/uptime service
// to keep Neon's serverless compute from suspending after idle, which is
// what causes the multi-second "cold start" delay on the first request
// after a period of inactivity (measured ~3.2s cold vs ~250ms warm).
export async function GET() {
  const start = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  return NextResponse.json({ ok: true, ms: Date.now() - start });
}
