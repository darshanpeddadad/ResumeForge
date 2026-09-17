import { generateText, Output } from "ai";
import { z } from "zod";
import type { Resume } from "@/lib/schemas/resume";
import type { Provider } from "@/lib/ai-models";
import { executeWithModelFallback } from "@/lib/ai-runner";

// ─────────────────────────────────────────────────────────────────────────────
// FULL blader/humanizer SKILL prompt (v2.11.1, Wikipedia "Signs of AI writing")
// ─────────────────────────────────────────────────────────────────────────────
const HUMANIZER_SYSTEM_PROMPT = `You are an expert human editor. Your ONLY job is to rewrite AI-generated text so it reads like a real person wrote it — not a language model.

CORE PRINCIPLE: Do NOT patch individual words. REWRITE whole sentences from scratch using the actual meaning. If a sentence stays awkward after rewording, rewrite the entire paragraph around its main point.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART A — ELIMINATE THESE AI PATTERNS (act on every single one):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. INFLATED IMPORTANCE — Delete: "stands as", "serves as a testament", "pivotal moment", "underscores", "reflects broader", "setting the stage for", "marks a shift", "key turning point", "evolving landscape", "indelible mark". Replace with the plain fact.

2. SHALLOW -ING RIDERS — Delete trailing "-ing" phrases that add no info: "highlighting...", "showcasing...", "symbolizing...", "reflecting...", "contributing to...", "fostering...", "ensuring...". State the fact directly instead.

3. SALES LANGUAGE — Delete: "boasts", "vibrant", "nestled", "breathtaking", "stunning", "groundbreaking", "renowned", "must-visit", "commitment to", "rich heritage", "seamless". Say what the thing actually is.

4. VAGUE SOURCES — Delete: "experts believe", "studies show", "industry reports suggest", "observers have cited", "some critics argue". If there's no real source, remove the claim or state it directly.

5. FORMULAIC STRUCTURE — Never write "X not only does A but also B". Never write "not just X, it's Y". Never write "X rather than Y" as a main framing device. State the point directly.

6. FORCED TRIADS — Never group items in sets of 3 for rhythm ("innovation, inspiration, and insights"). Use whatever natural count the content requires.

7. REPETITIVE SENTENCE OPENINGS — Vary how sentences start. Never start 3 sentences in a row with the same word or structure.

8. UNIFORM SENTENCE LENGTH — Mix short sentences (6–12 words) with medium (18–25 words) and occasional long ones (30+ words). AI writing clusters at 15–20 words per sentence.

9. EXCESSIVE EM-DASHES — Use periods, commas, or colons instead of em-dashes where possible.

10. BANNED WORDS — Never use: delve, testament, tapestry, landscape, pivotal, beacon, nestled, boasting, showcasing, foster, robust, multifaceted, vibrant, seamless, spearheaded, crucial, transformative, underscores, embodies, leveraged, utilized, synergy, dynamic, passionate, integral, game-changer, groundbreaking, revolutionize, elevate, unleash, cutting-edge, state-of-the-art.

11. CHATBOT RESIDUE — Delete completely: "I hope this helps!", "Certainly!", "Great question!", "Of course!", "Absolutely!", "I'd be happy to", "Please let me know".

12. STAGED RUN-UPS — Delete: "Let's dive in", "Here's what you need to know", "Honestly?", "The thing is", "Real talk". Start with the substance.

13. PASSIVE VOICE — Use active voice. Name who did what. "The system was built" → "I built the system."

14. INFLATED VERBS — Replace: "serves as" → "is", "boasts" → "has", "features" → "includes", "stands as" → "is", "endeavors to" → "tries to".

15. STACKED QUALIFIERS — Delete: "could potentially possibly", "may perhaps be". Choose one modifier or none.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART B — MAKE IT SOUND HUMAN (required, not optional):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A. SENTENCE RHYTHM: Read each paragraph aloud. If it has a metronomic beat where every sentence feels the same length and weight, break that rhythm. Interrupt mid-length sentences with a short factual one. Follow a complex clause with a blunt 8-word statement.

B. CONCRETE SPECIFICITY: Replace vague summaries with the most specific detail available. "Improved performance" → "cut response time from 2.1s to 340ms." If no specific detail exists, say what actually happened in plain terms.

C. NATURAL TRANSITIONS: Use "also", "then", "which meant", "as a result" instead of "furthermore", "moreover", "consequently", "additionally", "in conclusion".

D. FIRST-PERSON DIRECTNESS: In cover letters and personal statements, write in clear first-person. "I built X" not "X was built by the candidate."

E. AUTHENTIC CADENCE: Real writing has uneven rhythm — sometimes a sentence trails off with a qualification, sometimes it cuts short. Add this variation deliberately.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTE RULES (never break these):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Keep EVERY fact, number, company name, technology name, date, and metric exactly as given.
- Do not add facts that weren't in the original.
- Do not summarize or shorten — keep all the content.
- Return ONLY the rewritten text. No commentary, no preamble, no explanation.`;

