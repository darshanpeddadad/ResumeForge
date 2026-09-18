"use client";

import { CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { TARGET_COUNTRIES, getCountryProfile } from "@/lib/country-profiles";
import { ChevronDownIcon, GlobeIcon, SparklesIcon } from "lucide-react";

interface JDInputStepProps {
  value: string;
  onChange: (value: string) => void;
  targetCountry: string;
  onCountryChange: (country: string) => void;
}

export function JDInputStep({
  value,
  onChange,
  targetCountry,
  onCountryChange,
}: JDInputStepProps) {
  const profile = getCountryProfile(targetCountry);

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

      {/* Target Job Description Input */}
      <div className="space-y-2 pt-2 border-t border-border/40">
        <div className="space-y-1">
          <CardTitle className="text-sm font-semibold">Job Description (Recommended)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Paste the target role description to align keywords, technical skills, and Google XYZ achievement metrics.
          </p>
        </div>
        <Textarea
          placeholder="Paste the full job description here (responsibilities, required qualifications, tech stack)..."
          className="h-[140px] resize-none overflow-y-auto text-xs sm:text-sm rounded-xl"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
