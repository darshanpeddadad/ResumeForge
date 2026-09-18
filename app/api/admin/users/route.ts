import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { user, session, aiSettings, generationLog } from "@/lib/db/schema";
import { eq, ilike, or, desc, gt, count } from "drizzle-orm";
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
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    let usersQuery = db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user);

    if (query) {
      usersQuery = usersQuery.where(
        or(ilike(user.name, `%${query}%`), ilike(user.email, `%${query}%`))
      ) as any;
    }

    const usersList = await usersQuery.orderBy(desc(user.createdAt)).limit(100);
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Fetch AI provider settings for these users (without exposing secret keys!)
    const userSettings = await db
      .select({
        userId: aiSettings.userId,
        provider: aiSettings.provider,
        model: aiSettings.model,
        isActive: aiSettings.isActive,
      })
      .from(aiSettings);

    const providerMap = new Map<string, { provider: string; model: string | null }>();
    for (const s of userSettings) {
      if (s.isActive) {
        providerMap.set(s.userId, { provider: s.provider, model: s.model });
      }
    }

    // Fetch all active sessions
    const activeSessions = await db
      .select({
        id: session.id,
        userId: session.userId,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        updatedAt: session.updatedAt,
        expiresAt: session.expiresAt,
      })
      .from(session)
      .where(gt(session.expiresAt, now))
      .orderBy(desc(session.updatedAt));

    const userSessionMap = new Map<
      string,
      {
        count: number;
        lastSeen: Date;
        latestIp: string | null;
        latestDevice: string;
        isOnline: boolean;
      }
    >();

    for (const s of activeSessions) {
      const existing = userSessionMap.get(s.userId);
      const isOnline = new Date(s.updatedAt) > fiveMinutesAgo;
      const { os, browser } = parseUserAgent(s.userAgent);
      const deviceStr = `${os} · ${browser}`;

      if (!existing) {
        userSessionMap.set(s.userId, {
          count: 1,
          lastSeen: new Date(s.updatedAt),
          latestIp: s.ipAddress,
          latestDevice: deviceStr,
          isOnline,
        });
      } else {
        existing.count += 1;
        if (new Date(s.updatedAt) > existing.lastSeen) {
          existing.lastSeen = new Date(s.updatedAt);
          existing.latestIp = s.ipAddress;
          existing.latestDevice = deviceStr;
        }
        if (isOnline) existing.isOnline = true;
      }
    }

    // Fetch generation counts for each user
    const genCounts = await db
      .select({
        userId: generationLog.userId,
        count: count(),
      })
      .from(generationLog)
      .groupBy(generationLog.userId);

    const genCountMap = new Map<string, number>();
    for (const g of genCounts) {
      if (g.userId) genCountMap.set(g.userId, g.count);
    }

    const enrichedUsers = usersList.map((u) => {
      const sessionInfo = userSessionMap.get(u.id);
      const lastActiveAt = sessionInfo?.lastSeen || u.updatedAt || u.createdAt;
      const isOnline = sessionInfo ? sessionInfo.isOnline : false;

      return {
        ...u,
        aiProvider: providerMap.get(u.id)?.provider || null,
        aiModel: providerMap.get(u.id)?.model || null,
        isOnline,
        lastActiveAt: lastActiveAt.toISOString(),
        activeSessions: sessionInfo?.count || 0,
        latestIp: sessionInfo?.latestIp || null,
        latestDevice: sessionInfo?.latestDevice || "Unknown",
        totalGenerations: genCountMap.get(u.id) || 0,
      };
    });

    return NextResponse.json({ users: enrichedUsers });
  } catch (error) {
    safeLog.error("Admin list users error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authCheck = await verifyAdminSession(request);
  if (!authCheck.authorized) {
    return authCheck.response!;
  }

  try {
    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role || (role !== "admin" && role !== "user")) {
      return NextResponse.json(
        { error: "Valid userId and role ('admin' | 'user') are required" },
        { status: 400 }
      );
    }

    // Prevent demoting oneself to avoid platform lock-out
    if (userId === authCheck.userId && role !== "admin") {
      return NextResponse.json(
        { error: "You cannot remove your own admin privileges" },
        { status: 400 }
      );
    }

    await db
      .update(user)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));

    return NextResponse.json({ success: true, userId, role });
  } catch (error) {
    safeLog.error("Admin update user role error:", error);
    return NextResponse.json({ error: "Failed to update user role" }, { status: 500 });
  }
}
