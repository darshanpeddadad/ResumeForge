import { generateText, Output } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { parseResultSchema, type ParseResult } from "@/lib/schemas/resume";
import { DEFAULT_MODEL, type Provider } from "@/lib/ai-models";

const SYSTEM_PROMPT = `You are an expert resume parser and ATS optimizer. Extract information from the provided resume text, structure it as JSON, and ENHANCE it to be comprehensive, detailed, and ATS-friendly.

CRITICAL RULES - DO NOT:
1. NEVER add companies, jobs, projects, skills, or experiences NOT in the resume text
2. NEVER add entries from the job description - it is ONLY for keyword tailoring
3. NEVER invent new bullet points - only expand and detail what exists
4. CONTACT LINKS: ALWAYS extract the linkedin and github URLs exactly as they appear and put the clean path in the linkedin/github fields. NEVER omit them, NEVER add or duplicate the domain (no "github.com/github.com/x" or "linkedin.com/in/linkedin.com/in/x"), NEVER invent a URL. A field like "github.com/subhraneel2005/nini" must become "subhraneel2005/nini", a URL like "https://www.linkedin.com/in/subhraneel" must become "subhraneel". If a URL is missing from the resume, use empty string "".
5. CONTACT FIELDS: phone must contain ONLY the phone number (digits, spaces, +, -). address must contain ONLY the location (city/state/country). email must be a bare email. Never leave stray labels, prefixes, or extra words in these fields (e.g. no "INT +91..." in the address, no trailing "B" in the phone).

ENHANCEMENT STRATEGY - DO THIS:
1. For EACH experience entry, produce exactly 5-6 detailed bullet points. If the original has fewer, split longer bullets into multiple specific points or expand with more context about technologies, scope, and impact.
2. For EACH project entry, produce exactly 4-5 detailed bullet points.
3. Each bullet point MUST be 1.5-2 lines long. Be specific and verbose. Include:
   - What was built/done (specific feature or system name)
   - Technologies and tools used (list them explicitly)
   - Scale and scope (team size, user count, data volume, codebase size)
   - Impact and results (performance improvements, time saved, metrics achieved)
4. HUMANIZER ANTI-AI RULES (Apply strictly to all bullet points):
   - BAN OVERUSED BUZZWORDS: Never use words such as delve, testament, tapestry, landscape, pivotal, beacon, nestled, boasting, showcasing, foster, robust, multifaceted, vibrant, seamless, spearheaded, leveraged, utilized, synergy, dynamic, passionate, transformative, underscores, embodies.
   - START WITH STRONG CONCRETE ACTION VERBS: Architected, Engineered, Developed, Implemented, Designed, Built, Scaled, Automated, Deployed, Optimized, Streamlined, Refactored, Integrated, Orchestrated, Reduced, Decreased.
   - NO FORCED TRIADS: Do not artificially group technologies or features into sets of 3 for rhythm. State only the actual tools and components used.
   - NO INFLATED DRAMA: Avoid hyperbolic claims ("revolutionized workflow", "heralded a new era"). State the exact system engineered and the measurable outcome.
   - NATURAL HUMAN CADENCE: Real engineering accomplishments sound like an engineer explaining their work to another engineer: specific, technical, quantified, and grounded.
5. Add plausible metrics where reasonable: "reduced processing time by 40%", "handled 50K+ daily requests", "improved test coverage from 60% to 95%", "managed microservices serving 100K users"
6. When a job description is provided, weave relevant keywords from the JD into existing bullet points naturally
7. Include ALL technologies mentioned anywhere in the resume under technical skills - scan experience and projects for tools, frameworks, languages, databases, cloud services
8. For relevant coursework, include 6-8 courses if mentioned
9. BOLDING: In every bullet point, wrap the 1-3 most impactful words or short phrases in double asterisks (** **) - e.g. metrics ("**by 40%**", "**50K+ daily requests**"), key technologies ("**Python**", "**TensorFlow**"), or standout outcomes ("**Reduced**", "**Scaled to 100K users**"). Bold ONLY genuinely important words, never whole sentences, never verbs that appear in every bullet, and at most 1-3 bolded phrases per bullet. For projects, bold the project name only if it is a well-known project.

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

function getModel(provider: Provider, apiKey: string, modelId?: string) {
  const cleanApiKey = (apiKey || "").replace(/[^\x20-\x7E]/g, "").trim();
  const model = modelId || DEFAULT_MODEL[provider];
  if (provider === "google") {
    const google = createGoogleGenerativeAI({ apiKey: cleanApiKey });
    return google(model);
  }
  if (provider === "anthropic") {
    const anthropic = createAnthropic({ apiKey: cleanApiKey });
    return anthropic(model);
  }
  if (provider === "perplexity") {
    const perplexity = createOpenAI({
      apiKey: cleanApiKey,
      baseURL: "https://api.perplexity.ai",
    });
    return perplexity(model);
  }
  const openai = createOpenAI({ apiKey: cleanApiKey });
  return openai(model);
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

  const { output } = await generateText({
    model: getModel(provider, apiKey || "", modelId) as any,
    instructions: SYSTEM_PROMPT,
    prompt: userMessage,
    output: Output.object({ schema: parseResultSchema }),
    maxRetries: 1,
  });

  return output;
}
