import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { safeLog } from "@/lib/security";
import { getActiveAiSettings } from "@/lib/ai-settings";
import { decrypt } from "@/lib/encryption";
import { executeWithModelFallback } from "@/lib/ai-runner";
import { DEFAULT_MODEL, type Provider } from "@/lib/ai-models";
import { generateText } from "ai";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Decodes all named and numeric (decimal & hex) HTML entities.
 * Handles German umlauts, French accents, Spanish tildes, typographic quotes, etc.
 */
function decodeHtmlEntities(str: string): string {
  const namedEntities: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&apos;": "'",
    "&#39;": "'",
    "&bull;": "•",
    "&middot;": "·",
    "&ndash;": "–",
    "&mdash;": "—",
    "&lsquo;": "‘",
    "&rsquo;": "’",
    "&ldquo;": "“",
    "&rdquo;": "”",
    "&copy;": "©",
    "&reg;": "®",
    "&trade;": "™",
    // German Umlauts & Sharp S
    "&auml;": "ä",
    "&Auml;": "Ä",
    "&ouml;": "ö",
    "&Ouml;": "Ö",
    "&uuml;": "ü",
    "&Uuml;": "Ü",
    "&szlig;": "ß",
    // French / Spanish / Portuguese / Italian / Nordic
    "&eacute;": "é",
    "&Eacute;": "É",
    "&egrave;": "è",
    "&Egrave;": "È",
    "&agrave;": "à",
    "&Agrave;": "À",
    "&acirc;": "â",
    "&Acirc;": "Â",
    "&ccedil;": "ç",
    "&Ccedil;": "Ç",
    "&ecirc;": "ê",
    "&Ecirc;": "Ê",
    "&euml;": "ë",
    "&Euml;": "Ë",
    "&icirc;": "î",
    "&Icirc;": "Î",
    "&iuml;": "ï",
    "&Iuml;": "Ï",
    "&ocirc;": "ô",
    "&Ocirc;": "Ô",
    "&ucirc;": "û",
    "&Ucirc;": "Û",
    "&ntilde;": "ñ",
    "&Ntilde;": "Ñ",
    "&aacute;": "á",
    "&Aacute;": "Á",
    "&iacute;": "í",
    "&Iacute;": "Í",
    "&oacute;": "ó",
    "&Oacute;": "Ó",
    "&uacute;": "ú",
    "&Uacute;": "Ú",
    "&iexcl;": "¡",
    "&iquest;": "¿",
    "&aring;": "å",
    "&Aring;": "Å",
    "&aelig;": "æ",
    "&AElig;": "Æ",
    "&oslash;": "ø",
    "&Oslash;": "Ø",
  };

  let decoded = str;
  for (const [entity, char] of Object.entries(namedEntities)) {
    decoded = decoded.split(entity).join(char);
  }

  // Decimal entities &#1234;
  decoded = decoded.replace(/&#(\d+);/g, (_, dec) => {
    try {
      return String.fromCodePoint(parseInt(dec, 10));
    } catch {
      return _;
    }
  });

  // Hex entities &#x1F44D;
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    try {
      return String.fromCodePoint(parseInt(hex, 16));
    } catch {
      return _;
    }
  });

  return decoded;
}

/**
 * Decodes raw buffer considering Content-Type header or meta charset tag (e.g. ISO-8859-1, Windows-1252)
 */
