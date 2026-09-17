import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiSettings } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { encrypt, decrypt, maskApiKey, sanitizeApiKey } from "@/lib/encryption";
import { randomUUID } from "crypto";
import { DEFAULT_MODEL, type Provider } from "@/lib/ai-models";
import { checkSettingsRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { safeLog } from "@/lib/security";

async function getSession(request: NextRequest) {
  return auth.api.getSession({
    headers: request.headers,
  });
}

function formatRow(row: typeof aiSettings.$inferSelect) {
  return {
    id: row.id,
    provider: row.provider as Provider,
    model: row.model || DEFAULT_MODEL[row.provider as Provider],
    apiKeyMasked: maskApiKey(decrypt(row.apiKey)),
    isActive: row.isActive,
    isConfigured: true,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// GET — list user's saved AI provider / model settings
export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allRows = await db.query.aiSettings.findMany({
    where: eq(aiSettings.userId, session.user.id),
    orderBy: [desc(aiSettings.isActive), desc(aiSettings.updatedAt)],
  });

  const activeRow = allRows.find((r) => r.isActive) || allRows[0] || null;

  const openaiRow = allRows.find((r) => r.provider === "openai");
  const googleRow = allRows.find((r) => r.provider === "google");
  const anthropicRow = allRows.find((r) => r.provider === "anthropic");
  const perplexityRow = allRows.find((r) => r.provider === "perplexity");

  return NextResponse.json({
    settings: activeRow ? formatRow(activeRow) : null,
    activeProvider: activeRow ? (activeRow.provider as Provider) : null,
    savedConfigs: allRows.map(formatRow),
    providers: {
      openai: openaiRow ? formatRow(openaiRow) : null,
      google: googleRow ? formatRow(googleRow) : null,
      anthropic: anthropicRow ? formatRow(anthropicRow) : null,
      perplexity: perplexityRow ? formatRow(perplexityRow) : null,
    },
  });
}

// POST — save, update, or switch provider
export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting protection
  const rateLimit = checkSettingsRateLimit(session.user.id);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit.resetMs, "Too many settings updates. Please wait a moment.");
  }

  const body = await request.json();

  // 1. Switch active provider action
  if (body.action === "switch_provider" && body.provider) {
    const target = await db.query.aiSettings.findFirst({
      where: and(
        eq(aiSettings.userId, session.user.id),
        eq(aiSettings.provider, body.provider)
      ),
    });

    const targetLabel =
      body.provider === "openai"
        ? "OpenAI"
        : body.provider === "anthropic"
        ? "Anthropic (Claude)"
        : body.provider === "perplexity"
        ? "Perplexity AI"
        : "Google AI";

    if (!target) {
      return NextResponse.json(
        { error: `Please configure an API key for ${targetLabel} first.` },
        { status: 400 }
      );
    }

    await db
      .update(aiSettings)
      .set({ isActive: false })
      .where(eq(aiSettings.userId, session.user.id));

    await db
      .update(aiSettings)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(aiSettings.id, target.id));

    return NextResponse.json({ success: true, activeProvider: body.provider });
  }

  // 2. Set active by configuration ID
  if (body.action === "set_active" && body.id) {
    const target = await db.query.aiSettings.findFirst({
      where: and(eq(aiSettings.id, body.id), eq(aiSettings.userId, session.user.id)),
    });

    if (!target) {
      return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
    }

    await db
      .update(aiSettings)
      .set({ isActive: false })
      .where(eq(aiSettings.userId, session.user.id));

    await db
      .update(aiSettings)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(aiSettings.id, body.id));

    return NextResponse.json({ success: true });
  }

  // 3. Save or update provider configuration
  const { provider, apiKey, model, makeActive = true } = body;

  if (
    provider !== "openai" &&
    provider !== "google" &&
    provider !== "anthropic" &&
    provider !== "perplexity"
  ) {
    return NextResponse.json(
      { error: "provider must be 'openai', 'google', 'anthropic', or 'perplexity'" },
      { status: 400 }
    );
  }

  const existing = await db.query.aiSettings.findFirst({
    where: and(
      eq(aiSettings.userId, session.user.id),
      eq(aiSettings.provider, provider)
    ),
  });

  let resolvedApiKey: string | undefined;
  if (apiKey && typeof apiKey === "string" && apiKey.trim()) {
    // Sanitize API key: remove invisible characters and control codes
    resolvedApiKey = sanitizeApiKey(apiKey);

    if (resolvedApiKey.length > 250) {
      return NextResponse.json(
        {
          error:
            "The entered API key is too long (over 250 characters). Please paste only the raw API key without extra text.",
        },
        { status: 400 }
      );
    }

    // Key format validation
    if (resolvedApiKey.startsWith("pplx-") && provider !== "perplexity") {
      return NextResponse.json(
        {
          error: "This key starts with 'pplx-', which is a Perplexity API key. Please switch to the Perplexity tab.",
        },
        { status: 400 }
      );
    }

    if (provider === "google" && (resolvedApiKey.startsWith("sk-ant-") || resolvedApiKey.startsWith("sk-"))) {
      const isAnthropic = resolvedApiKey.startsWith("sk-ant-");
      return NextResponse.json(
        {
          error: `This key appears to be an ${isAnthropic ? "Anthropic (Claude)" : "OpenAI"} key. Please enter a Google AI key (or switch to the ${isAnthropic ? "Anthropic" : "OpenAI"} tab).`,
        },
        { status: 400 }
      );
    }

    if (
      provider === "openai" &&
      (resolvedApiKey.startsWith("AIza") || resolvedApiKey.startsWith("AQ.") || resolvedApiKey.startsWith("sk-ant-"))
    ) {
      const isAnthropic = resolvedApiKey.startsWith("sk-ant-");
      return NextResponse.json(
        {
          error: isAnthropic
            ? "This key starts with 'sk-ant-', which is an Anthropic (Claude) key. Please switch to the Anthropic tab."
            : "This key appears to be a Google AI key. Please enter an OpenAI key (or switch to the Google AI tab).",
        },
        { status: 400 }
      );
    }

    if (
      provider === "anthropic" &&
      (resolvedApiKey.startsWith("AIza") ||
        resolvedApiKey.startsWith("AQ.") ||
        (resolvedApiKey.startsWith("sk-") && !resolvedApiKey.startsWith("sk-ant-")))
    ) {
      const isGoogle = resolvedApiKey.startsWith("AIza") || resolvedApiKey.startsWith("AQ.");
      return NextResponse.json(
        {
          error: isGoogle
            ? "This key appears to be a Google AI key. Please switch to the Google AI tab."
            : "This key appears to be an OpenAI key (starts with 'sk-'). Anthropic keys start with 'sk-ant-'.",
        },
        { status: 400 }
      );
    }

    if (
      provider === "perplexity" &&
      (resolvedApiKey.startsWith("AIza") ||
        resolvedApiKey.startsWith("AQ.") ||
        resolvedApiKey.startsWith("sk-ant-"))
    ) {
      return NextResponse.json(
        {
          error: "This key appears to be a Google or Anthropic key. Please enter a valid Perplexity API key.",
        },
        { status: 400 }
      );
    }
  } else if (existing) {
    resolvedApiKey = decrypt(existing.apiKey);
  }

  const providerLabel =
    provider === "openai"
      ? "OpenAI"
      : provider === "anthropic"
      ? "Anthropic (Claude)"
      : provider === "perplexity"
      ? "Perplexity AI"
      : "Google AI";

  if (!resolvedApiKey) {
    return NextResponse.json(
      {
        error: `Please enter an API key for ${providerLabel}`,
      },
      { status: 400 }
    );
  }

  const resolvedModel =
    typeof model === "string" && model.trim()
      ? model.trim()
      : existing?.model || DEFAULT_MODEL[provider as Provider];

  if (makeActive) {
    await db
      .update(aiSettings)
      .set({ isActive: false })
      .where(eq(aiSettings.userId, session.user.id));
  }

  const values = {
    provider,
    apiKey: encrypt(resolvedApiKey),
    model: resolvedModel,
    isActive: makeActive ? true : (existing?.isActive ?? false),
    updatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(aiSettings)
      .set(values)
      .where(eq(aiSettings.id, existing.id));
  } else {
    await db.insert(aiSettings).values({
      id: randomUUID(),
      userId: session.user.id,
      ...values,
    });
  }

  return NextResponse.json({ success: true, provider, model: resolvedModel });
}

