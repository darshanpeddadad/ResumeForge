import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { systemAnnouncement } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { safeLog } from "@/lib/security";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const getAll = searchParams.get("all") === "true";

    if (getAll) {
      const allList = await db
        .select()
        .from(systemAnnouncement)
        .orderBy(desc(systemAnnouncement.createdAt))
        .limit(20);
      return NextResponse.json({ announcements: allList });
    }

    const activeList = await db
      .select()
      .from(systemAnnouncement)
      .where(eq(systemAnnouncement.isActive, true))
      .orderBy(desc(systemAnnouncement.createdAt))
      .limit(1);

    return NextResponse.json({ announcement: activeList[0] || null });
  } catch (error) {
    safeLog.error("Error fetching system announcement:", error);
    return NextResponse.json({ announcement: null, announcements: [] });
  }
}

export async function POST(request: NextRequest) {
  const authCheck = await verifyAdminSession(request);
  if (!authCheck.authorized) {
    return authCheck.response!;
  }

  try {
    const body = await request.json();
    const { message, type = "info", isActive = true } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Announcement message is required" }, { status: 400 });
    }

    const id = nanoid();
    const [created] = await db
      .insert(systemAnnouncement)
      .values({
        id,
        message,
        type,
        isActive: Boolean(isActive),
        createdAt: new Date(),
      })
      .returning();

    return NextResponse.json({ success: true, announcement: created });
  } catch (error) {
    safeLog.error("Error creating announcement:", error);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authCheck = await verifyAdminSession(request);
  if (!authCheck.authorized) {
    return authCheck.response!;
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      await db.delete(systemAnnouncement).where(eq(systemAnnouncement.id, id));
    } else {
      // If no ID specified, dismiss all active announcements
      await db.update(systemAnnouncement).set({ isActive: false });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    safeLog.error("Error dismissing announcement:", error);
    return NextResponse.json({ error: "Failed to dismiss announcement" }, { status: 500 });
  }
}
