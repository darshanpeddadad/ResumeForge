import { db } from "@/lib/db";
import { aiSettings } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";

export async function getActiveAiSettings(userId: string) {
  // 1. Try finding explicitly active configuration
  const active = await db.query.aiSettings.findFirst({
    where: and(eq(aiSettings.userId, userId), eq(aiSettings.isActive, true)),
    orderBy: [desc(aiSettings.updatedAt)],
  });

  if (active) return active;

  // 2. Fallback to most recently updated configuration
  return await db.query.aiSettings.findFirst({
    where: eq(aiSettings.userId, userId),
    orderBy: [desc(aiSettings.updatedAt)],
  });
}
