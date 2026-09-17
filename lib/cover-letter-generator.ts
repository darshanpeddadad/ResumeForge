import { generateText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
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

// getModel is now handled by @/lib/ai-runner with universal fallback

const COVER_LETTER_SYSTEM_PROMPT = `You are an expert career advisor and technical recruiter creating a tailored, high-impact cover letter based on a candidate's resume and a specific job description.

CRITICAL RULES - EXACTLY AS RESUME GENERATION:
1. NEVER INVENT OR FABRICATE: Never add companies, roles, degrees, technologies, metrics, or achievements that are not in the candidate's resume text.
2. JOB DESCRIPTION IS FOR KEYWORD MATCHING ONLY: Use the JD to identify what the company values (tech stack, scale, domain, priorities) and select the candidate's most relevant real experiences to emphasize. Never claim the candidate has done something from the JD if it is not supported by their resume.
3. CONCRETE IMPACT & METRICS: Highlight quantifiable outcomes, technical scope, and specific tools used from the resume (e.g. "scaled to 50K+ daily requests", "reduced processing latency by 40%").
4. HUMANIZER ANTI-AI WRITING RULES (Zero AI tells):
   - BAN OVERUSED AI WORDS: Never use words such as delve, testament, tapestry, landscape, pivotal, beacon, nestled, boasting, showcasing, foster, robust, multifaceted, vibrant, seamless, spearheaded, crucial, transformative, underscores, embodies.
   - BAN "NOT X BUT Y" CONSTRUCTIONS: Do not use "It's not just X, it's Y" or "This isn't just about X, it's about Y." State the point directly.
   - BAN DRAMATIC ONE-LINE CLOSERS & FRAGMENTS: Cut aphorisms and rhetorical pauses ("That is the real win", "Let that sink in").
   - BAN STAGED RUN-UPS: Cut "Here's what you need to know", "Honestly?", "At its core", "In reality".
   - BAN FORCED TRIADS: Do not artificially package thoughts, skills, or examples into sets of 3 just to sound rhythmic.
   - BAN CORPORATE CLICHÉS & CHATBOT RESIDUE: Never use "I am writing to eagerly apply for...", "I believe I am the ideal candidate...", "I hope this email finds you well", or "Please do not hesitate to reach out".
   - NATURAL HUMAN CADENCE: Vary sentence lengths naturally. Use periods and standard commas; avoid excessive em-dashes (—).
5. TEMPLATE REPLACEMENT: If a past cover letter is provided as a reference, preserve its structural flow and tone, but completely strip all old company/job specifics and replace them with the new company and role. If no template is provided, write a clean 3-paragraph letter from scratch.

OUTPUT STRUCTURE:
- recipientName: Hiring manager's name if mentioned in the JD, otherwise "Hiring Team"
- companyName: Exact target company name
- roleTitle: Exact target job title
- subject: Clean, professional subject line (e.g. "Application for [RoleTitle] - [CandidateName]")
- salutation: e.g. "Dear [RecipientName] at [CompanyName],"
- bodyParagraphs: Exactly 3 paragraphs:
  1. Opening Hook & Alignment: State the role, why this company's focus/engineering matches the candidate's background, and high-level fit.
  2. Core Technical Proof: Deep-dive into 1-2 most relevant projects or work experiences from the resume, citing specific tech stack and quantifiable metrics.
  3. Domain Synergy & Culture: Connect broader skills (languages, cloud tools, system design) to the team's needs, and express excitement for contributing to their mission.
- closing: e.g. "Sincerely,\n[Candidate Name]\n[Candidate Email] | [Candidate Phone]"
- fullText: The complete, ready-to-copy letter formatted with subject, salutation, paragraphs, and closing separated by double newlines.
- whyMatched: 3-4 bullet points briefly explaining which resume achievements were chosen to target the JD requirements.`;

export async function generateCoverLetter(
  resume: Resume,
  jobDescription: string,
  provider: Provider,
  apiKey: string,
  modelId?: string,
  pastCoverLetter?: string
): Promise<CoverLetterResult> {
  const resumeSummary = [
    `Name: ${resume.contact.name}`,
    `Email: ${resume.contact.email}`,
    `Phone: ${resume.contact.phone}`,
    resume.contact.address ? `Location: ${resume.contact.address}` : "",
    resume.contact.linkedin ? `LinkedIn: ${resume.contact.linkedin}` : "",
    resume.contact.github ? `GitHub: ${resume.contact.github}` : "",
    "",
    "EDUCATION:",
    ...resume.education.map(
      (e) => `- ${e.degree} at ${e.institution} (${e.dateRange})`
    ),
    "",
    "EXPERIENCE:",
    ...resume.experience.flatMap((e) => [
      `- ${e.position} at ${e.company} (${e.dateRange}):`,
      ...e.bulletPoints.map((b) => `  * ${b}`),
    ]),
    "",
    "PROJECTS:",
    ...resume.projects.flatMap((p) => [
      `- ${p.name} (${p.technologies}):`,
      ...p.bulletPoints.map((b) => `  * ${b}`),
    ]),
    "",
    "SKILLS:",
    `Languages: ${resume.technicalSkills.languages.join(", ")}`,
    `Developer Tools: ${resume.technicalSkills.developerTools.join(", ")}`,
    `Technologies & Frameworks: ${resume.technicalSkills.technologiesFrameworks.join(", ")}`,
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
