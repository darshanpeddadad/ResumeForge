import type { AiChanges, Resume } from "@/lib/schemas/resume";

export interface EntryHighlights {
  added: number[];
  tailored: number[];
  jd: Record<number, string[]>;
}

// Keyed by section title (unique within a resume)
export interface Highlights {
  bySectionTitle: Record<string, EntryHighlights[]>;
  addedSkillItems: string[];
  addedListItems: string[];
  addedSections: string[];
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "your", "you",
  "are", "will", "have", "has", "had", "our", "their", "they", "them",
  "who", "what", "when", "where", "how", "into", "over", "under",
  "using", "used", "use", "such", "more", "most", "than", "then",
  "was", "were", "been", "being", "etc", "like", "also", "can", "all",
  "any", "each", "or", "of", "to", "in", "on", "at", "as", "an", "by",
  "it", "is", "be", "we", "not", "but", "if", "so", "do", "per", "job",
]);

const GENERIC_TERMS = new Set([
  "software", "engineer", "engineering", "engineers", "developer",
  "development", "developing", "experience", "experienced", "building",
  "strong", "strongly", "scalable", "scaling", "system", "systems",
  "product", "products", "data", "cloud", "management", "managing",
  "team", "teams", "working", "work", "knowledge", "skills", "skill",
  "ability", "design", "designing", "implementing", "implementation",
  "including", "related", "etc", "ability", "across", "within",
  "design", "best", "practices", "good", "great", "excellent",
]);

function normalizeTerm(token: string): string {
  return token.toLowerCase().replace(/[.,;:!?()'\"""]/g, "");
}

export function tokenizeJd(jobDescription: string): string[] {
  if (!jobDescription) return [];

  const tokens = jobDescription
    .split(/[^a-zA-Z0-9]+/)
    .map(normalizeTerm)
    .filter(
      (t) => t.length >= 3 && !/^\d+$/.test(t) && !STOPWORDS.has(t)
    );

  const phrases = new Set<string>();
  for (let i = 0; i < tokens.length; i++) {
    for (let len = 1; len <= 3 && i + len <= tokens.length; len++) {
      const phrase = tokens.slice(i, i + len).join(" ");
      if (phrase.length < 3) continue;
      if (len === 1 && GENERIC_TERMS.has(phrase)) continue;
      phrases.add(phrase);
    }
  }

  return [...phrases].sort((a, b) => b.length - a.length);
}

function matchJdKeywordsForSection(
  bullets: string[],
  phrases: string[]
): Record<number, string[]> {
  const jd: Record<number, string[]> = {};
  bullets.forEach((bullet, b) => {
    const text = bullet.toLowerCase();
    const found = phrases.filter((p) => text.includes(p));
    if (found.length > 0) jd[b] = found;
  });
  return jd;
}

function keepIfAbsentInText(
  values: string[],
  resumeText: string,
  excludedTerms: Set<string>
): string[] {
  if (values.length === 0) return [];
  const haystack = resumeText.toLowerCase();
  return values.filter(
    (v) =>
      v &&
      !haystack.includes(v.toLowerCase()) &&
      !excludedTerms.has(normalizeTerm(v))
  );
}

export function buildHighlights(
  aiChanges: AiChanges,
  resume: Resume,
  resumeText: string,
  jobDescription?: string
): Highlights {
  const jdPhrases = tokenizeJd(jobDescription || "");
  const excludedJdTerms = new Set(jdPhrases.map((p) => normalizeTerm(p)));

  // Build lookup: sectionTitle → added bullet texts
  const addedByTitle: Record<string, string[]> = {};
  const tailoredByTitle: Record<string, string[]> = {};

  for (const bucket of aiChanges.addedBullets) {
    addedByTitle[bucket.sectionTitle] = [
      ...(addedByTitle[bucket.sectionTitle] ?? []),
      ...bucket.bullets,
    ];
  }
  for (const bucket of aiChanges.tailoredBullets) {
    tailoredByTitle[bucket.sectionTitle] = [
      ...(tailoredByTitle[bucket.sectionTitle] ?? []),
      ...bucket.bullets,
    ];
  }

  const bySectionTitle: Record<string, EntryHighlights[]> = {};

  for (const section of resume.sections) {
    if (section.type !== "bullet_list" && section.type !== "projects") continue;

    const addedTexts = new Set(addedByTitle[section.title] ?? []);
    const tailoredTexts = new Set(tailoredByTitle[section.title] ?? []);

    bySectionTitle[section.title] = section.entries.map((entry) => {
      const added: number[] = [];
      const tailored: number[] = [];
      entry.bullets.forEach((bullet, bi) => {
        if (addedTexts.has(bullet)) added.push(bi);
        else if (tailoredTexts.has(bullet)) tailored.push(bi);
      });
      const jd = matchJdKeywordsForSection(entry.bullets, jdPhrases);
      return { added, tailored, jd };
    });
  }

  return {
    bySectionTitle,
    addedSkillItems: keepIfAbsentInText(
      aiChanges.addedSkillItems,
      resumeText,
      excludedJdTerms
    ),
    addedListItems: keepIfAbsentInText(
      aiChanges.addedListItems,
      resumeText,
      excludedJdTerms
    ),
    addedSections: aiChanges.addedSections ?? [],
  };
}

export function emptyHighlights(resume: Resume): Highlights {
  const bySectionTitle: Record<string, EntryHighlights[]> = {};
  for (const section of resume.sections) {
    if (section.type !== "bullet_list" && section.type !== "projects") continue;
    bySectionTitle[section.title] = section.entries.map(() => ({
      added: [],
      tailored: [],
      jd: {},
    }));
  }
  return {
    bySectionTitle,
    addedSkillItems: [],
    addedListItems: [],
    addedSections: [],
  };
}

export function hasHighlights(highlights: Highlights): boolean {
  return (
    Object.values(highlights.bySectionTitle).some((entries) =>
      entries.some(
        (e) =>
          e.added.length > 0 ||
          e.tailored.length > 0 ||
          Object.keys(e.jd).length > 0
      )
    ) ||
    highlights.addedSkillItems.length > 0 ||
    highlights.addedListItems.length > 0 ||
    highlights.addedSections.length > 0
  );
}