export type LlmErrorCode =
  | "invalid_api_key"
  | "rate_limit"
  | "permission"
  | "model_not_found"
  | "provider"
  | "unknown";

export interface LlmErrorInfo {
  code: LlmErrorCode;
  message: string;
  toSettings: boolean;
}

export function describeLlmError(error: unknown): LlmErrorInfo {
  const e = (error ?? {}) as {
    statusCode?: number;
    name?: string;
    message?: string;
    lastError?: { statusCode?: number; message?: string };
    cause?: { statusCode?: number; message?: string };
    errors?: Array<{ statusCode?: number; message?: string }>;
  };

  const status =
    e.statusCode ??
    e.lastError?.statusCode ??
    e.cause?.statusCode ??
    e.errors?.[0]?.statusCode;

  const msg = [
    e.message,
    e.lastError?.message,
    e.cause?.message,
    ...(e.errors?.map((x) => x.message) || []),
  ]
    .filter(Boolean)
    .join(" ");

  if (/ByteString|character at index/i.test(msg)) {
    return {
      code: "invalid_api_key",
      message:
        "The API key contains invalid characters or text formatting. Please update your API key in Settings, ensuring only the raw key is pasted.",
      toSettings: true,
    };
  }

  if (
    status === 401 ||
    /incorrect api key|invalid api key|invalid_x_api_key|authentication_error|api key not valid|api key invalid|unauthorized|authentication failed|API_KEY_INVALID/i.test(
      msg
    )
  ) {
    return {
      code: "invalid_api_key",
      message:
        "Your API key was rejected — it may be wrong, revoked, or expired. Update it in Settings and try again.",
      toSettings: true,
    };
  }

  // Anthropic: Credit balance too low
  if (/credit balance is too low|credit_balance_exhausted/i.test(msg)) {
    return {
      code: "rate_limit",
      message:
        "Your Anthropic account has insufficient credit balance. Please add credits at console.anthropic.com/settings/plans, or switch to Google AI (free) in Settings.",
      toSettings: true,
    };
  }

  // OpenAI: Out of billing credits ($0 balance)
  if (/no credits remaining|insufficient_quota/i.test(msg)) {
    return {
      code: "rate_limit",
      message:
        "Your OpenAI account has no credits remaining ($0 balance). Please add credits at platform.openai.com/settings/organization/billing, or switch to Google AI (Gemini is free) in Settings.",
      toSettings: true,
    };
  }

  // Google AI: 503 High demand
  if (
    status === 503 ||
    /high demand|spikes in demand|temporarily unavailable|unavailable|overloaded/i.test(
      msg
    )
  ) {
    return {
      code: "provider",
      message:
        "Google Gemini is currently experiencing temporary high demand. Try switching to Gemini 3.6 Flash or Gemini 3.5 Flash Lite in Settings.",
      toSettings: true,
    };
  }

  // Google AI: Quota limit
  if (/RESOURCE_EXHAUSTED|free_tier_requests/i.test(msg)) {
    return {
      code: "rate_limit",
      message:
        "Your Google AI Studio free tier quota was reached (20 requests/minute). Wait 60 seconds or switch to Gemini 3.6 Flash in Settings.",
      toSettings: true,
    };
  }

  // General 429 rate limit
  if (
    status === 429 ||
    /rate limit|rate_limit_error|too many requests/i.test(msg)
  ) {
    const isGoogle = /google|generativelanguage|gemini/i.test(msg);
    const isAnthropic = /anthropic|claude/i.test(msg);
    const isPerplexity = /perplexity|sonar/i.test(msg);
    return {
      code: "rate_limit",
      message: isGoogle
        ? "Google Gemini rate limit reached. Wait 60 seconds or switch to Gemini 3.6 Flash in Settings."
        : isAnthropic
        ? "Anthropic (Claude) rate limit reached. Wait a minute and try again or switch provider in Settings."
        : isPerplexity
        ? "Perplexity API rate limit reached. Wait a minute and try again or switch provider in Settings."
        : "Your OpenAI API key hit a rate limit. Wait a minute and try again.",
      toSettings: true,
    };
  }

  if (
    status === 403 ||
    /permission denied|access denied|forbidden/i.test(msg)
  ) {
    return {
      code: "permission",
      message:
        "Your API key doesn't have access to this model. Check permissions and billing on your provider's dashboard.",
      toSettings: true,
    };
  }

  if (status === 404 || /model.*not found|not found|does not exist/i.test(msg)) {
    return {
      code: "model_not_found",
      message:
        "The model you selected isn't available for your key or account. Pick a supported model in Settings (e.g. GPT-4o Mini or Gemini 3.6 Flash).",
      toSettings: true,
    };
  }

  if (typeof status === "number" && status >= 500) {
    return {
      code: "provider",
      message:
        "The AI provider returned a server error (HTTP " + status + "). Try again in a moment or pick a different model in Settings.",
      toSettings: true,
    };
  }

  return {
    code: "unknown",
    message:
      "Something went wrong while talking to the AI provider. Try again in a moment or check your model in Settings.",
    toSettings: true,
  };
}