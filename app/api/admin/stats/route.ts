import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { user, session, generationLog, aiSettings } from "@/lib/db/schema";
import { count, eq, gt, sql, desc, gte } from "drizzle-orm";
import { safeLog } from "@/lib/security";

function parseUserAgent(ua?: string | null) {
  if (!ua) return { os: "Unknown", browser: "Unknown" };
  const lower = ua.toLowerCase();

  let os = "Other";
  if (lower.includes("windows") || lower.includes("win32") || lower.includes("win64")) os = "Windows";
  else if (lower.includes("mac") || lower.includes("darwin")) os = "macOS";
  else if (lower.includes("android")) os = "Android";
  else if (lower.includes("iphone") || lower.includes("ipad") || lower.includes("ios")) os = "iOS";
  else if (lower.includes("linux")) os = "Linux";

  let browser = "Other";
  if (lower.includes("edg/") || lower.includes("edge")) browser = "Edge";
  else if (lower.includes("chrome") && !lower.includes("edg")) browser = "Chrome";
  else if (lower.includes("safari") && !lower.includes("chrome")) browser = "Safari";
  else if (lower.includes("firefox")) browser = "Firefox";

  return { os, browser };
}

export async function GET(request: NextRequest) {
  const authCheck = await verifyAdminSession(request);
  if (!authCheck.authorized) {
    return authCheck.response!;
  }

  try {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Total users
    const [userCountResult] = await db.select({ value: count() }).from(user);
    const totalUsers = userCountResult?.value ?? 0;

    // 2. Active sessions
    const [activeSessionsResult] = await db
      .select({ value: count() })
      .from(session)
      .where(gt(session.expiresAt, now));
    const activeSessions = activeSessionsResult?.value ?? 0;

    // 3. Online right now (sessions updated in last 5 minutes)
    const [onlineNowResult] = await db
      .select({ value: count() })
      .from(session)
      .where(gt(session.updatedAt, fiveMinutesAgo));
    const onlineNow = onlineNowResult?.value ?? 0;

    // 4. Generation counts & reliability
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

    // 5. 7-Day Timeline generation activity (for Recharts Area Chart)
    const recentLogsForTimeline = await db
      .select({
        type: generationLog.type,
        createdAt: generationLog.createdAt,
      })
      .from(generationLog)
      .where(gte(generationLog.createdAt, sevenDaysAgo));

    // Build day map for the last 7 days
    const dayMap = new Map<string, { date: string; displayDate: string; resume: number; cover_letter: number; outreach: number; total: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().split("T")[0];
      const displayDate = d.toLocaleDateString([], { weekday: "short", month: "numeric", day: "numeric" });
      dayMap.set(dateKey, { date: dateKey, displayDate, resume: 0, cover_letter: 0, outreach: 0, total: 0 });
    }

    let resumeCount = 0;
    let coverLetterCount = 0;
    let outreachCount = 0;

    for (const log of recentLogsForTimeline) {
      const logDateKey = new Date(log.createdAt).toISOString().split("T")[0];
      const entry = dayMap.get(logDateKey);
      if (entry) {
        if (log.type === "resume") {
          entry.resume += 1;
          resumeCount += 1;
        } else if (log.type === "cover_letter") {
          entry.cover_letter += 1;
          coverLetterCount += 1;
        } else if (log.type === "outreach") {
          entry.outreach += 1;
          outreachCount += 1;
        }
        entry.total += 1;
      }
    }

    const timeline = Array.from(dayMap.values());

    // 6. Device & Browser intelligence from active sessions
    const activeSessionRecords = await db
      .select({
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
      })
      .from(session)
      .where(gt(session.expiresAt, now))
      .limit(200);

    const osCounts: Record<string, number> = {};
    const browserCounts: Record<string, number> = {};

    for (const s of activeSessionRecords) {
      const { os, browser } = parseUserAgent(s.userAgent);
      osCounts[os] = (osCounts[os] || 0) + 1;
      browserCounts[browser] = (browserCounts[browser] || 0) + 1;
    }

    // 7. Provider breakdown from aiSettings
    const providerCounts = await db
      .select({
        provider: aiSettings.provider,
        count: count(),
      })
      .from(aiSettings)
      .groupBy(aiSettings.provider);

    // 8. Target country breakdown from generationLog
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

    // 9. Recent generation logs (latest 10)
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
        onlineNow,
        totalGenerations,
        successRate,
      },
      timeline,
      features: {
        resume: resumeCount,
        coverLetter: coverLetterCount,
        outreach: outreachCount,
      },
      devices: Object.entries(osCounts).map(([name, value]) => ({ name, value })),
      browsers: Object.entries(browserCounts).map(([name, value]) => ({ name, value })),
      providers: providerCounts,
      countries: countryCounts,
      recentLogs,
    });
  } catch (error) {
    safeLog.error("Admin stats error:", error);
    return NextResponse.json({ error: "Failed to fetch admin stats" }, { status: 500 });
  }
}
