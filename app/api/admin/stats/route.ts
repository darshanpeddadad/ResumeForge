import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { user, session, generationLog, aiSettings } from "@/lib/db/schema";
import { count, eq, gt, sql, desc } from "drizzle-orm";
import { safeLog } from "@/lib/security";

export async function GET(request: NextRequest) {
  const authCheck = await verifyAdminSession(request);
  if (!authCheck.authorized) {
    return authCheck.response!;
  }

  try {
    const now = new Date();

    // 1. Total users
    const [userCountResult] = await db.select({ value: count() }).from(user);
    const totalUsers = userCountResult?.value ?? 0;

    // 2. Active sessions
    const [activeSessionsResult] = await db
      .select({ value: count() })
      .from(session)
      .where(gt(session.expiresAt, now));
    const activeSessions = activeSessionsResult?.value ?? 0;

    // 3. Generation stats
    const [totalGensResult] = await db.select({ value: count() }).from(generationLog);
    const totalGenerations = totalGensResult?.value ?? 0;

    const [successGensResult] = await db
      .select({ value: count() })
      .from(generationLog)
      .where(eq(generationLog.status, "success"));
    const successGenerations = successGensResult?.value ?? 0;

    const successRate =
      totalGenerations > 0
        ? Math.round((successGenerations / totalGenerations) * 100)
        : 100;

    // 4. Provider breakdown from aiSettings
    const providerCounts = await db
      .select({
        provider: aiSettings.provider,
        count: count(),
      })
      .from(aiSettings)
      .groupBy(aiSettings.provider);

    // 5. Target country breakdown from generationLog
    const countryCounts = await db
      .select({
        country: generationLog.targetCountry,
        count: count(),
      })
      .from(generationLog)
      .where(sql`${generationLog.targetCountry} IS NOT NULL`)
      .groupBy(generationLog.targetCountry)
      .orderBy(desc(count()))
      .limit(8);

    // 6. Recent generations stream (latest 10)
    const recentLogs = await db
      .select({
        id: generationLog.id,
        userId: generationLog.userId,
        userName: user.name,
        userEmail: user.email,
        type: generationLog.type,
        targetCountry: generationLog.targetCountry,
        provider: generationLog.provider,
        model: generationLog.model,
        status: generationLog.status,
        durationMs: generationLog.durationMs,
        errorMessage: generationLog.errorMessage,
        createdAt: generationLog.createdAt,
      })
      .from(generationLog)
      .leftJoin(user, eq(generationLog.userId, user.id))
      .orderBy(desc(generationLog.createdAt))
      .limit(10);

    return NextResponse.json({
      metrics: {
        totalUsers,
        activeSessions,
        totalGenerations,
        successRate,
      },
      providers: providerCounts,
      countries: countryCounts,
      recentLogs,
    });
  } catch (error) {
    safeLog.error("Admin stats error:", error);
    return NextResponse.json({ error: "Failed to fetch admin stats" }, { status: 500 });
  }
}