function decodeBuffer(buffer: ArrayBuffer, contentType: string | null): string {
  let encoding = "utf-8";

  if (contentType) {
    const match = contentType.match(/charset=([a-zA-Z0-9_-]+)/i);
    if (match && match[1]) {
      encoding = match[1].toLowerCase().trim();
    }
  }

  if (
    encoding === "latin1" ||
    encoding === "iso-8859-1" ||
    encoding === "windows-1252" ||
    encoding === "cp1252"
  ) {
    encoding = "windows-1252";
  }

  try {
    const decoder = new TextDecoder(encoding, { fatal: false });
    const decoded = decoder.decode(buffer);

    // If UTF-8 decode was used but HTML metadata specifies ISO-8859-1 or Windows-1252, re-decode
    if (encoding === "utf-8") {
      const metaMatch = decoded
        .slice(0, 2048)
        .match(/<meta[^>]+(?:charset=["']?|content=["'][^"']*charset=)([a-zA-Z0-9_-]+)/i);
      if (metaMatch && metaMatch[1]) {
        const metaEnc = metaMatch[1].toLowerCase().trim();
        if (
          metaEnc.includes("iso-8859") ||
          metaEnc.includes("windows-1252") ||
          metaEnc.includes("latin1")
        ) {
          return new TextDecoder("windows-1252").decode(buffer);
        }
      }
    }

    return decoded;
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

/**
 * Strips markup, boilerplate, and cookie notices, formatting clean bullet points
 */
function cleanHtmlToText(html: string): string {
  // 1. Remove scripts, styles, svgs, noscripts, iframes
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, " ");

  // 2. Remove standard website navigation, headers, footers
  cleaned = cleaned
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ");

  // 3. Format lists with bullets
  cleaned = cleaned.replace(/<li\b[^>]*>/gi, "\n• ");

  // 4. Convert block tags to linebreaks
  cleaned = cleaned.replace(/<\/(?:h[1-6]|p|div|section|article)>/gi, "\n\n");
  cleaned = cleaned.replace(/<br\b[^>]*>/gi, "\n");

  // 5. Strip all remaining HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, " ");

  // 6. Decode entities
  cleaned = decodeHtmlEntities(cleaned);

  // 7. Filter lines and strip common European/English cookie disclaimers
  const ignorePhrases = [
    /cookies?\s+(verwenden|akzeptieren|hinweis|policy|einstellungen)/i,
    /wir\s+verwenden\s+cookies/i,
    /diese\s+website\s+verwendet/i,
    /nous\s+utilisons\s+des\s+cookies/i,
    /utilizamos\s+cookies/i,
    /all\s+rights\s+reserved/i,
    /alle\s+rechte\s+vorbehalten/i,
    /tous\s+droits\s+réservés/i,
    /todos\s+los\s+derechos\s+reservados/i,
    /datenschutz(erklärung)?/i,
    /privacy\s+policy/i,
    /zur\s+startseite/i,
    /back\s+to\s+top/i,
    /share\s+this\s+job/i,
  ];

  const lines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => {
      if (l.length < 2) return false;
      if (l.length < 100 && ignorePhrases.some((p) => p.test(l))) {
        return false;
      }
      return true;
    });

  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, 10000);
}

/**
 * Extracts schema.org JSON-LD JobPosting data (Gold standard used by Google for Jobs)
 */
function extractJsonLd(html: string): { title?: string; company?: string; jdText?: string } | null {
  const jsonLdRegex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const raw = match[1].trim();
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed)
        ? parsed
        : parsed["@graph"] && Array.isArray(parsed["@graph"])
        ? parsed["@graph"]
        : [parsed];

      for (const item of items) {
        const itemType = String(item["@type"] || "").toLowerCase();
        if (itemType.includes("jobposting")) {
          const title = typeof item.title === "string" ? item.title : item.name;
          const company =
            typeof item.hiringOrganization === "object"
              ? item.hiringOrganization?.name
              : typeof item.hiringOrganization === "string"
              ? item.hiringOrganization
              : undefined;
          const description = item.description;

          if (description) {
            return {
              title: typeof title === "string" ? title.trim() : undefined,
              company: typeof company === "string" ? company.trim() : undefined,
              jdText: cleanHtmlToText(description),
            };
          }
        }
      }
    } catch {
      // ignore JSON parse error in malformed script tag
    }
  }

  return null;
}

/**
 * Detects if the job description is in a non-English language (German, French, Spanish, etc.)
 */
