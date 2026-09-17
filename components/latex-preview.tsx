"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CloudDownloadIcon } from "@/components/ui/cloud-download";
import { Copy01Icon } from "@/components/ui/copy-01";
import { CircleCheckIcon } from "@/components/ui/circle-check";
import { RefreshIcon } from "@/components/ui/refresh";
import { FileText } from "lucide-react";
import { ResumePreview } from "@/components/resume-preview";
import { ResumeEditor } from "@/components/resume-editor";
import { PdfResume } from "@/components/pdf-resume";
import type { Resume } from "@/lib/schemas/resume";
import type { Highlights } from "@/lib/highlights";
import { generateLatex } from "@/lib/latex-renderer";
import { generateResumeDocx } from "@/lib/docx-renderer";

interface LaTeXPreviewProps {
  latexCode: string;
  resumeData: Resume;
  highlights?: Highlights | null;
  onResumeChange?: (updated: Resume, updatedLatex: string) => void;
}

export function LaTeXPreview({
  latexCode: initialLatexCode,
  resumeData: initialResumeData,
  highlights,
  onResumeChange,
}: LaTeXPreviewProps) {
  const [currentResume, setCurrentResume] = useState<Resume>(initialResumeData);
  const [currentLatex, setCurrentLatex] = useState<string>(initialLatexCode);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);

  // Sync if parent updates
  const resumeData = currentResume;
  const latexCode = currentLatex;

  const handleResumeUpdate = (updated: Resume) => {
    setCurrentResume(updated);
    const newLatex = generateLatex(updated);
    setCurrentLatex(newLatex);
    if (onResumeChange) {
      onResumeChange(updated, newLatex);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(latexCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const blob = await pdf(<PdfResume resume={resumeData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = resumeData.contact.name
        ? resumeData.contact.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")
        : "resume";
      a.download = `${safeName}_resume.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Failed to generate PDF. Try downloading the .tex file instead."
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadDOCX = async () => {
    setIsDownloadingDocx(true);
    try {
      const blob = await generateResumeDocx(resumeData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = resumeData.contact.name
        ? resumeData.contact.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")
        : "resume";
      a.download = `${safeName}_resume.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("DOCX generation failed:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Failed to generate Word document (.docx)."
      );
    } finally {
      setIsDownloadingDocx(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">Generated Resume</CardTitle>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="rounded-xl h-8 text-xs font-medium border-border/60"
          >
            {copied ? (
              <CircleCheckIcon size={13} className="mr-1.5 shrink-0 text-emerald-400" />
            ) : (
              <Copy01Icon size={13} className="mr-1.5 shrink-0" />
            )}
            {copied ? "Copied!" : "Copy LaTeX"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadDOCX}
            disabled={isDownloadingDocx}
            className="rounded-xl h-8 text-xs font-medium border-border/60 hover:border-primary/50 hover:bg-primary/5 text-foreground"
          >
            {isDownloadingDocx ? (
              <RefreshIcon size={13} className="mr-1.5 shrink-0 animate-spin text-primary" />
            ) : (
              <FileText size={13} className="mr-1.5 shrink-0 text-primary" />
            )}
            {isDownloadingDocx ? "Generating..." : "Download DOCX"}
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="glossy-btn-primary rounded-xl h-8 text-xs font-semibold text-black"
          >
            {isDownloading ? (
              <RefreshIcon size={13} className="mr-1.5 shrink-0 animate-spin" />
            ) : (
              <CloudDownloadIcon size={13} className="mr-1.5 shrink-0" />
            )}
            {isDownloading ? "Compiling..." : "Download PDF"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="preview">
          <TabsList className="w-full">
            <TabsTrigger value="preview" className="flex-1">
              Preview
            </TabsTrigger>
            <TabsTrigger value="edit" className="flex-1">
              Edit Resume
            </TabsTrigger>
            <TabsTrigger value="code" className="flex-1">
              LaTeX Code
            </TabsTrigger>
          </TabsList>
          <TabsContent value="preview">
            <div className="rounded-md border overflow-auto max-h-[700px]">
              <ResumePreview resume={resumeData} highlights={highlights} />
            </div>
          </TabsContent>
          <TabsContent value="edit">
            <div className="rounded-md border p-4 max-h-[700px] overflow-y-auto">
              <ResumeEditor resume={resumeData} onChange={handleResumeUpdate} />
            </div>
          </TabsContent>
          <TabsContent value="code">
            <ScrollArea className="h-[500px] rounded-md border bg-muted/30 p-4">
              <pre className="text-xs leading-relaxed">
                <code>{latexCode}</code>
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
