import { z } from "zod";
import { nanoid } from "nanoid";

// ─── Contact ─────────────────────────────────────────────────────────────────

export const contactSchema = z.object({
  name: z.string().describe("Full name"),
  address: z.string().optional().default("").describe("City, State, Country or location"),
  phone: z.string().optional().default("").describe("Phone number"),
  email: z.string().optional().default("").describe("Email address"),
  linkedin: z.string().optional().default("").describe("LinkedIn handle or path"),
  github: z.string().optional().default("").describe("GitHub handle or path"),
});

export type Contact = z.infer<typeof contactSchema>;

// ─── Section Types ────────────────────────────────────────────────────────────

export const sectionTypeSchema = z.enum([
  "bullet_list", // Experience, Education, Leadership, Extracurricular — entries with heading/subheading/dates/bullets
  "projects",    // Projects, Research, Publications — entries with name/tech/dates/bullets
  "skills",      // Technical Skills, Languages, Tools — categories of keywords
  "simple_list", // Coursework, Awards, Honors, Certifications — flat list of strings
  "text",        // Summary, Objective, Profile — paragraph text
]);

export type SectionType = z.infer<typeof sectionTypeSchema>;

// ─── Section Entry (used by bullet_list and projects) ─────────────────────────

export const bulletEntrySchema = z.object({
  heading: z.string().describe("Company name / University / Project name / Organization"),
  subheading: z.string().describe("Job title / Degree / Tech stack / Position"),
  dateRange: z.string().describe("Date range, e.g. 'Oct 2024 - Present' or '2020 - 2024'"),
  location: z.string().optional().default("").describe("Location (e.g. 'Munich, Germany' or 'Remote')"),
  bullets: z.array(z.string()).describe("Achievement bullet points"),
});

export type BulletEntry = z.infer<typeof bulletEntrySchema>;

// ─── Skill Category ──────────────────────────────────────────────────────────

export const skillCategorySchema = z.object({
  label: z.string().describe("Category label, e.g. 'Languages', 'Cloud & DevOps', 'Frameworks'"),
  items: z.array(z.string()).describe("List of skills/technologies"),
});

export type SkillCategory = z.infer<typeof skillCategorySchema>;

// ─── Single Unified Section Schema (Compatible with all LLM engines) ─────────
// Avoids discriminated unions / anyOf which cause severe truncation/bugs in Gemini & OpenAI structured output.

export const resumeSectionSchema = z.object({
  id: z.string().optional(),
  title: z.string().describe("Heading of the section, e.g. 'Work Experience', 'Education', 'Projects', 'Technical Skills', 'Professional Summary'"),
  type: sectionTypeSchema.describe("Section type: bullet_list, projects, skills, simple_list, text"),
  content: z.string().optional().default("").describe("Paragraph text for type='text' sections"),
  categories: z.array(skillCategorySchema).optional().default([]).describe("Categorized skill groups for type='skills' sections"),
  items: z.array(z.string()).optional().default([]).describe("Flat list of string items for type='simple_list' sections"),
  entries: z.array(bulletEntrySchema).optional().default([]).describe("Entries with bullets for type='bullet_list' and type='projects' sections"),
});

export type ResumeSection = z.infer<typeof resumeSectionSchema> & { id: string };

// Aliases for type guards and backward compatibility
export type BulletListSection = ResumeSection & { type: "bullet_list" };
export type ProjectsSection = ResumeSection & { type: "projects" };
export type SkillsSection = ResumeSection & { type: "skills" };
export type SimpleListSection = ResumeSection & { type: "simple_list" };
export type TextSection = ResumeSection & { type: "text" };

// ─── Main Resume Schema ───────────────────────────────────────────────────────

export const resumeLlmSchema = z.object({
  contact: contactSchema,
  sections: z.array(resumeSectionSchema).describe("Ordered list of resume sections"),
});

export const resumeSchema = z.object({
  contact: contactSchema,
  sections: z.array(resumeSectionSchema.extend({ id: z.string() })),
});