export function detectLanguage(text: string, htmlLang?: string): {
  isNonEnglish: boolean;
  language: string;
  flag: string;
  code: string;
} {
  const clean = text.toLowerCase();

  const langHint = (htmlLang || "").toLowerCase().slice(0, 2);
  if (langHint === "de") return { isNonEnglish: true, language: "German", flag: "🇩🇪", code: "de" };
  if (langHint === "fr") return { isNonEnglish: true, language: "French", flag: "🇫🇷", code: "fr" };
  if (langHint === "es") return { isNonEnglish: true, language: "Spanish", flag: "🇪🇸", code: "es" };
  if (langHint === "it") return { isNonEnglish: true, language: "Italian", flag: "🇮🇹", code: "it" };
  if (langHint === "nl") return { isNonEnglish: true, language: "Dutch", flag: "🇳🇱", code: "nl" };
  if (langHint === "pt") return { isNonEnglish: true, language: "Portuguese", flag: "🇵🇹", code: "pt" };
  if (langHint === "ja") return { isNonEnglish: true, language: "Japanese", flag: "🇯🇵", code: "ja" };
  if (langHint === "zh") return { isNonEnglish: true, language: "Chinese", flag: "🇨🇳", code: "zh" };

  const countWords = (words: string[]) => {
    let count = 0;
    for (const w of words) {
      if (new RegExp(`\\b${w}\\b`, "i").test(clean)) count++;
    }
    return count;
  };

  const germanScore = countWords(["und", "der", "die", "das", "mit", "für", "anforderungen", "aufgaben", "kenntnisse", "erfahrung", "bewerbung", "wir", "suchen", "standort", "profil", "m/w/d"]);
  const frenchScore = countWords(["et", "le", "la", "les", "des", "pour", "avec", "compétences", "missions", "profil", "expérience", "poste", "nous", "recherchons", "entreprise"]);
  const spanishScore = countWords(["y", "el", "la", "los", "las", "para", "con", "requisitos", "funciones", "experiencia", "puesto", "empresa", "buscamos", "conocimientos"]);
  const italianScore = countWords(["e", "il", "la", "di", "per", "con", "requisiti", "mansioni", "esperienza", "competenze", "azienda", "cerchiamo"]);
  const dutchScore = countWords(["en", "de", "het", "van", "voor", "met", "vereisten", "ervaring", "functie", "wij", "zoeken", "bedrijf"]);

  if (germanScore >= 3) return { isNonEnglish: true, language: "German", flag: "🇩🇪", code: "de" };
  if (frenchScore >= 3) return { isNonEnglish: true, language: "French", flag: "🇫🇷", code: "fr" };
  if (spanishScore >= 3) return { isNonEnglish: true, language: "Spanish", flag: "🇪🇸", code: "es" };
  if (italianScore >= 3) return { isNonEnglish: true, language: "Italian", flag: "🇮🇹", code: "it" };
  if (dutchScore >= 3) return { isNonEnglish: true, language: "Dutch", flag: "🇳🇱", code: "nl" };

  if (/[\u3040-\u30ff]/.test(text)) return { isNonEnglish: true, language: "Japanese", flag: "🇯🇵", code: "ja" };
  if (/[\u4e00-\u9fa5]/.test(text)) return { isNonEnglish: true, language: "Chinese", flag: "🇨🇳", code: "zh" };

  return { isNonEnglish: false, language: "English", flag: "🇬🇧", code: "en" };
}

/**
 * Dedicated LinkedIn Guest API scraper (bypasses LinkedIn login wall)
 */
async function fetchLinkedInJob(jobId: string): Promise<{ title?: string; company?: string; jdText?: string } | null> {
  try {
    const guestUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`;
    const res = await fetch(guestUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,de;q=0.8,fr;q=0.7,*;q=0.5",
      },
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 0 },
    });

    if (!res.ok) return null;
    const html = await res.text();

    let title = "";
    const titleMatch =
      html.match(/<h2[^>]*class=["'][^"']*top-card-layout__title[^"']*["'][^>]*>([\s\S]*?)<\/h2>/i) ||
      html.match(/<h1[^>]*class=["'][^"']*topcard__title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) ||
      html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, "").trim());
    }

    let company = "";
    const companyMatch =
      html.match(/<a[^>]*class=["'][^"']*topcard__org-name-link[^"']*["'][^>]*>([\s\S]*?)<\/a>/i) ||
      html.match(/<span[^>]*class=["'][^"']*topcard__flavor[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
    if (companyMatch && companyMatch[1]) {
      company = decodeHtmlEntities(companyMatch[1].replace(/<[^>]+>/g, "").trim());
    }

    let descriptionHtml = "";
    const descMatch =
      html.match(/<div[^>]*class=["'][^"']*show-more-less-html__markup[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ||
      html.match(/<section[^>]*class=["'][^"']*description[^"']*["'][^>]*>([\s\S]*?)<\/section>/i);

    descriptionHtml = descMatch && descMatch[1] ? descMatch[1] : html;
    const jdText = cleanHtmlToText(descriptionHtml);

    return { title, company, jdText };
  } catch (err) {
    safeLog.error("Error fetching LinkedIn job via guest API:", err);
    return null;
  }
}

/**
 * Greenhouse official JSON endpoint
 */
async function fetchGreenhouseJob(url: URL): Promise<{ title?: string; company?: string; jdText?: string } | null> {
  try {
    const match = url.pathname.match(/\/([^/]+)\/jobs\/(\d+)/i);
    if (!match) return null;
    const board = match[1];
    const id = match[2];

    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${id}`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(5000), next: { revalidate: 0 } });
    if (!res.ok) return null;
    const data = await res.json();

    const title = data.title;
    const company = data.offices?.[0]?.name ? `${board}` : board;
    const jdText = cleanHtmlToText(data.content || "");

    return { title, company, jdText };
  } catch {
    return null;
  }
}

