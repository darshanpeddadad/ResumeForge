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
  summary: z.string().optional().default("").describe("Professional 2-3 sentence technical summary tailored to the target role"),
  skills: z.array(skillCategorySchema).describe("Consolidated technical skill categories (Languages, Cloud & DevOps, Frameworks, Databases, Developer Tools)"),
  experience: z.array(bulletEntrySchema).describe("Work experience roles with Google XYZ achievement bullets"),
  education: z.array(bulletEntrySchema).describe("Degrees, universities, dates, GPA/honors"),
  projects: z.array(bulletEntrySchema).describe("Notable projects with tech stack and achievement bullets"),
  certifications: z.array(z.string()).optional().default([]).describe("ALL certifications, licenses, and professional credentials (e.g. AWS, CKA, GCP, Azure, Cisco). NEVER omit if present in source text."),
  awards: z.array(z.string()).optional().default([]).describe("ALL awards, honors, hackathons, scholarships, Dean's List, recognitions. NEVER omit if present in source text."),
  publications: z.array(bulletEntrySchema).optional().default([]).describe("Publications, research papers, or patents if present in source text"),
  volunteerLeadership: z.array(bulletEntrySchema).optional().default([]).describe("Leadership, volunteering, open-source maintainer, or extracurricular roles"),
  additionalSections: z.array(z.object({
    title: z.string().describe("Section heading e.g. Languages, Speaking, Interests"),
    items: z.array(z.string()).describe("List of items in this section"),
  })).optional().default([]).describe("Any other sections present in source text"),
  sectionOrder: z.array(z.string()).optional().default([]).describe("ATS section ordering for populated sections, e.g. ['summary', 'skills', 'experience', 'projects', 'education', 'certifications', 'awards']"),
  sections: z.array(resumeSectionSchema).optional().default([]).describe("Fallback section list for backward compatibility"),
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
  aiChanges: aiChangesSchema.optional(),
});

export type AiChanges = z.infer<typeof aiChangesSchema>;
export type ParseResultLlm = z.infer<typeof parseResultLlmSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalizes sections from LLM output:
 * - Maps semantic anchors (experience, skills, certifications, awards, etc.) into structured ResumeSections
 * - Guarantees ZERO MISSED SECTIONS from candidate data
 * - Respects ATS sectionOrder
 */
