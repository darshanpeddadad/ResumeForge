import type { Resume, ResumeSection, BulletEntry } from "@/lib/schemas/resume";
import { parseContactUrl } from "@/lib/contact-links";

function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/[&%$#_{}]/g, (char) => `\\${char}`)
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}")
    .replace(/\*\*([^*]+)\*\*/g, "\\textbf{$1}");
}

function renderContactSection(contact: Resume["contact"]): string {
  const lines: string[] = [];

  lines.push("\\begin{center}");
  lines.push(
    "    {\\Huge \\scshape " + escapeLatex(contact.name) + "} \\\\ \\vspace{1pt}"
  );

  if (contact.address) {
    lines.push(
      "    " + escapeLatex(contact.address) + " \\\\ \\vspace{1pt}"
    );
  }

  const contactParts: string[] = [];
  if (contact.phone) {
    contactParts.push(
      "\\small \\raisebox{-0.1\\height}\\Telefon\\ " + escapeLatex(contact.phone)
    );
  }
  if (contact.email) {
    contactParts.push(
      "\\href{mailto:" + contact.email + "}{\\raisebox{-0.2\\height}\\Letter\\  \\uline{" + escapeLatex(contact.email) + "}}"
    );
  }

  const parsedLinkedin = parseContactUrl(contact.linkedin || "", "linkedin");
  if (parsedLinkedin.url) {
    contactParts.push(
      "\\href{" + parsedLinkedin.url + "}{\\uline{" + escapeLatex(parsedLinkedin.display) + "}}"
    );
  }

  const parsedGithub = parseContactUrl(contact.github || "", "github");
  if (parsedGithub.url) {
    contactParts.push(
      "\\href{" + parsedGithub.url + "}{\\uline{" + escapeLatex(parsedGithub.display) + "}}"
    );
  }

  if (contactParts.length > 0) {
    lines.push("    " + contactParts.join(" ~ "));
  }

  lines.push("    \\vspace{-8pt}");
  lines.push("\\end{center}");

  return lines.join("\n");
}

function renderSection(section: ResumeSection): string {
  switch (section.type) {
    case "bullet_list":
      return renderBulletListSection(section.title, section.entries);
    case "projects":
      return renderProjectsSection(section.title, section.entries);
    case "skills":
      return renderSkillsSection(section.title, section.categories);
    case "simple_list":
      return renderSimpleListSection(section.title, section.items);
    case "text":
      return renderTextSection(section.title, section.content);
    default:
      return "";
  }
}

function renderBulletListSection(
  title: string,
  entries: BulletEntry[]
): string {
  if (!entries || entries.length === 0) return "";

  const sectionLabel = title.toUpperCase().replace(/ /g, "-");
  const lines: string[] = [];

  lines.push(`%-----------${sectionLabel}-----------`);
  lines.push(`\\section{${escapeLatex(title)}}`);
  lines.push("  \\resumeSubHeadingListStart");

  for (const entry of entries as Array<{ heading: string; subheading: string; dateRange: string; location?: string; bullets: string[] }>) {
    lines.push("    \\resumeSubheading");
    lines.push(
      "      {" + escapeLatex(entry.heading) + "}{" + escapeLatex(entry.dateRange) + "}"
    );
    lines.push(
      "      {" + escapeLatex(entry.subheading) + "}{" + (entry.location ? escapeLatex(entry.location) : "") + "}"
    );
    lines.push("      \\resumeItemListStart");

    for (const bullet of entry.bullets) {
      lines.push("        \\resumeItem{" + escapeLatex(bullet) + "}");
    }

    lines.push("    \\resumeItemListEnd");
  }

  lines.push("  \\resumeSubHeadingListEnd");
  lines.push("\\vspace{-6pt}");

  return lines.join("\n");
}

function renderProjectsSection(
  title: string,
  entries: BulletEntry[]
): string {
  if (!entries || entries.length === 0) return "";

  const lines: string[] = [];

  lines.push(`%-----------${title.toUpperCase().replace(/ /g, "-")}-----------`);
  lines.push(`\\section{${escapeLatex(title)}}`);
  lines.push("    \\vspace{-5pt}");
  lines.push("    \\resumeSubHeadingListStart");

  for (const entry of entries as Array<{ heading: string; subheading: string; dateRange: string; bullets: string[] }>) {
    const techPart = entry.subheading
      ? " $|$ \\emph{" + escapeLatex(entry.subheading) + "}"
      : "";
    const datePart = entry.dateRange
      ? "{" + escapeLatex(entry.dateRange) + "}"
      : "{}";

    lines.push("      \\resumeProjectHeading");
    lines.push(
      "          {\\textbf{" + escapeLatex(entry.heading) + "}" + techPart + "}" + datePart
    );
    lines.push("          \\resumeItemListStart");

    for (const bullet of entry.bullets) {
      lines.push("            \\resumeItem{" + escapeLatex(bullet) + "}");
    }

    lines.push("          \\resumeItemListEnd");
    lines.push("          \\vspace{-7pt}");
  }

  lines.push("    \\resumeSubHeadingListEnd");
  lines.push("\\vspace{3pt}");

  return lines.join("\n");
}

function renderSkillsSection(
  title: string,
  categories: Array<{ label: string; items: string[] }>
): string {
  if (!categories || categories.length === 0) return "";

  const lines: string[] = [];

  lines.push(`%-----------${title.toUpperCase().replace(/ /g, "-")}-----------`);
  lines.push(`\\section{${escapeLatex(title)}}`);
  lines.push(" \\begin{itemize}[leftmargin=0.15in, label={}]");
  lines.push("    \\small{\\item{");

  for (const cat of categories) {
    if (cat.items.length > 0) {
      lines.push(
        "     \\textbf{" + escapeLatex(cat.label) + "}{: " + escapeLatex(cat.items.join(", ")) + "} \\\\"
      );
    }
  }

  lines.push("    }}");
  lines.push(" \\end{itemize}");
  lines.push(" \\vspace{-16pt}");

  return lines.join("\n");
}

