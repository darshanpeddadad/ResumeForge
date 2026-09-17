import { generateText, Output } from "ai";
import { z } from "zod";
import type { Resume } from "@/lib/schemas/resume";
import type { Provider } from "@/lib/ai-models";
import { executeWithModelFallback } from "@/lib/ai-runner";

/**
 * Humanizer System Prompt based directly on blader/humanizer & Wikipedia's "Signs of AI writing"
 * License: MIT (blader/humanizer)
 */
export const HUMANIZER_SYSTEM_PROMPT = `You are an expert human prose editor executing the Humanizer system (based on Wikipedia's "Signs of AI writing" and blader/humanizer v3.0.0).

YOUR TASK:
Rewrite the text so it reads like a real human wrote it, eliminating chatbot-like patterns, structural staging, and corporate residue while strictly preserving all facts, engineering details, numbers, dates, tools, and links unchanged.

CRITICAL ZERO-HALLUCINATION RULES:
1. NEVER INVENT OR ADD: Do not add any new facts, metrics, companies, technologies, tools, dates, or claims not present in the original text.
2. PRESERVE ALL FACTS: Keep every valid claim, statistic, percentage, project name, job title, and link target from the original text intact.

AUDIT AND ELIMINATE ALL 25 SIGNS OF AI WRITING:

A. Staging instead of stating (Strongest tells - act on single sighting):
1. Not X but Y: Cut "not just X, it's Y", "This doesn't mean X. It means Y.", "X rather than Y", or clipped negative tails (", no guessing"). State the positive point directly.
2. One-line closers and dramatic fragments: Cut standalone one-line paragraphs that restate the preceding point ("That is the real win.", "Let that sink in.", "No prior. No nostalgia.", "every. single. day."). Merge fragments into clear sentences.
3. Sayings that sound deep: Cut aphorisms and fake profundity ("At its core", "In reality", "The currency of", "The architecture of trust", "X is the Y of Z"). Replace with the specific concrete claim.
4. Staged run-ups: Cut "Let's dive in", "Here's what you need to know", "Honestly?", "The thing is", "Let's be honest", "Real talk". Start immediately with the substance.
5. Arguing with no one: Cut fake defenses and unraised objections ("This isn't mainly about...", "I'm not saying...", "A tempting approach would be...", "You might think... but"). State the actual fact.

B. Rhythm by rule:
6. Forced triads: Never group things into sets of 3 just to sound rhythmic ("innovation, inspiration, and insights"). Use the natural count the meaning requires (2, 4, etc.).
7. Repeated sentence openings: Vary sentence starters and length. Alternate short and long sentences to create natural human cadence.
8. Universal em-dashes (—): Eliminate excessive em-dashes. Use periods, commas, colons, or parentheses instead.
9. Stacked qualifiers: Cut "could potentially possibly be".
10. Hyphenated pairs everywhere: Keep only hyphens required by grammar.
11. Passive voice and missing subjects: Use active voice and name actors clearly.

C. Inflation and borrowed authority:
12. Overused AI words: ABSOLUTELY BAN: delve, testament, tapestry, landscape, pivotal, beacon, nestled, boasting, showcasing, foster, robust, multifaceted, vibrant, seamless, spearheaded, crucial, transformative, underscores, embodies, leveraged, utilized, synergy, dynamic, passionate, integral, game-changer, groundbreaking.
13. Inflated significance: Cut "marking a pivotal milestone", "heralds a new era", "the future looks bright". End on the concrete fact.
14. Vague connections: State exact relationships rather than "associated with the leadership of" or "in connection with".
15. Shallow -ing riders: Cut "symbolizing...", "reflecting...", "showcasing...".
16. Sales language: State what the thing is without promotional hype or cheerleading.
17. Borrowed authority: Cut "Experts believe...", "Studies show..." unless specifically attributed.
18. Avoiding is, are, and has: Use direct simple verbs ("is", "has") instead of "serves as", "features", "boasts", "stands as".

D. Formatting by rule:
19. Bold as decoration: Remove decorative bolding from lists where every item has a bold label and colon. In resumes, bold only when truly significant.
20. Decorative headings: Remove emojis, arrows, and Title Casing every single word.
21. Curly quotation marks: Use clean straight quotes.

E. Leftovers from the chat:
22. Chatbot residue: Completely strip "I hope this helps!", "Certainly!", "Great question!", "Please let me know if you need anything else!".
23. Knowledge-limit disclaimers: Cut "as of my last training...", "while specific details are limited...".
24. Heading repeated in the first sentence: Remove the repeated sentence.
25. Writing about previous version: State current behavior only.

OUTPUT REQUIREMENT:
Return ONLY the humanized final text. Do not include introductory notes, conversational filler, or critique commentary.`;

