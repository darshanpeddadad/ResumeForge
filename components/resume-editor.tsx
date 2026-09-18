"use client";

import React, { useState, useRef } from "react";
import { nanoid } from "nanoid";
import type {
  Resume,
  ResumeSection,
  BulletEntry,
  SectionType,
} from "@/lib/schemas/resume";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Delete02Icon } from "@/components/ui/delete-02";

// ─── Title → type inference map ───────────────────────────────────────────────
const TITLE_TYPE_MAP: Record<string, SectionType> = {
  // bullet_list
  experience: "bullet_list", work: "bullet_list", employment: "bullet_list",
  education: "bullet_list", school: "bullet_list", university: "bullet_list",
  academics: "bullet_list", college: "bullet_list",
  leadership: "bullet_list", volunteer: "bullet_list", research: "bullet_list",
  teaching: "bullet_list", military: "bullet_list", activities: "bullet_list",
  extracurricular: "bullet_list", involvement: "bullet_list",
  // projects
  projects: "projects", publications: "projects", "open source": "projects",
  portfolio: "projects", "open-source": "projects",
  // skills
  skills: "skills", "technical skills": "skills", technologies: "skills",
  certifications: "skills", languages: "skills", tools: "skills",
  "developer tools": "skills", frameworks: "skills",
  // simple_list
  coursework: "simple_list", "relevant coursework": "simple_list",
  awards: "simple_list", honors: "simple_list", interests: "simple_list",
  hobbies: "simple_list", achievements: "simple_list",
  // text
  summary: "text", objective: "text", profile: "text",
  about: "text", "professional summary": "text",
};

const TYPE_LABELS: Record<SectionType, { name: string; description: string; examples: string }> = {
  bullet_list: { name: "Work / Bullet List", description: "Org, role, dates, bullets", examples: "Experience, Education, Leadership" },
  projects: { name: "Projects", description: "Name, tech stack, date, bullets", examples: "Projects, Publications" },
  skills: { name: "Skills / Categories", description: "Label: item, item, item...", examples: "Technical Skills, Certifications" },
  simple_list: { name: "Simple List", description: "Flat list of items", examples: "Coursework, Awards, Interests" },
  text: { name: "Summary / Text", description: "Single paragraph", examples: "Summary, Objective, Profile" },
};

function inferType(title: string): SectionType {
  const lower = title.toLowerCase().trim();
  for (const [key, type] of Object.entries(TITLE_TYPE_MAP)) {
    if (lower.includes(key)) return type;
  }
  return "bullet_list";
}

