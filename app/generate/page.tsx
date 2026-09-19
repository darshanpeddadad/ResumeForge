"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { CircleCheckIcon } from "@/components/ui/circle-check"
import { RefreshIcon } from "@/components/ui/refresh"
import { MagicWand01Icon } from "@/components/ui/magic-wand-01"
import { File01Icon } from "@/components/ui/file-01"
import { ArrowLeft02Icon } from "@/components/ui/arrow-left-02"
import { ArrowRight02Icon } from "@/components/ui/arrow-right-02"
import { UndoIcon } from "@/components/ui/undo"
import { CloudDownloadIcon } from "@/components/ui/cloud-download"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { FolderKanban } from "lucide-react"
import { AtsScoreCard } from "@/components/ats-score-card"
import { DiffInspector } from "@/components/diff-inspector"
import { calculateAtsScore } from "@/lib/ats-scorer"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTrigger,
} from "@/components/reui/stepper"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { AuthStep } from "@/components/steps/auth-step"
import { ResumeUploadStep } from "@/components/steps/resume-upload-step"
import { JDInputStep } from "@/components/steps/jd-input-step"
import { LaTeXPreview } from "@/components/latex-preview"
import { OutreachPreview } from "@/components/outreach-preview"
import { CoverLetterPreview } from "@/components/cover-letter-preview"
import type { CoverLetterResult } from "@/lib/cover-letter-generator"
import { extractTextFromFile, extractLinksFromFile } from "@/lib/document-parser"
import { generateLatex } from "@/lib/latex-renderer"
import { renderColdEmail, renderColdDM } from "@/lib/template-renderer"
import type { Resume, ResumeSection } from "@/lib/schemas/resume"
import type { Highlights } from "@/lib/highlights"
import type { ColdEmail, ColdDM } from "@/lib/schemas/outreach"

const steps = [1, 2, 3]

