"use client"

import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  Link,
  StyleSheet,
} from "@react-pdf/renderer"
import type { Resume, ResumeSection } from "@/lib/schemas/resume"
import { parseContactUrl } from "@/lib/contact-links"

const styles = StyleSheet.create({
  page: {
    padding: "36 40",
    fontSize: 10,
    lineHeight: 1.45,
    color: "#000000",
    fontFamily: "Times-Roman",
  },
  header: {
    textAlign: "center",
    marginBottom: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  headerLine: {
    fontSize: 9,
    marginTop: 2,
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "#000000",
    paddingBottom: 2,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  bold: {
    fontWeight: "bold",
  },
  italic: {
    fontFamily: "Times-Italic",
    fontSize: 9,
  },
  meta: {
    fontSize: 9,
  },
  bullets: {
    marginTop: 2,
  },
  bullet: {
    flexDirection: "row",
    marginTop: 1,
  },
  bulletDot: {
    width: 10,
    fontSize: 9,
  },
  bulletText: {
    flex: 1,
  },
  coursework: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  courseworkItem: {
    width: "25%",
    fontSize: 9,
  },
  skills: {
    fontSize: 9,
  },
  skillsRow: {
    marginTop: 1,
  },
  block: {
    marginBottom: 4,
  },
})

interface PdfResumeProps {
  resume: Resume
}

export function PdfResume({ resume }: PdfResumeProps) {
  const { contact, sections } = resume

  const parsedLinkedin = parseContactUrl(contact.linkedin || "", "linkedin")
  const parsedGithub = parseContactUrl(contact.github || "", "github")

  const contactParts: React.ReactNode[] = []
  if (contact.phone) {
    contactParts.push(
      <Link key="phone" src={`tel:${contact.phone}`}>
        {contact.phone}
      </Link>
    )
  }
  if (contact.email) {
    contactParts.push(
      <Link key="email" src={`mailto:${contact.email}`}>
        {contact.email}
      </Link>
    )
  }
  if (parsedLinkedin.url && parsedLinkedin.display) {
    contactParts.push(
      <Link key="linkedin" src={parsedLinkedin.url}>
        {parsedLinkedin.display}
      </Link>
    )
  }
  if (parsedGithub.url && parsedGithub.display) {
    contactParts.push(
      <Link key="github" src={parsedGithub.url}>
        {parsedGithub.display}
      </Link>
    )
  }

  return (
    <Document title="resume.pdf">
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{contact.name}</Text>
          {contact.address && <Text style={styles.headerLine}>{contact.address}</Text>}
          {contactParts.length > 0 && (
            <Text style={styles.headerLine}>
              {contactParts.map((part, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <Text>{" ~ "}</Text>}
                  {part}
                </React.Fragment>
              ))}
            </Text>
          )}
        </View>

        {/* Dynamic sections in array order */}
        {sections.map((section) => (
          <PdfSection key={section.id} section={section} />
        ))}
      </Page>
    </Document>
  )
}

// ─── Section dispatcher ───────────────────────────────────────────────────────

function PdfSection({ section }: { section: ResumeSection }) {
  switch (section.type) {
    case "bullet_list": {
      if (!section.entries || section.entries.length === 0) return null;
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.entries.map((entry, i) => (
            <View key={i} style={styles.block}>
              <View style={styles.row}>
                <Text style={styles.bold}>
                  <RichPdfText text={entry.heading} />
                </Text>
                <Text style={styles.meta}>{entry.dateRange}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.italic}>
                  <RichPdfText text={entry.subheading} />
                </Text>
                <Text style={styles.meta}>{entry.location ?? ""}</Text>
              </View>
              <View style={styles.bullets}>
                {entry.bullets.map((bullet, j) => (
                  <Bullet key={j} text={bullet} />
                ))}
              </View>
            </View>
          ))}
        </View>
      );
    }

    case "projects": {
      if (!section.entries || section.entries.length === 0) return null;
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.entries.map((entry, i) => (
            <View key={i} style={styles.block}>
              <View style={styles.row}>
                <Text style={styles.bold}>
                  <RichPdfText text={entry.heading} />
                  {entry.subheading && (
                    <Text style={styles.italic}>{" | "}
                      <RichPdfText text={entry.subheading} />
                    </Text>
                  )}
                </Text>
                <Text style={styles.meta}>{entry.dateRange}</Text>
              </View>
              <View style={styles.bullets}>
                {entry.bullets.map((bullet, j) => (
                  <Bullet key={j} text={bullet} />
                ))}
              </View>
            </View>
          ))}
        </View>
      );
    }

    case "skills": {
      const validCategories = (section.categories || []).filter((c) => c && c.items && c.items.length > 0);
      const hasFlatItems = section.items && section.items.length > 0;
      if (validCategories.length === 0 && !hasFlatItems) return null;

      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.skills}>
            {validCategories.length > 0 ? (
              validCategories.map((cat, i) => (
                <Text key={i} style={styles.skillsRow}>
                  <Text style={styles.bold}>{cat.label}: </Text>
                  {cat.items.join(", ")}
                </Text>
              ))
            ) : (
              <Text style={styles.skillsRow}>
                {section.items?.join(", ")}
              </Text>
            )}
          </View>
        </View>
      );
    }

    case "simple_list": {
      if (!section.items || section.items.length === 0) return null;
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.coursework}>
            {section.items.map((item, i) => (
              <Text key={i} style={styles.courseworkItem}>
                {item}
              </Text>
            ))}
          </View>
        </View>
      );
    }

    case "text": {
      if (!section.content || !section.content.trim()) return null;
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={{ fontSize: 9 }}>{section.content}</Text>
        </View>
      );
    }

    default:
      return null;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletDot}>{"\u2022"}</Text>
      <Text style={styles.bulletText}>
        <RichPdfText text={text} />
      </Text>
    </View>
  )
}

function RichPdfText({ text }: { text: string }) {
  const parts = text.split(/\*\*([^*]+)\*\*/g)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <Text key={i} style={styles.bold}>{part}</Text> : part
      )}
    </>
  )
}