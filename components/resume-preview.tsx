"use client"

import type { Resume, ResumeSection, BulletEntry } from "@/lib/schemas/resume"
import { parseContactUrl } from "@/lib/contact-links"
import { hasHighlights, type Highlights, type EntryHighlights } from "@/lib/highlights"

interface ResumePreviewProps {
  resume: Resume
  highlights?: Highlights | null
}

const EMPTY_ENTRY: EntryHighlights = { added: [], tailored: [], jd: {} }

const ADDED_STYLE: React.CSSProperties = {
  backgroundColor: "rgba(245, 158, 11, 0.22)",
  borderLeft: "3px solid #d97706",
  paddingLeft: "4px",
}

const TAILORED_STYLE: React.CSSProperties = {
  backgroundColor: "rgba(59, 130, 246, 0.10)",
}

const ADDED_CHIP_STYLE: React.CSSProperties = {
  backgroundColor: "rgba(245, 158, 11, 0.22)",
  borderBottom: "2px solid #d97706",
  padding: "0 2px",
}

export function ResumePreview({ resume, highlights }: ResumePreviewProps) {
  const { contact, sections } = resume

  const parsedLinkedin = parseContactUrl(contact.linkedin || "", "linkedin")
  const parsedGithub = parseContactUrl(contact.github || "", "github")

  const showLegend = highlights ? hasHighlights(highlights) : false
  const addedSkillItems = new Set(highlights?.addedSkillItems ?? [])
  const addedListItems = new Set(highlights?.addedListItems ?? [])
  const addedSectionTitles = new Set(highlights?.addedSections ?? [])

  return (
    <div
      id="resume-preview"
      style={{
        backgroundColor: "#ffffff",
        color: "#000000",
        padding: "40px 48px",
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "11px",
        lineHeight: "1.4",
        width: "8.5in",
        minHeight: "11in",
        margin: "0 auto",
      }}
    >
      {showLegend && <HighlightLegend />}

      {/* Header / Contact */}
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "bold", letterSpacing: "0.05em", margin: 0 }}>
          {contact.name}
        </h1>
        {contact.address && (
          <p style={{ fontSize: "10px", marginTop: "2px" }}>{contact.address}</p>
        )}
        <p style={{ fontSize: "10px", marginTop: "2px" }}>
          {contact.phone && <span>{contact.phone}</span>}
          {contact.phone && contact.email && <span> ~ </span>}
          {contact.email && <span>{contact.email}</span>}
          {contact.email && parsedLinkedin.display && <span> ~ </span>}
          {parsedLinkedin.display && <span>{parsedLinkedin.display}</span>}
          {parsedLinkedin.display && parsedGithub.display && <span> ~ </span>}
          {parsedGithub.display && <span>{parsedGithub.display}</span>}
        </p>
      </div>

      {/* Dynamic sections — rendered in array order */}
      {sections.map((section) => (
        <SectionBlock
          key={section.id}
          section={section}
          highlights={highlights}
          addedSkillItems={addedSkillItems}
          addedListItems={addedListItems}
          addedSectionTitles={addedSectionTitles}
        />
      ))}
    </div>
  )
}

// ─── Section dispatcher ───────────────────────────────────────────────────────

