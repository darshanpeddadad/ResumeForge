import mammoth from "mammoth";
import { extractTextFromPDF, extractContactLinksFromPDF, type ContactLinks } from "./pdf-parser";

export function isWordDocument(file: File): boolean {
  if (!file) return false;
  const name = (file.name || "").toLowerCase().trim();
  const type = (file.type || "").toLowerCase().trim();
  return (
    name.endsWith(".docx") ||
    name.endsWith(".doc") ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    type === "application/msword"
  );
}

export function isPDFDocument(file: File): boolean {
  if (!file) return false;
  const name = (file.name || "").toLowerCase().trim();
  const type = (file.type || "").toLowerCase().trim();
  return name.endsWith(".pdf") || type === "application/pdf" || type === "application/x-pdf";
}

export function isTextDocument(file: File): boolean {
  if (!file) return false;
  const name = (file.name || "").toLowerCase().trim();
  const type = (file.type || "").toLowerCase().trim();

  // Known text file extensions
  if (
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".text") ||
    name.endsWith(".markdown") ||
    name.endsWith(".rtf") ||
    name.endsWith(".log") ||
    name.endsWith(".json")
  ) {
    return true;
  }

  // Known text MIME types
  if (
    type.startsWith("text/") ||
    type === "application/json" ||
    type === "application/x-markdown"
  ) {
    return true;
  }

  // If it is explicitly NOT a PDF and NOT a Word doc, treat as text document
  if (!isPDFDocument(file) && !isWordDocument(file)) {
    return true;
  }

  return false;
}

export function extractContactLinksFromText(text: string): ContactLinks {
  const links: ContactLinks = {};
  const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_\-]+(?:\/[^\s)]*)?/i);
  if (linkedinMatch) {
    const raw = linkedinMatch[0].replace(/[.,;:)]+$/, "");
    links.linkedin = raw.startsWith("http") ? raw : `https://${raw}`;
  }
  const githubMatch = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_\-]+(?:\/[^\s)]*)?/i);
  if (githubMatch) {
    const raw = githubMatch[0].replace(/[.,;:)]+$/, "");
    links.github = raw.startsWith("http") ? raw : `https://${raw}`;
  }
  return links;
}

export async function extractTextFromFile(file: File): Promise<string> {
  // 1. Text documents (.txt, .md, raw notes) - read instantly via browser API
  if (isTextDocument(file)) {
    return await file.text();
  }

  // 2. Word documents (.docx, .doc)
  if (isWordDocument(file)) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (wordErr) {
      console.warn("Word extraction failed, attempting text read:", wordErr);
      return await file.text();
    }
  }

  // 3. PDF documents
  if (isPDFDocument(file)) {
    try {
      return await extractTextFromPDF(file);
    } catch (pdfErr) {
      console.warn("PDF extraction failed, attempting plain text fallback:", pdfErr);
      try {
        const fallbackText = await file.text();
        if (fallbackText && fallbackText.trim().length > 0 && !fallbackText.includes("\u0000")) {
          return fallbackText;
        }
      } catch {
        // Fallback failed
      }
      throw new Error(
        "Could not read PDF document. The file may be password-protected, corrupted, or not a valid PDF. Please try uploading a Word (.docx) or plain text (.txt) file."
      );
    }
  }

  // 4. Any other file type: attempt direct text read
  try {
    const text = await file.text();
    if (text && text.trim().length > 0) {
      return text;
    }
  } catch (err) {
    console.error("Text extraction failed:", err);
  }

  return extractTextFromPDF(file);
}

export async function extractLinksFromFile(file: File): Promise<ContactLinks> {
  if (isTextDocument(file)) {
    try {
      const text = await file.text();
      return extractContactLinksFromText(text);
    } catch {
      return {};
    }
  }

  if (isWordDocument(file)) {
    return {};
  }

  if (isPDFDocument(file)) {
    try {
      return await extractContactLinksFromPDF(file);
    } catch (err) {
      console.warn("PDF link extraction failed gracefully:", err);
      return {};
    }
  }

  // Fallback: try parsing links as plain text
  try {
    const text = await file.text();
    return extractContactLinksFromText(text);
  } catch {
    return {};
  }
}


