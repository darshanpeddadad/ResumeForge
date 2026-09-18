import { generateText, Output } from "ai";
import { z } from "zod";
import type { Resume } from "@/lib/schemas/resume";
import type { Provider } from "@/lib/ai-models";
import { executeWithModelFallback } from "@/lib/ai-runner";

const outreachValuesSchema = z.object({
  coldEmail: z.object({
    recipientName: z.string(),
    companyName: z.string(),
    specificThing: z.string(),
    specificArea: z.string(),
    role: z.string(),
    relevantSkills: z.array(z.string()),
    achievement: z.string(),
    portfolioLink: z.string(),
    githubLink: z.string(),
    linkedinLink: z.string(),
    senderName: z.string(),
  }),
  coldDM: z.object({
    recipientName: z.string(),
    companyName: z.string(),
    specificThing: z.string(),
    niche: z.string(),
    technologies: z.array(z.string()),
    projectAchievement: z.string(),
    role: z.string(),
  }),
});

export type OutreachValues = z.infer<typeof outreachValuesSchema>;

export async function generateOutreach(
  resume: Resume,
  jobDescription: string,
  provider: Provider,
  apiKey: string,
  modelId?: string
): Promise<OutreachValues> {
  const bulletSections = resume.sections.filter(
    (s) => s.type === "bullet_list" || s.type === "projects"
  );

  const skillsSection = resume.sections.find((s) => s.type === "skills");

  const resumeSummary = [
    `Name: ${resume.contact.name}`,
    `Email: ${resume.contact.email}`,
    resume.contact.linkedin ? `LinkedIn: ${resume.contact.linkedin}` : "",
    resume.contact.github ? `GitHub: ${resume.contact.github}` : "",
    `Experience: ${bulletSections.filter((s) => s.type === "bullet_list").flatMap((s) => s.entries).map((e) => `${e.subheading} at ${e.heading}`).join("; ")}`,
    skillsSection
      ? `Skills: ${skillsSection.categories.flatMap((c) => c.items).join(", ")}`
      : "",
    `Projects: ${bulletSections.filter((s) => s.type === "projects").flatMap((s) => s.entries).map((e) => e.heading).join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  return executeWithModelFallback(
    provider,
    apiKey,
    modelId,
    "Outreach Messages",
    async (model) => {
      const { output } = await generateText({
        model: model as any,
        instructions: `You are an expert outreach copywriter. Given a resume and a job description, fill in the template values for a cold email and a cold DM.

RULES:
- Extract the company name and role title from the job description
- Use the candidate's actual skills, projects, and experience from the resume
- specificThing: Pick something genuine about the company (product, mission, recent news, tech stack)
- specificArea: A specific technical area the company works on
- achievement: Use the most impressive bullet point from their resume
- relevantSkills: Pick 2-3 skills most relevant to the job description
- For DM: niche should be their primary engineering domain
- For DM: projectAchievement should be their most impressive project, described concisely
- portfolioLink/githubLink/linkedinLink: Use the actual links from the resume, or "N/A" if not provided
- Keep all values concise and natural
- senderName and recipientName should use the actual names`,
        prompt: `RESUME:\n${resumeSummary}\n\nJOB DESCRIPTION:\n${jobDescription}`,
        output: Output.object({ schema: outreachValuesSchema }),
        maxRetries: 1,
      });
      return output;
    }
  );
}
