"use client";

import React, { useState } from "react";
import type { Resume, Experience, Project, Education } from "@/lib/schemas/resume";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Delete02Icon } from "@/components/ui/delete-02";

interface ResumeEditorProps {
  resume: Resume;
  onChange: (updatedResume: Resume) => void;
}

export function ResumeEditor({ resume, onChange }: ResumeEditorProps) {
  const [activeTab, setActiveTab] = useState("experience");

  // Helper to update contact
  const updateContact = (field: keyof Resume["contact"], val: string) => {
    onChange({
      ...resume,
      contact: {
        ...resume.contact,
        [field]: val,
      },
    });
  };

  // Helper to update skills
  const updateSkills = (
    field: "languages" | "developerTools" | "technologiesFrameworks",
    csvText: string
  ) => {
    const list = csvText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onChange({
      ...resume,
      technicalSkills: {
        ...resume.technicalSkills,
        [field]: list,
      },
    });
  };

  // Experience handlers
  const updateExperience = (index: number, updated: Partial<Experience>) => {
    const nextExp = [...resume.experience];
    nextExp[index] = { ...nextExp[index], ...updated };
    onChange({ ...resume, experience: nextExp });
  };

  const updateExpBullet = (expIndex: number, bulletIndex: number, text: string) => {
    const nextExp = [...resume.experience];
    const bullets = [...nextExp[expIndex].bulletPoints];
    bullets[bulletIndex] = text;
    nextExp[expIndex] = { ...nextExp[expIndex], bulletPoints: bullets };
    onChange({ ...resume, experience: nextExp });
  };

  const addExpBullet = (expIndex: number) => {
    const nextExp = [...resume.experience];
    nextExp[expIndex] = {
      ...nextExp[expIndex],
      bulletPoints: [...nextExp[expIndex].bulletPoints, "Developed..."],
    };
    onChange({ ...resume, experience: nextExp });
  };

  const removeExpBullet = (expIndex: number, bulletIndex: number) => {
    const nextExp = [...resume.experience];
    const bullets = nextExp[expIndex].bulletPoints.filter((_, b) => b !== bulletIndex);
    nextExp[expIndex] = { ...nextExp[expIndex], bulletPoints: bullets };
    onChange({ ...resume, experience: nextExp });
  };

  const addExperience = () => {
    const newEntry: Experience = {
      company: "Company Name",
      position: "Role Title",
      dateRange: "Month Year - Present",
      location: "City, State",
      bulletPoints: ["Engineered scalable features using modern technologies."],
    };
    onChange({ ...resume, experience: [newEntry, ...resume.experience] });
  };

  const removeExperience = (index: number) => {
    onChange({
      ...resume,
      experience: resume.experience.filter((_, i) => i !== index),
    });
  };

  // Projects handlers
  const updateProject = (index: number, updated: Partial<Project>) => {
    const nextProj = [...resume.projects];
    nextProj[index] = { ...nextProj[index], ...updated };
    onChange({ ...resume, projects: nextProj });
  };

  const updateProjBullet = (projIndex: number, bulletIndex: number, text: string) => {
    const nextProj = [...resume.projects];
    const bullets = [...nextProj[projIndex].bulletPoints];
    bullets[bulletIndex] = text;
    nextProj[projIndex] = { ...nextProj[projIndex], bulletPoints: bullets };
    onChange({ ...resume, projects: nextProj });
  };

  const addProjBullet = (projIndex: number) => {
    const nextProj = [...resume.projects];
    nextProj[projIndex] = {
      ...nextProj[projIndex],
      bulletPoints: [...nextProj[projIndex].bulletPoints, "Built..."],
    };
    onChange({ ...resume, projects: nextProj });
  };

  const removeProjBullet = (projIndex: number, bulletIndex: number) => {
    const nextProj = [...resume.projects];
    const bullets = nextProj[projIndex].bulletPoints.filter((_, b) => b !== bulletIndex);
    nextProj[projIndex] = { ...nextProj[projIndex], bulletPoints: bullets };
    onChange({ ...resume, projects: nextProj });
  };

  const addProject = () => {
    const newProj: Project = {
      name: "New Project",
      technologies: "React, TypeScript, Node.js",
      date: "2025",
      bulletPoints: ["Architected and deployed application with high reliability."],
    };
    onChange({ ...resume, projects: [newProj, ...resume.projects] });
  };

  const removeProject = (index: number) => {
    onChange({
      ...resume,
      projects: resume.projects.filter((_, i) => i !== index),
    });
  };

  // Education handlers
  const updateEducation = (index: number, updated: Partial<Education>) => {
    const nextEdu = [...resume.education];
    nextEdu[index] = { ...nextEdu[index], ...updated };
    onChange({ ...resume, education: nextEdu });
  };

  const addEducation = () => {
    const newEdu: Education = {
      institution: "University Name",
      degree: "B.S. in Computer Science",
      dateRange: "2021 - 2025",
      location: "City, State",
    };
    onChange({ ...resume, education: [...resume.education, newEdu] });
  };

  const removeEducation = (index: number) => {
    onChange({
      ...resume,
      education: resume.education.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="experience" className="text-xs">
            Experience ({resume.experience.length})
          </TabsTrigger>
          <TabsTrigger value="projects" className="text-xs">
            Projects ({resume.projects.length})
          </TabsTrigger>
          <TabsTrigger value="skills" className="text-xs">
            Skills
          </TabsTrigger>
          <TabsTrigger value="contact" className="text-xs">
            Contact
          </TabsTrigger>
          <TabsTrigger value="education" className="text-xs">
            Education
          </TabsTrigger>
        </TabsList>

        {/* ─── WORK EXPERIENCE ─── */}
        <TabsContent value="experience" className="space-y-4 pt-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Tip: Use **double asterisks** for bold words in bullet points (e.g., **by 40%**).
            </span>
            <Button size="sm" variant="outline" onClick={addExperience}>
              + Add Role
            </Button>
          </div>

          {resume.experience.map((exp, eIdx) => (
            <Card key={eIdx} className="bg-muted/20">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  {exp.position || "Untitled Position"} at {exp.company || "Company"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-destructive hover:text-destructive"
                  onClick={() => removeExperience(eIdx)}
                >
                  <Delete02Icon size={14} className="mr-1" />
                  Remove
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Company</Label>
                    <Input
                      value={exp.company}
                      onChange={(e) => updateExperience(eIdx, { company: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Position</Label>
                    <Input
                      value={exp.position}
                      onChange={(e) => updateExperience(eIdx, { position: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Dates</Label>
                    <Input
                      value={exp.dateRange}
                      onChange={(e) => updateExperience(eIdx, { dateRange: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Location</Label>
                    <Input
                      value={exp.location}
                      onChange={(e) => updateExperience(eIdx, { location: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold">Bullet Points</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-primary"
                      onClick={() => addExpBullet(eIdx)}
                    >
                      + Add Bullet
                    </Button>
                  </div>
                  {exp.bulletPoints.map((bullet, bIdx) => (
                    <div key={bIdx} className="flex items-start gap-2">
                      <textarea
                        value={bullet}
                        onChange={(e) => updateExpBullet(eIdx, bIdx, e.target.value)}
                        rows={2}
                        className="flex-1 rounded-md border bg-background p-2 text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0 mt-1"
                        onClick={() => removeExpBullet(eIdx, bIdx)}
                      >
                        <Delete02Icon size={13} />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ─── PROJECTS ─── */}
        <TabsContent value="projects" className="space-y-4 pt-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Projects highlight your technical competencies and outcomes.
            </span>
            <Button size="sm" variant="outline" onClick={addProject}>
              + Add Project
            </Button>
          </div>

          {resume.projects.map((proj, pIdx) => (
            <Card key={pIdx} className="bg-muted/20">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  {proj.name || "Untitled Project"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-destructive hover:text-destructive"
                  onClick={() => removeProject(pIdx)}
                >
                  <Delete02Icon size={14} className="mr-1" />
                  Remove
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Project Name</Label>
                    <Input
                      value={proj.name}
                      onChange={(e) => updateProject(pIdx, { name: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Technologies Used</Label>
                    <Input
                      value={proj.technologies}
                      onChange={(e) => updateProject(pIdx, { technologies: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Date</Label>
                    <Input
                      value={proj.date}
                      onChange={(e) => updateProject(pIdx, { date: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold">Bullet Points</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-primary"
                      onClick={() => addProjBullet(pIdx)}
                    >
                      + Add Bullet
                    </Button>
                  </div>
                  {proj.bulletPoints.map((bullet, bIdx) => (
                    <div key={bIdx} className="flex items-start gap-2">
                      <textarea
                        value={bullet}
                        onChange={(e) => updateProjBullet(pIdx, bIdx, e.target.value)}
                        rows={2}
                        className="flex-1 rounded-md border bg-background p-2 text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0 mt-1"
                        onClick={() => removeProjBullet(pIdx, bIdx)}
                      >
                        <Delete02Icon size={13} />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ─── TECHNICAL SKILLS ─── */}
        <TabsContent value="skills" className="space-y-4 pt-2">
          <Card className="bg-muted/20 p-4 space-y-4">
            <div>
              <Label className="text-xs font-semibold">Languages (comma separated)</Label>
              <Input
                value={resume.technicalSkills.languages.join(", ")}
                onChange={(e) => updateSkills("languages", e.target.value)}
                placeholder="Python, TypeScript, SQL, Go..."
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Developer Tools (comma separated)</Label>
              <Input
                value={resume.technicalSkills.developerTools.join(", ")}
                onChange={(e) => updateSkills("developerTools", e.target.value)}
                placeholder="Git, Docker, Kubernetes, AWS, Linux..."
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Technologies / Frameworks (comma separated)</Label>
              <Input
                value={resume.technicalSkills.technologiesFrameworks.join(", ")}
                onChange={(e) => updateSkills("technologiesFrameworks", e.target.value)}
                placeholder="Next.js, FastAPI, Node.js, PostgreSQL, Tailwind..."
                className="mt-1 text-xs"
              />
            </div>
          </Card>
        </TabsContent>

        {/* ─── CONTACT INFO ─── */}
        <TabsContent value="contact" className="space-y-4 pt-2">
          <Card className="bg-muted/20 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Full Name</Label>
                <Input
                  value={resume.contact.name}
                  onChange={(e) => updateContact("name", e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  value={resume.contact.email}
                  onChange={(e) => updateContact("email", e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input
                  value={resume.contact.phone}
                  onChange={(e) => updateContact("phone", e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Location (City, State / Country)</Label>
                <Input
                  value={resume.contact.address}
                  onChange={(e) => updateContact("address", e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">LinkedIn Username or URL</Label>
                <Input
                  value={resume.contact.linkedin}
                  onChange={(e) => updateContact("linkedin", e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">GitHub Username or URL</Label>
                <Input
                  value={resume.contact.github}
                  onChange={(e) => updateContact("github", e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ─── EDUCATION ─── */}
        <TabsContent value="education" className="space-y-4 pt-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Educational history and degrees.
            </span>
            <Button size="sm" variant="outline" onClick={addEducation}>
              + Add Education
            </Button>
          </div>

          {resume.education.map((edu, idx) => (
            <Card key={idx} className="bg-muted/20 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-semibold">
                  {edu.degree || "Degree"} — {edu.institution || "Institution"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-destructive hover:text-destructive"
                  onClick={() => removeEducation(idx)}
                >
                  <Delete02Icon size={14} className="mr-1" />
                  Remove
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Institution</Label>
                  <Input
                    value={edu.institution}
                    onChange={(e) => updateEducation(idx, { institution: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Degree</Label>
                  <Input
                    value={edu.degree}
                    onChange={(e) => updateEducation(idx, { degree: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Date Range</Label>
                  <Input
                    value={edu.dateRange}
                    onChange={(e) => updateEducation(idx, { dateRange: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Location</Label>
                  <Input
                    value={edu.location}
                    onChange={(e) => updateEducation(idx, { location: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
