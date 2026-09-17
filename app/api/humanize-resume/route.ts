import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActiveAiSettings } from "@/lib/ai-settings";
import { decrypt } from "@/lib/encryption";
import { humanizeResume } from "@/lib/humanizer";
import { describeLlmError } from "@/lib/llm-errors";
import { DEFAULT_MODEL, type Provider } from "@/lib/ai-models";
import type { Resume } from "@/lib/schemas/resume";
import { checkAiGenerationRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { safeLog } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting protection
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

    const { resume } = await request.json();

    if (!resume || !resume.experience || !resume.projects) {
      return NextResponse.json(
        { error: "Valid resume object is required" },
        { status: 400 }
      );
    }

    const humanized = await humanizeResume(
      resume as Resume,
      provider,
      apiKey,
      modelId
    );

    return NextResponse.json({ resume: humanized });
  } catch (error) {
    safeLog.error("Error humanizing resume:", error);
    const described = describeLlmError(error);
    return NextResponse.json(
      {
        error: described.message,
        code: described.code,
        redirect: described.toSettings ? "/settings" : undefined,
      },
      { status: 500 }
    );
  }
}