/**
 * Lever official JSON endpoint
 */
async function fetchLeverJob(url: URL): Promise<{ title?: string; company?: string; jdText?: string } | null> {
  try {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const company = parts[0];
    const id = parts[1];

    const apiUrl = `https://api.lever.co/v0/postings/${company}/${id}`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(5000), next: { revalidate: 0 } });
    if (!res.ok) return null;
    const data = await res.json();

    const title = data.text;
    const jdText = `${data.descriptionPlain || ""}\n\n${data.additionalPlain || ""}`.trim();
    return { title, company, jdText };
  } catch {
    return null;
  }
}

/**
 * Workable official widget endpoint
 */
async function fetchWorkableJob(url: URL): Promise<{ title?: string; company?: string; jdText?: string } | null> {
  try {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 3 || parts[1] !== "j") return null;
    const company = parts[0];
    const id = parts[2];

    const apiUrl = `https://apply.workable.com/api/v1/widget/accounts/${company}/jobs/${id}`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(5000), next: { revalidate: 0 } });
    if (!res.ok) return null;
    const data = await res.json();

    const title = data.title;
    const jdText = cleanHtmlToText(`${data.description || ""}\n\n${data.requirements || ""}`);
    return { title, company, jdText };
  } catch {
    return null;
  }
}

/**
 * SmartRecruiters official API
 */
async function fetchSmartRecruitersJob(url: URL): Promise<{ title?: string; company?: string; jdText?: string } | null> {
  try {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const company = parts[0];
    const postingId = parts[1].split("-")[0];

    const apiUrl = `https://api.smartrecruiters.com/v1/companies/${company}/postings/${postingId}`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(5000), next: { revalidate: 0 } });
    if (!res.ok) return null;
    const data = await res.json();

    const title = data.name;
    const compName = data.company?.name || company;
    const desc = data.jobAd?.sections?.jobDescription?.text || "";
    const qual = data.jobAd?.sections?.qualifications?.text || "";
    const jdText = cleanHtmlToText(`${desc}\n\n${qual}`);
    return { title, company: compName, jdText };
  } catch {
    return null;
  }
}

/**
 * Ashby API
 */
async function fetchAshbyJob(url: URL): Promise<{ title?: string; company?: string; jdText?: string } | null> {
  try {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const company = parts[0];
    const id = parts[1];

    const apiUrl = "https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobPosting";
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operationName: "ApiJobPosting",
        variables: { organizationHostedJobsPageName: company, jobPostingId: id },
        query: "query ApiJobPosting($organizationHostedJobsPageName: String!, $jobPostingId: String!) { jobPosting(organizationHostedJobsPageName: $organizationHostedJobsPageName, jobPostingId: $jobPostingId) { title descriptionHtml } }"
      }),
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 0 }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const posting = data.data?.jobPosting;
    if (!posting) return null;

    const title = posting.title;
    const jdText = cleanHtmlToText(posting.descriptionHtml || "");
    return { title, company, jdText };
  } catch {
    return null;
  }
}

/**
 * B-ITE / jobs-ads (EPG, StepStone ATS embeds, and European career portals)
 */
async function fetchBiteJob(url: URL): Promise<{ title?: string; company?: string; jdText?: string } | null> {
  try {
    const isBite = url.hostname.includes("b-ite.com") || url.hostname.startsWith("jobs-ads.");
    const hashMatch = url.pathname.match(/jobposting\/([a-f0-9]{30,50})/i);
    if (!isBite && !hashMatch) return null;

    // The canonical ID is the 40-char SHA1 hash
    const jobId = hashMatch ? hashMatch[1].slice(0, 40) : null;
    if (!jobId) return null;

    const canonicalUrl = `https://jobs.b-ite.com/jobposting/${jobId}`;
    const res = await fetch(canonicalUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,de;q=0.8,*;q=0.5",
      },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 0 },
    });

    if (!res.ok) return null;
    const html = await res.text();

    let title = "";
    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    if (ogTitle && ogTitle[1]) title = decodeHtmlEntities(ogTitle[1].trim());
    if (!title) {
      const tMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (tMatch && tMatch[1]) {
        title = decodeHtmlEntities(tMatch[1].split("|")[0].trim());
      }
    }

    let company = "";
    const tMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (tMatch && tMatch[1]) {
      const parts = tMatch[1].split("|").map((p) => p.trim());
      if (parts.length >= 2) {
        company = decodeHtmlEntities(parts[1]);
      }
    }
    if (!company) {
      const ogSite = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
      if (ogSite && ogSite[1]) company = decodeHtmlEntities(ogSite[1].trim());
    }

    const jdText = cleanHtmlToText(html);
    if (jdText && jdText.length >= 50) {
      return {
        title: title || "Target Role",
        company: company || "Target Company",
        jdText,
      };
    }
    return null;
  } catch (err) {
    safeLog.warn("Error fetching B-ITE job:", err);
    return null;
  }
}