// ─────────────────────────────────────────────────────────────────────────────
// Resume-specific humanizer system prompt
// ─────────────────────────────────────────────────────────────────────────────
const RESUME_HUMANIZER_PROMPT = `You are an expert technical resume editor. Rewrite resume bullet points so they sound like a real engineer wrote them — not an AI. This is CRITICAL: AI detectors are flagging these bullets. You must fundamentally rewrite the sentence structures, not just swap words.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE AI BULLET TEMPLATE TO DESTROY:
[Strong Verb] [buzzword adjective] [system/feature] to [vague outcome], resulting in [metric]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTEAD, use these natural human bullet patterns (vary them, don't repeat the same pattern):

Pattern A — Lead with the metric, explain how:
"Cut API latency by 40% by switching from polling to WebSocket connections"

Pattern B — Lead with the technology/tool choice:
"Moved the auth layer to JWT tokens; session errors dropped from 8% to under 0.5%"

Pattern C — Lead with the problem that was solved:
"Legacy batch jobs were taking 6+ hours; rewrote them as async workers and got it to 40 minutes"

Pattern D — Lead with what was built, impact is secondary:
"Built a real-time dashboard in React + D3 that replaced four separate Excel reports"

Pattern E — Lead with scale/scope, then method:
"Handled 50k daily active users on a single Node.js service by adding Redis caching and connection pooling"

RULES FOR ALL BULLETS:
1. BANNED VERBS: leveraged, utilized, spearheaded, championed, fostered, orchestrated, pioneered, catalyzed, synergized. Use: built, wrote, fixed, cut, reduced, shipped, designed, refactored, debugged, integrated, deployed, automated.
2. BANNED ADJECTIVES: seamless, robust, scalable, dynamic, vibrant, pivotal, transformative, cutting-edge, state-of-the-art. Say what the actual property is: "handles 10k req/s", "under 200ms latency", "zero downtime deploys".
3. VARY SENTENCE LENGTH: Mix short direct bullets (8–12 words) with detailed ones (18–28 words). Never have all bullets the same length.
4. NO FORCED TRIADS: Don't group things in sets of exactly 3. Use 2, 4, or whatever count is real.
5. NO PASSIVE VOICE: "was implemented" → "implemented", "was reduced" → "reduced", "was designed" → "designed".
6. KEEP ALL FACTS EXACTLY: Every number, company name, technology, and date must be preserved exactly.
7. EXACT ARRAY SHAPE: Return the exact same number of bullet arrays as given, in the same order.

OUTPUT REQUIREMENT: Return ONLY valid JSON matching the schema. No preamble, no commentary.`;

// ─────────────────────────────────────────────────────────────────────────────
// humanizeProse — for cover letters and cold messages
// ─────────────────────────────────────────────────────────────────────────────
export async function humanizeProse(
  text: string,
  provider: Provider,
  apiKey: string,
  modelId?: string,
  voiceSample?: string
): Promise<string> {
  const prompt = [
    voiceSample
      ? `WRITING STYLE SAMPLE — match the rhythm, sentence length, and vocabulary of this author:\n${voiceSample}\n\n`
      : "",
    "REWRITE THE FOLLOWING TEXT so it passes AI detection. Apply ALL patterns from Part A and Part B. Fundamentally restructure sentences — do not just swap individual words:\n\n",
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
        temperature: 0.75,
      });
      return response.text.trim();
    }
  );
}

const humanizedBulletsSchema = z.object({
  experienceBullets: z.array(z.array(z.string())),
  projectBullets: z.array(z.array(z.string())),
});

// ─────────────────────────────────────────────────────────────────────────────
// humanizeResume — for resume bullet points
// ─────────────────────────────────────────────────────────────────────────────
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

  const prompt = `Rewrite these resume bullet points so they pass AI detection. Destroy the "Verb + buzzword + metric" template. Use varied natural patterns. Keep every fact exactly as given.

INPUT:
${JSON.stringify(payload, null, 2)}

Return JSON with:
- experienceBullets: array of arrays, same count and order as the experiences above
- projectBullets: array of arrays, same count and order as the projects above`;

  const output = await executeWithModelFallback(
    provider,
    apiKey,
    modelId,
    "Humanize Resume",
    async (model) => {
      const { output: resOutput } = await generateText({
        model: model as any,
        system: RESUME_HUMANIZER_PROMPT,
        prompt,
        output: Output.object({ schema: humanizedBulletsSchema }),
        temperature: 0.8,
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

