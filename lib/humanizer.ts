import { generateText, Output } from "ai";
import { z } from "zod";
import type { Resume } from "@/lib/schemas/resume";
import type { Provider } from "@/lib/ai-models";
import { executeWithModelFallback } from "@/lib/ai-runner";

// ─────────────────────────────────────────────────────────────────────────────
// PASS 1 — Structure breaker: destroys AI sentence patterns
// ─────────────────────────────────────────────────────────────────────────────
const PASS1_SYSTEM_PROMPT = `You are a human editor rewriting AI-generated text. Your job: destroy the sentence STRUCTURES that AI detectors flag, not just swap words.

AI detectors measure two things:
1. PERPLEXITY — how predictable each word choice is. AI text is too predictable.
2. BURSTINESS — how much sentence length varies. AI text is too uniform (all 15-20 word sentences).

WHAT TO DO:
- Rewrite complete sentences from scratch using the same facts
- Mix very short sentences (4-8 words) with very long ones (30-45 words)
- Use contractions: I'm, I've, I'd, don't, didn't, it's, they're, we've, can't
- Use casual connecting words: "which meant", "so", "that way", "and", "but", "because"
- Use first person strongly: "I built", "I cut", "I shipped", "I designed" — not "was built", "was reduced"
- Add one genuine parenthetical aside per paragraph: (about X minutes in practice), (we called it Y internally), (which surprised us)
- Use semicolons to connect related facts instead of separate sentences
- Start some sentences with "And" or "But" — real writers do this
- Make transitions casual: "also", "plus", "on top of that", "that meant", "as a result"
- Never start two adjacent sentences the same way

BANNED FOREVER:
- Furthermore, Moreover, Additionally, Consequently, In conclusion, In summary
- Leveraged, Utilized, Spearheaded, Fostered, Championed, Pioneered, Synergized
- Robust, Seamless, Pivotal, Transformative, Cutting-edge, Vibrant, Dynamic
- Testament, Landscape, Tapestry, Beacon, Delve, Showcase, Underscore
- "I am writing to express my interest" / "I believe I am the ideal candidate"
- "Please don't hesitate to reach out" / "I look forward to hearing from you"
- The AI template: [Verb] [adjective] [noun] to [outcome], resulting in [metric]

RULES:
- Keep every fact, number, company name, technology, and date exactly as given
- Do not add new facts
- Keep all the content — don't summarize or cut
- Return ONLY the rewritten text, nothing else`;

// ─────────────────────────────────────────────────────────────────────────────
// PASS 2 — Authenticity layer: adds human fingerprints
// ─────────────────────────────────────────────────────────────────────────────
const PASS2_SYSTEM_PROMPT = `You are a final-pass human editor. The text you receive has already been rewritten once to remove AI patterns. Your job is to make it MORE human by adding authentic variation — the kind of imperfection and personality that real writers have.

WHAT TO DO:

1. SENTENCE LENGTH VARIATION (most important):
   - Count the sentences. If most are similar length, pick 20% of them and cut them in half. Pick another 20% and expand them with a "which meant..." or "because..." clause.
   - Target: some sentences under 8 words, some over 35 words, most in between.

2. CONTRACTIONS AND CASUAL LANGUAGE:
   - Replace every "I am" with "I'm", every "I have" with "I've", every "do not" with "don't", every "did not" with "didn't", every "it is" with "it's", every "they are" with "they're"
   - Replace formal transitions: "Furthermore" → "Also", "Additionally" → "Plus", "Consequently" → "So", "However" → "But"

3. ONE GENUINE HUMAN ASIDE PER PARAGRAPH:
   - Add a parenthetical that sounds like something a real person would note: "(which ended up being the harder part)", "(not as clean as I'd have liked, but it worked)", "(we had about a week to get this right)", "(took longer than expected)"
   - These must fit naturally — don't force them

4. VARY HOW SENTENCES START:
   - If two adjacent sentences start with "I", change one to start differently
   - Use: "That meant...", "Which...", "And...", "So...", "The result:", "This let us...", "As a result..."

5. WORD-LEVEL AUTHENTICITY:
   - Replace "assist" → "help", "utilize" → "use", "implement" → "build" or "write", "demonstrate" → "show", "facilitate" → "help with"
   - Keep technical terms exact (Redis, PostgreSQL, Next.js, etc.)

ABSOLUTE RULES:
- Keep every fact, number, company name, technology, and date exactly as given
- Do not add new facts or remove existing ones
- Return ONLY the rewritten text, nothing else
- Do not add commentary or preamble`;