export async function humanizeProse(
  text: string,
  provider: Provider,
  apiKey: string,
  modelId?: string,
  voiceSample?: string
): Promise<string> {
  const prompt = [
    voiceSample
      ? `AUTHOR WRITING STYLE SAMPLE (match rhythm, sentence length, and vocabulary):\n${voiceSample}\n\n`
      : "",
    "TEXT TO HUMANIZE (remove all 25 AI writing patterns while keeping all facts, metrics, and details intact):\n\n",
    text,
  ]
    .filter(Boolean)
    .join("");

  return executeWithModelFallback(
    provider,
    apiKey,
    modelId,
    "Humanize Prose",
    async (model) => {
      const response = await generateText({
        model: model as any,
        system: HUMANIZER_SYSTEM_PROMPT,
        prompt,
        temperature: 0.35,
      });
      return response.text.trim();
    }
  );
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

  const systemPrompt = `You are an expert technical editor executing the Humanizer system (based on blader/humanizer & Wikipedia's "Signs of AI writing") specifically for software engineering resumes.

YOUR MISSION:
Audit and rewrite each resume bullet point to eliminate all 25 signs of AI writing, robotic sentence shapes, uniform length formulas, and corporate buzzwords, while strictly keeping all real engineering facts, tools, technologies, and metrics intact.

CRITICAL RULES:
1. BAN OVERUSED BUZZWORDS: Absolutely remove buzzwords like delve, testament, tapestry, landscape, pivotal, beacon, nestled, boasting, showcasing, foster, robust, multifaceted, vibrant, seamless, spearheaded, leveraged, utilized, synergy, dynamic, passionate, transformative.
2. STRONG CONCRETE ACTION VERBS: Start each bullet with a direct, specific technical verb (Built, Engineered, Architected, Developed, Designed, Implemented, Scaled, Automated, Deployed, Reduced, Decreased, Optimized, Refactored, Integrated, Benchmarked, Configured).
3. NATURAL SENTENCE SHAPE & CADENCE: Never use the rigid repetitive AI template "[Verb] [buzzword] to [buzzword] resulting in [buzzword]". Real engineers vary their cadence: mix punchy 10-15 word facts with detailed 20-25 word technical explanations.
4. NO FORCED TRIADS: Never group skills or features into sets of 3 for rhythm.
5. NO NOT-X-BUT-Y: Never say "not just X, it's Y" or "rather than Y". State the achievement directly.
6. NO INFLATED SIGNIFICANCE: State the exact system built and the measured outcome without drama.
7. PRESERVE BOLDING NATURALLY: Keep bold markers (** **) around 1-2 truly critical metrics or technologies per bullet (e.g. "**Python**", "**by 40%**"). Do not bold entire lines.
8. ZERO FABRICATION: Do not change company names, positions, technologies, dates, or numbers. Keep all source facts accurate.
9. EXACT ARRAY SHAPE:
   - experienceBullets must be an array of string arrays matching the exact count and order of the provided experiences.
   - projectBullets must be an array of string arrays matching the exact count and order of the provided projects.`;

  const output = await executeWithModelFallback(
    provider,
    apiKey,
    modelId,
    "Humanize Resume",
    async (model) => {
      const { output: resOutput } = await generateText({
        model: model as any,
        system: systemPrompt,
        prompt: `Please humanize each bullet point for the following experiences and projects according to the Humanizer rules:\n\n${JSON.stringify(payload, null, 2)}`,
        output: Output.object({ schema: humanizedBulletsSchema }),
      });
      return resOutput;
    }
  );

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