export default function GeneratePage() {
  const { data: session, isPending } = authClient.useSession()
  const router = useRouter()
  const isSignedIn = !!session
  const [currentStep, setCurrentStep] = useState(1)
  const [targetCountry, setTargetCountry] = useState("US")
  const [jd, setJd] = useState("")
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [latexCode, setLatexCode] = useState<string | null>(null)
  const [resumeData, setResumeData] = useState<Resume | null>(null)
  const [highlights, setHighlights] = useState<Highlights | null>(null)
  const [whyMatched, setWhyMatched] = useState<string[] | null>(null)
  const [coldEmail, setColdEmail] = useState<string | null>(null)
  const [coldDM, setColdDM] = useState<string | null>(null)
  const [coverLetter, setCoverLetter] = useState<CoverLetterResult | null>(null)
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false)
  const [coverLetterError, setCoverLetterError] = useState<string | null>(null)
  const [error, setError] = useState<{ message: string; toSettings: boolean } | null>(null)

  const [detectedMeta, setDetectedMeta] = useState<{ title: string; company: string } | null>(null)
  const [isSavingToVault, setIsSavingToVault] = useState(false)
  const [vaultSavedSuccess, setVaultSavedSuccess] = useState(false)

  // Listen for ?importJob= parameter from 1-Click Bookmarklet
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const rawImport = params.get("importJob")
    if (rawImport) {
      try {
        const data = JSON.parse(decodeURIComponent(rawImport))
        if (data.text) {
          setJd(data.text)
        }
        if (data.title || data.company) {
          setDetectedMeta({
            title: data.title || "Target Role",
            company: data.company || "Target Company",
          })
        }
        if (session) {
          setCurrentStep(3)
        }
        window.history.replaceState({}, document.title, window.location.pathname)
      } catch {
        // ignore parse error
      }
    }
  }, [session])

  const atsScoreData = useMemo(() => {
    if (!resumeData) return null
    return calculateAtsScore(resumeData, jd)
  }, [resumeData, jd])

  const handleInjectKeyword = useCallback((keyword: string) => {
    setResumeData((prev) => {
      if (!prev) return prev
      const updated = { ...prev, sections: [...prev.sections] }
      const existingIndex = updated.sections.findIndex((s) => s.type === "skills")
      if (existingIndex === -1) {
        const newSection: ResumeSection = {
          id: "skills-injected",
          title: "Technical Skills",
          type: "skills",
          content: "",
          items: [],
          entries: [],
          categories: [{ label: "Core Competencies", items: [keyword] }],
        }
        updated.sections = [newSection, ...updated.sections]
      } else {
        const target = updated.sections[existingIndex]
        const categories = [...(target.categories || [])]
        if (categories.length === 0) {
          categories.push({ label: "Core Competencies", items: [keyword] })
        } else {
          const firstCat = { ...categories[0] }
          firstCat.items = Array.from(new Set([...(firstCat.items || []), keyword]))
          categories[0] = firstCat
        }
        const updatedSection: ResumeSection = { ...target, categories }
        updated.sections[existingIndex] = updatedSection
      }
      return updated
    })
  }, [])

  const handleSaveToVault = useCallback(async () => {
    if (!resumeData) return
    setIsSavingToVault(true)
    try {
      const firstRole = resumeData.sections.find((s) => s.type === "bullet_list" || s.type === "projects")?.entries?.[0]?.subheading
      const jobTitle = detectedMeta?.title || firstRole || "Software Engineer"
      const companyName = detectedMeta?.company || "Target Company"

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle,
          companyName,
          targetCountry,
          atsScore: atsScoreData?.overallScore || 0,
          status: "saved",
          resumeData,
          latexCode,
          coverLetter,
          outreach: coldEmail && coldDM ? { coldEmail, coldDM } : null,
        }),
      })

      if (res.ok) {
        setVaultSavedSuccess(true)
        setTimeout(() => setVaultSavedSuccess(false), 3000)
      }
    } catch (err) {
      console.error("Failed to save to vault:", err)
    } finally {
      setIsSavingToVault(false)
    }
  }, [resumeData, detectedMeta, targetCountry, atsScoreData, latexCode, coverLetter, coldEmail, coldDM])

  const effectiveStep = isSignedIn ? Math.max(currentStep, 2) : currentStep

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in?redirect=/generate")
    }
  }, [session, isPending, router])

  useEffect(() => {
    if (isSignedIn) {
      setCurrentStep((prev) => Math.max(prev, 2))
    }
  }, [isSignedIn])

  const handleFileSelect = useCallback((file: File) => {
    setResumeFile(file)
    setError(null)
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!resumeFile) return

    setIsProcessing(true)
    setError(null)

    try {
      // Step 1: Extract text from resume file (PDF or Word doc)
      const resumeText = await extractTextFromFile(resumeFile)

      if (!resumeText.trim()) {
        throw new Error("Could not extract text from document. Please try another file.")
      }

      // Step 2: Send to LLM for structured parsing
      const response = await fetch("/api/parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText,
          jobDescription: jd || undefined,
          targetCountry,
        }),
      })

      let data: any = null;
      try {
        const rawText = await response.text();
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        // Response was not JSON (e.g. Vercel 504 Gateway Timeout HTML page)
      }

      if (!response.ok) {
        let msg = data?.hint || data?.error;
        if (!msg) {
          if (response.status === 504) {
            msg = "The request timed out (504 Gateway Timeout). The serverless function took too long to complete. Please try again.";
          } else if (response.status === 502 || response.status === 503) {
            msg = `Service temporarily unavailable (${response.status}). Please try again in a few seconds.`;
          } else {
            msg = `Failed to parse resume (Status ${response.status}). Please check your AI API key in Settings.`;
          }
        }
        setError({
          message: msg,
          toSettings: !!data?.redirect || response.status === 403,
        });
        return;
      }

      if (!data || !data.resume) {
        throw new Error("Invalid response received from server. Please try again.");
      }

      const { resume, highlights, whyMatched: returnedWhyMatched } = data;

      // Hyperlink targets (e.g. annotations in PDF or raw text in DOCX)
      const contactLinks = await extractLinksFromFile(resumeFile)
      if (contactLinks.linkedin || contactLinks.github) {
        resume.contact = {
          ...resume.contact,
          linkedin: contactLinks.linkedin || resume.contact.linkedin,
          github: contactLinks.github || resume.contact.github,
        }
      }

      setResumeData(resume)
      setHighlights(highlights || null)
      setWhyMatched(returnedWhyMatched || null)

      // Step 3: Generate LaTeX
      const latex = generateLatex(resume)
      setLatexCode(latex)

      // Step 4: Generate outreach and cover letter (if JD provided) concurrently
      if (jd.trim()) {
        setIsGeneratingCoverLetter(true)
        setCoverLetterError(null)

        const outreachPromise = fetch("/api/generate-outreach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume, jobDescription: jd }),
        })
          .then(async (outreachResponse) => {
            if (outreachResponse.ok) {
              const data = await outreachResponse.json()
              // Use server-side rendered + humanized text if available
              setColdEmail(data.coldEmailText || renderColdEmail(data.outreach?.coldEmail))
              setColdDM(data.coldDMText || renderColdDM(data.outreach?.coldDM))
            }
          })
          .catch((err) => console.error("Outreach generation failed", err))

        const coverLetterPromise = fetch("/api/generate-cover-letter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume, jobDescription: jd }),
        })
          .then(async (coverLetterResponse) => {
            const data = await coverLetterResponse.json().catch(() => null)
            if (coverLetterResponse.ok && data?.coverLetter) {
              setCoverLetter(data.coverLetter)
            } else {
              setCoverLetterError(data?.error || "Cover letter generation failed.")
            }
          })
          .catch((err) => {
            setCoverLetterError(err instanceof Error ? err.message : "Cover letter generation failed")
          })
          .finally(() => {
            setIsGeneratingCoverLetter(false)
          })

        Promise.allSettled([outreachPromise, coverLetterPromise])
      }

      // Move to result view
      setCurrentStep(4)
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Something went wrong",
        toSettings: false,
      })
    } finally {
      setIsProcessing(false)
    }
  }, [resumeFile, jd])

    const handleGenerateCoverLetter = useCallback(async () => {
    if (!resumeData || !jd.trim()) return
    setIsGeneratingCoverLetter(true)
    setCoverLetterError(null)
    try {
      const res = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: resumeData, jobDescription: jd }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || `Failed to generate cover letter (${res.status})`)
      }
      if (data?.coverLetter) {
        setCoverLetter(data.coverLetter)
      }
    } catch (err) {
      setCoverLetterError(err instanceof Error ? err.message : "Failed to generate cover letter")
    } finally {
      setIsGeneratingCoverLetter(false)
    }
  }, [resumeData, jd])

  const handleDownloadTeX = useCallback(() => {
    if (!latexCode) return
    const blob = new Blob([latexCode], { type: "application/x-tex" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "resume.tex"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [latexCode])

  const handleBackToEdit = useCallback(() => {
    setCurrentStep(3)
    setLatexCode(null)
    setColdEmail(null)
    setColdDM(null)
    setCoverLetter(null)
    setHighlights(null)
    setWhyMatched(null)
  }, [])

  // Result view
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

  // Result view
  if (currentStep === 4 && latexCode && resumeData) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-background">
        {/* Ambient Glow Orbs */}
        <div className="ambient-orb -top-24 -left-24 h-96 w-96 bg-primary/20" />
        <div className="ambient-orb top-1/3 -right-24 h-96 w-96 bg-indigo-500/15" />
        <div className="ambient-orb -bottom-24 left-1/4 h-80 w-80 bg-cyan-500/15" />

        <Navbar />

        <main className="relative z-10 flex flex-1 w-full max-w-3xl flex-col items-center justify-center p-4 pt-24 pb-12 space-y-4">
          {atsScoreData && (
            <div className="w-full space-y-3">
              <AtsScoreCard
                scoreData={atsScoreData}
                onInjectKeyword={handleInjectKeyword}
              />
              <DiffInspector
                resume={resumeData}
                matchedKeywords={atsScoreData.matchedKeywords}
              />
            </div>
          )}

          <LaTeXPreview
            latexCode={latexCode}
            resumeData={resumeData}
            highlights={highlights}
            whyMatched={whyMatched}
            onResumeChange={(updatedResume, updatedLatex) => {
              setResumeData(updatedResume)
              setLatexCode(updatedLatex)
            }}
          />
          {coverLetter ? (
            <CoverLetterPreview coverLetter={coverLetter} />
          ) : (
            <Card className="glass-card w-full border border-border/50 shadow-2xl backdrop-blur-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <File01Icon size={16} className="text-primary shrink-0" />
                    <h3 className="text-sm font-semibold text-foreground">Tailored Cover Letter</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isGeneratingCoverLetter
                      ? "Generating tailored, humanized cover letter with zero AI tells..."
                      : jd.trim()
                      ? "Create an ATS-matched, humanized cover letter tailored to this role."
                      : "Add a Job Description in Step 3 to generate a targeted cover letter."}
                  </p>
                  {coverLetterError && (
                    <p className="text-xs text-destructive pt-0.5">{coverLetterError}</p>
                  )}
                </div>
                {jd.trim() && (
                  <Button
                    onClick={handleGenerateCoverLetter}
                    disabled={isGeneratingCoverLetter}
                    className="glossy-btn-primary text-black font-semibold rounded-xl text-xs h-8 px-3.5 shrink-0"
                  >
                    {isGeneratingCoverLetter ? (
                      <RefreshIcon size={13} className="mr-1.5 shrink-0 animate-spin text-black" />
                    ) : (
                      <MagicWand01Icon size={13} className="mr-1.5 shrink-0 text-black" />
                    )}
                    {isGeneratingCoverLetter ? "Generating..." : "Generate Cover Letter"}
                  </Button>
                )}
              </div>
            </Card>
          )}
          {coldEmail && coldDM && (
            <OutreachPreview email={coldEmail} dm={coldDM} />
          )}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <Button
              onClick={handleSaveToVault}
              disabled={isSavingToVault}
              className="glossy-btn-primary text-black font-semibold text-xs h-9 px-4 rounded-xl shadow-lg"
            >
              <FolderKanban size={14} className="mr-1.5 shrink-0 text-black" />
              {vaultSavedSuccess ? "Saved to Vault!" : isSavingToVault ? "Saving..." : "Save to Vault & Tracker"}
            </Button>
            <Button variant="outline" onClick={handleBackToEdit} className="glass-pill text-xs h-9">
              <UndoIcon size={14} className="mr-1.5 shrink-0" />
              Back to Edit
            </Button>
            <Button variant="outline" onClick={handleDownloadTeX} className="glass-pill text-xs h-9">
              <CloudDownloadIcon size={14} className="mr-1.5 shrink-0" />
              Download .tex
            </Button>
          </div>
        </main>

        <Footer />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-background">
      {/* Ambient Glow Orbs */}
      <div className="ambient-orb -top-20 -left-20 h-96 w-96 bg-primary/20" />
      <div className="ambient-orb top-1/2 -right-24 h-96 w-96 bg-indigo-500/15" />
      <div className="ambient-orb -bottom-20 left-1/3 h-80 w-80 bg-cyan-500/15" />

      <Navbar />

      <main className="relative z-10 flex flex-1 w-full items-center justify-center p-4 pt-24 pb-12">
        <Card className="glass-card w-full max-w-lg border border-border/50 shadow-2xl backdrop-blur-xl">
          <Stepper
            value={effectiveStep}
            onValueChange={setCurrentStep}
            className="space-y-6"
          >
            <StepperNav className="justify-center px-6 pt-6">
              {steps.map((step) => (
                <StepperItem key={step} step={step}>
                  <StepperTrigger>
                    <StepperIndicator className={effectiveStep >= step ? "bg-primary text-primary-foreground shadow-sm" : ""}>
                      {effectiveStep > step ? (
                        <CircleCheckIcon size={16} className="shrink-0" />
                      ) : (
                        step
                      )}
                    </StepperIndicator>
                  </StepperTrigger>
                  {steps.length > step && <StepperSeparator />}
                </StepperItem>
              ))}
            </StepperNav>

            <StepperPanel>
              <StepperContent value={1}>
                <CardContent>
                  <AuthStep />
                </CardContent>
              </StepperContent>

              <StepperContent value={2}>
                <CardContent>
                  <ResumeUploadStep onFileSelect={handleFileSelect} />
                </CardContent>
              </StepperContent>

              <StepperContent value={3}>
                <CardContent>
                  <JDInputStep
                    value={jd}
                    onChange={setJd}
                    targetCountry={targetCountry}
                    onCountryChange={setTargetCountry}
                    onMetadataChange={setDetectedMeta}
                  />
                </CardContent>
              </StepperContent>
            </StepperPanel>

            <CardFooter className="justify-between border-t border-border/40 px-6 py-4 bg-muted/20">
              <Button
                variant="ghost"
                onClick={() => setCurrentStep(Math.max(effectiveStep - 1, isSignedIn ? 2 : 1))}
                disabled={(isSignedIn ? effectiveStep <= 2 : effectiveStep <= 1) || isProcessing}
                className="hover:bg-muted/50"
              >
                <ArrowLeft02Icon size={14} className="mr-1.5 shrink-0" />
                Back
              </Button>
              {effectiveStep < 3 ? (
                <Button
                  onClick={() => setCurrentStep(effectiveStep + 1)}
                  disabled={effectiveStep >= 3}
                  className="glossy-btn-primary font-medium"
                >
                  Next
                  <ArrowRight02Icon size={14} className="ml-1.5 shrink-0" />
                </Button>
              ) : (
                <Button
                  onClick={handleGenerate}
                  disabled={!resumeFile || isProcessing}
                  className="glossy-btn-primary font-semibold text-primary-foreground"
                >
                  {isProcessing ? (
                    <>
                      <RefreshIcon size={14} className="mr-2 animate-spin" />
                      Crafting Tailored Resume...
                    </>
                  ) : (
                    "Generate Resume"
                  )}
                </Button>
              )}
            </CardFooter>
          </Stepper>
          {error && (
            <AlertDialog open onOpenChange={() => setError(null)}>
              <AlertDialogContent className="glass-card">
                <AlertDialogHeader>
                  <AlertDialogMedia>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </AlertDialogMedia>
                  <AlertDialogTitle>Something went wrong</AlertDialogTitle>
                  <AlertDialogDescription>
                    {error.message}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Close</AlertDialogCancel>
                  {error.toSettings && (
                    <Link href="/settings">
                      <AlertDialogAction className="glossy-btn-primary">Open Settings</AlertDialogAction>
                    </Link>
                  )}
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </Card>
      </main>

      <Footer />
    </div>
  )
}