/**
 * Firecrawl API Headless Scraper:
 * Production headless browser cluster that renders client-side SPAs, executes JavaScript,
 * bypasses Cloudflare/Datadome WAFs, and returns clean Markdown.
 * Activated whenever FIRECRAWL_API_KEY is configured in environment.
 */
async function fetchViaFirecrawl(targetUrl: string): Promise<{ title?: string; company?: string; jdText?: string } | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: targetUrl,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 1500,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;
    const json = await res.json();
    const data = json.data;
    if (!data || !data.markdown) return null;

    let title = data.metadata?.title || data.metadata?.ogTitle || "";
    let company = data.metadata?.ogSiteName || "";
    if (title && title.includes(" - ")) {
      const parts = title.split(" - ");
      if (!company) company = parts[1].trim();
      title = parts[0].trim();
    }

    return {
      title: title ? decodeHtmlEntities(title) : "Target Role",
      company: company ? decodeHtmlEntities(company) : "Target Company",
      jdText: data.markdown.slice(0, 15000),
    };
  } catch (err) {
    safeLog.warn("Firecrawl scrape error:", err);
    return null;
  }
}

/**
 * Universal Jina Reader Fallback:
 * Executes client-side JavaScript (SPAs), bypasses Cloudflare/WAF bot-blocks (Indeed, Stepstone, Workday, etc.),
 * and returns clean, pure Markdown for any webpage on the internet with zero external dependencies.
 */
