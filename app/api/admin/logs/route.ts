import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { generationLog, user } from "@/lib/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { safeLog } from "@/lib/security";

export async function GET(request: NextRequest) {
  const authCheck = await verifyAdminSession(request);
  if (!authCheck.authorized) {
    return authCheck.response!;
  }

  try {
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get("type");
    const statusFilter = searchParams.get("status");
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);

    const conditions = [];
    if (typeFilter) {
      conditions.push(eq(generationLog.type, typeFilter));
    }
    if (statusFilter) {
      conditions.push(eq(generationLog.status, statusFilter));
    }

    let query = db
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
      .leftJoin(user, eq(generationLog.userId, user.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const logs = await query.orderBy(desc(generationLog.createdAt)).limit(limit);

    return NextResponse.json({ logs });
  } catch (error) {
    safeLog.error("Admin list logs error:", error);
    return NextResponse.json({ error: "Failed to fetch generation logs" }, { status: 500 });
  }
}
