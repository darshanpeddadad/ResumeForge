import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { DEFAULT_MODEL, PROVIDER_MODELS } from "@/lib/ai-models";
import { TARGET_COUNTRIES } from "@/lib/country-profiles";
import { count } from "drizzle-orm";
import { safeLog } from "@/lib/security";

export async function GET(request: NextRequest) {
  const authCheck = await verifyAdminSession(request);
  if (!authCheck.authorized) {
    return authCheck.response!;
  }

  const startTime = performance.now();
  let dbStatus = "unknown";
  let dbLatencyMs = 0;

  try {
    const dbStart = performance.now();
    await db.select({ val: count() }).from(user);
    dbLatencyMs = Math.round(performance.now() - dbStart);
    dbStatus = "healthy";
  } catch (err) {
    safeLog.error("Health check DB query failed:", err);
    dbStatus = "unhealthy";
  }

  const memory = process.memoryUsage ? process.memoryUsage() : null;

  return NextResponse.json({
    status: dbStatus === "healthy" ? "operational" : "degraded",
    timestamp: new Date().toISOString(),
    latencyMs: Math.round(performance.now() - startTime),
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
    },
    system: {
      nodeVersion: process.version,
      memoryRssMb: memory ? Math.round(memory.rss / (1024 * 1024)) : null,
      memoryHeapMb: memory ? Math.round(memory.heapUsed / (1024 * 1024)) : null,
      uptimeSeconds: Math.round(process.uptime()),
    },
    aiCatalog: {
      defaultModels: DEFAULT_MODEL,
      availableProviders: Object.keys(PROVIDER_MODELS),
    },
    countryProfilesCount: TARGET_COUNTRIES.length,
  });
}
