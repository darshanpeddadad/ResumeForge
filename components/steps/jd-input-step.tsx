"use client";

import { useState, useMemo } from "react";
import { CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TARGET_COUNTRIES, getCountryProfile } from "@/lib/country-profiles";
import {
  ChevronDownIcon,
  GlobeIcon,
  SparklesIcon,
  Link2,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Languages,
  Bookmark,
  Wand2,
} from "lucide-react";

interface JDInputStepProps {
  value: string;
  onChange: (value: string) => void;
  targetCountry: string;
  onCountryChange: (country: string) => void;
  onMetadataChange?: (meta: { title: string; company: string }) => void;
}

export function JDInputStep({
  value,
  onChange,
  targetCountry,
  onCountryChange,
  onMetadataChange,
}: JDInputStepProps) {
  const profile = getCountryProfile(targetCountry);
  const [inputMode, setInputMode] = useState<"paste" | "url">("paste");
  const [jobUrl, setJobUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractedMeta, setExtractedMeta] = useState<{ title: string; company: string } | null>(null);

  // Multilingual & Translation State
  const [detectedLang, setDetectedLang] = useState<{
    language: string;
    flag: string;
    isNonEnglish: boolean;
  } | null>(null);
  const [originalText, setOriginalText] = useState("");
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [activeVersion, setActiveVersion] = useState<"original" | "translated">("original");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  // Quick heuristic check for non-English manually pasted text
  const manualNonEnglishDetected = useMemo(() => {
    if (!value || value.length < 30) return null;
    const clean = value.toLowerCase();

    const de = ["und", "der", "die", "das", "für", "mit", "anforderungen", "aufgaben", "erfahrung", "kenntnisse", "profil", "m/w/d"].filter(w => new RegExp(`\\b${w}\\b`, "i").test(clean)).length >= 3;
    if (de) return { language: "German", flag: "🇩🇪" };

    const fr = ["et", "le", "la", "les", "pour", "avec", "compétences", "missions", "profil", "expérience", "poste"].filter(w => new RegExp(`\\b${w}\\b`, "i").test(clean)).length >= 3;
    if (fr) return { language: "French", flag: "🇫🇷" };

    const es = ["y", "el", "la", "los", "las", "para", "con", "requisitos", "funciones", "experiencia", "puesto"].filter(w => new RegExp(`\\b${w}\\b`, "i").test(clean)).length >= 3;
    if (es) return { language: "Spanish", flag: "🇪🇸" };

    const it = ["e", "il", "la", "per", "con", "requisiti", "mansioni", "esperienza", "competenze"].filter(w => new RegExp(`\\b${w}\\b`, "i").test(clean)).length >= 3;
    if (it) return { language: "Italian", flag: "🇮🇹" };

    const nl = ["en", "de", "het", "van", "voor", "met", "vereisten", "ervaring", "functie"].filter(w => new RegExp(`\\b${w}\\b`, "i").test(clean)).length >= 3;
    if (nl) return { language: "Dutch", flag: "🇳🇱" };

    return null;
  }, [value]);

  const activeLanguageInfo = detectedLang || (manualNonEnglishDetected ? { ...manualNonEnglishDetected, isNonEnglish: true } : null);

  const handleExtractUrl = async () => {
    if (!jobUrl.trim()) return;
    setIsExtracting(true);
    setExtractError(null);
    setExtractedMeta(null);
    setDetectedLang(null);
    setTranslatedText(null);

    try {
      const res = await fetch("/api/extract-job-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: jobUrl.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setExtractError(data.error || "Failed to extract job details. Please paste the job description below.");
      } else {
        setExtractedMeta({ title: data.title, company: data.company });
        if (onMetadataChange) {
          onMetadataChange({ title: data.title, company: data.company });
        }

        setOriginalText(data.jdText);

        if (data.isNonEnglish) {
          setDetectedLang({
            language: data.detectedLanguage,
            flag: data.languageFlag,
            isNonEnglish: true,
          });

          if (data.englishTranslation) {
            setTranslatedText(data.englishTranslation);
            setActiveVersion("translated");
            onChange(data.englishTranslation);
          } else {
            setActiveVersion("original");
            onChange(data.jdText);
          }
        } else {
          setActiveVersion("original");
          onChange(data.jdText);
        }
      }
    } catch {
      setExtractError("Network error fetching job link. Please copy and paste the job description manually.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleTranslateManualText = async () => {
    if (!value.trim()) return;
    setIsTranslating(true);
    setTranslateError(null);

    try {
      const res = await fetch("/api/extract-job-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "translate",
          text: value,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setTranslateError(data.error || "Translation failed. Verify your AI key in Settings.");
      } else {
        setOriginalText(value);
        setTranslatedText(data.translatedText);
        setDetectedLang({
          language: data.detectedLanguage,
          flag: data.languageFlag,
          isNonEnglish: true,
        });
        setActiveVersion("translated");
        onChange(data.translatedText);
      }
    } catch {
      setTranslateError("Network error during translation.");
    } finally {
      setIsTranslating(false);
    }
  };

  const [isCleaning, setIsCleaning] = useState(false);

  const handleCleanText = async () => {
    if (!value.trim()) return;
    setIsCleaning(true);
    try {
      const res = await fetch("/api/extract-job-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clean", text: value }),
      });
      const data = await res.json();
      if (data.success && data.cleanedText) {
        onChange(data.cleanedText);
        setOriginalText(data.cleanedText);
      }
    } catch {
      // ignore
    } finally {
      setIsCleaning(false);
    }
  };

  const bookmarkletCode =
    typeof window !== "undefined"
      ? `javascript:(function(){try{var t=document.title||'';var meta=(document.querySelector('meta[property="og:title"]')||{}).content||t;var main=document.querySelector('main, article, [role="main"], .job-description, #job-description')||document.body;var txt=main?main.innerText||main.textContent||'':'';if(!txt||txt.length<20){alert('Could not detect job text on this page.');return;}var target='${window.location.origin}/generate?importJob='+encodeURIComponent(JSON.stringify({title:meta,text:txt.slice(0,12000),url:window.location.href}));window.open(target,'_blank');}catch(e){alert('Bookmarklet error: '+e.message);}})();`
      : `javascript:(function(){alert('Drag this button to your bookmarks bar.');})();`;

  return (
    <div className="flex flex-col gap-4 py-2">
      {/* Target Market / Country Selection */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <GlobeIcon className="size-4 text-primary shrink-0" />
            <span className="text-sm font-semibold text-foreground">
              Target Job Market / Country
            </span>
          </div>
          <Badge variant="secondary" className="px-2 py-0.5 text-[11px] font-medium tracking-wide">
            90+ ATS Optimized
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Calibrates regional ATS standards, length limits, spelling orthography, and mandatory Professional Summary.
        </p>

        <div className="relative">
          <select
            id="target-country-select"
            value={targetCountry}
            onChange={(e) => onCountryChange(e.target.value)}
            className="w-full h-10 appearance-none rounded-xl border border-border/60 bg-muted/40 px-3 pr-9 text-sm font-medium text-foreground transition-all hover:bg-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {TARGET_COUNTRIES.map((c) => (
              <option
                key={c.code}
                value={c.code}
                className="bg-popover text-popover-foreground py-1"
              >
                {c.flag} {c.name} ({c.code})
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground select-none" />
        </div>

        {/* Selected Country ATS Guidance Card */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs space-y-1 transition-all">
          <div className="flex items-center gap-1.5 font-semibold text-primary">
            <SparklesIcon className="size-3.5 shrink-0" />
            <span>{profile.flag} {profile.name} ATS Profile</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {profile.badge}
          </p>
        </div>
      </div>

      {/* Target Job Description Dual Input */}
      <div className="space-y-3 pt-2 border-t border-border/40">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-semibold">Job Description (Recommended)</CardTitle>
            <p className="text-xs text-muted-foreground">
              Extracts keywords, hard skills, and achievements. Supports international & foreign language job listings.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center rounded-xl bg-muted/40 p-0.5 border border-border/50 text-xs">
            <button
              type="button"
              onClick={() => setInputMode("paste")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                inputMode === "paste"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="size-3" /> Paste Text
            </button>
            <button
              type="button"
              onClick={() => setInputMode("url")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                inputMode === "url"
                  ? "bg-background text-primary font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Link2 className="size-3" /> Import URL
            </button>
          </div>
        </div>

        {/* URL Input Mode */}
        {inputMode === "url" && (
          <div className="space-y-2 rounded-xl bg-muted/20 border border-border/50 p-3">
            <div className="flex gap-2">
              <Input
                placeholder="Paste ANY job link (LinkedIn, Indeed, StepStone, Workday, Greenhouse, or company career page...)"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                className="h-9 text-xs rounded-xl bg-background"
                disabled={isExtracting}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleExtractUrl();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                onClick={handleExtractUrl}
                disabled={isExtracting || !jobUrl.trim()}
                className="h-9 px-3 text-xs font-semibold shrink-0 rounded-xl"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="size-3 mr-1.5 animate-spin" /> Scraping...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="size-3 mr-1.5" /> Scrape & Auto-Fill
                  </>
                )}
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <span className="text-emerald-500 font-medium">● Universal Scraper:</span>
              Works with ANY job URL — LinkedIn, Indeed, StepStone, Workday, Greenhouse, Lever, Ashby, Personio, Monster, or any company website.
            </p>

            {extractError && (
              <div className="flex items-center gap-1.5 text-[11px] text-destructive bg-destructive/10 p-2 rounded-lg">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{extractError}</span>
              </div>
            )}

            {extractedMeta && (
              <div className="flex items-center justify-between text-[11px] text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                <div className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="size-3.5 shrink-0" />
                  <span>
                    Extracted: <strong>{extractedMeta.title}</strong> at <strong>{extractedMeta.company}</strong>
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                  Ready
                </Badge>
              </div>
            )}

            {/* 1-Click Bookmarklet Fail-Safe for Logins & Private Intranets */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl border border-border/60 bg-muted/40 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Bookmark className="size-3.5 text-primary shrink-0" />
                  <span>1-Click Browser Bookmarklet (Login walls & Intranet fail-safe)</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Drag this button to your Bookmarks Bar. Click it on <em>any</em> job page to import directly:
                </p>
              </div>
              <a
                href={bookmarkletCode}
                onClick={(e) => {
                  e.preventDefault();
                  alert("Drag this button up to your browser's Bookmarks bar (Ctrl+Shift+B / Cmd+Shift+B). Then whenever you're viewing ANY job posting on LinkedIn, Workday, or an internal intranet, click it to auto-import into ResumeForge!");
                }}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30 font-semibold text-[11px] transition-colors cursor-grab active:cursor-grabbing shrink-0"
                title="Drag me to your Bookmarks Bar"
              >
                <span>📌 Send to ResumeForge</span>
              </a>
            </div>
          </div>
        )}

        {/* Multilingual / Translation Banner & Switcher */}
        {activeLanguageInfo && activeLanguageInfo.isNonEnglish && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-xs">
            <div className="flex items-center gap-2">
              <Languages className="size-4 text-indigo-400 shrink-0" />
              <span className="font-semibold text-foreground">
                Non-English Job Posting Detected: {activeLanguageInfo.language} {activeLanguageInfo.flag}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {translatedText ? (
                <div className="flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/50 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveVersion("original");
                      if (originalText) onChange(originalText);
                    }}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      activeVersion === "original"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Original ({activeLanguageInfo.flag})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveVersion("translated");
                      onChange(translatedText);
                    }}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                      activeVersion === "translated"
                        ? "bg-background text-indigo-400 shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    English Translation (🇬🇧)
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isTranslating}
                  onClick={handleTranslateManualText}
                  className="h-7 text-[11px] px-2.5 rounded-lg border-indigo-500/40 hover:bg-indigo-500/20 text-indigo-300"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="size-3 mr-1 animate-spin" /> Translating with AI...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="size-3 mr-1 text-indigo-400" /> Translate to English
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {translateError && (
          <div className="flex items-center gap-1.5 text-[11px] text-destructive bg-destructive/10 p-2 rounded-lg">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>{translateError}</span>
          </div>
        )}

        {/* Textarea for Job Description (Always visible to preview / edit) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-muted-foreground">
              {inputMode === "url" ? "Extracted / Editable Job Text" : "Job Description Text"}
            </span>
            {value.length > 80 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCleanText}
                disabled={isCleaning}
                className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                {isCleaning ? (
                  <Loader2 className="size-3 mr-1 animate-spin" />
                ) : (
                  <Wand2 className="size-3 mr-1 text-primary" />
                )}
                Clean Boilerplate
              </Button>
            )}
          </div>
          <Textarea
            placeholder="Paste the full job description here (responsibilities, required qualifications, tech stack) in English or any international language..."
            className="h-[140px] resize-none overflow-y-auto text-xs sm:text-sm rounded-xl font-mono leading-relaxed"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              if (activeVersion === "original") {
                setOriginalText(e.target.value);
              }
            }}
          />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
            <span>
              {value.length > 0 ? `${value.length.toLocaleString()} characters` : "Empty job description"}
            </span>
            {activeLanguageInfo?.isNonEnglish && translatedText && (
              <span className="text-indigo-400 font-medium">
                Showing: {activeVersion === "translated" ? "English Translated Version" : `Original ${activeLanguageInfo.language} Version`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
