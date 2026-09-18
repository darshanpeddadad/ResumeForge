import { generateText, Output } from "ai";
import {
  parseResultLlmSchema,
  hydrateSectionIds,
  type ParseResultLlm,
  type Resume,
} from "@/lib/schemas/resume";
import type { Provider } from "@/lib/ai-models";
import { executeWithModelFallback } from "@/lib/ai-runner";
import { sanitizeAiPatterns } from "@/lib/humanizer";

const SYSTEM_PROMPT = `You are a Principal Software Engineer and elite technical resume strategist.
Your mission is to transform the candidate's resume into a high-scoring (90+ ATS match), natural, human-written engineering resume.

═══════════════════════════════════════════════════════
MANDATORY PRESERVATION OF ORIGINAL RESUME CONTENT
═══════════════════════════════════════════════════════
DO NOT DROP OR OMIT THE CANDIDATE'S BACKGROUND. You must extract and preserve:

1. WORK EXPERIENCE (type: "bullet_list"):
   - Extract EVERY job, employer, role, and internship from the original resume.
   - heading: Company name
   - subheading: Role / Job Title
   - dateRange: e.g. "May 2024 – Aug 2024" or "2022 – Present"
   - location: City, State or Country
   - bullets: 3-5 high-impact, tailored achievement bullets per role.

2. EDUCATION (type: "bullet_list"):
   - Extract EVERY degree, university, and educational institution from the resume.
   - heading: University / School name (e.g. "Technical University of Munich")
   - subheading: Degree & Major (e.g. "M.Sc. in Computer Science")
   - dateRange: e.g. "Oct 2024 – Sep 2027"
   - location: City, Country
   - bullets: GPA, honors, relevant coursework, or thesis if mentioned.

3. PROJECTS (type: "projects"):
   - Extract EVERY project from the original resume.
   - heading: Project Name
   - subheading: Technologies / Tech Stack used (e.g. "Next.js, TypeScript, Docker, Kubernetes")
   - dateRange: e.g. "Jan 2024" or "Ongoing"
   - bullets: 2-3 bullets explaining what was engineered, the technical challenge, and the outcome.

4. TECHNICAL SKILLS (type: "skills"):
   - Consolidate ALL skills into ONE SINGLE "Technical Skills" section.
   - DO NOT create multiple Technical Skills sections. Put all categories into this one section.
   - Group into relevant categories:
     • Languages: e.g. Python, TypeScript, Go, C++, SQL
     • Cloud & DevOps: e.g. Docker, Kubernetes, AWS, Terraform, CI/CD, Linux
     • Frameworks & Libraries: e.g. Next.js, React, Node.js, FastAPI
     • Databases & Storage: e.g. PostgreSQL, Redis, MongoDB
     • Developer Tools: e.g. Git, Helm, Prometheus, Grafana
   - When a JD is provided, incorporate matching skills from the JD that align with the candidate's actual background.

5. PROFESSIONAL SUMMARY (type: "text", optional/recommended):
   - A punchy 2-3 sentence technical overview tailored to the target JD role.
   - Focus on candidate's core engineering strengths, domain focus, and value.
   - STRICTLY PROFESSIONAL: DO NOT use informal parentheticals like "(honestly)" or conversational asides.

6. OTHER SECTIONS (if present in original resume):
   - Certifications (type: "simple_list" or "skills")
   - Leadership & Extracurriculars (type: "bullet_list")
   - Publications or Research (type: "projects" or "bullet_list")
   - Awards or Honors (type: "simple_list")

═══════════════════════════════════════════════════════
THE 5 ENGINEERING BULLET ARCHETYPES (Rotate through these)
═══════════════════════════════════════════════════════
To prevent repetitive AI formula ("Verb + adjective + noun, resulting in metric"), rotate through these 5 archetypes:

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
- BANNED BUZZWORDS (NEVER USE):
  leveraged, utilized, spearheaded, orchestrated, championed, fostered, synergistic, seamless, robust, dynamic, pivotal, transformative, testament, delve, beacon.

- STRONG ACTION VERBS:
  built, designed, engineered, scaled, automated, cut, shipped, refactored, debugged, integrated, deployed, migrated, provisioned, benchmarked.

- VARY OPENING VERBS:
  Never start two adjacent bullets with the same verb.

- VARY LENGTH:
  Mix short punchy bullets (10-14 words) with detailed technical explanations (22-30 words).

- SPARSE BOLDING:
  Bold at most 1-2 standout technologies or metrics per bullet using **double asterisks** (e.g. "**Kubernetes**", "**40% latency reduction**").

═══════════════════════════════════════════════════════
LANGUAGE & MULTILINGUAL HANDLING
═══════════════════════════════════════════════════════
- Write the resume in the language of the source resume text (typically English).
- If the job description is in German, French, or another language:
  • Extract the core technical qualifications and matching keywords.
  • Keep the resume output in the candidate's language (English).
  • Do NOT translate the candidate's job titles, company names, or university degrees into German.

═══════════════════════════════════════════════════════
OPTIMAL ATS SECTION ORDER (when JD provided)
═══════════════════════════════════════════════════════
1. Professional Summary (if included)
2. Technical Skills
3. Work Experience
4. Projects
5. Education
6. Certifications / Additional sections

(Without JD: preserve original logical resume flow)
`;

function sanitizeText(str: string): string {
  return str
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-");
}

export interface ParseResult {
  resume: Resume;
  aiChanges: ParseResultLlm["aiChanges"];
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
    ? `SOURCE RESUME TEXT (Extract all jobs, degrees, projects, skills from this document):\n\n${cleanResume}\n\n═══════════════════════════════════════════════════════\nTARGET JOB DESCRIPTION (Tailor keywords, highlight matching skills, optimize ATS order):\n\n${cleanJD}`
    : `SOURCE RESUME TEXT (Extract all jobs, degrees, projects, skills from this document):\n\n${cleanResume}`;

  const llmResult = await executeWithModelFallback(
    provider,
    apiKey || "",
    modelId,
    "Resume Parsing",
    async (model) => {
      const { output } = await generateText({
        model: model as any,
        instructions: SYSTEM_PROMPT,
        prompt: userMessage,
        output: Output.object({ schema: parseResultLlmSchema }),
        temperature: 0.25, // Low temperature locks in determinism and eliminates fluctuation
        maxRetries: 2,
      });
      return output;
    }
  );

  // Hydrate nanoids, normalize sections, and consolidate duplicate skills
  const resume = hydrateSectionIds(llmResult.resume);

  // Apply deterministic pattern sanitizer across all text and bullets
  for (const section of resume.sections) {
    if (section.content) {
      section.content = sanitizeAiPatterns(section.content);
    }
    if (section.entries) {
      for (const entry of section.entries) {
        entry.bullets = entry.bullets.map(sanitizeAiPatterns);
      }
    }
  }

  return {
    resume,
    aiChanges: llmResult.aiChanges || {
      addedBullets: [],
      tailoredBullets: [],
      addedSkillItems: [],
      addedListItems: [],
      addedSections: [],
    },
  };
}