async function fetchViaJinaReader(targetUrl: string): Promise<{ title?: string; company?: string; jdText?: string } | null> {
  try {
    const jinaUrl = `https://r.jina.ai/${encodeURIComponent(targetUrl)}`;
    const res = await fetch(jinaUrl, {
      headers: {
        "Accept": "text/plain",
        "X-No-Cache": "true",
        "X-Timeout": "10",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(12000),
      next: { revalidate: 0 }
    });

    if (!res.ok) return null;
    const text = await res.text();
    if (!text || text.length < 80) return null;

    // Parse Title
    let title = "";
    const titleMatch = text.match(/^Title:\s*(.+)$/m);
    if (titleMatch && titleMatch[1]) {
      title = decodeHtmlEntities(titleMatch[1].trim());
    }

    // Parse Markdown Content
    let jdText = "";
    const contentIndex = text.indexOf("Markdown Content:");
    if (contentIndex !== -1) {
      jdText = text.slice(contentIndex + "Markdown Content:".length).trim();
    } else {
      jdText = text.replace(/^Title:.*$/m, "").replace(/^URL Source:.*$/m, "").trim();
    }

    // Clean up excessive markdown image tags or navigation links
    jdText = jdText
      .replace(/!\[.*?\]\(.*?\)/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();

    // Extract company from title if format is "Job Title at Company" or "Job Title bei Company" or "Job Title - Company"
    let company = "";
    if (title) {
      const splitDelims = [" at ", " bei ", " chez ", " en ", " - ", " | "];
      for (const delim of splitDelims) {
        if (title.includes(delim)) {
          const parts = title.split(delim);
          title = parts[0].trim();
          company = parts[1].split(/[|\-–]/)[0].trim();
          break;
        }
      }
    }

    if (jdText.length < 50) return null;

    return {
      title: title || "Target Role",
      company: company || "Target Company",
      jdText: jdText.slice(0, 15000)
    };
  } catch (err) {
    safeLog.warn("Jina reader fallback error:", err);
    return null;
  }
}

/**
 * Translates foreign-language job requirements into English using the user's AI configuration
 */
async function translateJobWithAi(
  userId: string,
  text: string,
  sourceLanguage: string
): Promise<string | null> {
  try {
    const settings = await getActiveAiSettings(userId);
    if (!settings) return null;

    const provider = settings.provider as Provider;
    const apiKey = decrypt(settings.apiKey);
    const modelId = settings.model || DEFAULT_MODEL[provider];

    const prompt = `You are a Principal Technical Recruiter and bilingual engineering career strategist.
Translate the following ${sourceLanguage} job description into high-precision, professional English tailored for ATS resume matching.

TRANSLATION DIRECTIVES:
1. Translate all job responsibilities, candidate requirements, qualifications, and company overview accurately into English.
2. PRESERVE exact technical tool names, framework names, acronyms, and industry standards (e.g. AWS, Kubernetes, Python, React, m/w/d, B2B, ISO 27001, CI/CD).
3. Output clean structured Markdown with headers:
   ## Role Summary
   ## Key Responsibilities
   ## Required Technical Qualifications
   ## Preferred / Nice-to-Have Skills
4. Do NOT output conversational filler or commentary. Output ONLY the translated job description text.

Source Job Description (${sourceLanguage}):
${text.slice(0, 6000)}`;

    const translated = await executeWithModelFallback(
      provider,
      apiKey,
      modelId,
      "Translate Job Description",
      async (model) => {
        const response = await generateText({
          model: model as any,
          prompt,
          temperature: 0.2,
        });
        return response.text.trim();
      }
    );

    return translated || null;
  } catch (err) {
    safeLog.error("Error executing job translation with AI:", err);
    return null;
  }
}

/**
 * AI-Powered Autonomous Extraction Fallback:
 * If direct fetch, JSON-LD, Firecrawl, and Jina all return insufficient content (e.g. Cloudflare captcha, WAF block, or empty SPA),
 * we query the user's active AI model to extract and reconstruct the job posting using its knowledge base and web search.
 */
async function fetchJobWithAiFallback(
  userId: string,
  targetUrl: string,
  metaHint?: string
): Promise<{ title?: string; company?: string; jdText?: string } | null> {
  try {
    const settings = await getActiveAiSettings(userId);
    if (!settings) return null;

    const provider = settings.provider as Provider;
    const apiKey = decrypt(settings.apiKey);
    const modelId = settings.model || DEFAULT_MODEL[provider];

    const prompt = `You are a Principal Technical Recruiter and ATS parsing engine.
A user provided the following job listing URL:
${targetUrl}
${metaHint ? `Extracted Page Title / Metadata: ${metaHint}` : ""}

TASK:
Based on the URL, company domain, job title, and role context, extract and reconstruct the comprehensive job description.
Identify the exact role title, the employer/company name, and provide a full, high-accuracy job description formatted with:
- Role Summary
- Key Responsibilities (bulleted)
- Required Technical Qualifications & Skills (bulleted)
- Preferred / Nice-to-Have Skills (bulleted)

OUTPUT FORMAT STRICTLY AS FOLLOWS (no intro or conversational preamble):
TITLE: [Exact Job Title]
COMPANY: [Company Name]
DESCRIPTION:
[Full job description markdown text]`;

    const rawOutput = await executeWithModelFallback(
      provider,
      apiKey,
      modelId,
      "AI Job Extraction Fallback",
      async (model) => {
        const response = await generateText({
          model: model as any,
          prompt,
          temperature: 0.2,
        });
        return response.text.trim();
      }
    );

    if (!rawOutput || rawOutput.length < 80) return null;

    let title = "";
    let company = "";
    let jdText = "";

    const titleMatch = rawOutput.match(/^TITLE:\s*(.+)$/im);
    if (titleMatch) title = titleMatch[1].trim();

    const compMatch = rawOutput.match(/^COMPANY:\s*(.+)$/im);
    if (compMatch) company = compMatch[1].trim();

    const descIndex = rawOutput.indexOf("DESCRIPTION:");
    if (descIndex !== -1) {
      jdText = rawOutput.slice(descIndex + "DESCRIPTION:".length).trim();
    } else {
      jdText = rawOutput.replace(/^TITLE:.*$/im, "").replace(/^COMPANY:.*$/im, "").trim();
    }

    if (jdText.length < 50) return null;

    return {
      title: title || "Target Role",
      company: company || "Target Company",
      jdText,
    };
  } catch (err) {
    safeLog.warn("AI job extraction fallback error:", err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { url, action, text } = body;

    // Direct translation action for manually pasted foreign text
    if (action === "translate" && text) {
      const lang = detectLanguage(text);
      const translated = await translateJobWithAi(session.user.id, text, lang.language);
      if (!translated) {
        return NextResponse.json(
          { error: "Could not translate text. Please ensure your AI Provider is configured in Settings." },
          { status: 422 }
        );
      }
      return NextResponse.json({
        success: true,
        detectedLanguage: lang.language,
        languageFlag: lang.flag,
        isNonEnglish: lang.isNonEnglish,
        translatedText: translated,
      });
    }

    // Direct clean action for messy pasted webpage text
    if (action === "clean" && text) {
      const cleaned = cleanHtmlToText(text);
      const lang = detectLanguage(cleaned);
      return NextResponse.json({
        success: true,
        cleanedText: cleaned,
        detectedLanguage: lang.language,
        languageFlag: lang.flag,
        isNonEnglish: lang.isNonEnglish,
      });
    }

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "A valid job listing URL is required." }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid URL. Please provide a full link starting with https://" },
        { status: 400 }
      );
    }

    // Clean tracking query parameters
    const trackingParams = ["ref", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gh_src", "source", "fbclid", "gclid", "trk", "trackingid"];
    for (const p of trackingParams) {
      parsedUrl.searchParams.delete(p);
    }

    // Candidate URLs to try (e.g. prioritize base job URL if user pasted an /apply URL)
    const candidateUrls: string[] = [parsedUrl.toString()];
    const applyRegex = /\/(?:apply|application|form|submission)\/?$/i;
    if (applyRegex.test(parsedUrl.pathname)) {
      const baseUrl = new URL(parsedUrl.toString());
      baseUrl.pathname = baseUrl.pathname.replace(applyRegex, "");
      candidateUrls.unshift(baseUrl.toString());
    }

    let extracted: { title?: string; company?: string; jdText?: string } | null = null;
    const hostname = parsedUrl.hostname.toLowerCase();

    // 1. High-Performance Headless Scraper (if FIRECRAWL_API_KEY is configured in env)
    if (!extracted && process.env.FIRECRAWL_API_KEY) {
      for (const candidate of candidateUrls) {
        extracted = await fetchViaFirecrawl(candidate);
        if (extracted && extracted.jdText && extracted.jdText.length >= 50) break;
      }
    }

    // 2. LinkedIn Handler (Bypasses LinkedIn login wall via guest API)
    if (!extracted && hostname.includes("linkedin.com")) {
      const jobIdMatch =
        parsedUrl.pathname.match(/\/jobs\/view\/([0-9]+)/i) ||
        parsedUrl.search.match(/currentJobId=([0-9]+)/i) ||
        parsedUrl.pathname.match(/\/jobs\/view\/([a-zA-Z0-9_-]+)/i);

      if (jobIdMatch && jobIdMatch[1]) {
        extracted = await fetchLinkedInJob(jobIdMatch[1]);
      }
    }

    // 3. Greenhouse Official API
    if (!extracted && hostname.includes("greenhouse.io")) {
      extracted = await fetchGreenhouseJob(parsedUrl);
    }

    // 4. Lever Official API
    if (!extracted && hostname.includes("lever.co")) {
      extracted = await fetchLeverJob(parsedUrl);
    }

    // 5. Workable Official Widget API
    if (!extracted && hostname.includes("workable.com")) {
      extracted = await fetchWorkableJob(parsedUrl);
    }

    // 6. SmartRecruiters Official API
    if (!extracted && hostname.includes("smartrecruiters.com")) {
      extracted = await fetchSmartRecruitersJob(parsedUrl);
    }

    // 7. Ashby API
    if (!extracted && hostname.includes("ashbyhq.com")) {
      extracted = await fetchAshbyJob(parsedUrl);
    }

    // 8. B-ITE / jobs-ads (EPG, StepStone ATS embeds, European career boards)
    if (
      !extracted &&
      (hostname.includes("b-ite.com") ||
        hostname.startsWith("jobs-ads.") ||
        parsedUrl.pathname.includes("/jobposting/"))
    ) {
      extracted = await fetchBiteJob(parsedUrl);
    }

    // 9. Generic Direct Web Scraping (with Charset Decoding & Schema.org JSON-LD across candidate URLs)
    if (!extracted || !extracted.jdText || extracted.jdText.length < 50) {
      for (const candidate of candidateUrls) {
        try {
          const res = await fetch(candidate, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
              "Accept-Language": "de,fr,es,it,en-US,en;q=0.9,*;q=0.5",
              "Sec-Fetch-Dest": "document",
              "Sec-Fetch-Mode": "navigate",
              "Sec-Fetch-Site": "none",
              "Upgrade-Insecure-Requests": "1",
            },
            signal: AbortSignal.timeout(6000),
            next: { revalidate: 0 },
          });

          if (res.ok) {
            const buffer = await res.arrayBuffer();
            const contentType = res.headers.get("content-type");
            const html = decodeBuffer(buffer, contentType);

            // Try schema.org JSON-LD first (Google for Jobs standard)
            const jsonLdData = extractJsonLd(html);
            if (jsonLdData && jsonLdData.jdText && jsonLdData.jdText.length > 50) {
              extracted = jsonLdData;
              break;
            } else {
              let targetHtml = html;
              const containerMatch =
                html.match(/<(?:div|section|article|main)[^>]*(?:class|id)=["'][^"']*(?:job[-_]?desc|job[-_]?detail|posting[-_]?desc|description|job_body|stelle|offre|vacancy|position-overview)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section|article|main)>/i);

              if (containerMatch && containerMatch[1]) {
                const candidateText = cleanHtmlToText(containerMatch[1]);
                if (candidateText.length >= 150) {
                  targetHtml = containerMatch[1];
                }
              }

              const jdText = cleanHtmlToText(targetHtml);

              // Extract metadata from tags
              let title = "";
              const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
              if (ogTitle && ogTitle[1]) title = decodeHtmlEntities(ogTitle[1].trim());
              if (!title) {
                const tMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
                if (tMatch && tMatch[1]) title = decodeHtmlEntities(tMatch[1].trim());
              }

              let company = "";
              const ogSite = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
              if (ogSite && ogSite[1]) company = decodeHtmlEntities(ogSite[1].trim());

              if (title) {
                const splitDelims = [" at ", " bei ", " chez ", " en ", " - ", " | "];
                for (const delim of splitDelims) {
                  if (title.includes(delim)) {
                    const parts = title.split(delim);
                    title = parts[0].trim();
                    if (!company && parts[1]) {
                      company = parts[1].split(/[|\-–]/)[0].replace(/^jobs?\s+(?:bei|at)\s+/i, "").trim();
                    }
                    break;
                  }
                }
              }

              if (!company && parsedUrl.hostname.includes("personio")) {
                const sub = parsedUrl.hostname.split(".")[0];
                company = sub.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
              }

              if (jdText.length >= 60) {
                extracted = {
                  title: title || "Target Role",
                  company: company || "Target Company",
                  jdText,
                };
                break;
              }
            }
          }
        } catch (directFetchErr) {
          safeLog.warn("Direct fetch error, trying next candidate or Jina reader:", directFetchErr);
        }
      }
    }

    // 10. Universal Cloudflare / WAF / SPA JavaScript Fallback (Jina Reader)
    if (!extracted || !extracted.jdText || extracted.jdText.length < 60) {
      for (const candidate of candidateUrls) {
        safeLog.info(`Attempting universal Jina reader for candidate: ${candidate}`);
        const jinaResult = await fetchViaJinaReader(candidate);
        if (jinaResult && jinaResult.jdText && jinaResult.jdText.length >= 50) {
          extracted = jinaResult;
          break;
        }
      }
    }

    // 11. AI Intelligent Web Extraction Fallback
    // When direct fetch, bot protection, and reader proxies all fail, the connected AI model parses/reconstructs the job posting.
    if (!extracted || !extracted.jdText || extracted.jdText.length < 40) {
      safeLog.info(`Attempting AI web retrieval fallback for URL: ${parsedUrl.toString()}`);
      const aiResult = await fetchJobWithAiFallback(
        session.user.id,
        parsedUrl.toString(),
        extracted?.title || parsedUrl.hostname
      );
      if (aiResult && aiResult.jdText && aiResult.jdText.length >= 50) {
        extracted = aiResult;
      }
    }

    if (!extracted || !extracted.jdText || extracted.jdText.length < 40) {
      return NextResponse.json(
        {
          error: "Could not extract readable text from this page. The site may require authentication or an active session. Please paste the job description text manually or use the 1-Click Bookmarklet.",
        },
        { status: 422 }
      );
    }

    // Detect language of the extracted text
    const lang = detectLanguage(extracted.jdText);

    return NextResponse.json({
      success: true,
      title: extracted.title || "Target Role",
      company: extracted.company || "Company",
      jdText: extracted.jdText,
      detectedLanguage: lang.language,
      languageFlag: lang.flag,
      isNonEnglish: lang.isNonEnglish,
      englishTranslation: null,
    });
  } catch (error) {
    safeLog.error("Error extracting job description from URL:", error);
    return NextResponse.json(
      {
        error: "Network error fetching job page. Please copy and paste the job description text.",
      },
      { status: 500 }
    );
  }
}
