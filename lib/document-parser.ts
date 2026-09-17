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

export async function extractTextFromFile(file: File): Promise<string> {
  if (isWordDocument(file)) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }
  return extractTextFromPDF(file);
}

export async function extractLinksFromFile(file: File): Promise<ContactLinks> {
  if (isWordDocument(file)) {
    return {};
  }
  return extractContactLinksFromPDF(file);
}