function makeBlankSection(title: string, type: SectionType): ResumeSection {
  const base = {
    id: nanoid(),
    title,
    type,
    content: "",
    categories: [],
    items: [],
    entries: [],
  };
  switch (type) {
    case "bullet_list":
    case "projects":
      return { ...base, type, entries: [] };
    case "skills":
      return { ...base, type, categories: [{ label: "Category", items: [] }] };
    case "simple_list":
      return { ...base, type, items: [] };
    case "text":
      return { ...base, type, content: "" };
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ResumeEditorProps {
  resume: Resume;
  onChange: (updated: Resume) => void;
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export function ResumeEditor({ resume, onChange }: ResumeEditorProps) {
  const [activeTab, setActiveTab] = useState("contact");
  const [addTitle, setAddTitle] = useState("");
  const [addType, setAddType] = useState<SectionType>("bullet_list");
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragNode = useRef<HTMLDivElement | null>(null);

  const updateResume = (sections: ResumeSection[]) =>
    onChange({ ...resume, sections });

  // ── Contact helpers ─────────────────────────────────────────────────────────
  const updateContact = (field: keyof Resume["contact"], val: string) =>
    onChange({ ...resume, contact: { ...resume.contact, [field]: val } });

  // ── Section helpers ─────────────────────────────────────────────────────────
  const updateSection = (id: string, patch: Partial<ResumeSection>) =>
    updateResume(
      resume.sections.map((s) => (s.id === id ? ({ ...s, ...patch } as ResumeSection) : s))
    );

  const removeSection = (id: string) =>
    updateResume(resume.sections.filter((s) => s.id !== id));

  const addSection = () => {
    const title = addTitle.trim() || "New Section";
    const type = addType;
    const newSection = makeBlankSection(title, type);
    updateResume([...resume.sections, newSection]);
    setAddTitle("");
    setAddType("bullet_list");
    setActiveTab(newSection.id);
  };

  // ── Bullet entry helpers ────────────────────────────────────────────────────
  const updateEntry = (sectionId: string, entryIdx: number, patch: Partial<BulletEntry>) => {
    const section = resume.sections.find((s) => s.id === sectionId);
    if (!section || (section.type !== "bullet_list" && section.type !== "projects")) return;
    const entries = [...section.entries];
    entries[entryIdx] = { ...entries[entryIdx], ...patch };
    updateSection(sectionId, { entries } as any);
  };

  const addEntry = (sectionId: string) => {
    const section = resume.sections.find((s) => s.id === sectionId);
    if (!section || (section.type !== "bullet_list" && section.type !== "projects")) return;
    const blank: BulletEntry = { heading: "Heading", subheading: "Subheading", dateRange: "", location: "", bullets: [""] };
    updateSection(sectionId, { entries: [...section.entries, blank] } as any);
  };

  const removeEntry = (sectionId: string, entryIdx: number) => {
    const section = resume.sections.find((s) => s.id === sectionId);
    if (!section || (section.type !== "bullet_list" && section.type !== "projects")) return;
    updateSection(sectionId, { entries: section.entries.filter((_, i) => i !== entryIdx) } as any);
  };

  const updateBullet = (sectionId: string, entryIdx: number, bulletIdx: number, text: string) => {
    const section = resume.sections.find((s) => s.id === sectionId);
    if (!section || (section.type !== "bullet_list" && section.type !== "projects")) return;
    const entries = [...section.entries];
    const bullets = [...entries[entryIdx].bullets];
    bullets[bulletIdx] = text;
    entries[entryIdx] = { ...entries[entryIdx], bullets };
    updateSection(sectionId, { entries } as any);
  };

  const addBullet = (sectionId: string, entryIdx: number) => {
    const section = resume.sections.find((s) => s.id === sectionId);
    if (!section || (section.type !== "bullet_list" && section.type !== "projects")) return;
    const entries = [...section.entries];
    entries[entryIdx] = { ...entries[entryIdx], bullets: [...entries[entryIdx].bullets, ""] };
    updateSection(sectionId, { entries } as any);
  };

  const removeBullet = (sectionId: string, entryIdx: number, bulletIdx: number) => {
    const section = resume.sections.find((s) => s.id === sectionId);
    if (!section || (section.type !== "bullet_list" && section.type !== "projects")) return;
    const entries = [...section.entries];
    entries[entryIdx] = { ...entries[entryIdx], bullets: entries[entryIdx].bullets.filter((_, i) => i !== bulletIdx) };
    updateSection(sectionId, { entries } as any);
  };

  // ── Reorder (Layout tab) ────────────────────────────────────────────────────
  const moveSection = (from: number, to: number) => {
    if (to < 0 || to >= resume.sections.length) return;
    const next = [...resume.sections];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    updateResume(next);
  };

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setOverIdx(idx);
  };

  const handleDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== idx) moveSection(dragIdx, idx);
    setDragIdx(null);
    setOverIdx(null);
  };

  // ── Tabs: contact + one per section + layout ────────────────────────────────
  const tabIds = ["contact", ...resume.sections.map((s) => s.id), "layout"];

  return (
    <div className="space-y-3">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* ── Tab bar ── */}
        <div className="overflow-x-auto">
          <TabsList className="flex w-max min-w-full">
            <TabsTrigger value="contact" className="text-xs shrink-0">
              Contact
            </TabsTrigger>
            {resume.sections.map((section) => (
              <TabsTrigger key={section.id} value={section.id} className="text-xs shrink-0">
                {section.title}
              </TabsTrigger>
            ))}
            <TabsTrigger value="layout" className="text-xs shrink-0">
              Layout ⠿
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Contact tab ── */}
        <TabsContent value="contact" className="space-y-4 pt-2">
          <Card className="bg-muted/20 p-4">
            <div className="grid grid-cols-2 gap-4">
              {(["name", "email", "phone", "address", "linkedin", "github"] as const).map((field) => (
                <div key={field}>
                  <Label className="text-xs capitalize">{field === "address" ? "Location" : field}</Label>
                  <Input
                    value={resume.contact[field]}
                    onChange={(e) => updateContact(field, e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ── Section tabs (dynamic) ── */}
        {resume.sections.map((section) => (
          <TabsContent key={section.id} value={section.id} className="space-y-4 pt-2">
            {/* Section title editor */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label className="text-xs">Section Title</Label>
                <Input
                  value={section.title}
                  onChange={(e) => updateSection(section.id, { title: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-destructive hover:text-destructive shrink-0 mt-4"
                onClick={() => {
                  removeSection(section.id);
                  setActiveTab("contact");
                }}
              >
                <Delete02Icon size={14} className="mr-1" />
                Remove Section
              </Button>
            </div>

            {/* ── bullet_list / projects ── */}
            {(section.type === "bullet_list" || section.type === "projects") && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {section.type === "projects"
                      ? "Use **double asterisks** for bold in bullets."
                      : "Use **double asterisks** for bold in bullets."}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => addEntry(section.id)}>
                    + Add Entry
                  </Button>
                </div>
                {section.entries.map((entry, eIdx) => (
                  <Card key={eIdx} className="bg-muted/20">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-semibold">
                        {entry.heading || "Entry"}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-destructive hover:text-destructive"
                        onClick={() => removeEntry(section.id, eIdx)}
                      >
                        <Delete02Icon size={14} className="mr-1" />
                        Remove
                      </Button>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">{section.type === "projects" ? "Project Name" : "Heading"}</Label>
                          <Input value={entry.heading} onChange={(e) => updateEntry(section.id, eIdx, { heading: e.target.value })} className="h-8 text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs">{section.type === "projects" ? "Technologies" : "Subheading / Role"}</Label>
                          <Input value={entry.subheading} onChange={(e) => updateEntry(section.id, eIdx, { subheading: e.target.value })} className="h-8 text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs">Date Range</Label>
                          <Input value={entry.dateRange} onChange={(e) => updateEntry(section.id, eIdx, { dateRange: e.target.value })} className="h-8 text-xs" />
                        </div>
                        {section.type === "bullet_list" && (
                          <div>
                            <Label className="text-xs">Location</Label>
                            <Input value={entry.location ?? ""} onChange={(e) => updateEntry(section.id, eIdx, { location: e.target.value })} className="h-8 text-xs" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2 pt-1">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs font-semibold">Bullet Points</Label>
                          <Button type="button" variant="ghost" size="sm" className="h-6 text-xs text-primary" onClick={() => addBullet(section.id, eIdx)}>
                            + Add Bullet
                          </Button>
                        </div>
                        {entry.bullets.map((bullet, bIdx) => (
                          <div key={bIdx} className="flex items-start gap-2">
                            <textarea
                              value={bullet}
                              onChange={(e) => updateBullet(section.id, eIdx, bIdx, e.target.value)}
                              rows={2}
                              className="flex-1 rounded-md border bg-background p-2 text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0 mt-1" onClick={() => removeBullet(section.id, eIdx, bIdx)}>
                              <Delete02Icon size={13} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}

            {/* ── skills ── */}
            {section.type === "skills" && (
              <Card className="bg-muted/20 p-4 space-y-4">
                {section.categories.map((cat, cIdx) => (
                  <div key={cIdx} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Input
                        value={cat.label}
                        placeholder="Category label"
                        onChange={(e) => {
                          const categories = [...section.categories];
                          categories[cIdx] = { ...categories[cIdx], label: e.target.value };
                          updateSection(section.id, { categories } as any);
                        }}
                        className="h-7 text-xs font-semibold w-48"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          const categories = section.categories.filter((_, i) => i !== cIdx);
                          updateSection(section.id, { categories } as any);
                        }}
                      >
                        <Delete02Icon size={13} />
                      </Button>
                    </div>
                    <Input
                      value={cat.items.join(", ")}
                      placeholder="Item1, Item2, Item3..."
                      onChange={(e) => {
                        const items = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                        const categories = [...section.categories];
                        categories[cIdx] = { ...categories[cIdx], items };
                        updateSection(section.id, { categories } as any);
                      }}
                      className="text-xs"
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const categories = [...section.categories, { label: "New Category", items: [] }];
                    updateSection(section.id, { categories } as any);
                  }}
                >
                  + Add Category
                </Button>
              </Card>
            )}

            {/* ── simple_list ── */}
            {section.type === "simple_list" && (
              <Card className="bg-muted/20 p-4">
                <Label className="text-xs font-semibold">Items (comma separated)</Label>
                <Input
                  value={section.items.join(", ")}
                  onChange={(e) => {
                    const items = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                    updateSection(section.id, { items } as any);
                  }}
                  placeholder="Item1, Item2, Item3..."
                  className="mt-1 text-xs"
                />
              </Card>
            )}

            {/* ── text ── */}
            {section.type === "text" && (
              <Card className="bg-muted/20 p-4">
                <Label className="text-xs font-semibold">Content</Label>
                <textarea
                  value={section.content}
                  onChange={(e) => updateSection(section.id, { content: e.target.value } as any)}
                  rows={5}
                  placeholder="Write your summary, objective, or profile here..."
                  className="mt-1 w-full rounded-md border bg-background p-2 text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </Card>
            )}
          </TabsContent>
        ))}

        {/* ── Layout tab (reorder) ── */}
        <TabsContent value="layout" className="pt-2 space-y-3">
          <p className="text-xs text-muted-foreground">
            Drag sections or use arrows to reorder. Changes apply live to the preview.
          </p>
          <div className="space-y-2">
            {resume.sections.map((section, idx) => (
              <div
                key={section.id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 bg-muted/20 cursor-grab transition-all ${
                  overIdx === idx && dragIdx !== idx ? "border-primary ring-1 ring-primary" : "border-border"
                } ${dragIdx === idx ? "opacity-40" : ""}`}
              >
                <span className="text-muted-foreground select-none text-sm">⠿</span>
                <span className="flex-1 text-sm font-medium">{section.title}</span>
                <span className="text-xs text-muted-foreground mr-2">{TYPE_LABELS[section.type].name}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSection(idx, idx - 1)} disabled={idx === 0}>
                  ↑
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSection(idx, idx + 1)} disabled={idx === resume.sections.length - 1}>
                  ↓
                </Button>
              </div>
            ))}
          </div>

          {/* ── Add section panel (Option B + A) ── */}
          <div className="pt-2 border-t border-border/40">
            <p className="text-xs font-semibold mb-2">Add New Section</p>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  value={addTitle}
                  onChange={(e) => {
                    setAddTitle(e.target.value);
                    setAddType(inferType(e.target.value));
                  }}
                  placeholder="Section title..."
                  className="text-xs h-8"
                />
                {addTitle.trim() && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-muted-foreground">
                      Type: <strong>{TYPE_LABELS[addType].name}</strong>
                    </span>
                    <button
                      className="text-xs text-primary underline"
                      onClick={() => setShowTypePicker(true)}
                    >
                      · Change?
                    </button>
                  </div>
                )}
              </div>
              <Button size="sm" onClick={addSection} disabled={!addTitle.trim()}>
                + Add
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Type picker modal (Option A fallback) ── */}
      {showTypePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-semibold text-sm">Change section type</h3>
            <div className="space-y-2">
              {(Object.entries(TYPE_LABELS) as [SectionType, typeof TYPE_LABELS[SectionType]][]).map(([type, meta]) => (
                <label key={type} className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <input
                    type="radio"
                    name="sectionType"
                    className="mt-0.5"
                    checked={addType === type}
                    onChange={() => setAddType(type)}
                  />
                  <div>
                    <p className="text-sm font-medium">{meta.name}</p>
                    <p className="text-xs text-muted-foreground">{meta.description}</p>
                    <p className="text-xs text-muted-foreground/70">e.g. {meta.examples}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowTypePicker(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => setShowTypePicker(false)}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
