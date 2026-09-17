"use client";

import { useState } from "react";
import { pdf, Document, Page, Text, StyleSheet } from "@react-pdf/renderer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy01Icon } from "@/components/ui/copy-01";
import { CircleCheckIcon } from "@/components/ui/circle-check";
import { CloudDownloadIcon } from "@/components/ui/cloud-download";
import { File01Icon } from "@/components/ui/file-01";
import { RefreshIcon } from "@/components/ui/refresh";
import { UndoIcon } from "@/components/ui/undo";
import type { CoverLetterResult } from "@/lib/cover-letter-generator";
import { generateCoverLetterDocx } from "@/lib/docx-renderer";

const pdfStyles = StyleSheet.create({
  page: {
    padding: "45 50",
    fontSize: 11,
    lineHeight: 1.5,
    fontFamily: "Times-Roman",
    color: "#111111",
  },
  paragraph: {
    marginBottom: 12,
  },
});

function PdfCoverLetterDoc({ text }: { text: string }) {
  const paragraphs = text.split("\n\n").filter((p) => p.trim().length > 0);
  return (
    <Document>
      <Page size="LETTER" style={pdfStyles.page}>
        {paragraphs.map((para, i) => (
          <Text key={i} style={pdfStyles.paragraph}>
            {para}
          </Text>
        ))}
      </Page>
    </Document>
  );
}

interface CoverLetterPreviewProps {
  coverLetter: CoverLetterResult;
}

export function CoverLetterPreview({ coverLetter }: CoverLetterPreviewProps) {
  const [text, setText] = useState(coverLetter.fullText);
  const [copied, setCopied] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [showRationale, setShowRationale] = useState(false);

  const isEdited = text !== coverLetter.fullText;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const cleanCompany = coverLetter.companyName.toLowerCase().replace(/[^a-z0-9]/g, "-");
    a.download = `cover-letter-${cleanCompany || "tailored"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadDocx = async () => {
    setIsDownloadingDocx(true);
    try {
      const cleanCompany = coverLetter.companyName.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const filename = `cover-letter-${cleanCompany || "tailored"}.docx`;
      const blob = await generateCoverLetterDocx(
        text,
        `Cover Letter - ${coverLetter.roleTitle} at ${coverLetter.companyName}`
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to compile cover letter Word doc:", err);
      alert("Failed to compile Word document. You can download the PDF or .txt version instead.");
    } finally {
      setIsDownloadingDocx(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const blob = await pdf(<PdfCoverLetterDoc text={text} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cleanCompany = coverLetter.companyName.toLowerCase().replace(/[^a-z0-9]/g, "-");
      a.download = `cover-letter-${cleanCompany || "tailored"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to compile cover letter PDF:", err);
      alert("Failed to compile PDF. You can download the .txt version instead.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleReset = () => {
    setText(coverLetter.fullText);
  };

  return (
    <Card className="glass-card w-full border border-border/50 shadow-2xl backdrop-blur-xl">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <File01Icon size={18} className="text-primary shrink-0" />
            <CardTitle className="text-lg">Tailored Cover Letter</CardTitle>
            {isEdited && (
              <span className="text-[10px] bg-amber-500/15 text-amber-600 px-2 py-0.5 rounded-full font-medium">
                Edited
              </span>
            )}
          </div>
          <CardDescription className="mt-1">
            Tailored for <span className="font-semibold text-foreground">{coverLetter.roleTitle}</span> at{" "}
            <span className="font-semibold text-foreground">{coverLetter.companyName}</span>
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isEdited && (
            <Button variant="ghost" size="sm" onClick={handleReset} title="Reset to original">
              <UndoIcon size={13} className="mr-1 shrink-0" />
              Reset
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleDownloadTxt}>
            <CloudDownloadIcon size={14} className="mr-1.5 shrink-0" />
            .txt
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadDocx} disabled={isDownloadingDocx}>
            {isDownloadingDocx ? (
              <RefreshIcon size={14} className="mr-1.5 shrink-0 animate-spin" />
            ) : (
              <CloudDownloadIcon size={14} className="mr-1.5 shrink-0" />
            )}
            {isDownloadingDocx ? "Compiling..." : "Word (.docx)"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={isDownloadingPdf}>
            {isDownloadingPdf ? (
              <RefreshIcon size={14} className="mr-1.5 shrink-0 animate-spin" />
            ) : (
              <CloudDownloadIcon size={14} className="mr-1.5 shrink-0" />
            )}
            {isDownloadingPdf ? "Compiling..." : "PDF"}
          </Button>
          <Button size="sm" onClick={handleCopy}>
            {copied ? (
              <CircleCheckIcon size={14} className="mr-1.5 shrink-0 text-green-500" />
            ) : (
              <Copy01Icon size={14} className="mr-1.5 shrink-0" />
            )}
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {coverLetter.subject && (
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
            <span className="font-medium text-muted-foreground">Subject: </span>
            <span className="font-mono text-foreground">{coverLetter.subject}</span>
          </div>
        )}

        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            className="w-full resize-y rounded-md border bg-background p-4 text-sm leading-relaxed text-foreground font-sans focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Edit your cover letter here before downloading..."
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-3">
            <span>{wordCount} words</span>
            <span>·</span>
            <span>{charCount} characters</span>
            <span className="italic text-muted-foreground/80">(Editable in-place)</span>
          </div>
          {coverLetter.whyMatched && coverLetter.whyMatched.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowRationale(!showRationale)}
            >
              {showRationale ? "Hide alignment details" : "Why these points were selected"}
            </Button>
          )}
        </div>

        {showRationale && coverLetter.whyMatched && coverLetter.whyMatched.length > 0 && (
          <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Strategic Alignment with Job Description
            </p>
            <ul className="space-y-1.5 text-xs text-foreground">
              {coverLetter.whyMatched.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary font-bold">→</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
