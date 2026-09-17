import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActiveAiSettings } from "@/lib/ai-settings";
import { decrypt } from "@/lib/encryption";
import { parseResumeWithLLM } from "@/lib/llm";
import { buildHighlights } from "@/lib/highlights";
import { describeLlmError } from "@/lib/llm-errors";
import { DEFAULT_MODEL, type Provider } from "@/lib/ai-models";
import { checkAiGenerationRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { safeLog } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    // Verify session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting protection for AI generation
    const rateLimit = checkAiGenerationRateLimit(session.user.id);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetMs);
    }

    // Look up user's active BYOK provider settings
    const settings = await getActiveAiSettings(session.user.id);

    if (!settings) {
      safeLog.error(
        `parse-resume 403: no ai_settings row for user ${session.user.id} (email: ${session.user.email ?? "?"})`
      );
      return NextResponse.json(
        {
          error: "AI provider not configured",
          redirect: "/settings",
          hint: `Signed in as ${session.user.email ?? "unknown"}. Your API key may be saved under a different account.`,
        },
        { status: 403 }
      );
    }

    const provider = settings.provider as Provider;
    const apiKey = decrypt(settings.apiKey);
    const modelId = settings.model || DEFAULT_MODEL[provider];

    const body = await request.json();
    const { resumeText, jobDescription } = body;

    if (!resumeText || typeof resumeText !== "string") {
      return NextResponse.json(
        { error: "resumeText is required" },
        { status: 400 }
      );
    }

    let result;
    try {
      result = await parseResumeWithLLM(
        resumeText,
        jobDescription || undefined,
        provider,
        apiKey,
        modelId
      );
    } catch (primaryErr) {
      if (provider === "google") {
        const fallbacks = [
          "gemini-3.6-flash",
          "gemini-3.5-flash-lite",
          "gemini-3.5-flash",
        ].filter((m) => m !== modelId);

        let fallbackSuccess = false;
        let lastError = primaryErr;

        for (const fbModel of fallbacks) {
          safeLog.warn(
            `Primary model ${modelId} failed (${(primaryErr as Error).message}), attempting fallback to ${fbModel}...`
          );
          try {
            result = await parseResumeWithLLM(
              resumeText,
              jobDescription || undefined,
              provider,
              apiKey,
              fbModel
            );
            fallbackSuccess = true;
            break;
          } catch (fbErr) {
            lastError = fbErr;
          }
        }

        if (!fallbackSuccess || !result) {
          throw lastError;
        }
      } else {
        throw primaryErr;
      }
    }

    if (!result) {
      throw new Error("Resume generation produced no output");
    }

    const { resume, aiChanges } = result;

    const highlights = buildHighlights(
      aiChanges,
      resume,
      resumeText,
      jobDescription || undefined
    );

    return NextResponse.json({ resume, aiChanges, highlights });
  } catch (error) {
    safeLog.error("Parse resume error:", error);
    const info = describeLlmError(error);
    return NextResponse.json(
      {
        error: info.message,
        code: info.code,
        redirect: info.toSettings ? "/settings" : undefined,
      },
      { status: 500 }
    );
  }
}