// ─────────────────────────────────────────────────────────────────────────────
// Resume-specific PASS 1 prompt
// ─────────────────────────────────────────────────────────────────────────────
const RESUME_PASS1_PROMPT = `You are a technical resume editor. Rewrite resume bullet points to pass AI detection. The main issue: every bullet follows the same structure "Verb + adjective + noun, resulting in metric". Destroy that template.

USE THESE 5 PATTERNS INSTEAD (rotate through them, don't repeat the same one):

A — Lead with the number/metric, then explain what caused it:
"Cut API response time by 40% by replacing synchronous DB queries with async batch calls"

B — Lead with the tech decision, then show the outcome:
"Switched auth from sessions to JWT tokens; login failures dropped from 8% to under 0.5%"

C — Lead with the problem, then what fixed it:
"Batch jobs were taking 6+ hours overnight — rewrote them as parallel workers, down to 40 minutes"

D — Lead with what got built, metric is natural not forced:
"Built a React + WebSocket dashboard that replaced 4 separate Excel reports the team was maintaining"

E — Lead with scale, then how it was achieved:
"Serving 50k daily users on a single Node service using Redis caching and a connection pool of 20"

RULES:
- BANNED VERBS: leveraged, utilized, spearheaded, championed, fostered, orchestrated
- USE INSTEAD: built, wrote, cut, shipped, refactored, debugged, integrated, deployed, fixed, reduced, designed
- BANNED ADJECTIVES: seamless, robust, scalable, dynamic, pivotal, transformative, cutting-edge
- VARY LENGTH: some bullets 8-12 words (short/punchy), some 20-30 words (detailed). Never all the same
- NO PASSIVE VOICE: "was built" → "built", "was reduced" → "reduced"
- NO TRIADS: don't list exactly 3 things just for rhythm
- KEEP ALL FACTS EXACTLY: every number, company, tech name, date must match

Return JSON only. No preamble.`;

// ─────────────────────────────────────────────────────────────────────────────
// Resume-specific PASS 2 prompt
// ─────────────────────────────────────────────────────────────────────────────
const RESUME_PASS2_PROMPT = `You are doing a final polish pass on resume bullet points. They've already been rewritten once. Your job: make them sound like a real engineer wrote them by varying the structure more aggressively.

FOR EACH BULLET:
1. If it starts with a verb (Built, Designed, Cut, etc.) — keep it if it sounds natural, or restructure if it still feels templated
2. Make sure NO TWO ADJACENT bullets start with the same verb
3. At least one bullet per job should be SHORT (under 12 words) and punchy
4. At least one bullet per job should have a DASH or SEMICOLON to connect two facts naturally
5. Remove any remaining corporate jargon: "leveraged", "utilized", "spearheaded", "seamless", "robust", "scalable"
6. If a bullet still says "resulting in X" or "leading to X" at the end — rewrite it to lead with X instead

ABSOLUTE RULES:
- Every number, technology name, company name, and date must stay exactly the same
- Do not add facts not already in the bullet
- Same bullet count per job, same order
- Return JSON only, no commentary`;

const humanizedBulletsSchema = z.object({
  experienceBullets: z.array(z.array(z.string())),
  projectBullets: z.array(z.array(z.string())),
});