export function hydrateSectionIds(llmResume: z.infer<typeof resumeLlmSchema>): Resume {
  // Backward compatibility fallback if LLM returned generic sections array only
  if (
    llmResume.sections &&
    llmResume.sections.length > 0 &&
    (!llmResume.experience || llmResume.experience.length === 0)
  ) {
    const sections: ResumeSection[] = [];
    for (const rawSec of llmResume.sections) {
      if (!rawSec.title) continue;
      sections.push({
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
      });
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

  // ─── Semantic Anchors to ResumeSection mapping (Guaranteed Zero-Omission) ───
  const sectionMap: Record<string, ResumeSection> = {};

  if (llmResume.summary && llmResume.summary.trim()) {
    sectionMap["summary"] = {
      id: nanoid(),
      title: "Professional Summary",
      type: "text",
      content: llmResume.summary.trim(),
      categories: [],
      items: [],
      entries: [],
    };
  }

  if (llmResume.skills && llmResume.skills.length > 0) {
    const validSkills = llmResume.skills.filter((c) => c && c.items && c.items.length > 0);
    if (validSkills.length > 0) {
      sectionMap["skills"] = {
        id: nanoid(),
        title: "Technical Skills",
        type: "skills",
        content: "",
        categories: validSkills,
        items: [],
        entries: [],
      };
    }
  }

  if (llmResume.experience && llmResume.experience.length > 0) {
    sectionMap["experience"] = {
      id: nanoid(),
      title: "Work Experience",
      type: "bullet_list",
      content: "",
      categories: [],
      items: [],
      entries: llmResume.experience.map((e) => ({
        heading: e.heading || "",
        subheading: e.subheading || "",
        dateRange: e.dateRange || "",
        location: e.location || "",
        bullets: e.bullets || [],
      })),
    };
  }

  if (llmResume.projects && llmResume.projects.length > 0) {
    sectionMap["projects"] = {
      id: nanoid(),
      title: "Projects",
      type: "projects",
      content: "",
      categories: [],
      items: [],
      entries: llmResume.projects.map((e) => ({
        heading: e.heading || "",
        subheading: e.subheading || "",
        dateRange: e.dateRange || "",
        location: e.location || "",
        bullets: e.bullets || [],
      })),
    };
  }

  if (llmResume.education && llmResume.education.length > 0) {
    sectionMap["education"] = {
      id: nanoid(),
      title: "Education",
      type: "bullet_list",
      content: "",
      categories: [],
      items: [],
      entries: llmResume.education.map((e) => ({
        heading: e.heading || "",
        subheading: e.subheading || "",
        dateRange: e.dateRange || "",
        location: e.location || "",
        bullets: e.bullets || [],
      })),
    };
  }

  if (llmResume.certifications && llmResume.certifications.length > 0) {
    const validCerts = llmResume.certifications.filter((c) => c && c.trim().length > 0);
    if (validCerts.length > 0) {
      sectionMap["certifications"] = {
        id: nanoid(),
        title: "Certifications",
        type: "simple_list",
        content: "",
        categories: [],
        items: validCerts,
        entries: [],
      };
    }
  }

  if (llmResume.awards && llmResume.awards.length > 0) {
    const validAwards = llmResume.awards.filter((a) => a && a.trim().length > 0);
    if (validAwards.length > 0) {
      sectionMap["awards"] = {
        id: nanoid(),
        title: "Awards & Honors",
        type: "simple_list",
        content: "",
        categories: [],
        items: validAwards,
        entries: [],
      };
    }
  }

  if (llmResume.publications && llmResume.publications.length > 0) {
    sectionMap["publications"] = {
      id: nanoid(),
      title: "Publications & Research",
      type: "projects",
      content: "",
      categories: [],
      items: [],
      entries: llmResume.publications.map((e) => ({
        heading: e.heading || "",
        subheading: e.subheading || "",
        dateRange: e.dateRange || "",
        location: e.location || "",
        bullets: e.bullets || [],
      })),
    };
  }

  if (llmResume.volunteerLeadership && llmResume.volunteerLeadership.length > 0) {
    sectionMap["leadership"] = {
      id: nanoid(),
      title: "Leadership & Volunteering",
      type: "bullet_list",
      content: "",
      categories: [],
      items: [],
      entries: llmResume.volunteerLeadership.map((e) => ({
        heading: e.heading || "",
        subheading: e.subheading || "",
        dateRange: e.dateRange || "",
        location: e.location || "",
        bullets: e.bullets || [],
      })),
    };
  }

  // Handle custom additional sections from source
  const customSections: ResumeSection[] = (llmResume.additionalSections || [])
    .filter((s) => s.title && s.items && s.items.length > 0)
    .map((s) => ({
      id: nanoid(),
      title: s.title.trim(),
      type: "simple_list" as const,
      content: "",
      categories: [],
      items: s.items,
      entries: [],
    }));

  // Build final ordered list according to sectionOrder (or default ATS order)
  const defaultOrder = [
    "summary",
    "skills",
    "experience",
    "projects",
    "education",
    "certifications",
    "awards",
    "publications",
    "leadership",
  ];

  const order = (llmResume.sectionOrder && llmResume.sectionOrder.length > 0)
    ? llmResume.sectionOrder
    : defaultOrder;

  const sections: ResumeSection[] = [];
  const placed = new Set<string>();

  for (const key of order) {
    const normKey = key.toLowerCase().replace(/[^a-z]/g, "");
    const mapKey = Object.keys(sectionMap).find((k) =>
      normKey.includes(k) || k.includes(normKey)
    );
    if (mapKey && sectionMap[mapKey] && !placed.has(mapKey)) {
      sections.push(sectionMap[mapKey]);
      placed.add(mapKey);
    }
  }

  // Add any remaining populated sections that were not listed in sectionOrder
  for (const [key, sec] of Object.entries(sectionMap)) {
    if (!placed.has(key)) {
      sections.push(sec);
      placed.add(key);
    }
  }

  // Append custom sections
  for (const custom of customSections) {
    sections.push(custom);
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