// DELETE — remove a specific provider's configuration
export async function DELETE(request: NextRequest) {
  try {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting protection
  const rateLimit = checkSettingsRateLimit(session.user.id);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit.resetMs, "Too many settings requests. Please wait a moment.");
  }

  const { searchParams } = new URL(request.url);
  const targetProvider = searchParams.get("provider");
  const targetId = searchParams.get("id");

  if (targetProvider) {
    await db
      .delete(aiSettings)
      .where(
        and(
          eq(aiSettings.provider, targetProvider),
          eq(aiSettings.userId, session.user.id)
        )
      );
  } else if (targetId) {
    await db
      .delete(aiSettings)
      .where(
        and(eq(aiSettings.id, targetId), eq(aiSettings.userId, session.user.id))
      );
  } else {
    await db.delete(aiSettings).where(eq(aiSettings.userId, session.user.id));
  }

  // Ensure an existing provider is marked active if one is left
  const remaining = await db.query.aiSettings.findMany({
    where: eq(aiSettings.userId, session.user.id),
    orderBy: [desc(aiSettings.updatedAt)],
  });

  if (remaining.length > 0 && !remaining.some((r) => r.isActive)) {
    await db
      .update(aiSettings)
      .set({ isActive: true })
      .where(eq(aiSettings.id, remaining[0].id));
  }

  return NextResponse.json({ success: true });
  } catch (error) {
    safeLog.error("Error in DELETE /api/settings/ai-provider:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete settings" }, { status: 500 });
  }
}
