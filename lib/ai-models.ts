export type Provider = "openai" | "google" | "anthropic" | "perplexity";

export interface ModelOption {
  id: string;
  label: string;
  description?: string;
}

export const PROVIDER_MODELS: Record<Provider, ModelOption[]> = {
  openai: [
    {
      id: "gpt-4o-mini",
      label: "GPT-4o Mini",
      description: "Fast, highly capable & cost-effective. Recommended.",
    },
    { id: "gpt-4o", label: "GPT-4o", description: "Flagship omni model with high intelligence." },
    { id: "o3-mini", label: "o3-mini", description: "Advanced reasoning for deep technical tailoring." },
    { id: "gpt-4-turbo", label: "GPT-4 Turbo", description: "High performance general model." },
  ],
  google: [
    {
      id: "gemini-3.6-flash",
      label: "Gemini 3.6 Flash",
      description: "Latest Flash generation, fast and reliable. Recommended.",
    },
    {
      id: "gemini-3.5-flash-lite",
      label: "Gemini 3.5 Flash Lite",
      description: "High speed lightweight model with high throughput.",
    },
    {
      id: "gemini-3.5-flash",
      label: "Gemini 3.5 Flash",
      description: "Standard Flash model (subject to free-tier quota limits).",
    },
    { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash", description: "Latest Gemini 3.7 generation." },
    { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", description: "High intelligence Flash model." },
  ],
  anthropic: [
    {
      id: "claude-3-5-sonnet-latest",
      label: "Claude 3.5 Sonnet",
      description: "State-of-the-art intelligence, precision & ATS tailoring. Recommended.",
    },
    {
      id: "claude-3-5-haiku-latest",
      label: "Claude 3.5 Haiku",
      description: "Blazing fast and cost-effective with strong coding & writing abilities.",
    },
    {
      id: "claude-3-opus-latest",
      label: "Claude 3 Opus",
      description: "Deep reasoning model for highly complex documents.",
    },
  ],
  perplexity: [
    {
      id: "sonar-pro",
      label: "Sonar Pro",
      description: "Premier search & high-intelligence generation (127k context). Recommended.",
    },
    {
      id: "sonar",
      label: "Sonar",
      description: "Lightweight, fast search & text generation (127k context).",
    },
    {
      id: "sonar-reasoning-pro",
      label: "Sonar Reasoning Pro",
      description: "Advanced reasoning model with chain-of-thought capabilities.",
    },
    {
      id: "sonar-reasoning",
      label: "Sonar Reasoning",
      description: "Fast reasoning model for structured problem-solving.",
    },
  ],
};

export const DEFAULT_MODEL: Record<Provider, string> = {
  openai: "gpt-4o-mini",
  google: "gemini-3.5-flash",
  anthropic: "claude-3-5-sonnet-latest",
  perplexity: "sonar-pro",
};
