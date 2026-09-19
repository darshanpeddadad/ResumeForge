"use client";

import { useState } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AtsScoreResult } from "@/lib/ats-scorer";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  Plus,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  ShieldAlert,
  ShieldCheck,
  Flame,
} from "lucide-react";

interface AtsScoreCardProps {
  scoreData: AtsScoreResult;
  onInjectKeyword?: (keyword: string) => void;
}

export function AtsScoreCard({ scoreData, onInjectKeyword }: AtsScoreCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [injectedKeywords, setInjectedKeywords] = useState<Set<string>>(new Set());

  const handleInject = (keyword: string) => {
    setInjectedKeywords((prev) => new Set([...prev, keyword]));
    if (onInjectKeyword) {
      onInjectKeyword(keyword);
    }
  };

  const getRiskColor = (risk: AtsScoreResult["rejectionRisk"]) => {
    switch (risk) {
      case "Critical":
        return "text-rose-400 border-rose-500/40 bg-rose-500/10";
      case "High":
        return "text-orange-400 border-orange-500/40 bg-orange-500/10";
      case "Moderate":
        return "text-amber-400 border-amber-500/40 bg-amber-500/10";
      case "Competitive":
        return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
      case "Elite":
        return "text-cyan-400 border-cyan-500/40 bg-cyan-500/10";
      default:
        return "text-muted-foreground border-border bg-muted/20";
    }
  };

  const getGaugeStrokeColor = (score: number) => {
    if (score >= 90) return "#06b6d4"; // cyan
    if (score >= 80) return "#10b981"; // emerald
    if (score >= 65) return "#f59e0b"; // amber
    if (score >= 50) return "#f97316"; // orange
    return "#f43f5e"; // rose
  };

  const hasRedFlags = scoreData.redFlags && scoreData.redFlags.length > 0;

  return (
    <Card className="glass-card border border-border/50 p-4 space-y-3.5 relative overflow-hidden">
      {/* Top Header & Radial Gauge */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Target className="size-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">
              Strict ATS Match & Screener Audit
            </CardTitle>
            <Badge
              variant="outline"
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${getRiskColor(
                scoreData.rejectionRisk
              )}`}
            >
              {scoreData.rejectionRisk === "Critical" && "🔴 Critical ATS Rejection Risk"}
              {scoreData.rejectionRisk === "High" && "🟠 High ATS Rejection Risk"}
              {scoreData.rejectionRisk === "Moderate" && "🟡 Moderate Screening Match"}
              {scoreData.rejectionRisk === "Competitive" && "🟢 Competitive Candidate"}
              {scoreData.rejectionRisk === "Elite" && "🏆 Elite Benchmark (Top 5%)"}
            </Badge>

            {scoreData.totalPenalties > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] font-semibold text-rose-400 border-rose-500/30 bg-rose-500/10 px-2 py-0.5 flex items-center gap-1"
              >
                <Flame className="size-2.5 text-rose-400" />
                -{scoreData.totalPenalties}% Screener Deductions
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            {scoreData.verdictSummary ||
              "Evaluated against executive screening algorithms, measurable technical outcomes, and target JD competency benchmarks."}
          </CardDescription>
        </div>

        {/* Circular Gauge */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg className="size-16 -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="26"
              stroke="currentColor"
              strokeWidth="5"
              fill="transparent"
              className="text-muted/30"
            />
            <circle
              cx="32"
              cy="32"
              r="26"
              stroke={getGaugeStrokeColor(scoreData.overallScore)}
              strokeWidth="5"
              strokeDasharray={163}
              strokeDashoffset={163 - (163 * scoreData.overallScore) / 100}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-base font-black text-foreground">{scoreData.overallScore}%</span>
            <span className="text-[8px] uppercase tracking-tighter text-muted-foreground font-semibold">
              Match
            </span>
          </div>
        </div>
      </div>

      {/* 3 Metric Pills with calibrated 50 / 25 / 25 weights */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <div className="rounded-xl border border-border/40 bg-muted/20 p-2 text-center space-y-0.5">
          <div className="text-[10px] uppercase font-semibold text-muted-foreground">Keywords (50%)</div>
          <div className={`text-xs font-bold ${scoreData.keywordScore >= 80 ? "text-emerald-400" : scoreData.keywordScore >= 60 ? "text-amber-400" : "text-rose-400"}`}>
            {scoreData.keywordScore}%
          </div>
        </div>

        <div className="rounded-xl border border-border/40 bg-muted/20 p-2 text-center space-y-0.5">
          <div className="text-[10px] uppercase font-semibold text-muted-foreground">Content (25%)</div>
          <div className={`text-xs font-bold ${scoreData.metricScore >= 80 ? "text-emerald-400" : scoreData.metricScore >= 60 ? "text-amber-400" : "text-rose-400"}`}>
            {scoreData.metricScore}%
          </div>
        </div>

        <div className="rounded-xl border border-border/40 bg-muted/20 p-2 text-center space-y-0.5">
          <div className="text-[10px] uppercase font-semibold text-muted-foreground">Structure (25%)</div>
          <div className={`text-xs font-bold ${scoreData.structureScore >= 90 ? "text-primary" : "text-amber-400"}`}>
            {scoreData.structureScore}%
          </div>
        </div>
      </div>

      {/* 🚨 HARSH ATS DEFICIENCIES & RED FLAGS SECTION */}
      {hasRedFlags && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <ShieldAlert className="size-3.5 text-rose-400" />
              Critical ATS Deficiencies & Red Flags ({scoreData.redFlags.length})
            </span>
            <span className="text-[10px] text-muted-foreground">
              Fix these to stop automated screener rejections
            </span>
          </div>

          <div className="space-y-2">
            {scoreData.redFlags.map((flag) => (
              <div
                key={flag.id}
                className="rounded-xl border border-rose-500/25 bg-rose-500/[0.04] p-3 space-y-1.5 text-xs transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    {flag.severity === "critical" ? (
                      <XCircle className="size-3.5 text-rose-400 shrink-0" />
                    ) : flag.severity === "warning" ? (
                      <AlertTriangle className="size-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <AlertCircle className="size-3.5 text-yellow-400 shrink-0" />
                    )}
                    <span>{flag.title}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold text-rose-400 border-rose-500/30 bg-rose-500/10 px-1.5 py-0 shrink-0"
                  >
                    -{flag.penaltyPoints}% Deducted
                  </Badge>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {flag.description}
                </p>

                {flag.flaggedText && (
                  <div className="rounded-lg bg-background/80 border border-border/40 p-2 text-[11px] font-mono text-muted-foreground/90 italic">
                    <span className="text-rose-400 font-semibold not-italic">Flagged: </span>
                    &ldquo;{flag.flaggedText.replace(/\*\*/g, "").replace(/__/g, "")}&rdquo;
                  </div>
                )}

                <div className="text-[11px] text-emerald-400/90 font-medium bg-emerald-500/5 rounded-lg p-2 border border-emerald-500/20">
                  <span className="font-semibold text-emerald-400">Fix Action: </span>
                  {flag.remediation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INSTITUTIONAL REGULATORY AUDIT CHECKLIST */}
      {scoreData.audit && (
        <div className="rounded-xl bg-muted/15 border border-border/40 p-2.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
            <span className="flex items-center gap-1">
              <ShieldCheck className="size-3.5 text-primary" /> Strict ATS Regulatory Checklist
            </span>
            <span className="text-[10px] text-muted-foreground">
              Screening Barometer
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-background/50 border border-border/30">
              <span className="text-muted-foreground">Quantified Impact & Scale (≥85%)</span>
              {scoreData.audit.metricCompliance.passed ? (
                <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                  PASS ({scoreData.audit.metricCompliance.ratio}%)
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] text-rose-400 border-rose-500/30 bg-rose-500/10">
                  FAIL ({scoreData.audit.metricCompliance.ratio}%)
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between p-1.5 rounded-lg bg-background/50 border border-border/30">
              <span className="text-muted-foreground">Decisive Active Verbs (≥90%)</span>
              {scoreData.audit.actionVerbCompliance.passed ? (
                <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                  PASS ({scoreData.audit.actionVerbCompliance.ratio}%)
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] text-rose-400 border-rose-500/30 bg-rose-500/10">
                  FAIL ({scoreData.audit.actionVerbCompliance.ratio}%)
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between p-1.5 rounded-lg bg-background/50 border border-border/30">
              <span className="text-muted-foreground">Zero Cliché Fluff</span>
              {scoreData.audit.fluffFreeCompliance.passed ? (
                <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                  CLEAN (0 Fluff)
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] text-amber-400 border-amber-500/30 bg-amber-500/10">
                  {scoreData.audit.fluffFreeCompliance.violationsCount} VIOLATIONS
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between p-1.5 rounded-lg bg-background/50 border border-border/30">
              <span className="text-muted-foreground">Target JD Alignment (≥80%)</span>
              {scoreData.audit.keywordDensityCompliance.passed ? (
                <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                  PASS ({scoreData.audit.keywordDensityCompliance.ratio}%)
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] text-rose-400 border-rose-500/30 bg-rose-500/10">
                  FAIL ({scoreData.audit.keywordDensityCompliance.ratio}%)
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Missing Critical Keywords with 1-Click Injection */}
      {scoreData.missingKeywords.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1 font-medium text-[11px]">
              <AlertCircle className="size-3 text-rose-400" />
              Missing High-Value JD Keywords (Click to Inject):
            </span>
            <span className="text-[10px] text-rose-400 font-semibold">
              {scoreData.missingKeywords.length} missing
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {scoreData.missingKeywords.slice(0, 8).map((kw) => {
              const isInjected = injectedKeywords.has(kw);
              return (
                <button
                  key={kw}
                  type="button"
                  onClick={() => !isInjected && handleInject(kw)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium transition-all ${
                    isInjected
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default"
                      : "bg-rose-500/10 text-rose-300 border border-rose-500/25 hover:bg-primary/20 hover:text-primary hover:border-primary/40 cursor-pointer"
                  }`}
                >
                  {isInjected ? (
                    <>
                      <CheckCircle2 className="size-2.5" /> {kw}
                    </>
                  ) : (
                    <>
                      <Plus className="size-2.5" /> {kw}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Expandable Breakdown Details */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1 font-medium border-t border-border/30"
        >
          <span className="flex items-center gap-1">
            <Sparkles className="size-3 text-primary" />
            {isExpanded ? "Hide Full ATS Breakdown" : "View Matched Keywords & Screener Suggestions"}
          </span>
          {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>

        {isExpanded && (
          <div className="space-y-3 pt-2 text-xs">
            {/* Matched Keywords */}
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="size-3" /> Matched In Resume ({scoreData.matchedKeywords.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {scoreData.matchedKeywords.map((kw) => (
                  <Badge
                    key={kw}
                    variant="outline"
                    className="text-[10px] bg-emerald-500/5 text-emerald-300 border-emerald-500/25 px-1.5 py-0"
                  >
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Smart Suggestions */}
            {scoreData.suggestions.length > 0 && (
              <div className="space-y-1 rounded-xl bg-muted/20 border border-border/40 p-2.5">
                <div className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                  <Target className="size-3 text-primary" /> Screener Action Steps
                </div>
                <ul className="space-y-1 text-[11px] text-muted-foreground list-disc pl-4">
                  {scoreData.suggestions.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

