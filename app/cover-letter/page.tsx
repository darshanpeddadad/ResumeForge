"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CoverLetterPreview } from "@/components/cover-letter-preview";
import { extractTextFromFile } from "@/lib/document-parser";
import { File01Icon } from "@/components/ui/file-01";
import { CloudDownloadIcon } from "@/components/ui/cloud-download";
import { RefreshIcon } from "@/components/ui/refresh";
import { MagicWand01Icon } from "@/components/ui/magic-wand-01";
import type { CoverLetterResult } from "@/lib/cover-letter-generator";

export default function CoverLetterPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/sign-in?callbackUrl=/cover-letter");
    }
  }, [session, isPending, router]);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [pastCoverLetter, setPastCoverLetter] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [coverLetter, setCoverLetter] = useState<CoverLetterResult | null>(null);
  const [error, setError] = useState<{ message: string; toSettings?: boolean } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeFile(file);
    setError(null);
    try {
      const extracted = await extractTextFromFile(file);
      setResumeText(extracted);
    } catch (err) {
      console.error("Document parse error:", err);
      setError({ message: "Could not read document. You can paste your resume text below." });
    }
  };

  const handleGenerate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeText.trim()) {
      setError({ message: "Please upload a resume PDF or paste your resume text." });
      return;
    }
    if (!jobDescription.trim()) {
      setError({ message: "Please provide a target job description." });
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Step 1: Parse resume text into structured Resume JSON
      const parseRes = await fetch("/api/parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText,
          jobDescription,
        }),
      });

      if (!parseRes.ok) {
        const data = await parseRes.json();
        setError({
          message: data.hint || data.error || "Failed to process resume.",
          toSettings: !!data.redirect || parseRes.status === 403,
        });
        return;
      }

      const { resume } = await parseRes.json();

      // Step 2: Generate targeted cover letter
      const clRes = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume,
          jobDescription,
          pastCoverLetter: pastCoverLetter.trim() || undefined,
        }),
      });

      if (!clRes.ok) {
        const data = await clRes.json();
        setError({
          message: data.error || "Failed to generate cover letter.",
          toSettings: !!data.redirect || clRes.status === 403,
        });
        return;
      }

      const { coverLetter: result } = await clRes.json();
      setCoverLetter(result);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Something went wrong while generating.",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [resumeText, jobDescription, pastCoverLetter]);

  if (isPending || !session) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground">Checking authentication...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-background">
      {/* Ambient Glow Orbs */}
      <div className="ambient-orb -top-24 -left-24 h-96 w-96 bg-primary/20" />
      <div className="ambient-orb top-1/3 -right-24 h-96 w-96 bg-indigo-500/15" />
      <div className="ambient-orb -bottom-24 left-1/4 h-80 w-80 bg-cyan-500/15" />

      <Navbar />

      <main className="relative z-10 flex flex-1 w-full max-w-3xl flex-col items-center justify-start p-4 pt-24 pb-12 space-y-6">
        <div className="text-center space-y-3">
          <div className="glass-pill inline-flex items-center gap-2 px-3.5 py-1 text-xs font-semibold text-primary">
            <MagicWand01Icon size={13} className="shrink-0 animate-pulse" />
            <span>Anti-AI Humanizer Engine • Zero Generic Fluff</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl text-foreground">
            Tailored Cover Letter Generator
          </h1>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Zero generic corporate fluff. Enforces strict anti-hallucination,
            keyword matching, and quantifiable metrics rules for your target role.
          </p>
        </div>

        {error && (
          <div className="glass-card w-full rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive flex items-center justify-between shadow-lg">
            <span>{error.message}</span>
            {error.toSettings && (
              <Link href="/settings">
                <Button size="sm" variant="outline" className="glass-pill">Go to Settings</Button>
              </Link>
            )}
          </div>
        )}

        {coverLetter && (
          <div className="w-full space-y-4">
            <CoverLetterPreview coverLetter={coverLetter} />
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={() => setCoverLetter(null)} className="glass-pill">
                Draft Another Letter
              </Button>
            </div>
          </div>
        )}

        {!coverLetter && (
          <Card className="glass-card w-full border border-border/50 shadow-2xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-lg">Target Role & Candidate Details</CardTitle>
              <CardDescription>
                Provide your resume and the target job description. Your BYOK key is used directly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="resumeFile">Upload Resume (PDF or Word)</Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="resumeFile"
                      type="file"
                      accept=".pdf,.docx,.doc"
                      onChange={handleFileChange}
                      className="text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border file:border-border file:bg-muted/50 file:text-sm file:font-medium hover:file:bg-accent cursor-pointer"
                    />
                    {resumeFile && (
                      <span className="text-xs text-muted-foreground">
                        {resumeFile.name} ({(resumeFile.size / 1024).toFixed(0)} KB)
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resumeText">
                    Resume Text{" "}
                    <span className="text-xs text-muted-foreground">(Extracted or pasted)</span>
                  </Label>
                  <textarea
                    id="resumeText"
                    rows={6}
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Paste or review your resume text here..."
                    className="w-full rounded-xl border border-border/50 bg-background/60 p-3 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary font-mono shadow-inner"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobDescription">Target Job Description</Label>
                  <textarea
                    id="jobDescription"
                    rows={6}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the full job description here (requirements, tech stack, responsibilities)..."
                    className="w-full rounded-xl border border-border/50 bg-background/60 p-3 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary font-sans shadow-inner"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pastCoverLetter">
                    Past Cover Letter Reference{" "}
                    <span className="text-xs text-muted-foreground">(Optional template to match tone/structure)</span>
                  </Label>
                  <textarea
                    id="pastCoverLetter"
                    rows={4}
                    value={pastCoverLetter}
                    onChange={(e) => setPastCoverLetter(e.target.value)}
                    placeholder="Optional: Paste an existing cover letter you like. All old company/job specifics will be stripped and replaced."
                    className="w-full rounded-xl border border-border/50 bg-background/60 p-3 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary font-sans shadow-inner"
                  />
                </div>

                <Button type="submit" disabled={isGenerating} className="glossy-btn-primary w-full font-semibold text-primary-foreground">
                  {isGenerating ? (
                    <>
                      <RefreshIcon size={16} className="mr-2 animate-spin" />
                      Analyzing JD & Generating Cover Letter...
                    </>
                  ) : (
                    <>
                      <File01Icon size={16} className="mr-2" />
                      Generate Tailored Cover Letter
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
