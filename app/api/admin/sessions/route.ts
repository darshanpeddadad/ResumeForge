import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { session } from "@/lib/db/schema";
import { eq, desc, gt } from "drizzle-orm";
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
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const now = new Date();
    const sessions = await db
      .select({
        id: session.id,
        userId: session.userId,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        expiresAt: session.expiresAt,
      })
      .from(session)
      .where(eq(session.userId, userId))
      .orderBy(desc(session.updatedAt));

    const enriched = sessions.map((s) => ({
      ...s,
      isExpired: new Date(s.expiresAt) <= now,
      device: parseUserAgent(s.userAgent),
    }));

    return NextResponse.json({ sessions: enriched });
  } catch (error) {
    safeLog.error("Admin get user sessions error:", error);
    return NextResponse.json({ error: "Failed to fetch user sessions" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authCheck = await verifyAdminSession(request);
  if (!authCheck.authorized) {
    return authCheck.response!;
  }

  try {
    const body = await request.json();
    const { sessionId, userId } = body;

    if (!sessionId && !userId) {
      return NextResponse.json(
        { error: "sessionId or userId is required" },
        { status: 400 }
      );
    }

    if (sessionId) {
      await db.delete(session).where(eq(session.id, sessionId));
      return NextResponse.json({ success: true, revokedSessionId: sessionId });
    }

    if (userId) {
      await db.delete(session).where(eq(session.userId, userId));
      return NextResponse.json({ success: true, revokedUserId: userId });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    safeLog.error("Admin revoke session error:", error);
    return NextResponse.json({ error: "Failed to revoke session" }, { status: 500 });
  }
}
