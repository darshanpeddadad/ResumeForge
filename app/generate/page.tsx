"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { CircleCheckIcon } from "@/components/ui/circle-check"
import { RefreshIcon } from "@/components/ui/refresh"
import { ArrowLeft02Icon } from "@/components/ui/arrow-left-02"
import { ArrowRight02Icon } from "@/components/ui/arrow-right-02"
import { UndoIcon } from "@/components/ui/undo"
import { CloudDownloadIcon } from "@/components/ui/cloud-download"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
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
import type { Resume } from "@/lib/schemas/resume"
import type { Highlights } from "@/lib/highlights"
import type { ColdEmail, ColdDM } from "@/lib/schemas/outreach"

const steps = [1, 2, 3]

export default function GeneratePage() {
  const { data: session } = authClient.useSession()
  const isSignedIn = !!session
  const [currentStep, setCurrentStep] = useState(1)
  const [jd, setJd] = useState("")
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [latexCode, setLatexCode] = useState<string | null>(null)
  const [resumeData, setResumeData] = useState<Resume | null>(null)
  const [highlights, setHighlights] = useState<Highlights | null>(null)
  const [coldEmail, setColdEmail] = useState<string | null>(null)
  const [coldDM, setColdDM] = useState<string | null>(null)
  const [coverLetter, setCoverLetter] = useState<CoverLetterResult | null>(null)
  const [error, setError] = useState<{ message: string; toSettings: boolean } | null>(null)

  const effectiveStep = isSignedIn ? Math.max(currentStep, 2) : currentStep

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
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError({
          message:
            data.hint ||
            data.error ||
            "Failed to parse resume. Check your API key in Settings.",
          toSettings: !!data.redirect || response.status === 403,
        })
        return
      }

      const { resume, highlights } = await response.json()

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

      // Step 3: Generate LaTeX
      const latex = generateLatex(resume)
      setLatexCode(latex)

      // Step 4: Generate outreach and cover letter (if JD provided)
      if (jd.trim()) {
        try {
          const outreachResponse = await fetch("/api/generate-outreach", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resume, jobDescription: jd }),
          })

          if (outreachResponse.ok) {
            const { outreach } = await outreachResponse.json()
            const emailData: ColdEmail = outreach.coldEmail
            const dmData: ColdDM = outreach.coldDM
            setColdEmail(renderColdEmail(emailData))
            setColdDM(renderColdDM(dmData))
          }
        } catch {
          // Outreach generation is optional, don't block resume
          console.error("Outreach generation failed")
        }

        try {
          const coverLetterResponse = await fetch("/api/generate-cover-letter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resume, jobDescription: jd }),
          })

          if (coverLetterResponse.ok) {
            const { coverLetter: clData } = await coverLetterResponse.json()
            setCoverLetter(clData)
          }
        } catch {
          console.error("Cover letter generation failed")
        }
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
  }, [])

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
          <LaTeXPreview
            latexCode={latexCode}
            resumeData={resumeData}
            highlights={highlights}
            onResumeChange={(updatedResume, updatedLatex) => {
              setResumeData(updatedResume)
              setLatexCode(updatedLatex)
            }}
          />
          {coverLetter && <CoverLetterPreview coverLetter={coverLetter} />}
          {coldEmail && coldDM && (
            <OutreachPreview email={coldEmail} dm={coldDM} />
          )}
          <div className="flex justify-center gap-2 pt-2">
            <Button variant="outline" onClick={handleBackToEdit} className="glass-pill">
              <UndoIcon size={14} className="mr-1.5 shrink-0" />
              Back to Edit
            </Button>
            <Button variant="outline" onClick={handleDownloadTeX} className="glass-pill">
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
                  <JDInputStep value={jd} onChange={setJd} />
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
