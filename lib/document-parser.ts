import mammoth from "mammoth";
import { extractTextFromPDF, extractContactLinksFromPDF, type ContactLinks } from "./pdf-parser";

export function isWordDocument(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".docx") ||
    name.endsWith(".doc") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type === "application/msword"
  );
}

export function isTextDocument(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".markdown") ||
    file.type === "text/plain" ||
    file.type === "text/markdown"
  );
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
  if (isTextDocument(file)) {
    return await file.text();
  }
  if (isWordDocument(file)) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }
  return extractTextFromPDF(file);
}

export async function extractLinksFromFile(file: File): Promise<ContactLinks> {
  if (isTextDocument(file)) {
    const text = await file.text();
    return extractContactLinksFromText(text);
  }
  if (isWordDocument(file)) {
    return {};
  }
  return extractContactLinksFromPDF(file);
}

