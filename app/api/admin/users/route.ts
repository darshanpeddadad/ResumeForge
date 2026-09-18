import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { user, session, aiSettings } from "@/lib/db/schema";
import { eq, ilike, or, desc } from "drizzle-orm";
import { safeLog } from "@/lib/security";

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
      })
      .from(user);

    if (query) {
      usersQuery = usersQuery.where(
        or(ilike(user.name, `%${query}%`), ilike(user.email, `%${query}%`))
      ) as any;
    }

    const usersList = await usersQuery.orderBy(desc(user.createdAt)).limit(100);

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

    const enrichedUsers = usersList.map((u) => ({
      ...u,
      aiProvider: providerMap.get(u.id)?.provider || null,
      aiModel: providerMap.get(u.id)?.model || null,
    }));

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
