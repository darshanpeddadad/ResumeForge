"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshIcon } from "@/components/ui/refresh";
import { Delete02Icon } from "@/components/ui/delete-02";
import { Check, Sparkles, CheckCircle2, Bot, Cpu, Zap, RefreshCw, Layers } from "lucide-react";
import { SiPerplexity } from "react-icons/si";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PROVIDER_MODELS,
  DEFAULT_MODEL,
  type Provider,
  type ModelOption,
} from "@/lib/ai-models";

interface ProviderConfig {
  id: string;
  provider: Provider;
  model: string | null;
  apiKeyMasked: string;
  isActive: boolean;
  isConfigured: boolean;
  updatedAt: string;
}

function providerDisplayName(p: Provider): string {
  if (p === "anthropic") return "Anthropic (Claude)";
  if (p === "openai") return "OpenAI";
  if (p === "perplexity") return "Perplexity AI";
  return "Google AI";
}

export function AiProviderForm() {
  const { data: session } = authClient.useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Provider>("google");
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);

  const [configs, setConfigs] = useState<{
    openai: ProviderConfig | null;
    google: ProviderConfig | null;
    anthropic: ProviderConfig | null;
    perplexity: ProviderConfig | null;
  }>({ openai: null, google: null, anthropic: null, perplexity: null });

  // Separate form state for each provider so switching tabs never loses input
  const [googleKey, setGoogleKey] = useState("");
  const [googleModel, setGoogleModel] = useState(DEFAULT_MODEL["google"]);
  const [googleCustomModel, setGoogleCustomModel] = useState("");

  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState(DEFAULT_MODEL["openai"]);
  const [openaiCustomModel, setOpenaiCustomModel] = useState("");

  const [anthropicKey, setAnthropicKey] = useState("");
  const [anthropicModel, setAnthropicModel] = useState(DEFAULT_MODEL["anthropic"]);
  const [anthropicCustomModel, setAnthropicCustomModel] = useState("");

  const [perplexityKey, setPerplexityKey] = useState("");
  const [perplexityModel, setPerplexityModel] = useState(DEFAULT_MODEL["perplexity"]);
  const [perplexityCustomModel, setPerplexityCustomModel] = useState("");

  // Dynamic models detected for user's keys
  const [availableModels, setAvailableModels] = useState<Record<Provider, ModelOption[]>>(PROVIDER_MODELS);
  const [scanningModels, setScanningModels] = useState<Record<Provider, boolean>>({
    google: false,
    openai: false,
    anthropic: false,
    perplexity: false,
  });
  const [scanStatus, setScanStatus] = useState<Record<Provider, string | null>>({
    google: null,
    openai: null,
    anthropic: null,
    perplexity: null,
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    fetchSettings();
  }, [session]);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings/ai-provider");
      const data = await res.json();

      const pConfigs = data.providers || { openai: null, google: null, anthropic: null, perplexity: null };
      setConfigs(pConfigs);

      const active = (data.activeProvider as Provider) || (pConfigs.google ? "google" : pConfigs.openai ? "openai" : pConfigs.anthropic ? "anthropic" : "perplexity");
      setActiveProvider(data.activeProvider || null);
      if (active) {
        setActiveTab(active);
        // Automatically check models for active configured provider in background
        if (pConfigs[active]?.isConfigured) {
          triggerAutoScan(active);
        }
      }

      if (pConfigs.google?.model) {
        setGoogleModel(pConfigs.google.model);
      }
      if (pConfigs.openai?.model) {
        setOpenaiModel(pConfigs.openai.model);
      }
      if (pConfigs.anthropic?.model) {
        setAnthropicModel(pConfigs.anthropic.model);
      }
      if (pConfigs.perplexity?.model) {
        setPerplexityModel(pConfigs.perplexity.model);
      }
    } catch {
      // Settings not configured yet
    } finally {
      setLoading(false);
    }
  }

  async function triggerAutoScan(p: Provider) {
    try {
      const res = await fetch("/api/settings/ai-provider/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: p }),
      });
      const data = await res.json();
      if (res.ok && data.models && Array.isArray(data.models) && data.models.length > 0) {
        setAvailableModels((prev) => ({ ...prev, [p]: data.models }));
        setScanStatus((prev) => ({
          ...prev,
          [p]: `Verified: ${data.models.length} models accessible on your account`,
        }));
      }
    } catch {
      // silent background scan failure
    }
  }

  async function handleScanModels(p: Provider) {
    const key =
      p === "google"
        ? googleKey
        : p === "openai"
        ? openaiKey
        : p === "anthropic"
        ? anthropicKey
        : perplexityKey;

    if (!key.trim() && !configs[p]?.isConfigured) {
      setError(`Please enter or save your ${providerDisplayName(p)} API key first.`);
      return;
    }

    setScanningModels((prev) => ({ ...prev, [p]: true }));
    setError(null);
    setScanStatus((prev) => ({ ...prev, [p]: null }));

    try {
      const res = await fetch("/api/settings/ai-provider/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: p, apiKey: key.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch models from provider");
      }

      if (data.models && Array.isArray(data.models) && data.models.length > 0) {
        setAvailableModels((prev) => ({ ...prev, [p]: data.models }));
        setScanStatus((prev) => ({
          ...prev,
          [p]: `Success! Found ${data.models.length} models accessible for this key`,
        }));
        setSuccess(`Loaded ${data.models.length} accessible models for ${providerDisplayName(p)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan available models");
    } finally {
      setScanningModels((prev) => ({ ...prev, [p]: false }));
    }
  }

  async function handleSwitchActive(provider: Provider) {
    if (!configs[provider]?.isConfigured) {
      setError(`Please configure your ${providerDisplayName(provider)} API key below first.`);
      setActiveTab(provider);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/settings/ai-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "switch_provider", provider }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to switch active provider");
      }

      setActiveProvider(provider);
      setActiveTab(provider);
      setSuccess(`Switched active provider to ${providerDisplayName(provider)}`);
      await fetchSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch provider");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveProvider(p: Provider) {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const key =
      p === "google"
        ? googleKey
        : p === "openai"
        ? openaiKey
        : p === "anthropic"
        ? anthropicKey
        : perplexityKey;
    const selectedModel =
      p === "google"
        ? googleModel
        : p === "openai"
        ? openaiModel
        : p === "anthropic"
        ? anthropicModel
        : perplexityModel;
    const custom =
      p === "google"
        ? googleCustomModel
        : p === "openai"
        ? openaiCustomModel
        : p === "anthropic"
        ? anthropicCustomModel
        : perplexityCustomModel;
    const finalModel = selectedModel === "custom" ? custom.trim() : selectedModel;

    try {
      const res = await fetch("/api/settings/ai-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: p,
          apiKey: key || undefined,
          model: finalModel || DEFAULT_MODEL[p],
          makeActive: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save settings");
      }

      if (p === "google") setGoogleKey("");
      if (p === "openai") setOpenaiKey("");
      if (p === "anthropic") setAnthropicKey("");
      if (p === "perplexity") setPerplexityKey("");

      setSuccess(`Saved & activated ${providerDisplayName(p)} (${finalModel || DEFAULT_MODEL[p]})`);
      await fetchSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProvider(p: Provider) {
    if (!confirm(`Are you sure you want to remove your ${providerDisplayName(p)} API key?`)) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/settings/ai-provider?provider=${p}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete settings");
      }

      setSuccess(`Removed ${providerDisplayName(p)} configuration`);
      await fetchSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card className="glass-card border border-border/50 shadow-xl backdrop-blur-xl">
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-center text-muted-foreground text-sm">
            <RefreshIcon size={16} className="animate-spin text-primary" />
            Loading AI configurations...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card border border-border/50 shadow-2xl backdrop-blur-xl">
        <CardHeader>
          <CardTitle>AI Providers & Models</CardTitle>
          <CardDescription>
            Configure your API keys for Google AI (Gemini), OpenAI (ChatGPT), Anthropic (Claude), and Perplexity (Sonar). All can be saved simultaneously so you can switch between them with a single click.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Active Provider Switcher Banner */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">
                Active Provider For Resumes
              </span>
              {activeProvider && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 text-primary px-2.5 py-0.5 text-xs font-bold">
                  <Sparkles size={12} /> Active: {providerDisplayName(activeProvider)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-1">
              {/* Google Selector */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab("google");
                  if (configs.google?.isConfigured && activeProvider !== "google") {
                    handleSwitchActive("google");
                  }
                }}
                className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden ${
                  activeProvider === "google"
                    ? "border-primary bg-primary/15 shadow-md shadow-primary/5 text-foreground ring-1 ring-primary"
                    : configs.google?.isConfigured
                    ? "border-border/60 bg-background/50 hover:border-primary/40 text-muted-foreground hover:text-foreground"
                    : "border-border/30 bg-background/20 opacity-60 text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Bot size={16} className={`shrink-0 ${activeProvider === "google" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="font-bold text-xs truncate">Google AI</span>
                  </div>
                  {activeProvider === "google" && (
                    <span className="text-[10px] font-bold text-primary flex items-center gap-1 shrink-0 bg-primary/20 border border-primary/30 px-1.5 py-0.5 rounded-full">
                      <CheckCircle2 size={10} className="shrink-0" /> Active
                    </span>
                  )}
                </div>
                <div className="mt-2.5 text-xs space-y-1">
                  {configs.google?.isConfigured ? (
                    <>
                      <div className="text-primary font-mono text-[11px] font-semibold leading-snug break-all truncate">
                        {configs.google.model || "gemini-3.6-flash"}
                      </div>
                      <div className="text-muted-foreground/70 font-mono text-[10px]">
                        {configs.google.apiKeyMasked}
                      </div>
                    </>
                  ) : (
                    <div className="text-muted-foreground/60 text-[10px]">Not configured</div>
                  )}
                </div>
              </button>

              {/* OpenAI Selector */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab("openai");
                  if (configs.openai?.isConfigured && activeProvider !== "openai") {
                    handleSwitchActive("openai");
                  }
                }}
                className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden ${
                  activeProvider === "openai"
                    ? "border-primary bg-primary/15 shadow-md shadow-primary/5 text-foreground ring-1 ring-primary"
                    : configs.openai?.isConfigured
                    ? "border-border/60 bg-background/50 hover:border-primary/40 text-muted-foreground hover:text-foreground"
                    : "border-border/30 bg-background/20 opacity-60 text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Cpu size={16} className={`shrink-0 ${activeProvider === "openai" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="font-bold text-xs truncate">OpenAI</span>
                  </div>
                  {activeProvider === "openai" && (
                    <span className="text-[10px] font-bold text-primary flex items-center gap-1 shrink-0 bg-primary/20 border border-primary/30 px-1.5 py-0.5 rounded-full">
                      <CheckCircle2 size={10} className="shrink-0" /> Active
                    </span>
                  )}
                </div>
                <div className="mt-2.5 text-xs space-y-1">
                  {configs.openai?.isConfigured ? (
                    <>
                      <div className="text-primary font-mono text-[11px] font-semibold leading-snug break-all truncate">
                        {configs.openai.model || "gpt-4o-mini"}
                      </div>
                      <div className="text-muted-foreground/70 font-mono text-[10px]">
                        {configs.openai.apiKeyMasked}
                      </div>
                    </>
                  ) : (
                    <div className="text-muted-foreground/60 text-[10px]">Not configured</div>
                  )}
                </div>
              </button>

              {/* Anthropic Selector */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab("anthropic");
                  if (configs.anthropic?.isConfigured && activeProvider !== "anthropic") {
                    handleSwitchActive("anthropic");
                  }
                }}
                className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden ${
                  activeProvider === "anthropic"
                    ? "border-primary bg-primary/15 shadow-md shadow-primary/5 text-foreground ring-1 ring-primary"
                    : configs.anthropic?.isConfigured
                    ? "border-border/60 bg-background/50 hover:border-primary/40 text-muted-foreground hover:text-foreground"
                    : "border-border/30 bg-background/20 opacity-60 text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Zap size={16} className={`shrink-0 ${activeProvider === "anthropic" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="font-bold text-xs truncate">Claude</span>
                  </div>
                  {activeProvider === "anthropic" && (
                    <span className="text-[10px] font-bold text-primary flex items-center gap-1 shrink-0 bg-primary/20 border border-primary/30 px-1.5 py-0.5 rounded-full">
                      <CheckCircle2 size={10} className="shrink-0" /> Active
                    </span>
                  )}
                </div>
                <div className="mt-2.5 text-xs space-y-1">
                  {configs.anthropic?.isConfigured ? (
                    <>
                      <div className="text-primary font-mono text-[11px] font-semibold leading-snug break-all truncate">
                        {configs.anthropic.model || "claude-3-5-sonnet-latest"}
                      </div>
                      <div className="text-muted-foreground/70 font-mono text-[10px]">
                        {configs.anthropic.apiKeyMasked}
                      </div>
                    </>
                  ) : (
                    <div className="text-muted-foreground/60 text-[10px]">Not configured</div>
                  )}
                </div>
              </button>

              {/* Perplexity Selector */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab("perplexity");
                  if (configs.perplexity?.isConfigured && activeProvider !== "perplexity") {
                    handleSwitchActive("perplexity");
                  }
                }}
                className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden ${
                  activeProvider === "perplexity"
                    ? "border-primary bg-primary/15 shadow-md shadow-primary/5 text-foreground ring-1 ring-primary"
                    : configs.perplexity?.isConfigured
                    ? "border-border/60 bg-background/50 hover:border-primary/40 text-muted-foreground hover:text-foreground"
                    : "border-border/30 bg-background/20 opacity-60 text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <SiPerplexity className={`shrink-0 text-sm ${activeProvider === "perplexity" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="font-bold text-xs truncate">Perplexity</span>
                  </div>
                  {activeProvider === "perplexity" && (
                    <span className="text-[10px] font-bold text-primary flex items-center gap-1 shrink-0 bg-primary/20 border border-primary/30 px-1.5 py-0.5 rounded-full">
                      <CheckCircle2 size={10} className="shrink-0" /> Active
                    </span>
                  )}
                </div>
                <div className="mt-2.5 text-xs space-y-1">
                  {configs.perplexity?.isConfigured ? (
                    <>
                      <div className="text-primary font-mono text-[11px] font-semibold leading-snug break-all truncate">
                        {configs.perplexity.model || "sonar-pro"}
                      </div>
                      <div className="text-muted-foreground/70 font-mono text-[10px]">
                        {configs.perplexity.apiKeyMasked}
                      </div>
                    </>
                  ) : (
                    <div className="text-muted-foreground/60 text-[10px]">Not configured</div>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-border/50 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("google")}
              className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "google"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bot size={16} />
              Google AI (Gemini)
              {configs.google?.isConfigured && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("openai")}
              className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "openai"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Cpu size={16} />
              OpenAI (ChatGPT)
              {configs.openai?.isConfigured && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("anthropic")}
              className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "anthropic"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap size={16} />
              Anthropic (Claude)
              {configs.anthropic?.isConfigured && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("perplexity")}
              className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "perplexity"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <SiPerplexity className="text-sm" />
              Perplexity (Sonar)
              {configs.perplexity?.isConfigured && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>
          </div>

          {/* GOOGLE AI TAB CONTENT */}
          {activeTab === "google" && (
            <div className="space-y-5 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="googleKey" className="text-xs font-medium">
                  Google AI Studio API Key
                  {configs.google?.isConfigured && (
                    <span className="ml-2 text-xs text-primary font-mono">
                      (Saved: {configs.google.apiKeyMasked} — leave blank to keep)
                    </span>
                  )}
                </Label>
                <Input
                  id="googleKey"
                  type="password"
                  placeholder="AIzaSy... or AQ.Ab8..."
                  value={googleKey}
                  onChange={(e) => setGoogleKey(e.target.value)}
                  className="rounded-xl border-border/50 bg-background/60 text-sm font-mono focus-visible:ring-primary"
                />
                <p className="text-[11px] text-muted-foreground">
                  Get your free API key at{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    aistudio.google.com
                  </a>
                </p>
              </div>

              {/* Google Models Selection */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Select Model
                    </h4>
                    {scanStatus.google ? (
                      <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium mt-0.5">
                        <Check size={12} /> {scanStatus.google}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Choose a model or scan your key to load models enabled on your Google AI account.
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleScanModels("google")}
                    disabled={scanningModels.google}
                    className="rounded-xl border-primary/30 hover:border-primary text-xs h-8 px-3 text-primary bg-primary/5 hover:bg-primary/10 transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw size={12} className={scanningModels.google ? "animate-spin" : ""} />
                    {scanningModels.google ? "Scanning Key..." : "Detect Models from Key"}
                  </Button>
                </div>

                <div className="grid gap-2 max-h-[360px] overflow-y-auto pr-1">
                  {(availableModels["google"] || PROVIDER_MODELS["google"]).map((m) => {
                    const isSelected = googleModel === m.id;
                    return (
                      <label
                        key={m.id}
                        onClick={() => setGoogleModel(m.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border/40 bg-background/40 hover:border-border hover:bg-background/60"
                        }`}
                      >
                        <input
                          type="radio"
                          name="googleModelRadio"
                          value={m.id}
                          checked={isSelected}
                          onChange={() => setGoogleModel(m.id)}
                          className="mt-0.5 text-primary accent-primary"
                        />
                        <div className="space-y-0.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-foreground font-mono">{m.label}</span>
                            <span className="text-[10px] text-muted-foreground font-mono bg-background/80 px-1.5 py-0.5 rounded border border-border/40">
                              {m.id}
                            </span>
                            {configs.google?.model === m.id && (
                              <span className="text-[10px] font-bold text-primary bg-primary/20 border border-primary/30 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                                <Check size={10} /> Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">{m.description}</p>
                        </div>
                      </label>
                    );
                  })}

                  {/* Custom Model Option */}
                  <label
                    onClick={() => setGoogleModel("custom")}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      googleModel === "custom"
                        ? "border-primary bg-primary/10"
                        : "border-border/40 bg-background/40 hover:border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="googleModelRadio"
                      value="custom"
                      checked={googleModel === "custom"}
                      onChange={() => setGoogleModel("custom")}
                      className="mt-0.5 text-primary accent-primary"
                    />
                    <div className="space-y-1.5 flex-1">
                      <span className="text-xs font-bold text-foreground">Custom Model Name</span>
                      {googleModel === "custom" && (
                        <Input
                          type="text"
                          placeholder="e.g. gemini-3.6-flash"
                          value={googleCustomModel}
                          onChange={(e) => setGoogleCustomModel(e.target.value)}
                          className="rounded-lg border-primary/40 bg-background text-xs font-mono h-8"
                        />
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Actions for Google */}
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                {configs.google?.isConfigured ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => handleDeleteProvider("google")}
                    disabled={saving}
                    className="text-destructive hover:bg-destructive/10 text-xs rounded-xl h-8"
                  >
                    <Delete02Icon size={13} className="mr-1.5" /> Remove Key
                  </Button>
                ) : <div />}

                <Button
                  type="button"
                  onClick={() => handleSaveProvider("google")}
                  disabled={saving || (!configs.google?.isConfigured && !googleKey.trim())}
                  className="glossy-btn-primary font-semibold text-black rounded-xl text-xs h-9 px-4"
                >
                  {saving ? "Saving..." : "Save & Use Google AI"}
                </Button>
              </div>
            </div>
          )}

          {/* OPENAI TAB CONTENT */}
          {activeTab === "openai" && (
            <div className="space-y-5 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="openaiKey" className="text-xs font-medium">
                  OpenAI API Key
                  {configs.openai?.isConfigured && (
                    <span className="ml-2 text-xs text-primary font-mono">
                      (Saved: {configs.openai.apiKeyMasked} — leave blank to keep)
                    </span>
                  )}
                </Label>
                <Input
                  id="openaiKey"
                  type="password"
                  placeholder="sk-proj-... or sk-..."
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  className="rounded-xl border-border/50 bg-background/60 text-sm font-mono focus-visible:ring-primary"
                />
                <p className="text-[11px] text-muted-foreground">
                  Get your OpenAI API key from{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    platform.openai.com
                  </a>
                </p>
              </div>

              {/* OpenAI Models Selection */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Select Model
                    </h4>
                    {scanStatus.openai ? (
                      <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium mt-0.5">
                        <Check size={12} /> {scanStatus.openai}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Choose a model or scan your key to load models accessible on your OpenAI account.
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleScanModels("openai")}
                    disabled={scanningModels.openai}
                    className="rounded-xl border-primary/30 hover:border-primary text-xs h-8 px-3 text-primary bg-primary/5 hover:bg-primary/10 transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw size={12} className={scanningModels.openai ? "animate-spin" : ""} />
                    {scanningModels.openai ? "Scanning Key..." : "Detect Models from Key"}
                  </Button>
                </div>

                <div className="grid gap-2 max-h-[360px] overflow-y-auto pr-1">
                  {(availableModels["openai"] || PROVIDER_MODELS["openai"]).map((m) => {
                    const isSelected = openaiModel === m.id;
                    return (
                      <label
                        key={m.id}
                        onClick={() => setOpenaiModel(m.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border/40 bg-background/40 hover:border-border hover:bg-background/60"
                        }`}
                      >
                        <input
                          type="radio"
                          name="openaiModelRadio"
                          value={m.id}
                          checked={isSelected}
                          onChange={() => setOpenaiModel(m.id)}
                          className="mt-0.5 text-primary accent-primary"
                        />
                        <div className="space-y-0.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-foreground font-mono">{m.label}</span>
                            <span className="text-[10px] text-muted-foreground font-mono bg-background/80 px-1.5 py-0.5 rounded border border-border/40">
                              {m.id}
                            </span>
                            {configs.openai?.model === m.id && (
                              <span className="text-[10px] font-bold text-primary bg-primary/20 border border-primary/30 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                                <Check size={10} /> Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">{m.description}</p>
                        </div>
                      </label>
                    );
                  })}

                  {/* Custom Model Option */}
                  <label
                    onClick={() => setOpenaiModel("custom")}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      openaiModel === "custom"
                        ? "border-primary bg-primary/10"
                        : "border-border/40 bg-background/40 hover:border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="openaiModelRadio"
                      value="custom"
                      checked={openaiModel === "custom"}
                      onChange={() => setOpenaiModel("custom")}
                      className="mt-0.5 text-primary accent-primary"
                    />
                    <div className="space-y-1.5 flex-1">
                      <span className="text-xs font-bold text-foreground">Custom Model Name</span>
                      {openaiModel === "custom" && (
                        <Input
                          type="text"
                          placeholder="e.g. gpt-4o-mini or gpt-4o"
                          value={openaiCustomModel}
                          onChange={(e) => setOpenaiCustomModel(e.target.value)}
                          className="rounded-lg border-primary/40 bg-background text-xs font-mono h-8"
                        />
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Actions for OpenAI */}
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                {configs.openai?.isConfigured ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => handleDeleteProvider("openai")}
                    disabled={saving}
                    className="text-destructive hover:bg-destructive/10 text-xs rounded-xl h-8"
                  >
                    <Delete02Icon size={13} className="mr-1.5" /> Remove Key
                  </Button>
                ) : <div />}

                <Button
                  type="button"
                  onClick={() => handleSaveProvider("openai")}
                  disabled={saving || (!configs.openai?.isConfigured && !openaiKey.trim())}
                  className="glossy-btn-primary font-semibold text-black rounded-xl text-xs h-9 px-4"
                >
                  {saving ? "Saving..." : "Save & Use OpenAI"}
                </Button>
              </div>
            </div>
          )}

          {/* ANTHROPIC (CLAUDE) TAB CONTENT */}
          {activeTab === "anthropic" && (
            <div className="space-y-5 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="anthropicKey" className="text-xs font-medium">
                  Anthropic API Key
                  {configs.anthropic?.isConfigured && (
                    <span className="ml-2 text-xs text-primary font-mono">
                      (Saved: {configs.anthropic.apiKeyMasked} — leave blank to keep)
                    </span>
                  )}
                </Label>
                <Input
                  id="anthropicKey"
                  type="password"
                  placeholder="sk-ant-api03-..."
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  className="rounded-xl border-border/50 bg-background/60 text-sm font-mono focus-visible:ring-primary"
                />
                <p className="text-[11px] text-muted-foreground">
                  Get your Anthropic API key from{" "}
                  <a
                    href="https://console.anthropic.com/settings/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    console.anthropic.com
                  </a>
                </p>
              </div>

              {/* Anthropic Models Selection */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Select Model
                    </h4>
                    {scanStatus.anthropic ? (
                      <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium mt-0.5">
                        <Check size={12} /> {scanStatus.anthropic}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Choose a model or scan your key to load models accessible on your Anthropic account.
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleScanModels("anthropic")}
                    disabled={scanningModels.anthropic}
                    className="rounded-xl border-primary/30 hover:border-primary text-xs h-8 px-3 text-primary bg-primary/5 hover:bg-primary/10 transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw size={12} className={scanningModels.anthropic ? "animate-spin" : ""} />
                    {scanningModels.anthropic ? "Scanning Key..." : "Detect Models from Key"}
                  </Button>
                </div>

                <div className="grid gap-2 max-h-[360px] overflow-y-auto pr-1">
                  {(availableModels["anthropic"] || PROVIDER_MODELS["anthropic"]).map((m) => {
                    const isSelected = anthropicModel === m.id;
                    return (
                      <label
                        key={m.id}
                        onClick={() => setAnthropicModel(m.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border/40 bg-background/40 hover:border-border hover:bg-background/60"
                        }`}
                      >
                        <input
                          type="radio"
                          name="anthropicModelRadio"
                          value={m.id}
                          checked={isSelected}
                          onChange={() => setAnthropicModel(m.id)}
                          className="mt-0.5 text-primary accent-primary"
                        />
                        <div className="space-y-0.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-foreground font-mono">{m.label}</span>
                            <span className="text-[10px] text-muted-foreground font-mono bg-background/80 px-1.5 py-0.5 rounded border border-border/40">
                              {m.id}
                            </span>
                            {configs.anthropic?.model === m.id && (
                              <span className="text-[10px] font-bold text-primary bg-primary/20 border border-primary/30 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                                <Check size={10} /> Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">{m.description}</p>
                        </div>
                      </label>
                    );
                  })}

                  {/* Custom Model Option */}
                  <label
                    onClick={() => setAnthropicModel("custom")}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      anthropicModel === "custom"
                        ? "border-primary bg-primary/10"
                        : "border-border/40 bg-background/40 hover:border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="anthropicModelRadio"
                      value="custom"
                      checked={anthropicModel === "custom"}
                      onChange={() => setAnthropicModel("custom")}
                      className="mt-0.5 text-primary accent-primary"
                    />
                    <div className="space-y-1.5 flex-1">
                      <span className="text-xs font-bold text-foreground">Custom Model Name</span>
                      {anthropicModel === "custom" && (
                        <Input
                          type="text"
                          placeholder="e.g. claude-3-5-sonnet-latest"
                          value={anthropicCustomModel}
                          onChange={(e) => setAnthropicCustomModel(e.target.value)}
                          className="rounded-lg border-primary/40 bg-background text-xs font-mono h-8"
                        />
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Actions for Anthropic */}
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                {configs.anthropic?.isConfigured ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => handleDeleteProvider("anthropic")}
                    disabled={saving}
                    className="text-destructive hover:bg-destructive/10 text-xs rounded-xl h-8"
                  >
                    <Delete02Icon size={13} className="mr-1.5" /> Remove Key
                  </Button>
                ) : <div />}

                <Button
                  type="button"
                  onClick={() => handleSaveProvider("anthropic")}
                  disabled={saving || (!configs.anthropic?.isConfigured && !anthropicKey.trim())}
                  className="glossy-btn-primary font-semibold text-black rounded-xl text-xs h-9 px-4"
                >
                  {saving ? "Saving..." : "Save & Use Claude"}
                </Button>
              </div>
            </div>
          )}

          {/* PERPLEXITY (SONAR) TAB CONTENT */}
          {activeTab === "perplexity" && (
            <div className="space-y-5 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="perplexityKey" className="text-xs font-medium">
                  Perplexity API Key
                  {configs.perplexity?.isConfigured && (
                    <span className="ml-2 text-xs text-primary font-mono">
                      (Saved: {configs.perplexity.apiKeyMasked} — leave blank to keep)
                    </span>
                  )}
                </Label>
                <Input
                  id="perplexityKey"
                  type="password"
                  placeholder={configs.perplexity?.isConfigured ? "Enter new key to update, or leave blank" : "Paste your Perplexity key (e.g. pplx-... or tab...)"}
                  value={perplexityKey}
                  onChange={(e) => setPerplexityKey(e.target.value)}
                  className="rounded-xl border-border/60 bg-background/60 text-xs font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  Get your Perplexity API key from{" "}
                  <a
                    href="https://www.perplexity.ai/settings/api"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-mono"
                  >
                    perplexity.ai/settings/api
                  </a>
                  . Standard <code className="text-primary font-mono">pplx-...</code> and enterprise/partner keys (such as <code className="text-primary font-mono">tab...</code>) are both supported.
                </p>
              </div>

              {/* Complete List of Perplexity Models */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Select Model
                    </h4>
                    {scanStatus.perplexity ? (
                      <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium mt-0.5">
                        <Check size={12} /> {scanStatus.perplexity}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Choose a premier Sonar model or scan your key to verify active permissions.
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleScanModels("perplexity")}
                    disabled={scanningModels.perplexity}
                    className="rounded-xl border-primary/30 hover:border-primary text-xs h-8 px-3 text-primary bg-primary/5 hover:bg-primary/10 transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw size={12} className={scanningModels.perplexity ? "animate-spin" : ""} />
                    {scanningModels.perplexity ? "Verifying Key..." : "Detect Models from Key"}
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-[360px] overflow-y-auto pr-1">
                  {(availableModels["perplexity"] || PROVIDER_MODELS["perplexity"]).map((m) => {
                    const isSelected = perplexityModel === m.id;
                    return (
                      <label
                        key={m.id}
                        onClick={() => setPerplexityModel(m.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border/40 bg-background/40 hover:border-border hover:bg-background/60"
                        }`}
                      >
                        <input
                          type="radio"
                          name="perplexityModelRadio"
                          value={m.id}
                          checked={isSelected}
                          onChange={() => setPerplexityModel(m.id)}
                          className="mt-0.5 text-primary accent-primary"
                        />
                        <div className="space-y-0.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-foreground font-mono">{m.label}</span>
                            <span className="text-[10px] text-muted-foreground font-mono bg-background/80 px-1.5 py-0.5 rounded border border-border/40">
                              {m.id}
                            </span>
                            {configs.perplexity?.model === m.id && (
                              <span className="text-[10px] font-bold text-primary bg-primary/20 border border-primary/30 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                                <Check size={10} /> Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">{m.description}</p>
                        </div>
                      </label>
                    );
                  })}

                  {/* Custom Model Option */}
                  <label
                    onClick={() => setPerplexityModel("custom")}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      perplexityModel === "custom"
                        ? "border-primary bg-primary/10"
                        : "border-border/40 bg-background/40 hover:border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="perplexityModelRadio"
                      value="custom"
                      checked={perplexityModel === "custom"}
                      onChange={() => setPerplexityModel("custom")}
                      className="mt-0.5 text-primary accent-primary"
                    />
                    <div className="space-y-1.5 flex-1">
                      <span className="text-xs font-bold text-foreground">Custom Model Name</span>
                      {perplexityModel === "custom" && (
                        <Input
                          type="text"
                          placeholder="e.g. sonar-pro"
                          value={perplexityCustomModel}
                          onChange={(e) => setPerplexityCustomModel(e.target.value)}
                          className="rounded-lg border-primary/40 bg-background text-xs font-mono h-8"
                        />
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Actions for Perplexity */}
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                {configs.perplexity?.isConfigured ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => handleDeleteProvider("perplexity")}
                    disabled={saving}
                    className="text-destructive hover:bg-destructive/10 text-xs rounded-xl h-8"
                  >
                    <Delete02Icon size={13} className="mr-1.5" /> Remove Key
                  </Button>
                ) : <div />}

                <Button
                  type="button"
                  onClick={() => handleSaveProvider("perplexity")}
                  disabled={saving || (!configs.perplexity?.isConfigured && !perplexityKey.trim())}
                  className="glossy-btn-primary font-semibold text-black rounded-xl text-xs h-9 px-4"
                >
                  {saving ? "Saving..." : "Save & Use Perplexity"}
                </Button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-destructive font-medium bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
              {error}
            </p>
          )}

          {success && (
            <p className="text-xs text-emerald-400 font-medium bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 flex items-center gap-1.5">
              <Check size={14} /> {success}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}