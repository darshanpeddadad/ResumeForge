import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  TabStopType,
  TabStopPosition,
} from "docx";
import type { Resume, ResumeSection } from "@/lib/schemas/resume";
import { parseContactUrl } from "@/lib/contact-links";

const RIGHT_TAB = 10800; // right margin tab stop for 0.5in margins

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseFormattedRuns(
  text: string,
  baseOptions: { size?: number; italics?: boolean } = {}
): TextRun[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return new TextRun({
          text: part.slice(2, -2),
          bold: true,
          font: "Times New Roman",
          size: baseOptions.size || 20,
          italics: baseOptions.italics,
        });
      }
      return new TextRun({
        text: part,
        bold: false,
        font: "Times New Roman",
        size: baseOptions.size || 20,
        italics: baseOptions.italics,
      });
    });
}

function createSectionHeading(title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 140, after: 60 },
    border: {
      bottom: {
        color: "000000",
        space: 2,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
    children: [
      new TextRun({
        text: title.toUpperCase(),
        bold: true,
        font: "Times New Roman",
        size: 22, // 11pt
      }),
    ],
  });
}

// ─── Section renderers ────────────────────────────────────────────────────────

function renderSectionDocx(section: ResumeSection): Paragraph[] {
  switch (section.type) {
    case "bullet_list":
      return renderBulletListDocx(section.title, section.entries);
    case "projects":
      return renderProjectsDocx(section.title, section.entries);
    case "skills":
      return renderSkillsDocx(section.title, section.categories);
    case "simple_list":
      return renderSimpleListDocx(section.title, section.items);
    case "text":
      return renderTextDocx(section.title, section.content);
    default:
      return [];
  }
}

function renderBulletListDocx(
  title: string,
  entries: Array<{ heading: string; subheading: string; dateRange: string; location?: string; bullets: string[] }>
): Paragraph[] {
  if (!entries || entries.length === 0) return [];
  const paragraphs: Paragraph[] = [createSectionHeading(title)];

  for (const entry of entries) {
    paragraphs.push(
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
        spacing: { before: 60, after: 20 },
        children: [
          new TextRun({ text: entry.heading, bold: true, font: "Times New Roman", size: 20 }),
          new TextRun({ text: `\t${entry.dateRange}`, bold: true, font: "Times New Roman", size: 20 }),
        ],
      }),
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
        spacing: { after: 40 },
        children: [
          new TextRun({ text: entry.subheading, italics: true, font: "Times New Roman", size: 19 }),
          new TextRun({ text: entry.location ? `\t${entry.location}` : "", italics: true, font: "Times New Roman", size: 19 }),
        ],
      })
    );
    for (const bullet of entry.bullets) {
      paragraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: 20, after: 30 },
          children: parseFormattedRuns(bullet, { size: 20 }),
        })
      );
    }
  }
  return paragraphs;
}

function renderProjectsDocx(
  title: string,
  entries: Array<{ heading: string; subheading: string; dateRange: string; bullets: string[] }>
): Paragraph[] {
  if (!entries || entries.length === 0) return [];
  const paragraphs: Paragraph[] = [createSectionHeading(title)];

  for (const entry of entries) {
    const headerRuns: TextRun[] = [
      new TextRun({ text: entry.heading, bold: true, font: "Times New Roman", size: 20 }),
    ];
    if (entry.subheading) {
      headerRuns.push(
        new TextRun({ text: ` | ${entry.subheading}`, italics: true, font: "Times New Roman", size: 19 })
      );
    }
    if (entry.dateRange) {
      headerRuns.push(
        new TextRun({ text: `\t${entry.dateRange}`, font: "Times New Roman", size: 20 })
      );
    }
    paragraphs.push(
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
        spacing: { before: 60, after: 30 },
        children: headerRuns,
      })
    );
    for (const bullet of entry.bullets) {
      paragraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: 20, after: 30 },
          children: parseFormattedRuns(bullet, { size: 20 }),
        })
      );
    }
  }
  return paragraphs;
}

function renderSkillsDocx(
  title: string,
  categories: Array<{ label: string; items: string[] }>
): Paragraph[] {
  if (!categories || categories.length === 0) return [];
  const paragraphs: Paragraph[] = [createSectionHeading(title)];

  for (const cat of categories) {
    if (cat.items.length === 0) continue;
    paragraphs.push(
      new Paragraph({
        spacing: { before: 30, after: 20 },
        children: [
          new TextRun({ text: `${cat.label}: `, bold: true, font: "Times New Roman", size: 20 }),
          new TextRun({ text: cat.items.join(", "), font: "Times New Roman", size: 20 }),
        ],
      })
    );
  }
  return paragraphs;
}

function renderSimpleListDocx(title: string, items: string[]): Paragraph[] {
  if (!items || items.length === 0) return [];
  const isDescriptive = items.some((item) => item.length > 25);
  if (isDescriptive) {
    const paragraphs: Paragraph[] = [createSectionHeading(title)];
    for (const item of items) {
      paragraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: 20, after: 20 },
          children: parseFormattedRuns(item, { size: 20 }),
        })
      );
    }
    return paragraphs;
  }
  return [
    createSectionHeading(title),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: items.join(", "), font: "Times New Roman", size: 20 }),
      ],
    }),
  ];
}

function renderTextDocx(title: string, content: string): Paragraph[] {
  if (!content) return [];
  return [
    createSectionHeading(title),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: content, font: "Times New Roman", size: 20 }),
      ],
    }),
  ];
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateResumeDocx(resume: Resume): Promise<Blob> {
  const children: Paragraph[] = [];

  // ─── Header / Contact ───
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: resume.contact.name,
          bold: true,
          font: "Times New Roman",
          size: 40, // 20pt
        }),
      ],
    })
  );

  if (resume.contact.address) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 30 },
        children: [
          new TextRun({ text: resume.contact.address, font: "Times New Roman", size: 19 }),
        ],
      })
    );
  }

  const contactParts: string[] = [];
  if (resume.contact.phone) contactParts.push(resume.contact.phone);
  if (resume.contact.email) contactParts.push(resume.contact.email);

  const linkedin = parseContactUrl(resume.contact.linkedin || "", "linkedin");
  if (linkedin.display) contactParts.push(linkedin.display);

  const github = parseContactUrl(resume.contact.github || "", "github");
  if (github.display) contactParts.push(github.display);

  if (contactParts.length > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [
          new TextRun({ text: contactParts.join("  ~  "), font: "Times New Roman", size: 19 }),
        ],
      })
    );
  }

  // ─── Dynamic sections in array order ───
  for (const section of resume.sections) {
    const rendered = renderSectionDocx(section);
    children.push(...rendered);
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

// ─── Cover letter (unchanged) ─────────────────────────────────────────────────

export async function generateCoverLetterDocx(
  text: string,
  title?: string
): Promise<Blob> {
  const paragraphs = text.split("\n\n").filter((p) => p.trim().length > 0);
  const children: Paragraph[] = [];

  if (title) {
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: title, bold: true, font: "Times New Roman", size: 24 })],
      })
    );
  }

  for (const para of paragraphs) {
    children.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text: para.trim(), font: "Times New Roman", size: 22 })],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
