import { generateText, Output } from "ai";
import { z } from "zod";
import type { Resume, ResumeSection } from "@/lib/schemas/resume";
import { bulletSections, textSections } from "@/lib/schemas/resume";
import type { Provider } from "@/lib/ai-models";
import { executeWithModelFallback } from "@/lib/ai-runner";

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC PATTERN SANITIZER
// Catches and replaces AI buzzwords, cliché connectors, and informal residues
// ─────────────────────────────────────────────────────────────────────────────
const BANNED_PATTERNS: Array<[RegExp, string | ((match: string, ...args: any[]) => string)]> = [
  [/\b(spearheaded|spearheading)\b/gi, "led"],
  [/\b(leveraged|leveraging)\b/gi, "used"],
  [/\b(utilized|utilizing)\b/gi, "used"],
  [/\b(orchestrated|orchestrating)\b/gi, "architected"],
  [/\b(fostered|fostering)\b/gi, "established"],
  [/\b(championed|championing)\b/gi, "led"],
  [/\b(synergized|synergizing)\b/gi, "aligned"],
  [/\b(seamlessly integrated|seamless integration)\b/gi, "integrated"],
  [/\b(seamless|seamlessly)\b/gi, "reliably"],
  [/\b(robust and scalable|robust, scalable)\b/gi, "high-throughput"],
  [/\b(robust)\b/gi, "reliable"],
  [/\b(pivotal role in)\b/gi, "role in"],
  [/\b(pivotal)\b/gi, "key"],
  [/\b(transformative)\b/gi, "major"],
  [/\b(testament to|delve into|tapestry of|beacon of|landscape of)\b/gi, ""],
  [/\b(played a key role in developing)\b/gi, "developed"],
  [/\b(played a key role in building)\b/gi, "built"],
  [/\bin order to\b/gi, "to"],
  [/,?\s*\bresulting in a\b/gi, "; achieved a"],
  [/,?\s*\bresulting in\b/gi, "; achieving"],
  [/,?\s*\bleading to a\b/gi, "; achieved a"],
  [/,?\s*\bleading to\b/gi, "; achieving"],
  [/\s*\((which is still my go-to stack, honestly|honestly|which surprised us|in practice)\)/gi, ""],
];

