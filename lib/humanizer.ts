import { generateText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { Resume } from "@/lib/schemas/resume";
import { DEFAULT_MODEL, type Provider } from "@/lib/ai-models";

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

export const HUMANIZER_SYSTEM_PROMPT = `You are an expert human prose editor implementing the Humanizer system (based on Wikipedia's "Signs of AI writing" and blader/humanizer).

YOUR TASK:
Rewrite the provided text so it reads like a real human wrote it, eliminating chatbot-like patterns while keeping the exact meaning, technical details, facts, numbers, dates, and claims unchanged.

CRITICAL ZERO-HALLUCINATION RULES:
1. NEVER INVENT OR ADD: Do not add any new facts, metrics, companies, technologies, tools, dates, or claims not present in the original text.
2. PRESERVE ALL FACTS: Keep every valid claim, statistic, percentage, project name, job title, and link target from the original text intact.

AUDIT AND ELIMINATE THESE 25 AI TELLS:
1. "Not X but Y" (e.g. "It's not just X, it's Y" or "This doesn't mean X. It means Y.") -> State the point directly.
2. Dramatic one-line closers and fragments (e.g. "That is the real win.", "Let that sink in.") -> Cut repetitions or merge fragments.
3. Sayings that sound deep (e.g. "At its core", "In reality", "The currency of", "The architecture of trust") -> Replace with specific concrete claims.
4. Staged run-ups (e.g. "Let's dive in", "Here's what you need to know", "Honestly?", "The thing is") -> Cut the announcement; start with the claim.
5. Arguing with no one (e.g. "This isn't mainly about...", "A tempting approach would be...", "You might think... but") -> Cut fake defenses and unraised objections.
6. Forced triads -> Do not group things into sets of 3 just for rhythmic symmetry. Use the natural count of facts.
7. Repetitive sentence structures -> Alternate short and long sentences. Create natural, human cadence.
8. Universal em-dashes (—) -> Replace excessive em-dashes with commas, periods, or standard parentheticals.
9. Stacked qualifiers -> Cut "could potentially possibly be".
10. Hyphenated pairs -> Use hyphens only when strictly required by grammar.
11. Passive voice -> Use active voice and name the subject clearly where appropriate.
12. Overused AI words -> ABSOLUTELY BAN: delve, testament, tapestry, landscape, pivotal, beacon, nestled, boasting, showcasing, foster, robust, multifaceted, vibrant, seamless, spearheaded, crucial, transformative, underscores, embodies.
13. Inflated significance -> Cut "marking a pivotal milestone", "heralds a new era", "the future looks bright". End on concrete facts.
14. Vague connections -> State exact relationships rather than "associated with the leadership of".
15. Shallow -ing riders -> Cut "symbolizing...", "reflecting...", "showcasing...".
16. Sales hype -> Cut promotional fluff and corporate cheerleading.
17. Borrowed authority -> Cut vague claims like "Experts believe" or "Studies show" unless specifically sourced.
18. Avoiding is/are/has -> Use direct simple verbs ("is", "has") instead of "serves as", "features", "boasts".
19. Bold decoration -> Remove decorative bold tags on phrases.
20. Decorative emojis/headings -> Keep headers clean, professional, and free of emojis.
21. Chatbot residue -> Cut conversational fluff ("I hope this email finds you well", "I am thrilled to apply", "Certainly!").

OUTPUT REQUIREMENT:
Return ONLY the humanized final text. Do not include introductory notes, conversational filler, or commentary.`;

export async function humanizeProse(
  text: string,
  provider: Provider,
  apiKey: string,
  modelId?: string,
  voiceSample?: string
): Promise<string> {
  const model = getModel(provider, apiKey, modelId);

  const prompt = [
    voiceSample
      ? `Here is a sample of the author's personal writing style and cadence for voice matching:\n${voiceSample}\n\n`
      : "",
    "Please humanize the following text by removing all 25 AI writing patterns while strictly keeping all facts and metrics intact:\n\n",
    text,
  ]
    .filter(Boolean)
    .join("");

  const response = await generateText({
    model: model as any,
    system: HUMANIZER_SYSTEM_PROMPT,
    prompt,
    temperature: 0.3,
  });

  return response.text.trim();
}

const humanizedBulletsSchema = z.object({
  experienceBullets: z.array(z.array(z.string())),
  projectBullets: z.array(z.array(z.string())),
});

export async function humanizeResume(
  resume: Resume,
  provider: Provider,
  apiKey: string,
  modelId?: string
): Promise<Resume> {
  const model = getModel(provider, apiKey, modelId);

  const payload = {
    experiences: resume.experience.map((e) => ({
      company: e.company,
      position: e.position,
      bulletPoints: e.bulletPoints,
    })),
    projects: resume.projects.map((p) => ({
      name: p.name,
      technologies: p.technologies,
      bulletPoints: p.bulletPoints,
    })),
  };

  const systemPrompt = `You are an expert technical editor executing the Humanizer system (based on Wikipedia's "Signs of AI writing" & blader/humanizer) specifically for engineering resumes.

YOUR MISSION:
Audit and rewrite each resume bullet point to eliminate AI writing tells, robotic templates, and buzzwords while keeping all engineering facts, technologies, metrics, and markdown bold markers (** **) intact.

CRITICAL RULES:
1. BAN OVERUSED BUZZWORDS: Absolutely remove buzzwords like delve, testament, tapestry, landscape, pivotal, beacon, nestled, boasting, showcasing, foster, robust, multifaceted, vibrant, seamless, spearheaded, leveraged, utilized, synergy, dynamic, passionate, transformative.
2. STRONG CONCRETE VERBS: Start each bullet with a direct, crisp action verb (Built, Engineered, Architected, Developed, Designed, Implemented, Scaled, Automated, Deployed, Reduced, Decreased, Optimized, Refactored, Integrated).
3. NATURAL SENTENCE SHAPE: Avoid the rigid template "[Verb] [buzzword] to [buzzword] resulting in [buzzword]". Alternate sentence flow so it reads like an experienced engineer writing about their own work.
4. PRESERVE BOLDING: Keep the 1-3 **bold** phrases per bullet around metrics, technologies, and standout outcomes.
5. ZERO FABRICATION: Do not change companies, positions, technologies, dates, or metrics. Keep all numbers and metrics accurate to the source.
6. EXACT ARRAY SHAPE:
   - experienceBullets must be an array of string arrays matching the exact count and order of the provided experiences.
   - projectBullets must be an array of string arrays matching the exact count and order of the provided projects.`;

  const { output } = await generateText({
    model: model as any,
    system: systemPrompt,
    prompt: `Please humanize the bullet points for the following experiences and projects:\n\n${JSON.stringify(payload, null, 2)}`,
    output: Output.object({ schema: humanizedBulletsSchema }),
  });

  return {
    ...resume,
    experience: resume.experience.map((exp, i) => ({
      ...exp,
      bulletPoints: output.experienceBullets[i] || exp.bulletPoints,
    })),
    projects: resume.projects.map((proj, i) => ({
      ...proj,
      bulletPoints: output.projectBullets[i] || proj.bulletPoints,
    })),
  };
}
