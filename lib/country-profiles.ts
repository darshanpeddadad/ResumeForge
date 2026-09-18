export interface CountryProfile {
  code: string;
  name: string;
  flag: string;
  badge: string;
  description: string;
  atsGuidelines: string;
}

export const TARGET_COUNTRIES: CountryProfile[] = [
  {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    badge: "1-Page Standard (Max 2 for 7+ yrs) • Google XYZ Metrics • Strict Anti-Bias Compliance",
    description: "US ATS Standard: 1-Page preference, high-density reverse-chronological, metrics-heavy, strict anti-bias compliance (no photo/age), mandatory Professional Summary.",
    atsGuidelines: `TARGET COUNTRY: UNITED STATES (US)
• Resume Length: 1 page preferred for early/mid-career (<7 yrs), strictly maximum 2 pages for senior/lead.
• Summary: Mandatory 2-3 sentence technical Professional Summary at the top emphasizing core engineering identity, primary stack, and quantifiable business impact.
• Language & Spelling: American English (e.g. "optimized", "analyzed", "scalable architecture", "program").
• Bullet Writing: Enforce Google XYZ Formula: "Accomplished [X], as measured by [Y], by doing [Z]".
• Anti-Bias Compliance: Strictly NO photo, no date of birth, no nationality, no marital status.
• Section Order: Professional Summary -> Technical Skills -> Work Experience -> Projects -> Education -> Certifications -> Awards.`,
  },
  {
    code: "UK",
    name: "United Kingdom",
    flag: "🇬🇧",
    badge: "2-Page Standard CV • Personal Statement at Top • British English Orthography",
    description: "UK ATS Standard: 2-Page CV format standard, Personal Statement/Summary at top, British English spelling (optimised, analysed), no photo.",
    atsGuidelines: `TARGET COUNTRY: UNITED KINGDOM (UK)
• Resume Length: 2 pages is the standard UK tech CV length.
• Summary: Mandatory Personal Statement / Professional Summary at the top highlighting career trajectory, domain specialism, and matching UK market requirements.
• Language & Spelling: British English (e.g. "optimised", "analysed", "synchronised", "behaviour", "programme").
• Bullet Writing: High-impact achievement bullets with metrics, balanced with team and project scope.
• Anti-Bias Compliance: Strictly NO photo, no age, no marital status.
• Section Order: Personal Statement -> Key Technical Skills -> Professional Experience -> Projects -> Education -> Certifications -> Awards.`,
  },
  {
    code: "DE",
    name: "Germany / DACH",
    flag: "🇩🇪",
    badge: "1-2 Page Tech CV (Lebenslauf) • Structured Competence Matrix • Language Proficiencies",
    description: "Germany / DACH Standard: Structured technical profile, clear chronological progression, languages with proficiencies, professional competence overview.",
    atsGuidelines: `TARGET COUNTRY: GERMANY / DACH (Germany, Austria, Switzerland)
• Resume Length: 1 to 2 pages clean tabular/chronological tech CV.
• Summary: Mandatory "Berufsprofil / Professional Summary" at the top highlighting engineering competencies, specialized domain experience, and technical problem-solving.
• Language: Output in English (international tech standard in Germany/DACH), retaining standard German company names and titles untranslated.
• Skills & Languages: Emphasize clear categorized technical competence. If spoken languages are mentioned, retain them with proficiency levels.
• Section Order: Professional Summary -> Technical Skills -> Work Experience -> Education -> Projects -> Certifications -> Awards -> Languages.`,
  },
  {
    code: "CA",
    name: "Canada",
    flag: "🇨🇦",
    badge: "1-2 Page Format • Impact-Driven Bullets • Canadian Human Rights Compliance",
    description: "Canada ATS Standard: 1-2 page format, impact-focused bullets, Canadian/North American ATS keyword conventions, strict anti-bias compliance.",
    atsGuidelines: `TARGET COUNTRY: CANADA (CA)
• Resume Length: 1 to 2 pages maximum.
• Summary: Mandatory Professional Summary detailing core competencies, years of experience, and quantifiable technical achievements.
• Language & Spelling: Canadian/North American English.
• Compliance: Strictly NO photo, no date of birth, no immigration/citizenship details (strictly compliant with Canadian Human Rights regulations).
• Section Order: Professional Summary -> Technical Skills -> Work Experience -> Projects -> Education -> Certifications -> Awards.`,
  },
  {
    code: "AU",
    name: "Australia / NZ",
    flag: "🇦🇺",
    badge: "2-Page Standard CV • Key Competencies Upfront • Broad Project Scope",
    description: "Australia / NZ Standard: 2-page detailed CV standard, core competencies upfront, comprehensive project scope and impact.",
    atsGuidelines: `TARGET COUNTRY: AUSTRALIA & NEW ZEALAND (AU/NZ)
• Resume Length: 2 pages standard tech CV.
• Summary: Mandatory Career Profile / Professional Summary highlighting technical strengths, system ownership, and collaboration.
• Language & Spelling: Australian/UK English (e.g. "optimised", "prioritised").
• Section Order: Career Profile -> Core Technical Competencies -> Employment History -> Projects -> Education -> Certifications.`,
  },
  {
    code: "SG",
    name: "Singapore / Asia",
    flag: "🇸🇬",
    badge: "1-2 Page Format • High-Growth Scale Metrics • Cloud & Architecture Clarity",
    description: "Singapore / Asia Hub Standard: High-growth tech scale, architectural depth, cloud infrastructure metrics, executive summary.",
    atsGuidelines: `TARGET COUNTRY: SINGAPORE / ASIA TECH HUBS
• Resume Length: 1 to 2 pages.
• Summary: Mandatory Executive Summary highlighting technical architecture, high-concurrency systems, scale sustained, and business ROI.
• Language: International tech English.
• Section Order: Executive Summary -> Technical Skills -> Work Experience -> Key Projects -> Education -> Certifications -> Honors & Awards.`,
  },
  {
    code: "EU",
    name: "European Union",
    flag: "🇪🇺",
    badge: "Modern European Tech Format • Cross-Border Competence • Comprehensive Skills",
    description: "European Union Standard: Modernized European tech CV, clear technical categorization, international project scope.",
    atsGuidelines: `TARGET COUNTRY: EUROPEAN UNION (EU GENERAL)
• Resume Length: 1 to 2 pages.
• Summary: Mandatory Professional Summary emphasizing engineering versatility, international cross-functional collaboration, and technical expertise.
• Language: Professional International English.
• Section Order: Professional Summary -> Technical Skills -> Professional Experience -> Projects -> Education -> Certifications -> Awards.`,
  },
  {
    code: "GLOBAL",
    name: "Global / Other",
    flag: "🌐",
    badge: "Global ATS Standard • Universal 90+ Score Optimization • Google XYZ Formula",
    description: "Universal ATS Standard: Optimized for multinational ATS platforms (Workday, Greenhouse, Lever, Taleo) with 90+ match.",
    atsGuidelines: `TARGET COUNTRY: GLOBAL / INTERNATIONAL ATS
• Resume Length: Flexible 1 or 2 pages (strict max 2 pages).
• Summary: Mandatory 2-3 sentence technical Professional Summary synthesizing core engineering identity and quantifiable value.
• Language: Clear, standardized professional English.
• Bullet Writing: Google XYZ Formula ("Accomplished [X], as measured by [Y], by doing [Z]").
• Section Order: Professional Summary -> Technical Skills -> Work Experience -> Projects -> Education -> Certifications -> Awards.`,
  },
];

export function getCountryProfile(code?: string): CountryProfile {
  if (!code) return TARGET_COUNTRIES[0]; // Default US
  const found = TARGET_COUNTRIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
  return found || TARGET_COUNTRIES[0];
}