export function sanitizeAiPatterns(text: string): string {
  if (!text) return "";
  let clean = text;

  for (const [regex, replacement] of BANNED_PATTERNS) {
    clean = clean.replace(regex, replacement as any);
  }

  // Clean up double spaces, punctuation anomalies, and trim
  clean = clean
    .replace(/\s{2,}/g, " ")
    .replace(/;\s*;/g, ";")
    .replace(/,\s*,/g, ",")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();

  return clean;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROSE HUMANIZER (For Cover Letters and narrative text)
// ─────────────────────────────────────────────────────────────────────────────
const PROSE_HUMANIZER_PROMPT = `You are an elite executive editor refining professional text to eliminate AI patterns.

AI SIGNALS TO ELIMINATE:
1. Uniform sentence lengths (every sentence 16-20 words). You must mix short punchy sentences (6-10 words) with longer compound sentences (25-35 words).
2. Cliché transitional crutches: "Furthermore", "Moreover", "Additionally", "Consequently", "In conclusion", "In summary".
3. AI buzzwords: leveraged, utilized, spearheaded, fostered, championed, pioneered, synergized, robust, seamless, pivotal, transformative, cutting-edge, vibrant, dynamic, testament, tapestry, beacon, delve, showcase, underscore.
4. Chatbot boilerplate: "I am writing to express my enthusiasm", "I believe I am the ideal candidate", "Please do not hesitate to reach out".

STRICT RULES:
- Preserve EVERY fact, number, date, company, technology, and metric exactly as given.
- Sound like a sharp, authentic senior engineer — direct, articulate, professional.
- NEVER add informal conversational parentheticals like "(honestly)" or "(we called it Y)".
- Return ONLY the rewritten text, with no preamble.`;

export async function humanizeProse(
  text: string,
  provider: Provider,
  apiKey: string,
  modelId?: string,
  voiceSample?: string
): Promise<string> {
  if (!text || text.trim().length < 20) return text;

  const voicePrefix = voiceSample
    ? `WRITING STYLE SAMPLE — match this rhythm and vocabulary:\n${voiceSample}\n\n`
    : "";

  try {
    const raw = await executeWithModelFallback(
      provider,
      apiKey,
      modelId,
      "Humanize Prose",
      async (model) => {
        const response = await generateText({
          model: model as any,
          system: PROSE_HUMANIZER_PROMPT,
          prompt: `${voicePrefix}REWRITE THIS TEXT to be sharp, human, and professional:\n\n${text}`,
          temperature: 0.3, // Low temperature eliminates fluctuations
        });
        return response.text.trim() || text;
      }
    );
    return sanitizeAiPatterns(raw);
  } catch {
    return sanitizeAiPatterns(text);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RESUME BULLETS PATTERN RECOGNITION & REFINEMENT
// ─────────────────────────────────────────────────────────────────────────────
const RESUME_BULLETS_HUMANIZER_PROMPT = `You are a Principal Software Engineer and technical resume auditor.
Your mission: Eliminate formulaic AI templates and rewrite bullet points into crisp, authentic engineering achievements.

═══════════════════════════════════════════════════════
THE 5 ENGINEERING BULLET ARCHETYPES (Rotate through these)
═══════════════════════════════════════════════════════
Never let consecutive bullets use the same structure or start with the same verb!

• Pattern A (Metric & Impact First):
  Structure: [Action + Metric Outcome] by [Technical Implementation / Architecture]
  Example: "Cut cloud infrastructure spend by 28% by auditing unused AWS EBS volumes and migrating non-critical workloads to Spot instances."

• Pattern B (Architectural & Technical Decision):
  Structure: [Technical decision / migration]; [direct consequence or stability outcome]
  Example: "Migrated REST polling endpoints to WebSocket channels in Go; slashed server CPU utilization by 45% during peak trading hours."

• Pattern C (Problem-Resolution & Deep Debugging):
  Structure: [Concrete problem / bottleneck] — [root cause fix], [outcome]
  Example: "Production database deadlocks were causing sporadic 504 gateway timeouts — identified unindexed foreign keys and restructured transaction isolation levels to eliminate contention."

• Pattern D (Products, Tools & Pipelines Shipped):
  Structure: [Built / Shipped X using Tech Y] that [solved workflow problem for team or users]
  Example: "Engineered an automated CI/CD canary deployment pipeline with GitHub Actions and ArgoCD, reducing release cycle time from bi-weekly to multiple daily deploys."

• Pattern E (Operational Scale, Reliability & SRE):
  Structure: [Operated scale X across infrastructure Y] with [monitoring / reliability practices]
  Example: "Operated multi-region Kubernetes clusters running 80+ microservices, maintaining 99.95% uptime with Prometheus alerting and automated horizontal pod autoscaling."

═══════════════════════════════════════════════════════
STRICT ANTI-AI CONSTRAINTS
═══════════════════════════════════════════════════════
1. NEVER USE BANNED WORDS: leveraged, utilized, spearheaded, orchestrated, championed, fostered, synergistic, seamless, robust, dynamic, pivotal, transformative, cutting-edge.
2. VARY OPENING VERBS: Do NOT start consecutive bullets with the same verb (e.g. Built, Designed, Cut, Engineered, Automated, Deployed, Migrated).
3. BURSTINESS: Vary bullet lengths naturally. Keep some punchy (10-14 words) and some detailed (22-30 words).
4. PRESERVE GROUND TRUTH: Keep all numbers, metrics, dates, companies, and technical names 100% faithful to the source. Do not invent new claims.
5. SPARSE BOLDING: Keep double asterisks **around at most 1-2 core keywords** per bullet.
6. Return the exact same number of sections and entries as provided in the input JSON.`;

const humanizedBulletSectionsSchema = z.object({
  sections: z.array(
    z.object({
      sectionTitle: z.string(),
      entries: z.array(
        z.object({
          heading: z.string().optional(),
          bullets: z.array(z.string()),
        })
      ),
    })
  ),
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN RESUME HUMANIZER
// ─────────────────────────────────────────────────────────────────────────────
export async function humanizeResume(
  resume: Resume,
  provider: Provider,
  apiKey: string,
  modelId?: string
): Promise<Resume> {
  const result: Resume = {
    ...resume,
    sections: resume.sections.map((s) => ({
      ...s,
      content: s.content ? sanitizeAiPatterns(s.content) : "",
      entries: (s.entries || []).map((e) => ({
        ...e,
        bullets: (e.bullets || []).map(sanitizeAiPatterns),
      })),
    })),
  };

  const bulleted = bulletSections(result);
  if (bulleted.length === 0) return result;

  try {
    const payload = {
      sections: bulleted.map((s) => ({
        sectionTitle: s.title,
        entries: s.entries.map((e) => ({
          heading: e.heading,
          bullets: e.bullets,
        })),
      })),
    };

    const output = await executeWithModelFallback(
      provider,
      apiKey,
      modelId,
      "Resume Humanize Bullets",
      async (model) => {
        const { output } = await generateText({
          model: model as any,
          system: RESUME_BULLETS_HUMANIZER_PROMPT,
          prompt: `Apply the 5 engineering archetypes and eliminate AI patterns across these resume bullets:\n\n${JSON.stringify(payload, null, 2)}`,
          output: Output.object({ schema: humanizedBulletSectionsSchema }),
          temperature: 0.25, // Low temperature locks in determinism and prevents fluctuation
        });
        return output;
      }
    );

    if (output && output.sections && output.sections.length > 0) {
      result.sections = result.sections.map((section) => {
        if (section.type !== "bullet_list" && section.type !== "projects") {
          return section;
        }

        const polishedSec = output.sections.find(
          (os) => os.sectionTitle.toLowerCase() === section.title.toLowerCase()
        );

        if (!polishedSec || !polishedSec.entries) return section;

        return {
          ...section,
          entries: section.entries.map((entry, ei) => {
            const polishedBullets = polishedSec.entries[ei]?.bullets;
            const bullets =
              polishedBullets && polishedBullets.length > 0
                ? polishedBullets.map(sanitizeAiPatterns)
                : entry.bullets;
            return {
              ...entry,
              bullets,
            };
          }),
        };
      });
    }
  } catch {
    // If the polish pass encounters an error or rate limit,
    // the sanitized resume from the initial generation is safely retained.
  }

  return result;
}
