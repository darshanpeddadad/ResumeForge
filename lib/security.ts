/**
 * Security & Data Redaction Utilities
 * Prevents inadvertent leaks of sensitive credentials (API keys, authorization headers, tokens)
 * in server logs, error messages, and API telemetry.
 */

const SENSITIVE_PATTERNS = [
  // OpenAI project or legacy keys: sk-proj-..., sk-...
  /\bsk-[a-zA-Z0-9_\-]{20,}\b/g,
  // Google Gemini API keys: AIza... or AQ....
  /\b(AIza|AQ\.)[a-zA-Z0-9_\-]{30,}\b/g,
  // Anthropic Claude keys: sk-ant-...
  /\bsk-ant-[a-zA-Z0-9_\-]{20,}\b/g,
  // Perplexity API keys: pplx-...
  /\bpplx-[a-zA-Z0-9_\-]{20,}\b/g,
  // Bearer tokens
  /\bBearer\s+[a-zA-Z0-9_\-\.]{20,}\b/gi,
  // URL query parameter keys (?key=... or &key=...)
  /([?&]key=)[a-zA-Z0-9_\-]{20,}/gi,
];

const SENSITIVE_KEY_NAMES = new Set([
  "apikey",
  "api_key",
  "authorization",
  "x-api-key",
  "x-goog-api-key",
  "secret",
  "password",
  "token",
  "cookie",
]);

/**
 * Redacts any detected API key or token substrings from a string.
 */
export function redactSensitiveText(text: string): string {
  if (!text || typeof text !== "string") return text;
  let result = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, (match, group1) => {
      if (group1 && (group1 === "?key=" || group1 === "&key=")) {
        return `${group1}[REDACTED]`;
      }
      return "[REDACTED_API_KEY]";
    });
  }
  return result;
}

/**
 * Deeply redacts sensitive keys and values from arbitrary objects,
 * error payloads, and HTTP configuration metadata.
 */
export function redactSensitiveData(data: unknown, depth = 0): unknown {
  if (depth > 6) return "[MAX_DEPTH]";
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    return redactSensitiveText(data);
  }

  if (typeof data !== "object") {
    return data;
  }

  if (data instanceof Error) {
    return {
      name: data.name,
      message: redactSensitiveText(data.message),
      stack: data.stack ? redactSensitiveText(data.stack) : undefined,
    };
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEY_NAMES.has(lowerKey)) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = redactSensitiveData(val, depth + 1);
    }
  }
  return sanitized;
}

/**
 * Secure logging methods that guarantee raw credentials are scrubbed
 * prior to outputting to stdout or telemetry aggregators.
 */
export const safeLog = {
  error(message: string, error?: unknown, extra?: Record<string, unknown>): void {
    const cleanMsg = redactSensitiveText(message);
    const cleanErr = error !== undefined ? redactSensitiveData(error) : undefined;
    const cleanExtra = extra !== undefined ? redactSensitiveData(extra) : undefined;

    if (cleanErr !== undefined && cleanExtra !== undefined) {
      console.error(cleanMsg, cleanErr, cleanExtra);
    } else if (cleanErr !== undefined) {
      console.error(cleanMsg, cleanErr);
    } else if (cleanExtra !== undefined) {
      console.error(cleanMsg, cleanExtra);
    } else {
      console.error(cleanMsg);
    }
  },

  warn(message: string, extra?: unknown): void {
    const cleanMsg = redactSensitiveText(message);
    const cleanExtra = extra !== undefined ? redactSensitiveData(extra) : undefined;
    if (cleanExtra !== undefined) {
      console.warn(cleanMsg, cleanExtra);
    } else {
      console.warn(cleanMsg);
    }
  },

  info(message: string, extra?: unknown): void {
    const cleanMsg = redactSensitiveText(message);
    const cleanExtra = extra !== undefined ? redactSensitiveData(extra) : undefined;
    if (cleanExtra !== undefined) {
      console.log(cleanMsg, cleanExtra);
    } else {
      console.log(cleanMsg);
    }
  },
};
