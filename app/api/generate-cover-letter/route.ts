import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActiveAiSettings } from "@/lib/ai-settings";
import { decrypt } from "@/lib/encryption";
import { generateCoverLetter } from "@/lib/cover-letter-generator";
import { describeLlmError } from "@/lib/llm-errors";
import { DEFAULT_MODEL, type Provider } from "@/lib/ai-models";
import type { Resume } from "@/lib/schemas/resume";
import { checkAiGenerationRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { safeLog } from "@/lib/security";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = checkAiGenerationRateLimit(session.user.id);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetMs);
    }

    const settings = await getActiveAiSettings(session.user.id);

    if (!settings) {
      return NextResponse.json(
        {
          error: "AI provider not configured",
          redirect: "/settings",
        },
        { status: 403 }
      );
    }

    const provider = settings.provider as Provider;
    const apiKey = decrypt(settings.apiKey);
    const modelId = settings.model || DEFAULT_MODEL[provider];

    const { resume, jobDescription, pastCoverLetter } = await request.json();

    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: "resume and jobDescription are required" },
        { status: 400 }
      );
    }

    let coverLetter;
    try {
      coverLetter = await generateCoverLetter(
        resume as Resume,
        jobDescription,
        provider,
        apiKey,
        modelId,
        pastCoverLetter
      );
    } catch (primaryErr) {
      if (provider === "google") {
        const fallbacks = [
          "gemini-3.6-flash",
          "gemini-3.5-flash-lite",
          "gemini-3.5-flash",
          "gemini-3.7-flash",
        ].filter((m) => m !== modelId);

        let fallbackSuccess = false;
        let lastError = primaryErr;

        for (const fbModel of fallbacks) {
          safeLog.warn(
            `Primary cover letter model ${modelId} failed (${(primaryErr as Error).message}), attempting fallback to ${fbModel}...`
          );
          try {
            coverLetter = await generateCoverLetter(
              resume as Resume,
              jobDescription,
              provider,
              apiKey,
              fbModel,
              pastCoverLetter
            );
            fallbackSuccess = true;
            break;
          } catch (fbErr) {
            lastError = fbErr;
          }
        }

        if (!fallbackSuccess) {
          throw lastError;
        }
      } else {
        throw primaryErr;
      }
    }

    return NextResponse.json({ coverLetter });
  } catch (error) {
    safeLog.error("Cover letter generation failed:", error);
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
