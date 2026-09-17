import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiSettings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { decrypt, sanitizeApiKey } from "@/lib/encryption";
import { DEFAULT_MODEL, PROVIDER_MODELS, type Provider, type ModelOption } from "@/lib/ai-models";
import { checkSettingsRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { safeLog } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const rateLimit = checkSettingsRateLimit(session.user.id);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetMs, "Too many model scan requests. Please wait a moment.");
    }

    const body = await request.json();
    const { provider, apiKey } = body as { provider?: Provider; apiKey?: string };

    if (!provider || (provider !== "openai" && provider !== "google" && provider !== "anthropic" && provider !== "perplexity")) {
      return NextResponse.json({ error: "Invalid provider specified" }, { status: 400 });
    }

    // Resolve API key: either provided in body or saved in DB
    let resolvedKey: string | undefined;
    if (apiKey) {
      resolvedKey = sanitizeApiKey(apiKey);
    } else {
      const existing = await db.query.aiSettings.findFirst({
        where: and(
          eq(aiSettings.userId, session.user.id),
          eq(aiSettings.provider, provider)
        ),
      });
      if (existing) {
        resolvedKey = decrypt(existing.apiKey);
      }
    }

    if (!resolvedKey) {
      return NextResponse.json(
        { error: "Please enter or save an API key first to fetch available models." },
        { status: 400 }
      );
    }

    const cleanKey = sanitizeApiKey(resolvedKey);

    // Check for TabPFN prefix on Perplexity
    if (provider === "perplexity" && cleanKey.startsWith("tabpfn_")) {
      return NextResponse.json(
        {
          error:
            "Your API key starts with 'tabpfn_', which belongs to TabPFN (PriorLabs) for tabular machine learning, not Perplexity AI. Please generate a Perplexity API key at https://www.perplexity.ai/settings/api.",
          isMisconfiguredKey: true,
        },
        { status: 400 }
      );
    }

    const presetMap = new Map(PROVIDER_MODELS[provider].map((m) => [m.id, m]));
    let dynamicModels: ModelOption[] = [];

    if (provider === "google") {
      // Secure transmission via x-goog-api-key header instead of query parameters
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
        headers: {
          "x-goog-api-key": cleanKey,
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        if (res.status === 400 || res.status === 403) {
          return NextResponse.json(
            { error: "Invalid Google AI API key or API not enabled. Please verify at https://aistudio.google.com/." },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: `Google API returned error (${res.status}): ${errorText.slice(0, 150)}` },
          { status: 400 }
        );
      }

      const data = await res.json();
      const rawModels = (data.models || []) as Array<{
        name: string;
        displayName?: string;
        description?: string;
        supportedGenerationMethods?: string[];
      }>;

      // Filter for chat / text generation models
      const textModels = rawModels.filter(
        (m) =>
          m.supportedGenerationMethods &&
          m.supportedGenerationMethods.includes("generateContent") &&
          !m.name.includes("embedding") &&
          !m.name.includes("aqa")
      );

      // Map models, prioritizing Flash and known flagship models
      dynamicModels = textModels.map((m) => {
        const id = m.name.replace("models/", "");
        const preset = presetMap.get(id);
        return {
          id,
          label: preset?.label || m.displayName || id,
          description:
            preset?.description ||
            (m.description ? m.description.slice(0, 120) + "..." : "Compatible Gemini generation model."),
        };
      });

      // Sort with Flash and Pro models at top
      dynamicModels.sort((a, b) => {
        const aFlash = a.id.includes("flash") ? 1 : 0;
        const bFlash = b.id.includes("flash") ? 1 : 0;
        if (aFlash !== bFlash) return bFlash - aFlash;
        return a.id.localeCompare(b.id);
      });
    } else if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${cleanKey}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          return NextResponse.json(
            { error: "Invalid OpenAI API key. Verify your key at https://platform.openai.com/api-keys." },
            { status: 400 }
          );
        }
        const errorText = await res.text();
        return NextResponse.json(
          { error: `OpenAI API returned error (${res.status}): ${errorText.slice(0, 150)}` },
          { status: 400 }
        );
      }

      const data = await res.json();
      const raw = (data.data || []) as Array<{ id: string }>;
      const chatPrefixes = ["gpt-4", "o1", "o3", "chatgpt-4o"];

      const chatModels = raw
        .filter((m) => chatPrefixes.some((p) => m.id.startsWith(p)) && !m.id.includes("realtime") && !m.id.includes("audio"))
        .sort((a, b) => b.id.localeCompare(a.id));

      dynamicModels = chatModels.map((m) => {
        const preset = presetMap.get(m.id);
        return {
          id: m.id,
          label: preset?.label || m.id,
          description: preset?.description || "OpenAI model available on your account.",
        };
      });
    } else if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": cleanKey,
          "anthropic-version": "2023-06-01",
        },
      });
      if (!res.ok) {
        if (res.status === 401) {
          return NextResponse.json(
            { error: "Invalid Anthropic API key. Verify your key at https://console.anthropic.com/settings/keys." },
            { status: 400 }
          );
        }
        const errorText = await res.text();
        return NextResponse.json(
          { error: `Anthropic API returned error (${res.status}): ${errorText.slice(0, 150)}` },
          { status: 400 }
        );
      }

      const data = await res.json();
      const raw = (data.data || []) as Array<{ id: string; display_name?: string }>;
      dynamicModels = raw.map((m) => {
        const preset = presetMap.get(m.id);
        return {
          id: m.id,
          label: preset?.label || m.display_name || m.id,
          description: preset?.description || "Claude model available on your account.",
        };
      });
    } else if (provider === "perplexity") {
      // Test the Perplexity key against /chat/completions to verify active access
      const res = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cleanKey}`,
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.error?.message || "Invalid Perplexity API key";
        if (res.status === 401) {
          return NextResponse.json(
            {
              error: `${errMsg}. Please ensure you are using a valid Perplexity API key from https://www.perplexity.ai/settings/api.`,
            },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: `Perplexity API returned error (${res.status}): ${errMsg}` },
          { status: 400 }
        );
      }

      // If key is valid, present the full Sonar model suite
      dynamicModels = PROVIDER_MODELS["perplexity"];
    }

    // If no models were detected or dynamic response is empty, fallback to presets
    if (dynamicModels.length === 0) {
      dynamicModels = PROVIDER_MODELS[provider];
    }

    return NextResponse.json({
      success: true,
      provider,
      models: dynamicModels,
      count: dynamicModels.length,
      defaultModel: DEFAULT_MODEL[provider],
    });
  } catch (err) {
    safeLog.error("Fetch models error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch models from provider" },
      { status: 500 }
    );
  }
}
