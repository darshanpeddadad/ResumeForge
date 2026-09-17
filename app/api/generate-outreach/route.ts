import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActiveAiSettings } from "@/lib/ai-settings";
import { decrypt } from "@/lib/encryption";
import { generateOutreach } from "@/lib/outreach-generator";
import { humanizeProse } from "@/lib/humanizer";
import { renderColdEmail, renderColdDM } from "@/lib/template-renderer";
import { describeLlmError } from "@/lib/llm-errors";
import { DEFAULT_MODEL, type Provider } from "@/lib/ai-models";
import type { Resume } from "@/lib/schemas/resume";
import type { ColdEmail, ColdDM } from "@/lib/schemas/outreach";
import { checkAiGenerationRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { safeLog } from "@/lib/security";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Verify session
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

    // Look up user's AI provider settings
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

    const { resume, jobDescription } = await request.json();

    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: "resume and jobDescription are required" },
        { status: 400 }
      );
    }

    const outreach = await generateOutreach(
      resume as Resume,
      jobDescription,
      provider,
      apiKey,
      modelId
    );

    // Render the template values into prose strings
    const emailData = outreach.coldEmail as ColdEmail;
    const dmData = outreach.coldDM as ColdDM;
    let coldEmailText = renderColdEmail(emailData);
    let coldDMText = renderColdDM(dmData);

    // Automatically run the blader/humanizer engine on both messages
    try {
      const [humanizedEmail, humanizedDM] = await Promise.allSettled([
        humanizeProse(coldEmailText, provider, apiKey, modelId),
        humanizeProse(coldDMText, provider, apiKey, modelId),
      ]);
      if (humanizedEmail.status === "fulfilled" && humanizedEmail.value) {
        coldEmailText = humanizedEmail.value;
      }
      if (humanizedDM.status === "fulfilled" && humanizedDM.value) {
        coldDMText = humanizedDM.value;
      }
    } catch (hErr) {
      safeLog.warn("Outreach auto-humanize fallback:", hErr);
    }

    // Return rendered + humanized strings alongside structured data
    return NextResponse.json({
      outreach,
      coldEmailText,
      coldDMText,
    });
  } catch (error) {
    safeLog.error("Generate outreach error:", error);
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