function SectionBlock({
  section,
  highlights,
  addedSkillItems,
  addedListItems,
  addedSectionTitles,
}: {
  section: ResumeSection
  highlights?: Highlights | null
  addedSkillItems: Set<string>
  addedListItems: Set<string>
  addedSectionTitles: Set<string>
}) {
  const titleStyle: React.CSSProperties = addedSectionTitles.has(section.title)
    ? { ...ADDED_CHIP_STYLE, display: "inline-block" }
    : {}

  const sectionEntryHighlights = highlights?.bySectionTitle[section.title]
  const entryAt = (i: number): EntryHighlights =>
    sectionEntryHighlights?.[i] ?? EMPTY_ENTRY

  switch (section.type) {
    case "bullet_list": {
      if (!section.entries || section.entries.length === 0) return null;
      return (
        <Section title={section.title} titleStyle={titleStyle}>
          {section.entries.map((entry, i) => (
            <div key={i} style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                <span><RichText text={entry.heading} /></span>
                <span style={{ fontSize: "10px" }}>{entry.dateRange}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontStyle: "italic", fontSize: "10px" }}>
                <span><RichText text={entry.subheading} /></span>
                <span>{entry.location}</span>
              </div>
              {entry.bullets && entry.bullets.length > 0 && (
                <ul style={{ listStyleType: "disc", marginLeft: "16px", marginTop: "2px" }}>
                  {entry.bullets.map((bullet, j) => (
                    <BulletItem key={j} text={bullet} hl={entryAt(i)} bulletIndex={j} />
                  ))}
                </ul>
              )}
            </div>
          ))}
        </Section>
      );
    }

    case "projects": {
      if (!section.entries || section.entries.length === 0) return null;
      return (
        <Section title={section.title} titleStyle={titleStyle}>
          {section.entries.map((entry, i) => (
            <div key={i} style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>
                  <strong><RichText text={entry.heading} /></strong>
                  {entry.subheading && <em> | <RichText text={entry.subheading} /></em>}
                </span>
                <span style={{ fontSize: "10px" }}>{entry.dateRange}</span>
              </div>
              {entry.bullets && entry.bullets.length > 0 && (
                <ul style={{ listStyleType: "disc", marginLeft: "16px", marginTop: "2px" }}>
                  {entry.bullets.map((bullet, j) => (
                    <BulletItem key={j} text={bullet} hl={entryAt(i)} bulletIndex={j} />
                  ))}
                </ul>
              )}
            </div>
          ))}
        </Section>
      );
    }

    case "skills": {
      const validCategories = (section.categories || []).filter((c) => c && c.items && c.items.length > 0);
      const hasFlatItems = section.items && section.items.length > 0;
      if (validCategories.length === 0 && !hasFlatItems) return null;

      return (
        <Section title={section.title} titleStyle={titleStyle}>
          <div style={{ fontSize: "10px" }}>
            {validCategories.length > 0 ? (
              validCategories.map((cat, i) => (
                <p key={i} style={{ margin: "1px 0" }}>
                  <strong>{cat.label}:</strong>{" "}
                  <SkillTokens skills={cat.items} added={addedSkillItems} />
                </p>
              ))
            ) : (
              <p style={{ margin: "1px 0" }}>
                <SkillTokens skills={section.items || []} added={addedSkillItems} />
              </p>
            )}
          </div>
        </Section>
      );
    }

    case "simple_list": {
      if (!section.items || section.items.length === 0) return null;
      const isDescriptive = section.items.some((item) => item.length > 25);
      return (
        <Section title={section.title} titleStyle={titleStyle}>
          {isDescriptive ? (
            <ul style={{ listStyleType: "disc", marginLeft: "16px", marginTop: "2px", fontSize: "10px" }}>
              {section.items.map((item, i) => (
                <li key={i} style={{ marginBottom: "2px", ...(addedListItems.has(item) ? ADDED_CHIP_STYLE : {}) }}>
                  <RichText text={item} />
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px 8px", fontSize: "10px" }}>
              {section.items.map((item, i) => (
                <span key={i} style={addedListItems.has(item) ? ADDED_CHIP_STYLE : undefined}>
                  <RichText text={item} />
                </span>
              ))}
            </div>
          )}
        </Section>
      );
    }

    case "text": {
      if (!section.content || !section.content.trim()) return null;
      return (
        <Section title={section.title} titleStyle={titleStyle}>
          <p style={{ fontSize: "10px", margin: "2px 0" }}>{section.content}</p>
        </Section>
      );
    }

    default:
      return null;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BulletItem({
  text,
  hl,
  bulletIndex,
}: {
  text: string
  hl: EntryHighlights
  bulletIndex: number
}) {
  let style: React.CSSProperties | undefined = undefined
  if (hl.added.includes(bulletIndex)) style = { ...ADDED_STYLE }
  else if (hl.tailored.includes(bulletIndex)) style = { ...TAILORED_STYLE }

  const jdPhrases = hl.jd[bulletIndex] ?? []

  return (
    <li style={{ fontSize: "10px", ...style }}>
      <RichText text={text} phrases={jdPhrases} />
    </li>
  )
}

function SkillTokens({ skills, added }: { skills: string[]; added: Set<string> }) {
  return (
    <>
      {skills.map((skill, i) => (
        <span key={skill}>
          {i > 0 && ", "}
          <span style={added.has(skill) ? ADDED_CHIP_STYLE : undefined}>{skill}</span>
        </span>
      ))}
    </>
  )
}

function HighlightLegend() {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "10px",
        fontSize: "10px",
        marginBottom: "10px",
        paddingBottom: "6px",
        borderBottom: "1px dashed #cbd5e1",
      }}
    >
      <LegendChip color="#d97706" label="Added by AI" />
      <LegendChip color="#3b82f6" label="Reworded / Tailored" />
      <LegendChip color="#ca8a04" label="JD keyword match" />
    </div>
  )
}

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
      <span
        style={{
          display: "inline-block",
          width: "10px",
          height: "10px",
          backgroundColor: color,
          borderRadius: "2px",
          opacity: 0.85,
        }}
      />
      {label}
    </span>
  )
}

function RichText({ text, phrases = [] }: { text: string; phrases?: string[] }) {
  const parts = text.split(/\*\*([^*]+)\*\*/g)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i}>{highlightPhrases(part, phrases)}</strong>
        ) : (
          highlightPhrases(part, phrases)
        )
      )}
    </>
  )
}

function highlightPhrases(text: string, phrases: string[]): React.ReactNode {
  if (!phrases || phrases.length === 0) return text

  const lower = text.toLowerCase()
  const spans: Array<{ start: number; end: number }> = []
  for (const phrase of phrases) {
    const needle = phrase.toLowerCase()
    let idx = lower.indexOf(needle)
    while (idx !== -1) {
      spans.push({ start: idx, end: idx + needle.length })
      idx = lower.indexOf(needle, idx + needle.length)
    }
  }
  if (spans.length === 0) return text

  spans.sort((a, b) => a.start - b.start || b.end - a.end)
  const merged: Array<{ start: number; end: number }> = []
  for (const span of spans) {
    const last = merged[merged.length - 1]
    if (last && span.start < last.end) {
      if (span.end > last.end) last.end = span.end
    } else {
      merged.push({ ...span })
    }
  }

  const nodes: React.ReactNode[] = []
  let pos = 0
  for (const span of merged) {
    if (span.start > pos) nodes.push(text.slice(pos, span.start))
    nodes.push(
      <mark
        key={span.start}
        style={{ backgroundColor: "#fde047", color: "#000000", padding: "0 1px" }}
      >
        {text.slice(span.start, span.end)}
      </mark>
    )
    pos = span.end
  }
  if (pos < text.length) nodes.push(text.slice(pos))
  return nodes
}

function Section({
  title,
  titleStyle,
  children,
}: {
  title: string
  titleStyle?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <div style={{ marginTop: "8px" }}>
      <h2
        style={{
          fontSize: "14px",
          fontWeight: "bold",
          textTransform: "uppercase",
          borderBottom: "1px solid #000000",
          paddingBottom: "2px",
          marginBottom: "4px",
        }}
      >
        <span style={titleStyle}>{title}</span>
      </h2>
      {children}
    </div>
  )
}