function renderSimpleListSection(title: string, items: string[]): string {
  if (!items || items.length === 0) return "";

  const lines: string[] = [];

  lines.push(`%------${title.toUpperCase().replace(/ /g, "-")}-------`);
  lines.push(`\\section{${escapeLatex(title)}}`);
  lines.push("        \\begin{multicols}{4}");
  lines.push("            \\begin{itemize}[itemsep=-5pt, parsep=3pt]");

  for (const item of items) {
    lines.push("                \\item\\small " + escapeLatex(item));
  }

  lines.push("            \\end{itemize}");
  lines.push("        \\end{multicols}");
  lines.push("        \\vspace*{2.0\\multicolsep}");

  return lines.join("\n");
}

function renderTextSection(title: string, content: string): string {
  if (!content) return "";

  const lines: string[] = [];

  lines.push(`%-----------${title.toUpperCase().replace(/ /g, "-")}-----------`);
  lines.push(`\\section{${escapeLatex(title)}}`);
  lines.push("  \\small{" + escapeLatex(content) + "}");

  return lines.join("\n");
}

const PREAMBLE = [
  "%-------------------------",
  "% Resume in Latex",
  "% Author : Generated by ResumeForge",
  "% License : MIT",
  "%------------------------",
  "",
  "\\documentclass[letterpaper,11pt]{article}",
  "",
  "\\usepackage{latexsym}",
  "\\usepackage[empty]{fullpage}",
  "\\usepackage{titlesec}",
  "\\usepackage{marvosym}",
  "\\usepackage[usenames,dvipsnames]{color}",
  "\\usepackage{verbatim}",
  "\\usepackage{enumitem}",
  "\\usepackage[hidelinks]{hyperref}",
  "\\usepackage{fancyhdr}",
  "\\usepackage[english]{babel}",
  "\\usepackage{tabularx}",
  "\\usepackage[normalem]{ulem}",
  "\\usepackage{iftex}",
  "\\usepackage{multicol}",
  "\\setlength{\\multicolsep}{-3.0pt}",
  "\\setlength{\\columnsep}{-1pt}",
  "\\ifPDFTeX",
  "  \\input{glyphtounicode}",
  "  \\pdfgentounicode=1",
  "\\fi",
  "",
  "\\pagestyle{fancy}",
  "\\fancyhf{} % clear all header and footer fields",
  "\\fancyfoot{}",
  "\\renewcommand{\\headrulewidth}{0pt}",
  "\\renewcommand{\\footrulewidth}{0pt}",
  "",
  "% Adjust margins",
  "\\addtolength{\\oddsidemargin}{-0.6in}",
  "\\addtolength{\\evensidemargin}{-0.5in}",
  "\\addtolength{\\textwidth}{1.19in}",
  "\\addtolength{\\topmargin}{-.7in}",
  "\\addtolength{\\textheight}{1.4in}",
  "",
  "\\urlstyle{same}",
  "",
  "\\raggedbottom",
  "\\raggedright",
  "\\setlength{\\tabcolsep}{0in}",
  "",
  "% Sections formatting",
  "\\titleformat{\\section}{",
  "  \\vspace{-4pt}\\scshape\\raggedright\\large\\bfseries",
  "}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]",
  "",
  "%-------------------------",
  "% Custom commands",
  "\\newcommand{\\resumeItem}[1]{",
  "  \\item\\small{",
  "    {#1 \\vspace{-2pt}}",
  "  }",
  "}",
  "",
  "\\newcommand{\\classesList}[4]{",
  "    \\item\\small{",
  "        {#1 #2 #3 #4 \\vspace{-2pt}}",
  "  }",
  "}",
  "",
  "\\newcommand{\\resumeSubheading}[4]{",
  "  \\vspace{-2pt}\\item",
  "    \\begin{tabular*}{1.0\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}",
  "      \\textbf{#1} & \\textbf{\\small #2} \\\\",
  "      \\textit{\\small#3} & \\textit{\\small #4} \\\\",
  "    \\end{tabular*}\\vspace{-7pt}",
  "}",
  "",
  "\\newcommand{\\resumeSubSubheading}[2]{",
  "    \\item",
  "    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}",
  "      \\textit{\\small#1} & \\textit{\\small #2} \\\\",
  "    \\end{tabular*}\\vspace{-7pt}",
  "}",
  "",
  "\\newcommand{\\resumeProjectHeading}[2]{",
  "    \\item",
  "    \\begin{tabular*}{1.001\\textwidth}{l@{\\extracolsep{\\fill}}r}",
  "      \\small#1 & \\textbf{\\small #2}\\\\",
  "    \\end{tabular*}\\vspace{-7pt}",
  "}",
  "",
  "\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}",
  "",
  "\\renewcommand\\labelitemi{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}",
  "\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}",
  "",
  "\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.0in, label={}]}",
  "\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}",
  "\\newcommand{\\resumeItemListStart}{\\begin{itemize}}",
  "\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}",
  "",
  "%-------------------------------------------",
  "%%%%%%  RESUME STARTS HERE  %%%%%%%%%%%%%%%%%%%%%%%%%%%%",
  "",
  "",
  "\\begin{document}",
].join("\n");

export function generateLatex(resume: Resume): string {
  const parts: string[] = [PREAMBLE, renderContactSection(resume.contact)];

  for (const section of resume.sections) {
    const rendered = renderSection(section);
    if (rendered) parts.push(rendered);
  }

  parts.push("\\end{document}");
  return parts.join("\n\n");
}
