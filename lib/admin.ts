import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, account, generationLog } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { safeLog } from "@/lib/security";

/**
 * Parses configured admin emails from environment variables with production fallback.
 */
function getAdminEmails(): string[] {
  const envEmails = [
    ...(process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(",") : []),
    ...(process.env.ADMIN_EMAIL ? [process.env.ADMIN_EMAIL] : []),
    "admin@gmail.com",
  ]
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(envEmails));
}

let hasEnsuredAdmin = false;

/**
 * Automatically provisions the configured admin user and ensures database
 * schema tables/columns exist in production and local environments.
 */
export async function ensureAdminUserExists(): Promise<void> {
  if (hasEnsuredAdmin) return;

  const adminEmail = (process.env.ADMIN_EMAIL || "admin@gmail.com").toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || "Hulk@3000";

  try {
    // 1. Self-healing database schema check (adds 'role' column & 'generation_log' table)
    try {
      await db.execute(sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'user'`);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "generation_log" (
          "id" TEXT PRIMARY KEY,
          "user_id" TEXT REFERENCES "user"("id") ON DELETE SET NULL,
          "type" TEXT NOT NULL,
          "target_country" TEXT,
          "provider" TEXT,
          "model" TEXT,
          "status" TEXT NOT NULL,
          "duration_ms" TEXT,
          "error_message" TEXT,
          "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
    } catch (schemaErr) {
      safeLog.warn("Schema self-healing notice:", schemaErr);
    }

    // 2. Check if admin user exists in DB
    const existing = await db
      .select({ id: user.id, role: user.role })
      .from(user)
      .where(eq(user.email, adminEmail))
      .limit(1);

    if (existing.length === 0) {
      try {
        await auth.api.signUpEmail({
          body: {
            email: adminEmail,
            password: adminPassword,
            name: "Administrator",
          },
        });
        await db.update(user).set({ role: "admin" }).where(eq(user.email, adminEmail));
        safeLog.info(`Provisioned admin account: ${adminEmail}`);
      } catch (signupErr) {
        safeLog.warn("Auto-signup admin notice:", signupErr);
      }
    } else {
      if (existing[0].role !== "admin") {
        await db.update(user).set({ role: "admin" }).where(eq(user.email, adminEmail));
      }
      const existingAccount = await db
        .select({ id: account.id })
        .from(account)
        .where(eq(account.userId, existing[0].id))
        .limit(1);

      if (existingAccount.length === 0) {
        try {
          await db.delete(user).where(eq(user.id, existing[0].id));
          await auth.api.signUpEmail({
            body: {
              email: adminEmail,
              password: adminPassword,
              name: "Administrator",
            },
          });
          await db.update(user).set({ role: "admin" }).where(eq(user.email, adminEmail));
        } catch (recreateErr) {
          safeLog.warn("Recreate admin notice:", recreateErr);
        }
      }
    }
    hasEnsuredAdmin = true;
  } catch (err) {
    safeLog.warn("Admin provisioning check:", err);
  }
}

/**
 * Synchronous check whether a user object or session has admin privileges.
 */
export function checkIsAdmin(userObj?: { email?: string | null; role?: string | null } | null): boolean {
  if (!userObj) return false;

  // 1. Direct database role check
  if (userObj.role === "admin") return true;

  // 2. Environment variable email override
  const email = userObj.email?.toLowerCase().trim();
  if (email) {
    const adminEmails = getAdminEmails();
    if (adminEmails.includes(email)) return true;
  }

  return false;
}

/**
 * Asynchronously verifies if a specific user ID is an admin,
 * checking the database role and email against admin lists.
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const [dbUser] = await db
      .select({ role: user.role, email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!dbUser) return false;

    if (dbUser.role === "admin") return true;

    const email = dbUser.email?.toLowerCase().trim();
    if (email && getAdminEmails().includes(email)) {
      return true;
    }

    // If no admin emails configured and user has role admin
    return false;
  } catch (err) {
    safeLog.error("Error verifying admin role:", err);
    return false;
  }
}

/**
 * Guard helper for API routes: verifies current session and admin permissions.
 */
export async function verifyAdminSession(request: NextRequest): Promise<{
  authorized: boolean;
  userId?: string;
  email?: string;
  response?: NextResponse;
}> {
  try {
    await ensureAdminUserExists();

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session || !session.user) {
      return {
        authorized: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }

    const isAdmin = checkIsAdmin(session.user as any) || (await isUserAdmin(session.user.id));

    if (!isAdmin) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Forbidden: Admin privileges required" },
          { status: 403 }
        ),
      };
    }

    return {
      authorized: true,
      userId: session.user.id,
      email: session.user.email,
    };
  } catch (err) {
    safeLog.error("Admin session verification error:", err);
    return {
      authorized: false,
      response: NextResponse.json({ error: "Internal Server Error" }, { status: 500 }),
    };
  }
}

/**
 * Asynchronously logs generation telemetry without impacting user-facing API performance.
 */
export async function recordGenerationLog(params: {
  userId?: string;
  type: "resume" | "cover_letter" | "outreach";
  targetCountry?: string;
  provider?: string;
  model?: string;
  status: "success" | "error";
  durationMs?: number;
  errorMessage?: string;
}): Promise<void> {
  try {
    await db.insert(generationLog).values({
      id: nanoid(),
      userId: params.userId || null,
      type: params.type,
      targetCountry: params.targetCountry || null,
      provider: params.provider || null,
      model: params.model || null,
      status: params.status,
      durationMs: params.durationMs !== undefined ? `${Math.round(params.durationMs)}` : null,
      errorMessage: params.errorMessage || null,
    });
  } catch (err) {
    // Non-blocking telemetry failure
    safeLog.error("Failed to record generation log:", err);
  }
}
