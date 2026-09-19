import { generateText, Output } from "ai";
import { z } from "zod";
import type { Resume } from "@/lib/schemas/resume";
import type { Provider } from "@/lib/ai-models";
import { executeWithModelFallback } from "@/lib/ai-runner";

export const coverLetterSchema = z.object({
  recipientName: z.string(),
  companyName: z.string(),
  roleTitle: z.string(),
  subject: z.string(),
  salutation: z.string(),
  bodyParagraphs: z.array(z.string()),
  closing: z.string(),
  fullText: z.string(),
  whyMatched: z.array(z.string()),
});

export type CoverLetterResult = z.infer<typeof coverLetterSchema>;

const COVER_LETTER_SYSTEM_PROMPT = `You are an elite Executive Career Advisor and Senior Talent Acquisition Leader crafting authentic, compelling, interview-winning cover letters for any industry or career level (including Tech, Finance, Marketing, Sales, Healthcare, Operations, HR, Creative, and Legal).

YOUR NORTH STAR:
The ATS gets the candidate past the automated filter, but the HUMAN RECRUITER AND HIRING MANAGER decide who gets called for an interview.
When the hiring manager opens this letter, they must immediately feel:
"This candidate deeply understands our business needs, speaks our industry's native language, has proven outcomes, and is clearly the exact professional we need to interview."

CRITICAL RULES:
1. NEVER INVENT OR FABRICATE: Never add companies, roles, degrees, tools, metrics, or achievements that are not in the candidate's resume text. Ground every claim in their genuine career history.
2. SOLVE THE HIRING MANAGER'S PAIN POINTS: Use the JD to understand what the company needs (growth, efficiency, technical modernization, regulatory compliance, client retention, clinical quality) and highlight the candidate's most relevant genuine achievements that directly address those needs.
3. CONCRETE IMPACT & MEASURABLE SCALE: Highlight real numbers, percentages, volume, or business outcomes from the resume (e.g. "accelerated pipeline by 42%", "reduced patient triage time by 35%", "managed $1.2M budget", "scaled to 50K+ daily active users").
4. ZERO AI RESIDUE — 100% AUTHENTIC HUMAN VOICE:
   - BANNED AI FILLER: Never use words such as delve, testament, tapestry, landscape, pivotal, beacon, nestled, boasting, showcasing, foster, robust, multifaceted, vibrant, seamless, spearheaded, crucial, transformative, underscores, embodies.
   - BANNED CLICHÉS: Never use "I am writing to eagerly apply for...", "I believe I am the ideal candidate...", "I hope this email finds you well", or "Please do not hesitate to reach out".
   - BANNED FORMULAS: Cut "It's not just X, it's Y", "Here's what you need to know", "At its core". State the value directly with professional gravitas.
   - NATURAL HUMAN CADENCE: Write with confident, concise, and engaging prose. Use natural sentence variety that reads like a seasoned professional writing to a respected peer.
5. PAST TEMPLATE RESPECT: If a past cover letter is provided as a reference, preserve its structural flow and tone, but completely strip all old company/job specifics and replace them with the new company and role. If no template is provided, write a clean 3-paragraph letter from scratch.

OUTPUT STRUCTURE:
- recipientName: Hiring manager's name if mentioned in the JD, otherwise "Hiring Team"
- companyName: Exact target company name
- roleTitle: Exact target job title
- subject: Clean, professional subject line (e.g. "Application for [RoleTitle] - [CandidateName]")
- salutation: e.g. "Dear [RecipientName] at [CompanyName],"
- bodyParagraphs: Exactly 3 high-impact paragraphs:
  1. Opening Hook & Strategic Alignment: State the role and why this company's immediate mission/focus directly aligns with the candidate's career track record and domain strengths.
  2. Core Proven Impact: Deep-dive into 1-2 most relevant genuine achievements from the resume, detailing the specific tools/methodologies used and the measurable business or operational outcomes achieved.
  3. Strategic Value & Contribution: Connect broader competencies and leadership strengths to the team's forward-looking objectives, closing with confident enthusiasm for contributing to their mission.
- closing: e.g. "Sincerely,\n[Candidate Name]\n[Candidate Email] | [Candidate Phone]"
- fullText: The complete, ready-to-copy letter formatted with subject, salutation, paragraphs, and closing separated by double newlines.
- whyMatched: 3-4 bullet points briefly explaining which resume achievements were strategically highlighted to win over the hiring manager.`;

export async function generateCoverLetter(
  resume: Resume,
  jobDescription: string,
  provider: Provider,
  apiKey: string,
  modelId?: string,
  pastCoverLetter?: string
): Promise<CoverLetterResult> {
  // Build a text summary from dynamic sections
  const bulletSections = resume.sections.filter(
    (s) => s.type === "bullet_list" || s.type === "projects"
  );

  const skillsSection = resume.sections.find((s) => s.type === "skills");

  const resumeSummary = [
    `Name: ${resume.contact.name}`,
    `Email: ${resume.contact.email}`,
    `Phone: ${resume.contact.phone}`,
    resume.contact.address ? `Location: ${resume.contact.address}` : "",
    resume.contact.linkedin ? `LinkedIn: ${resume.contact.linkedin}` : "",
    resume.contact.github ? `GitHub: ${resume.contact.github}` : "",
    "",
    ...bulletSections.flatMap((section) => [
      `${section.title.toUpperCase()}:`,
      ...section.entries.flatMap((e) => [
        `- ${e.heading}${e.subheading ? ` — ${e.subheading}` : ""} (${e.dateRange}):`,
        ...e.bullets.map((b) => `  * ${b}`),
      ]),
      "",
    ]),
    skillsSection
      ? [
          "SKILLS:",
          ...skillsSection.categories.map(
            (cat) => `${cat.label}: ${cat.items.join(", ")}`
          ),
        ].join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = [
    `CANDIDATE RESUME:\n${resumeSummary}`,
    `\n---\nTARGET JOB DESCRIPTION:\n${jobDescription}`,
    pastCoverLetter
      ? `\n---\nPAST COVER LETTER TEMPLATE (use for structural tone/flow, but strip all old job details):\n${pastCoverLetter}`
      : "",
  ].join("\n");

  return executeWithModelFallback(
    provider,
    apiKey,
    modelId,
    "Cover Letter Generation",
    async (model) => {
      const { output } = await generateText({
        model: model as any,
        instructions: COVER_LETTER_SYSTEM_PROMPT,
        prompt,
        output: Output.object({ schema: coverLetterSchema }),
        maxRetries: 1,
      });
      return output;
    }
  );
}