export type Resume = {
  contact: Contact;
  sections: ResumeSection[];
};

// ─── AI Changes Annotation ────────────────────────────────────────────────────

export const aiChangesSchema = z.object({
  addedBullets: z.array(
    z.object({
      sectionTitle: z.string(),
      bullets: z.array(z.string()),
    })
  ).optional().default([]),
  tailoredBullets: z.array(
    z.object({
      sectionTitle: z.string(),
      bullets: z.array(z.string()),
    })
  ).optional().default([]),
  addedSkillItems: z.array(z.string()).optional().default([]),
  addedListItems: z.array(z.string()).optional().default([]),
  addedSections: z.array(z.string()).optional().default([]),
});

export const parseResultLlmSchema = z.object({
  resume: resumeLlmSchema,
  aiChanges: aiChangesSchema.optional().default({
    addedBullets: [],
    tailoredBullets: [],
    addedSkillItems: [],
    addedListItems: [],
    addedSections: [],
  }),
});

export type AiChanges = z.infer<typeof aiChangesSchema>;
export type ParseResultLlm = z.infer<typeof parseResultLlmSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalizes sections from LLM output:
 * - Generates stable nanoid for every section
 * - Consolidates duplicate skill sections into one single section
 * - Ensures arrays/strings exist
 * - Ensures skills in `items` are moved to `categories` if needed
 */
export function hydrateSectionIds(llmResume: z.infer<typeof resumeLlmSchema>): Resume {
  const sections: ResumeSection[] = [];
  let consolidatedSkills: ResumeSection | null = null;

  for (const rawSec of llmResume.sections || []) {
    if (!rawSec.title) continue;

    const sec: ResumeSection = {
      id: rawSec.id || nanoid(),
      title: rawSec.title.trim(),
      type: rawSec.type || "bullet_list",
      content: rawSec.content || "",
      categories: (rawSec.categories || []).filter((c) => c && c.items && c.items.length > 0),
      items: rawSec.items || [],
      entries: (rawSec.entries || []).map((entry) => ({
        heading: entry.heading || "",
        subheading: entry.subheading || "",
        dateRange: entry.dateRange || "",
        location: entry.location || "",
        bullets: entry.bullets || [],
      })),
    };

    // If section is skills, ensure categories exist
    if (sec.type === "skills") {
      if (sec.categories.length === 0 && sec.items.length > 0) {
        sec.categories = [{ label: "Skills", items: [...sec.items] }];
      }
      // If we already have a skills section, merge this into the existing one
      if (consolidatedSkills) {
        for (const cat of sec.categories) {
          const existingCat = consolidatedSkills.categories.find(
            (c) => c.label.toLowerCase() === cat.label.toLowerCase()
          );
          if (existingCat) {
            const set = new Set([...existingCat.items, ...cat.items]);
            existingCat.items = [...set];
          } else {
            consolidatedSkills.categories.push(cat);
          }
        }
        continue;
      } else {
        consolidatedSkills = sec;
        sections.push(sec);
        continue;
      }
    }

    sections.push(sec);
  }

  return {
    contact: {
      name: llmResume.contact?.name || "Your Name",
      address: llmResume.contact?.address || "",
      phone: llmResume.contact?.phone || "",
      email: llmResume.contact?.email || "",
      linkedin: llmResume.contact?.linkedin || "",
      github: llmResume.contact?.github || "",
    },
    sections,
  };
}

/** Filter sections that have bullet entries (bullet_list or projects) */
export function bulletSections(resume: Resume): (BulletListSection | ProjectsSection)[] {
  return resume.sections.filter(
    (s): s is BulletListSection | ProjectsSection =>
      s.type === "bullet_list" || s.type === "projects"
  );
}

/** Filter text sections */
export function textSections(resume: Resume): TextSection[] {
  return resume.sections.filter((s): s is TextSection => s.type === "text");
}

/** Filter simple list sections */
export function simpleListSections(resume: Resume): SimpleListSection[] {
  return resume.sections.filter(
    (s): s is SimpleListSection => s.type === "simple_list"
  );
}
