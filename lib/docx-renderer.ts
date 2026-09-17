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
import type { Resume } from "@/lib/schemas/resume";
import { parseContactUrl } from "@/lib/contact-links";

// Helper to parse double asterisk bolding into TextRuns
function parseFormattedRuns(text: string, baseOptions: { size?: number; italics?: boolean } = {}): TextRun[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return new TextRun({
          text: part.slice(2, -2),
          bold: true,
          font: "Times New Roman",
          size: baseOptions.size || 20, // 10pt
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

export async function generateResumeDocx(resume: Resume): Promise<Blob> {
  const children: Paragraph[] = [];
  const rightTabPosition = 10800; // Right margin tab stop for 0.5 in margins

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
          new TextRun({
            text: resume.contact.address,
            font: "Times New Roman",
            size: 19,
          }),
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
          new TextRun({
            text: contactParts.join("  ~  "),
            font: "Times New Roman",
            size: 19,
          }),
        ],
      })
    );
  }

  // ─── Education ───
  if (resume.education && resume.education.length > 0) {
    children.push(createSectionHeading("Education"));
    for (const edu of resume.education) {
      children.push(
        new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: rightTabPosition }],
          spacing: { before: 40, after: 20 },
          children: [
            new TextRun({
              text: edu.institution,
              bold: true,
              font: "Times New Roman",
              size: 20,
            }),
            new TextRun({
              text: `\t${edu.dateRange}`,
              bold: true,
              font: "Times New Roman",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: rightTabPosition }],
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: edu.degree,
              italics: true,
              font: "Times New Roman",
              size: 19,
            }),
            new TextRun({
              text: edu.location ? `\t${edu.location}` : "",
              italics: true,
              font: "Times New Roman",
              size: 19,
            }),
          ],
        })
      );
    }
  }

  // ─── Relevant Coursework ───
  if (resume.relevantCoursework && resume.relevantCoursework.length > 0) {
    children.push(createSectionHeading("Relevant Coursework"));
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: resume.relevantCoursework.join(", "),
            font: "Times New Roman",
            size: 20,
          }),
        ],
      })
    );
  }

  // ─── Experience ───
  if (resume.experience && resume.experience.length > 0) {
    children.push(createSectionHeading("Experience"));
    for (const exp of resume.experience) {
      children.push(
        new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: rightTabPosition }],
          spacing: { before: 60, after: 20 },
          children: [
            new TextRun({
              text: exp.company,
              bold: true,
              font: "Times New Roman",
              size: 20,
            }),
            new TextRun({
              text: `\t${exp.dateRange}`,
              bold: true,
              font: "Times New Roman",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: rightTabPosition }],
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: exp.position,
              italics: true,
              font: "Times New Roman",
              size: 19,
            }),
            new TextRun({
              text: exp.location ? `\t${exp.location}` : "",
              italics: true,
              font: "Times New Roman",
              size: 19,
            }),
          ],
        })
      );

      for (const bullet of exp.bulletPoints) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { before: 20, after: 30 },
            children: parseFormattedRuns(bullet, { size: 20 }),
          })
        );
      }
    }
  }

  // ─── Projects ───
  if (resume.projects && resume.projects.length > 0) {
    children.push(createSectionHeading("Projects"));
    for (const proj of resume.projects) {
      const projHeaderRuns: TextRun[] = [
        new TextRun({
          text: proj.name,
          bold: true,
          font: "Times New Roman",
          size: 20,
        }),
      ];
      if (proj.technologies) {
        projHeaderRuns.push(
          new TextRun({
            text: ` | ${proj.technologies}`,
            italics: true,
            font: "Times New Roman",
            size: 19,
          })
        );
      }
      if (proj.date) {
        projHeaderRuns.push(
          new TextRun({
            text: `\t${proj.date}`,
            font: "Times New Roman",
            size: 20,
          })
        );
      }

      children.push(
        new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: rightTabPosition }],
          spacing: { before: 60, after: 30 },
          children: projHeaderRuns,
        })
      );

      for (const bullet of proj.bulletPoints) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { before: 20, after: 30 },
            children: parseFormattedRuns(bullet, { size: 20 }),
          })
        );
      }
    }
  }

  // ─── Technical Skills ───
  if (resume.technicalSkills) {
    children.push(createSectionHeading("Technical Skills"));
    const { languages, developerTools, technologiesFrameworks } = resume.technicalSkills;

    if (languages && languages.length > 0) {
      children.push(
        new Paragraph({
          spacing: { before: 30, after: 20 },
          children: [
            new TextRun({ text: "Languages: ", bold: true, font: "Times New Roman", size: 20 }),
            new TextRun({ text: languages.join(", "), font: "Times New Roman", size: 20 }),
          ],
        })
      );
    }
    if (developerTools && developerTools.length > 0) {
      children.push(
        new Paragraph({
          spacing: { before: 20, after: 20 },
          children: [
            new TextRun({ text: "Developer Tools: ", bold: true, font: "Times New Roman", size: 20 }),
            new TextRun({ text: developerTools.join(", "), font: "Times New Roman", size: 20 }),
          ],
        })
      );
    }
    if (technologiesFrameworks && technologiesFrameworks.length > 0) {
      children.push(
        new Paragraph({
          spacing: { before: 20, after: 40 },
          children: [
            new TextRun({ text: "Technologies / Frameworks: ", bold: true, font: "Times New Roman", size: 20 }),
            new TextRun({ text: technologiesFrameworks.join(", "), font: "Times New Roman", size: 20 }),
          ],
        })
      );
    }
  }

  // ─── Leadership / Extracurricular ───
  if (resume.leadership && resume.leadership.length > 0) {
    children.push(createSectionHeading("Leadership / Extracurricular"));
    for (const lead of resume.leadership) {
      children.push(
        new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: rightTabPosition }],
          spacing: { before: 60, after: 20 },
          children: [
            new TextRun({
              text: lead.organization,
              bold: true,
              font: "Times New Roman",
              size: 20,
            }),
            new TextRun({
              text: `\t${lead.dateRange}`,
              bold: true,
              font: "Times New Roman",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: rightTabPosition }],
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: lead.position,
              italics: true,
              font: "Times New Roman",
              size: 19,
            }),
            new TextRun({
              text: lead.location ? `\t${lead.location}` : "",
              italics: true,
              font: "Times New Roman",
              size: 19,
            }),
          ],
        })
      );

      for (const bullet of lead.bulletPoints) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { before: 20, after: 30 },
            children: parseFormattedRuns(bullet, { size: 20 }),
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 in
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

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
        children: [
          new TextRun({
            text: title,
            bold: true,
            font: "Times New Roman",
            size: 24,
          }),
        ],
      })
    );
  }

  for (const para of paragraphs) {
    children.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({
            text: para.trim(),
            font: "Times New Roman",
            size: 22, // 11pt
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 in
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
