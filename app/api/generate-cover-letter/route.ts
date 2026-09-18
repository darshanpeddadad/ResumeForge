import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActiveAiSettings } from "@/lib/ai-settings";
import { decrypt } from "@/lib/encryption";
import { generateCoverLetter } from "@/lib/cover-letter-generator";
import { humanizeProse } from "@/lib/humanizer";
import { describeLlmError } from "@/lib/llm-errors";
import { DEFAULT_MODEL, type Provider } from "@/lib/ai-models";
import type { Resume } from "@/lib/schemas/resume";
import { checkAiGenerationRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { safeLog } from "@/lib/security";
import { recordGenerationLog } from "@/lib/admin";

export const maxDuration = 120;

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

    const startTime = performance.now();
    const coverLetter = await generateCoverLetter(
      resume as Resume,
      jobDescription,
      provider,
      apiKey,
      modelId,
      pastCoverLetter
    );

    // Automatically run the blader/humanizer engine on the cover letter text
    try {
      const humanizedText = await humanizeProse(
        coverLetter.fullText,
        provider,
        apiKey,
        modelId
      );
      if (humanizedText) {
        coverLetter.fullText = humanizedText;
      }
    } catch (hErr) {
      safeLog.warn("Cover letter auto-humanize fallback:", hErr);
    }

    const durationMs = performance.now() - startTime;
    recordGenerationLog({
      userId: session.user.id,
      type: "cover_letter",
      provider,
      model: modelId,
      status: "success",
      durationMs,
    });

    return NextResponse.json({ coverLetter });
  } catch (error) {
    safeLog.error("Cover letter generation failed:", error);
    const info = describeLlmError(error);
    recordGenerationLog({
      type: "cover_letter",
      status: "error",
      errorMessage: info.message,
    });
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

