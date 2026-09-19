"use client";

import { useState } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Resume } from "@/lib/schemas/resume";
import {
  Sparkles,
  TrendingUp,
  Zap,
  Tag,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Filter,
} from "lucide-react";

interface DiffInspectorProps {
  resume: Resume;
  matchedKeywords?: string[];
}

export function DiffInspector({ resume, matchedKeywords = [] }: DiffInspectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "flagged" | "compliant">("all");

  const metricRegex = /(\d+[%xXkKMbB]?|\$\d+|\b\d+\s*(percent|users|requests|ms|seconds|hours|clients|engineers|teams|services|endpoints))/i;
  const passiveStarters = [
    "responsible for", "assisted with", "assisted in", "worked on", "worked with",
    "helped to", "helped", "participated in", "supported the", "supported", "contributed to",
    "handled", "dealt with", "duties included", "tasked with"
  ];

  const strongVerbs = new Set([
    "accelerated", "achieved", "adapted", "administered", "analyzed", "architected", "automated", "built",
    "championed", "collaborated", "constructed", "coordinated", "created", "decreased", "delivered", "deployed",
    "designed", "developed", "devised", "drove", "engineered", "enhanced", "established", "executed", "expanded",
    "expedited", "formulated", "generated", "guided", "implemented", "improved", "increased", "initiated",
    "innovated", "instituted", "integrated", "introduced", "launched", "lead", "led", "managed", "maximized",
    "mentored", "migrated", "minimized", "modernized", "negotiated", "optimized", "orchestrated", "overhauled",
    "pioneered", "planned", "produced", "programmed", "promoted", "re-engineered", "reduced", "refactored",
    "resolved", "revamped", "scaled", "simplified", "spearheaded", "standardized", "streamlined", "strengthened",
    "supervised", "transformed", "unified", "upgraded", "validated"
  ]);

  interface InspectedBullet {
    role: string;
    company: string;
    bullet: string;
    hasMetric: boolean;
    hasActionVerb: boolean;
    isPassive: boolean;
    passivePhrase?: string;
    isLengthFlawed: boolean;
    lengthNote?: string;
    matchedTerms: string[];
    isDeficient: boolean;
  }

  const allInspectedBullets: InspectedBullet[] = [];

  if (Array.isArray(resume.sections)) {
    for (const section of resume.sections) {
      const lowerTitle = (section.title || "").toLowerCase();
      const isEducation =
        lowerTitle.includes("education") ||
        lowerTitle.includes("academic") ||
        lowerTitle.includes("studies") ||
        lowerTitle.includes("degree") ||
        lowerTitle.includes("university") ||
        lowerTitle.includes("school");

      const isNonWork =
        isEducation ||
        section.type === "skills" ||
        section.type === "text" ||
        lowerTitle.includes("award") ||
        lowerTitle.includes("certification") ||
        lowerTitle.includes("language") ||
        lowerTitle.includes("interest") ||
        lowerTitle.includes("volunteer");

      if (isNonWork) continue;

      if (Array.isArray(section.entries)) {
        for (const entry of section.entries) {
          if (Array.isArray(entry.bullets)) {
            for (const bullet of entry.bullets) {
              const trimmed = bullet.trim();
              if (!trimmed) continue;

              // Skip CGPA, GPA, Coursework, Thesis, Degree notes wherever they appear
              if (/^\s*(cgpa|gpa|grade|marks|percentage|honors?|relevant coursework|coursework|thesis|major|minor)\b/i.test(trimmed)) {
                continue;
              }

              const hasMetric = metricRegex.test(trimmed);
              const firstWord = trimmed.split(" ")[0]?.toLowerCase().replace(/[^a-z]/g, "");
              const hasActionVerb = strongVerbs.has(firstWord);

              const lower = trimmed.toLowerCase();
              let isPassive = false;
              let passivePhrase: string | undefined;
              for (const p of passiveStarters) {
                if (lower.startsWith(p) || lower.includes(` ${p} `)) {
                  isPassive = true;
                  passivePhrase = p;
                  break;
                }
              }

              const wordCount = trimmed.split(/\s+/).length;
              let isLengthFlawed = false;
              let lengthNote: string | undefined;
              if (wordCount < 8) {
                isLengthFlawed = true;
                lengthNote = "Too short (<8w)";
              } else if (wordCount > 35) {
                isLengthFlawed = true;
                lengthNote = "Run-on (>35w)";
              }

              const matchedTerms = matchedKeywords.filter((kw) =>
                trimmed.toLowerCase().includes(kw.toLowerCase())
              );

              const isDeficient = !hasMetric || isPassive || isLengthFlawed;

              allInspectedBullets.push({
                role: entry.subheading || section.title || "Experience",
                company: entry.heading || "Organization",
                bullet: trimmed,
                hasMetric,
                hasActionVerb,
                isPassive,
                passivePhrase,
                isLengthFlawed,
                lengthNote,
                matchedTerms,
                isDeficient,
              });
            }
          }
        }
      }
    }
  }

  if (allInspectedBullets.length === 0) return null;

  const deficientCount = allInspectedBullets.filter((b) => b.isDeficient).length;
  const compliantCount = allInspectedBullets.length - deficientCount;

  const displayedBullets = allInspectedBullets.filter((b) => {
    if (activeFilter === "flagged") return b.isDeficient;
    if (activeFilter === "compliant") return !b.isDeficient;
    return true;
  });

  return (
    <Card className="glass-card border border-primary/20 bg-primary/[0.03] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Sparkles className="size-4 text-primary" />
          <CardTitle className="text-sm font-semibold text-foreground">
            Automated Screener & Bullet Calibration Audit
          </CardTitle>
          <Badge
            variant="outline"
            className={`text-[10px] font-semibold px-2 py-0.5 ${
              deficientCount > 0
                ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
                : "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
            }`}
          >
            {deficientCount > 0 ? `${deficientCount} Flaws Flagged` : "100% Calibrated"}
          </Badge>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-primary font-medium flex items-center gap-1 hover:underline shrink-0"
        >
          {isExpanded ? (
            <>
              Hide Audit Details <ChevronUp className="size-3.5" />
            </>
          ) : (
            <>
              Inspect {allInspectedBullets.length} Work Bullets ({deficientCount} Deficiencies) <ChevronDown className="size-3.5" />
            </>
          )}
        </button>
      </div>

      <CardDescription className="text-xs text-muted-foreground">
        Deep screener inspection: audits each work experience bullet for quantifiable outcomes, active verbs, and flags weak non-ownership phrasing.
      </CardDescription>

      {/* Summary Highlight & Status Pills */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
          <TrendingUp className="size-3" />
          <span>{allInspectedBullets.filter((b) => b.hasMetric).length}/{allInspectedBullets.length} Quantified Impact</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-medium">
          <Zap className="size-3" />
          <span>{allInspectedBullets.filter((b) => b.hasActionVerb).length}/{allInspectedBullets.length} Active Verbs</span>
        </div>
        {deficientCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-medium">
            <AlertTriangle className="size-3" />
            <span>{deficientCount} Screener Deficiencies Detected</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] font-medium">
          <Tag className="size-3" />
          <span>ATS Hard Skills Aligned</span>
        </div>
      </div>

      {/* Expanded Bullet List with Badges & Defect Alerts */}
      {isExpanded && (
        <div className="space-y-2.5 pt-2 border-t border-border/30">
          {/* Filter Bar */}
          <div className="flex items-center gap-1.5 text-xs pb-1">
            <Filter className="size-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground mr-1">Filter:</span>
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                activeFilter === "all"
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-muted/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({allInspectedBullets.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("flagged")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                activeFilter === "flagged"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  : "bg-muted/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              Flagged Deficiencies ({deficientCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("compliant")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                activeFilter === "compliant"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-muted/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              Compliant ({compliantCount})
            </button>
          </div>

          <div className="space-y-2.5 max-h-84 overflow-y-auto pr-1 text-xs">
            {displayedBullets.map((item, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border space-y-1.5 transition-all ${
                  item.isDeficient
                    ? "bg-rose-500/[0.04] border-rose-500/30"
                    : "bg-background/60 border-border/40"
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-muted-foreground flex-wrap gap-1">
                  <span className="font-semibold text-foreground">
                    {item.role} · {item.company}
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {/* Defect Badges */}
                    {item.isPassive && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-rose-500/40 text-rose-400 bg-rose-500/10">
                        ⚠️ Passive ({item.passivePhrase})
                      </Badge>
                    )}
                    {!item.hasMetric && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-rose-500/40 text-rose-400 bg-rose-500/10">
                        ❌ Missing Metric
                      </Badge>
                    )}
                    {item.isLengthFlawed && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-500/40 text-amber-400 bg-amber-500/10">
                        ⚠️ {item.lengthNote}
                      </Badge>
                    )}

                    {/* Positive Compliant Badges */}
                    {item.hasMetric && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
                        +Metric
                      </Badge>
                    )}
                    {item.hasActionVerb && !item.isPassive && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-indigo-500/30 text-indigo-300 bg-indigo-500/5">
                        +Action Verb
                      </Badge>
                    )}
                    {item.matchedTerms.length > 0 && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-purple-500/30 text-purple-300 bg-purple-500/5">
                        +{item.matchedTerms.length} JD Keyword{item.matchedTerms.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                    {!item.isDeficient && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/30 text-emerald-400 bg-emerald-500/5 flex items-center gap-0.5">
                        <CheckCircle2 className="size-2.5" /> Calibrated
                      </Badge>
                    )}
                  </div>
                </div>

                <p className="text-foreground leading-relaxed font-sans text-xs">
                  {item.bullet}
                </p>

                {item.isDeficient && (
                  <div className="text-[10px] text-amber-400/90 bg-amber-500/5 rounded p-1.5 border border-amber-500/15">
                    <span className="font-semibold">Screener Advice: </span>
                    {!item.hasMetric && "Add measurable technical results (e.g. latency in ms, scale, user volume, %, or cost savings). "}
                    {item.isPassive && "Replace passive opener with a decisive active verb (e.g., 'Architected', 'Engineered', 'Overhauled'). "}
                    {item.isLengthFlawed && `Keep length between 14-28 words for maximum recruiter scan speed.`}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

