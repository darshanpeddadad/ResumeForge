import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { DEFAULT_MODEL, PROVIDER_MODELS, type Provider } from "@/lib/ai-models";
import { safeLog } from "@/lib/security";

/**
 * Returns a configured AI SDK model instance for any provider.
 */
export function getAiModel(provider: Provider, apiKey: string, modelId?: string) {
  const cleanApiKey = (apiKey || "").replace(/[^\x20-\x7E]/g, "").trim();
  const model = modelId || DEFAULT_MODEL[provider];

  if (provider === "google") {
    const google = createGoogleGenerativeAI({ apiKey: cleanApiKey });
    return google(model);
  }
  if (provider === "anthropic") {
    const anthropic = createAnthropic({ apiKey: cleanApiKey });
    return anthropic(model);
  }
  if (provider === "perplexity") {
    const perplexity = createOpenAI({
      apiKey: cleanApiKey,
      baseURL: "https://api.perplexity.ai",
    });
    return perplexity(model);
  }
  const openai = createOpenAI({ apiKey: cleanApiKey });
  return openai(model);
}

/**
 * Returns prioritized fallback models for a provider, excluding the current model.
 */
export function getModelFallbacks(provider: Provider, currentModelId: string): string[] {
  const presetIds = PROVIDER_MODELS[provider]?.map((m) => m.id) || [];
  return presetIds.filter((id) => id !== currentModelId);
}

/**
 * Determines if an error is an unrecoverable authentication error
 * where cycling through alternative models is futile.
 */
export function isPermanentAuthError(error: unknown): boolean {
  const msg = String(error instanceof Error ? error.message : error).toLowerCase();
  return (
    msg.includes("401") ||
    msg.includes("invalid_api_key") ||
    msg.includes("incorrect api key") ||
    msg.includes("authentication") ||
    msg.includes("unauthorized") ||
    msg.includes("permission_denied")
  );
}

/**
 * Executes any AI SDK generation task with automatic model fallback across all 4 providers.
 * If the active model experiences rate-limits (429), capacity errors (529/503), or model retirement (404),
 * it gracefully cascades to the next best model for that provider.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// Execution budget per model attempt: 35s allows full structured resume/translation generation without premature aborts
const ATTEMPT_TIMEOUT_MS = 35000;

export async function executeWithModelFallback<T>(
  provider: Provider,
  apiKey: string,
  modelId: string | undefined,
  taskName: string,
  operation: (model: any, activeModelId: string) => Promise<T>
): Promise<T> {
  const primaryModel = modelId || DEFAULT_MODEL[provider];
  const primaryInstance = getAiModel(provider, apiKey, primaryModel);

  try {
    return await withTimeout(
      operation(primaryInstance, primaryModel),
      ATTEMPT_TIMEOUT_MS,
      `Model "${primaryModel}" timed out after ${ATTEMPT_TIMEOUT_MS}ms`
    );
  } catch (primaryError) {
    if (isPermanentAuthError(primaryError)) {
      throw primaryError;
    }

    // Limit to top 2 fallbacks to prevent cascading hammering of the provider's API
    const fallbacks = getModelFallbacks(provider, primaryModel).slice(0, 2);
    if (fallbacks.length === 0) {
      throw primaryError;
    }

    let lastError = primaryError;
    for (const fbModel of fallbacks) {
      safeLog.warn(
        `[${taskName}] Primary model "${primaryModel}" on ${provider} failed (${(primaryError as Error).message}). Cascading to fallback model "${fbModel}"...`
      );
      try {
        // Brief pause before fallback to allow transient rate-limit buffers to clear
        await new Promise((res) => setTimeout(res, 600));

        const fallbackInstance = getAiModel(provider, apiKey, fbModel);
        const result = await withTimeout(
          operation(fallbackInstance, fbModel),
          ATTEMPT_TIMEOUT_MS,
          `Fallback model "${fbModel}" timed out after ${ATTEMPT_TIMEOUT_MS}ms`
        );
        safeLog.info(
          `[${taskName}] Successfully recovered using fallback model "${fbModel}" on ${provider}!`
        );
        return result;
      } catch (fbError) {
        if (isPermanentAuthError(fbError)) {
          throw fbError;
        }
        lastError = fbError;
      }
    }

    throw lastError;
  }
}