// ─────────────────────────────────────────────────────────────────────────────
// humanizeProse — double-pass for cover letters and cold messages
// ─────────────────────────────────────────────────────────────────────────────
export async function humanizeProse(
  text: string,
  provider: Provider,
  apiKey: string,
  modelId?: string,
  voiceSample?: string
): Promise<string> {
  const voicePrefix = voiceSample
    ? `WRITING STYLE SAMPLE — match this author's rhythm and vocabulary:\n${voiceSample}\n\n`
    : "";

  // PASS 1: Break AI sentence structures
  const pass1 = await executeWithModelFallback(
    provider,
    apiKey,
    modelId,
    "Humanize Pass 1",
    async (model) => {
      const response = await generateText({
        model: model as any,
        system: PASS1_SYSTEM_PROMPT,
        prompt: `${voicePrefix}REWRITE THIS TEXT — destroy AI sentence structures, vary lengths dramatically:\n\n${text}`,
        temperature: 0.8,
      });
      return response.text.trim();
    }
  );

  // PASS 2: Add authenticity layer (contractions, asides, length variation)
  const pass2 = await executeWithModelFallback(
    provider,
    apiKey,
    modelId,
    "Humanize Pass 2",
    async (model) => {
      const response = await generateText({
        model: model as any,
        system: PASS2_SYSTEM_PROMPT,
        prompt: `Add human fingerprints to this text — contractions, asides, sentence length variation:\n\n${pass1}`,
        temperature: 0.7,
      });
      return response.text.trim();
    }
  );

  return pass2;
}

// ─────────────────────────────────────────────────────────────────────────────
// humanizeResume — double-pass for resume bullet points
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

  const jsonPayload = JSON.stringify(payload, null, 2);

  // PASS 1: Destroy AI bullet template, apply 5-pattern system
  const pass1Output = await executeWithModelFallback(
    provider,
    apiKey,
    modelId,
    "Resume Humanize Pass 1",
    async (model) => {
      const { output } = await generateText({
        model: model as any,
        system: RESUME_PASS1_PROMPT,
        prompt: `Rewrite these bullets to destroy the AI template. Apply the 5 patterns. Keep all facts exactly:\n\n${jsonPayload}`,
        output: Output.object({ schema: humanizedBulletsSchema }),
        temperature: 0.85,
      });
      return output;
    }
  );

  // Build intermediate payload from pass 1
  const pass1Payload = {
    experiences: resume.experience.map((e, i) => ({
      company: e.company,
      position: e.position,
      bulletPoints: pass1Output.experienceBullets[i] || e.bulletPoints,
    })),
    projects: resume.projects.map((p, i) => ({
      name: p.name,
      technologies: p.technologies,
      bulletPoints: pass1Output.projectBullets[i] || p.bulletPoints,
    })),
  };

  // PASS 2: Final polish — vary adjacent verbs, add punchy bullets, remove leftovers
  const pass2Output = await executeWithModelFallback(
    provider,
    apiKey,
    modelId,
    "Resume Humanize Pass 2",
    async (model) => {
      const { output } = await generateText({
        model: model as any,
        system: RESUME_PASS2_PROMPT,
        prompt: `Final polish pass — vary adjacent verbs, add short punchy bullets, remove any remaining AI patterns:\n\n${JSON.stringify(pass1Payload, null, 2)}`,
        output: Output.object({ schema: humanizedBulletsSchema }),
        temperature: 0.75,
      });
      return output;
    }
  );

  return {
    ...resume,
    experience: resume.experience.map((exp, i) => ({
      ...exp,
      bulletPoints: pass2Output.experienceBullets[i] || pass1Output.experienceBullets[i] || exp.bulletPoints,
    })),
    projects: resume.projects.map((proj, i) => ({
      ...proj,
      bulletPoints: pass2Output.projectBullets[i] || pass1Output.projectBullets[i] || proj.bulletPoints,
    })),
  };
}
