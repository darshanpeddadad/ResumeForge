import { generateText, Output } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { parseResultSchema, type ParseResult } from "@/lib/schemas/resume";
import type { Provider } from "@/lib/ai-models";
import { executeWithModelFallback } from "@/lib/ai-runner";

const SYSTEM_PROMPT = `You are an expert resume parser and ATS optimizer. Extract information from the provided resume text, structure it as JSON, and ENHANCE it to be comprehensive, detailed, and ATS-friendly.

CRITICAL RULES - DO NOT:
1. NEVER add companies, jobs, projects, skills, or experiences NOT in the resume text
2. NEVER add entries from the job description - it is ONLY for keyword tailoring
3. NEVER invent new bullet points - only expand and detail what exists
4. CONTACT LINKS: ALWAYS extract the linkedin and github URLs exactly as they appear and put the clean path in the linkedin/github fields. NEVER omit them, NEVER add or duplicate the domain (no "github.com/github.com/x" or "linkedin.com/in/linkedin.com/in/x"), NEVER invent a URL. A field like "github.com/subhraneel2005/nini" must become "subhraneel2005/nini", a URL like "https://www.linkedin.com/in/subhraneel" must become "subhraneel". If a URL is missing from the resume, use empty string "".
5. CONTACT FIELDS: phone must contain ONLY the phone number (digits, spaces, +, -). address must contain ONLY the location (city/state/country). email must be a bare email. Never leave stray labels, prefixes, or extra words in these fields (e.g. no "INT +91..." in the address, no trailing "B" in the phone).

ENHANCEMENT STRATEGY (HUMAN-CENTERED & ATS-OPTIMIZED):
1. NATURAL BULLET DENSITY: Produce 3-5 high-impact bullet points for major experience roles, 2-3 for internships/past roles, and 2-4 for projects. Never force a rigid identical bullet count across all entries.
2. HUMAN CADENCE & LENGTH VARIATION: Avoid cookie-cutter length formulas. Alternate short punchy lines (10-15 words) with detailed technical explanations (20-25 words).
3. CONCRETE ENGINEERING SUBSTANCE:
   - What was built/done (specific system, microservice, algorithm, or tool name)
   - Technologies and tools used (name the exact libraries, databases, cloud services)
   - Actual scope and measurable impact (latency, throughput, reliability, test coverage)
4. BLADER/HUMANIZER ANTI-AI RULES (ZERO AI TELLS):
   - BAN OVERUSED BUZZWORDS: Never use words such as delve, testament, tapestry, landscape, pivotal, beacon, nestled, boasting, showcasing, foster, robust, multifaceted, vibrant, seamless, spearheaded, leveraged, utilized, synergy, dynamic, passionate, transformative, underscores, embodies.
   - START WITH CONCRETE ACTION VERBS: Built, Engineered, Architected, Developed, Designed, Implemented, Scaled, Automated, Deployed, Reduced, Decreased, Optimized, Refactored, Integrated, Benchmarked, Configured.
   - NO FORCED TRIADS: Do not artificially group technologies into sets of 3 just for rhythmic symmetry.
   - NO NOT-X-BUT-Y: State positive claims directly without contrasting against unmade claims.
   - NO FABRICATED METRICS: Do not invent generic cookie-cutter metrics ("reduced time by 40%") out of nowhere. Quantify what the candidate actually built or handled.
   - NO CORPORATE HYPERBOLE: State what the system did without dramatic flair.
5. JD KEYWORD ALIGNMENT: When a job description is provided, weave genuine matching technical skills into relevant bullets naturally.
6. TECHNICAL SKILLS: Extract and categorize all technologies mentioned anywhere in the resume.
7. SPARSE BOLDING: Bold at most 1-2 standout technologies or metrics per bullet using double asterisks (** **). Never bold every line by formula.

AI-CHANGE ANNOTATION (the "aiChanges" part of your output):
After building the resume, report exactly what you created or altered so the UI can highlight it.
- addedBullets: for each section (experience/projects/leadership) and entry, list the FULL VERBATIM text of every bullet you created that has NO counterpart in the original resume text. Copy the strings exactly as they appear in your resume (including any **bold** markers). Empty list if none.
- tailoredBullets: for each section and entry, list the FULL VERBATIM text of every bullet that was already in the original resume but you substantially expanded or rewrote (do NOT list bullets you left essentially unchanged). Copy verbatim from your resume, including **bold** markers. Empty list if none.
- addedSkills: skills labels that were not mentioned anywhere in the original resume text and were not part of the job description (if provided). Give the short label, e.g. "Kubernetes", not a full sentence. Empty list if none.
- addedCoursework: course names you added that were not in the original resume. Empty list if none.
- IMPORTANT: never fabricate entries in aiChanges; if nothing was added or rewritten, use empty arrays. Always copy bullet text from your own resume output so the strings match character-for-character.

OUTPUT VOLUME (these are MINIMUMS, produce MORE if the source content supports it):
- Each experience: 5-6 substantial bullet points
- Each project: 4-5 substantial bullet points  
- Technical skills: 3 categories with all mentioned technologies
- Education: preserve all details
- Contact: preserve all details, use empty string "" for missing fields`;

function sanitizeText(str: string): string {
  return str
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-");
}

export async function parseResumeWithLLM(
  resumeText: string,
  jobDescription?: string,
  provider: Provider = "google",
  apiKey?: string,
  modelId?: string
): Promise<ParseResult> {
  const cleanResume = sanitizeText(resumeText);
  const cleanJD = jobDescription ? sanitizeText(jobDescription) : undefined;

  const userMessage = cleanJD
    ? `RESUME TEXT:\n\n${cleanResume}\n\n---\nJOB DESCRIPTION (for keyword tailoring ONLY - do NOT add new entries):\n\n${cleanJD}`
    : `RESUME TEXT:\n\n${cleanResume}`;

  return executeWithModelFallback(
    provider,
    apiKey || "",
    modelId,
    "Resume Parsing",
    async (model) => {
      const { output } = await generateText({
        model: model as any,
        instructions: SYSTEM_PROMPT,
        prompt: userMessage,
        output: Output.object({ schema: parseResultSchema }),
        maxRetries: 1,
      });
      return output;
    }
  );
}
