import type { Resume } from "@/lib/schemas/resume";

export interface AtsRedFlag {
  id: string;
  severity: "critical" | "warning" | "caution";
  category: "passive_voice" | "unquantified_bullet" | "cliche_fluff" | "formatting_risk" | "missing_core_requirement";
  title: string;
  description: string;
  penaltyPoints: number; // e.g. 4, 8
  flaggedText?: string;
  remediation: string;
}

export interface AtsRegulatoryAudit {
  metricCompliance: { passed: boolean; ratio: number; required: number; label: string };
  actionVerbCompliance: { passed: boolean; ratio: number; required: number; label: string };
  keywordDensityCompliance: { passed: boolean; ratio: number; required: number; label: string };
  structuralIntegrityCompliance: { passed: boolean; passedCount: number; totalCount: number; label: string };
  fluffFreeCompliance: { passed: boolean; violationsCount: number; label: string };
}

export interface AtsScoreResult {
  overallScore: number; // 0 - 100
  keywordScore: number; // 0 - 100
  metricScore: number; // 0 - 100
  structureScore: number; // 0 - 100
  matchedKeywords: string[];
  missingKeywords: string[];
  missingCriticalSkills: string[];
  quantifiedBulletsCount: number;
  totalBulletsCount: number;
  metricPercentage: number;
  suggestions: string[];
  // Harsh, strict audit properties:
  redFlags: AtsRedFlag[];
  totalPenalties: number;
  rejectionRisk: "Critical" | "High" | "Moderate" | "Competitive" | "Elite";
  verdictSummary: string;
  audit: AtsRegulatoryAudit;
}

// Comprehensive cross-industry keywords for high-precision extraction across Tech, Business, Finance, Marketing, Sales, Healthcare, Operations, HR, and Legal
const INDUSTRY_KEYWORDS = [
  // Technology, Software & Data
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go", "Golang", "Rust", "Ruby", "PHP", "Swift", "Kotlin",
  "React", "React.js", "Next.js", "Vue", "Vue.js", "Angular", "Svelte", "Node.js", "Node", "Express", "NestJS",
  "Django", "Flask", "FastAPI", "Spring Boot", "GraphQL", "REST", "RESTful", "gRPC", "WebSockets",
  "PostgreSQL", "Postgres", "MySQL", "MongoDB", "Redis", "Elasticsearch", "Cassandra", "DynamoDB", "SQLite", "Prisma",
  "Docker", "Kubernetes", "K8s", "AWS", "Azure", "GCP", "Google Cloud", "Terraform", "Ansible",
  "CI/CD", "GitHub Actions", "GitLab", "Jenkins", "Linux", "Git", "Microservices", "Serverless",
  "TailwindCSS", "Tailwind", "HTML5", "CSS3", "Redux", "Webpack", "Vite",
  "Jest", "Cypress", "Playwright", "Unit Testing", "TDD", "Integration Testing",
  "Machine Learning", "Artificial Intelligence", "AI", "LLM", "Deep Learning", "Data Pipeline", "ETL", "Kafka", "RabbitMQ",
  "System Design", "Architecture", "Cybersecurity", "Network Security", "Cloud Architecture",

  // Business, Product & Project Management
  "Project Management", "Product Management", "Agile", "Scrum", "Kanban", "Sprint Planning", "Jira", "Confluence",
  "Asana", "Trello", "Stakeholder Management", "Roadmapping", "Change Management", "Risk Management",
  "Cross-functional Leadership", "Strategic Planning", "Business Analysis", "Requirements Gathering",
  "PMP", "Scrum Master", "CSPO", "PRINCE2", "Six Sigma", "Lean Six Sigma", "Process Optimization",

  // Marketing, Growth & Digital
  "Digital Marketing", "Content Strategy", "SEO", "Search Engine Optimization", "SEM", "PPC", "Google Ads", "Meta Ads",
  "Social Media Marketing", "Email Marketing", "Brand Strategy", "Copywriting", "Conversion Rate Optimization", "CRO",
  "A/B Testing", "HubSpot", "Google Analytics", "GA4", "Marketo", "Mailchimp", "Customer Acquisition", "CAC", "LTV",
  "Inbound Marketing", "Lead Generation", "Public Relations", "PR", "Influencer Marketing", "Growth Hacking",

  // Sales, Account Management & Business Development
  "B2B Sales", "B2C Sales", "Enterprise Sales", "SaaS Sales", "Lead Generation", "Cold Calling", "Prospecting",
  "Pipeline Management", "Quota Attainment", "Salesforce", "CRM", "Deal Closing", "Account Management",
  "Contract Negotiation", "Client Retention", "Territory Management", "Solution Selling", "Relationship Building",
  "Revenue Growth", "Key Account Management", "Customer Success", "Upselling", "Cross-selling",

  // Finance, Accounting & Banking
  "Financial Modeling", "Financial Analysis", "Forecasting", "Budgeting", "Variance Analysis", "GAAP", "IFRS",
  "P&L Management", "Cash Flow", "Balance Sheet", "Auditing", "Internal Controls", "Tax Compliance",
  "Financial Reporting", "Valuation", "DCF", "Mergers & Acquisitions", "M&A", "Due Diligence", "EBITDA",
  "SAP", "Oracle ERP", "NetSuite", "QuickBooks", "Advanced Excel", "Financial Planning & Analysis", "FP&A",

  // Healthcare, Nursing, Medicine & Clinical
  "Patient Care", "Clinical Care", "Triage", "Vital Signs", "HIPAA", "Medication Administration",
  "Electronic Health Records", "EHR", "EMR", "Epic Systems", "Cerner", "Patient Assessment", "Wound Care",
  "Phlebotomy", "IV Therapy", "CPR", "BLS", "ACLS", "Infection Control", "Patient Education", "Clinical Documentation",
  "Acute Care", "Telemetry", "ICU", "Emergency Care", "Healthcare Compliance",

  // Human Resources, Talent Acquisition & People
  "Talent Acquisition", "Full-cycle Recruiting", "Employee Relations", "Performance Management", "Onboarding",
  "HRIS", "Workday", "BambooHR", "Compensation & Benefits", "Labor Law Compliance", "Employee Engagement",
  "Diversity Equity & Inclusion", "DE&I", "Succession Planning", "Conflict Resolution", "Payroll Administration",
  "HR Policy Drafting", "Organizational Development", "Retention Strategies", "Talent Management",

  // Operations, Supply Chain & Logistics
  "Supply Chain Management", "Procurement", "Inventory Management", "Logistics", "Vendor Management",
  "Warehouse Management", "ERP", "Demand Planning", "Continuous Improvement", "Kaizen", "Root Cause Analysis",
  "Quality Assurance", "QA", "Contract Administration", "Fleet Management", "Operations Management",

  // Design, UX & Creative
  "UI/UX Design", "User Experience", "User Interface", "Figma", "Adobe Creative Suite", "Photoshop", "Illustrator",
  "Wireframing", "Prototyping", "User Research", "Usability Testing", "Design Systems", "Information Architecture",

  // Legal, Risk & Compliance
  "Contract Drafting", "Contract Review", "Regulatory Compliance", "Due Diligence", "Corporate Governance",
  "Risk Assessment", "Policy Drafting", "Legal Research", "Litigation Support", "Intellectual Property", "GDPR",
  "Data Privacy", "Anti-Money Laundering", "AML", "KYC"
];

// Passive, weak phrases penalized heavily by ATS & executive screeners across all professions
const WEAK_PASSIVE_PATTERNS = [
  { regex: /\b(responsible for|duties included|tasked with)\b/i, phrase: "responsible for", penalty: 4, name: "Passive Duty Statement" },
  { regex: /\b(assisted with|assisted in|assisted|helped to|helped with|helped)\b/i, phrase: "assisted with / helped", penalty: 3, name: "Weak Non-Ownership Verb" },
  { regex: /\b(worked on|worked with|participated in|involved in)\b/i, phrase: "worked on / participated in", penalty: 3, name: "Vague Activity Phrasing" },
  { regex: /\b(supported the team|supported|contributed to|part of team that)\b/i, phrase: "supported / contributed to", penalty: 3, name: "Diffused Accountability" },
  { regex: /\b(handled|dealt with)\b/i, phrase: "handled / dealt with", penalty: 2, name: "Administrative Action Verb" },
];

// Fluff, cliché buzzwords without quantitative proof penalized by modern screeners across all fields
const CLICHE_BUZZWORDS = [
  { regex: /\b(hardworking|hard worker)\b/i, term: "hardworking" },
  { regex: /\b(team player)\b/i, term: "team player" },
  { regex: /\b(detail-oriented|detail oriented)\b/i, term: "detail-oriented" },
  { regex: /\b(go-getter|go getter)\b/i, term: "go-getter" },
  { regex: /\b(self-motivated|self motivated)\b/i, term: "self-motivated" },
  { regex: /\b(passionate)\b/i, term: "passionate" },
  { regex: /\b(results-driven|results driven)\b/i, term: "results-driven" },
  { regex: /\b(think outside the box|out of the box)\b/i, term: "out of the box" },
  { regex: /\b(synergy|synergies)\b/i, term: "synergy" },
  { regex: /\b(dynamic personality)\b/i, term: "dynamic personality" },
  { regex: /\b(rockstar|ninja|guru)\b/i, term: "rockstar/ninja" },
  { regex: /\b(fast learner|quick learner)\b/i, term: "fast learner" },
  { regex: /\b(strategic thinker)\b/i, term: "strategic thinker" },
  { regex: /\b(people person)\b/i, term: "people person" },
];

// Universal, high-impact action verbs aligned with modern ATS parsers across all professional disciplines
const STRONG_ACTION_VERBS = new Set([
  // Universal Leadership, Management & Strategy
  "accelerated", "achieved", "adapted", "administered", "advised", "allocated", "analyzed", "appointed",
  "architected", "audited", "authored", "automated", "balanced", "benchmarked", "budgeted", "built",
  "calculated", "campaigned", "centralized", "championed", "closed", "coached", "collaborated", "commercialized",
  "conceptualized", "configured", "consolidated", "constructed", "containerized", "converted", "coordinated",
  "crafted", "created", "curated", "customized", "debugged", "decreased", "defended", "delivered", "deployed",
  "designed", "developed", "devised", "diagnosed", "directed", "discovered", "dispatched", "dockerized",
  "documented", "drafted", "drove", "eliminated", "empowered", "enforced", "engineered", "enhanced",
  "established", "evaluated", "exceeded", "executed", "expanded", "expedited", "extracted", "facilitated",
  "forecasted", "formulated", "founded", "generated", "guided", "identified", "implemented", "improved",
  "increased", "indexed", "initiated", "innovated", "inspected", "instituted", "integrated", "introduced",
  "investigated", "isolated", "launched", "lead", "led", "leveraged", "maintained", "managed", "marketed",
  "maximized", "mediated", "mentored", "migrated", "minimized", "mitigated", "mobilized", "modeled",
  "modernized", "monitored", "motivated", "negotiated", "nurtured", "onboarded", "operated", "optimized",
  "orchestrated", "organized", "outperformed", "overhauled", "partnered", "pioneered", "pitched", "planned",
  "prescribed", "prevented", "procured", "produced", "profiled", "programmed", "projected", "promoted",
  "prospected", "published", "quantified", "re-engineered", "reconciled", "recruited", "redesigned", "reduced",
  "refactored", "released", "remediated", "repaired", "researched", "resolved", "restored", "restructured",
  "retained", "retrieved", "revamped", "reviewed", "routed", "safeguarded", "scaled", "scheduled", "secured",
  "simplified", "sourced", "spearheaded", "stabilized", "standardized", "steered", "strategized", "streamlined",
  "strengthened", "supervised", "surpassed", "synthesized", "targeted", "tested", "tracked", "trained",
  "transformed", "triaged", "troubleshot", "unified", "uncovered", "upgraded", "upsold", "validated",
  "verified", "visualized", "yielded",
  // German
  "entwickelt", "implementiert", "optimiert", "geleitet", "gestaltet", "aufgebaut", "automatisiert", "skaliert",
  "koordiniert", "konzipiert", "überwacht", "verantwortet", "transformiert", "verbessert", "erstellt", "eingeführt",
  "modernisiert", "integriert", "entwickelte", "implementierte", "optimierte", "leitete", "analysierte",
  // French
  "dirigé", "développé", "conçu", "optimisé", "implémenté", "automatisé", "déployé", "amélioré", "supervisé",
  "coordonné", "piloté", "créé", "transformé", "intégré", "géré", "analysé",
  // Spanish
  "lideró", "desarrolló", "diseñó", "optimizó", "implementó", "automatizó", "desplegó", "mejoró", "supervisó",
  "coordinó", "gestionó", "creó", "transformó", "integró", "dirigió", "analizó"
]);

// Comprehensive cross-industry synonym & acronym equivalence clusters
const SYNONYM_PAIRS: string[][] = [
  // Tech & Cloud
  ["Kubernetes", "K8s"],
  ["Docker", "Containerization", "Containers"],
  ["Amazon Web Services", "AWS"],
  ["Google Cloud Platform", "Google Cloud", "GCP"],
  ["Microsoft Azure", "Azure"],
  ["Continuous Integration", "Continuous Deployment", "CI/CD", "CI-CD"],
  ["Infrastructure as Code", "IaC", "Terraform"],
  ["PostgreSQL", "Postgres"],
  ["React", "React.js", "Reactjs"],
  ["Vue", "Vue.js", "Vuejs"],
  ["Node", "Node.js", "Nodejs"],
  ["Next.js", "Nextjs"],
  ["Tailwind", "TailwindCSS", "Tailwind CSS"],
  ["Machine Learning", "ML"],
  ["Artificial Intelligence", "AI"],
  ["Large Language Models", "LLM", "LLMs"],
  ["ETL", "Data Pipeline", "Data Pipelines"],
  ["Golang", "Go"],
  // Business, Product & Methodologies
  ["Project Management", "PMP"],
  ["Agile", "Scrum", "Kanban"],
  ["Cross-functional Leadership", "Cross-functional Collaboration", "Cross-functional Teams"],
  ["Stakeholder Management", "Stakeholder Engagement", "Stakeholder Relations"],
  ["Business Analysis", "Business Analyst"],
  // Marketing & Sales
  ["Search Engine Optimization", "SEO"],
  ["Search Engine Marketing", "SEM"],
  ["Pay-Per-Click", "PPC"],
  ["Conversion Rate Optimization", "CRO"],
  ["Customer Relationship Management", "CRM", "Salesforce", "HubSpot"],
  ["B2B Sales", "B2B", "Business-to-Business"],
  ["B2C Sales", "B2C", "Business-to-Consumer"],
  ["Customer Acquisition Cost", "CAC"],
  ["Customer Lifetime Value", "LTV", "CLV"],
  ["Public Relations", "PR"],
  // Finance & Accounting
  ["Profit and Loss", "P&L", "P&L Management"],
  ["Generally Accepted Accounting Principles", "GAAP"],
  ["International Financial Reporting Standards", "IFRS"],
  ["Mergers and Acquisitions", "M&A", "Mergers & Acquisitions"],
  ["Financial Planning and Analysis", "FP&A", "Financial Planning & Analysis"],
  ["Return on Investment", "ROI"],
  ["Enterprise Resource Planning", "ERP", "SAP", "Oracle ERP"],
  ["Earnings Before Interest Taxes Depreciation Amortization", "EBITDA"],
  // Healthcare & Clinical
  ["Electronic Health Records", "EHR", "Electronic Medical Records", "EMR"],
  ["Health Insurance Portability and Accountability Act", "HIPAA"],
  ["Basic Life Support", "BLS"],
  ["Advanced Cardiac Life Support", "ACLS"],
  ["Cardiopulmonary Resuscitation", "CPR"],
  ["Intensive Care Unit", "ICU"],
  // Operations & Supply Chain
  ["Supply Chain Management", "Supply Chain", "SCM"],
  ["Quality Assurance", "QA", "Quality Control", "QC"],
  ["Standard Operating Procedures", "SOP", "SOPs"],
  // HR & Talent
  ["Human Resources Information System", "HRIS", "Workday"],
  ["Diversity Equity and Inclusion", "DEI", "DE&I"],
  ["Applicant Tracking System", "ATS"],
  // Legal & Compliance
  ["General Data Protection Regulation", "GDPR"],
  ["Anti-Money Laundering", "AML"],
  ["Know Your Customer", "KYC"]
];

const SYNONYM_MAP = new Map<string, string[]>();
for (const group of SYNONYM_PAIRS) {
  for (const item of group) {
    const key = item.toLowerCase();
    const existing = SYNONYM_MAP.get(key) || [];
    for (const other of group) {
      const otherLower = other.toLowerCase();
      if (otherLower !== key && !existing.includes(otherLower)) {
        existing.push(otherLower);
      }
    }
    SYNONYM_MAP.set(key, existing);
  }
}

// General English stopwords filtered out during dynamic keyword extraction
const GENERAL_STOP_WORDS = new Set([
  "and", "for", "the", "with", "not", "all", "new", "any", "are", "our", "you", "its", "but", "this", "that", "from",
  "about", "will", "have", "been", "work", "team", "role", "help", "need", "make", "must", "good", "well", "high",
  "best", "more", "most", "some", "such", "than", "them", "then", "into", "over", "also", "your", "they", "what",
  "when", "where", "which", "while", "candidate", "position", "ability", "skills", "experience", "years", "strong",
  "duties", "responsibilities", "requirements", "qualifications", "preferred", "including", "working", "knowledge",
  "opportunity", "company", "organization", "environment", "successful", "closely", "within", "across", "other",
  "proven", "demonstrated", "familiarity", "understanding", "plus", "proficiency", "proficient", "seeking", "looking"
]);

// Universal cross-lingual noise words that should NEVER be standalone target keywords
const UNIVERSAL_NOISE_WORDS = new Set([
  // English filler & role titles
  "management", "strategy", "strategies", "tools", "tool", "process", "processes",
  "system", "systems", "solution", "solutions", "service", "services", "platform",
  "platforms", "environment", "specialist", "specialists", "expert", "lead", "leader",
  "manager", "director", "analyst", "engineer", "consultant", "requirements", "skills",
  "ability", "abilities", "knowledge", "experience", "years", "candidate", "team", "teams",
  "organization", "company", "role", "position", "duties", "responsibilities", "qualifications",
  "preferred", "working", "demonstrated", "familiarity", "understanding", "seeking", "looking",
  "methods", "methodologies", "standards", "practices", "competencies", "procedures",
  // German noise & suffixes
  "infrastruktur", "prozesse", "prozess", "praktiken", "technologien", "technologie",
  "werkzeuge", "werkzeug", "basierten", "basiert", "basiertes", "geräte", "geraete",
  "systemen", "systeme", "umfeld", "bereich", "bereiche", "kenntnisse", "erfahrung",
  "erfahrungen", "aufgaben", "anforderungen", "mitarbeiter", "fachkraft", "notfall",
  "gestuetzte", "orientiert", "orientierte", "ger", "pflegekraft"
]);

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[._\-\/\\+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stemWord(word: string): string {
  let w = word.toLowerCase().trim();
  if (w.length <= 3) return w;
  if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
  if (w.endsWith("sses")) return w.slice(0, -2);
  if (w.endsWith("ses") || w.endsWith("zes") || w.endsWith("ches") || w.endsWith("shes") || w.endsWith("xes")) return w.slice(0, -2);
  if (w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us") && !w.endsWith("is")) return w.slice(0, -1);
  if (w.endsWith("ing") && w.length > 5) return w.slice(0, -3);
  if (w.endsWith("ed") && w.length > 4) return w.slice(0, -2);
  if (w.endsWith("tion") && w.length > 6) return w.slice(0, -4);
  return w;
}

/**
 * Universal ATS keyword satisfaction checker.
 * Validates whether a candidate's resume satisfies a job description keyword across:
 * 1. Direct match (exact / case-insensitive)
 * 2. Punctuation & whitespace normalization (e.g. CI/CD == CI-CD == CI CD)
 * 3. Bidirectional synonym & acronym equivalence (e.g. SEO <-> Search Engine Optimization, M&A <-> Mergers and Acquisitions)
 * 4. Stemmed inflection & plural invariance (e.g. models <-> modeling, strategies <-> strategy)
 * 5. Multi-word anchor term satisfaction (e.g. Financial Modeling Tools satisfied by Financial Modeling)
 */
function isKeywordSatisfied(kw: string, resumeText: string, resumeKeywordSet: Set<string>): boolean {
  const kwLower = kw.toLowerCase().trim();
  const kwNorm = normalizeString(kw);
  const resumeNorm = normalizeString(resumeText);
  const resumeStemmed = resumeNorm.split(" ").map(stemWord).join(" ");

  // 1. Direct match in candidate's skills set or full text
  if (resumeKeywordSet.has(kwLower) || resumeText.toLowerCase().includes(kwLower)) {
    return true;
  }

  // 2. Normalized match (punctuation & space agnostic)
  if (resumeNorm.includes(kwNorm)) {
    return true;
  }

  // 3. Synonym match
  const synonyms = SYNONYM_MAP.get(kwLower) || [];
  for (const syn of synonyms) {
    if (
      resumeKeywordSet.has(syn) ||
      resumeText.toLowerCase().includes(syn) ||
      resumeNorm.includes(normalizeString(syn))
    ) {
      return true;
    }
  }

  // 4. Core non-noise words & stemming check
  const coreWords = kwNorm.split(" ").filter((w) => !UNIVERSAL_NOISE_WORDS.has(w) && w.length >= 2);
  if (coreWords.length > 0) {
    const corePhrase = coreWords.join(" ");
    if (resumeKeywordSet.has(corePhrase) || resumeNorm.includes(corePhrase)) {
      return true;
    }
    // Check if synonyms exist for corePhrase
    const coreSynonyms = SYNONYM_MAP.get(corePhrase) || [];
    for (const cs of coreSynonyms) {
      if (resumeKeywordSet.has(cs) || resumeNorm.includes(normalizeString(cs))) {
        return true;
      }
    }
    // Check stemmed words
    const coreStemmed = coreWords.map(stemWord);
    if (coreStemmed.every((w) => resumeStemmed.includes(w))) {
      return true;
    }
  }

  return false;
}

/**
 * Dynamically extracts all explicit skills, certifications, and competencies
 * entered by the candidate in their resume, regardless of their industry.
 */
function extractExplicitSkillsFromResume(resume: Resume): string[] {
  const skills: string[] = [];
  if (Array.isArray(resume.sections)) {
    for (const section of resume.sections) {
      const lowerTitle = (section.title || "").toLowerCase();
      const isSkillOrCert =
        section.type === "skills" ||
        section.type === "simple_list" ||
        lowerTitle.includes("skill") ||
        lowerTitle.includes("competenc") ||
        lowerTitle.includes("certificat") ||
        lowerTitle.includes("tool") ||
        lowerTitle.includes("technolog") ||
        lowerTitle.includes("coursework") ||
        lowerTitle.includes("course") ||
        lowerTitle.includes("academic") ||
        lowerTitle.includes("education");

      if (isSkillOrCert) {
        if (Array.isArray(section.categories)) {
          for (const cat of section.categories) {
            if (Array.isArray(cat.items)) {
              for (const item of cat.items) {
                const clean = item.trim();
                if (clean.length >= 2 && !GENERAL_STOP_WORDS.has(clean.toLowerCase()) && !UNIVERSAL_NOISE_WORDS.has(clean.toLowerCase())) {
                  skills.push(clean);
                }
              }
            }
          }
        }
        if (Array.isArray(section.items)) {
          for (const item of section.items) {
            const clean = item.trim();
            if (clean.length >= 2 && !GENERAL_STOP_WORDS.has(clean.toLowerCase()) && !UNIVERSAL_NOISE_WORDS.has(clean.toLowerCase())) {
              skills.push(clean);
            }
          }
        }
        // Extract comma-separated coursework or skills in entries / bullet lists
        if (Array.isArray(section.entries)) {
          for (const entry of section.entries) {
            const entryText = `${entry.heading || ""} ${entry.subheading || ""}`;
            if (
              lowerTitle.includes("coursework") ||
              lowerTitle.includes("education") ||
              entryText.toLowerCase().includes("coursework")
            ) {
              const bullets = Array.isArray(entry.bullets) ? entry.bullets : [];
              for (const b of [entryText, ...bullets]) {
                const parts = b.split(/[,•|;\n]/);
                for (const p of parts) {
                  const clean = p.replace(/^(?:relevant coursework|coursework|courses?)\s*[:\-]?/i, "").trim();
                  if (clean.length >= 3 && !GENERAL_STOP_WORDS.has(clean.toLowerCase()) && !UNIVERSAL_NOISE_WORDS.has(clean.toLowerCase())) {
                    skills.push(clean);
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  return skills;
}

// Words frequently found in job posting section headers and boilerplate that must NEVER be extracted as required candidate skills
const JD_HEADER_WORDS = new Set([
  "role", "summary", "responsibilities", "responsibility", "qualifications", "qualification",
  "technical", "requirements", "requirement", "profile", "expect", "offer", "benefits", "perks",
  "culture", "onboarding", "hybrid", "remote", "nice", "have", "about", "overview", "duties",
  "tasks", "who", "what", "bring", "equal", "opportunity", "employer", "code", "field",
  "basic", "good", "join", "help", "seeking", "looking", "ideal", "candidate", "job", "work",
  "life", "balance", "environment", "team", "spirit", "we", "our", "your", "you", "this"
]);

/**
 * Pre-processes the job description to remove company perks, benefits, and workplace culture sections
 * so they are never mistakenly extracted as candidate qualification requirements.
 */
export function cleanJobDescription(jd: string): string {
  if (!jd) return "";
  // Strip employee perks/benefits section at the end of job descriptions (e.g. "We offer this", "What we offer", "Our Benefits")
  const benefitCutoff = jd.search(/\b(?:we offer(?: this)?|what we offer|our benefits|perks|benefits|wir bieten|was wir bieten)\b/i);
  if (benefitCutoff !== -1) {
    return jd.slice(0, benefitCutoff).trim();
  }
  return jd;
}

/**
 * Universal, Robust Keyword Extractor.
 * Extracts clean, high-precision industry skills across Tech, Business, Healthcare, Finance, Marketing, etc.
 * Handles German and multilingual compound terms safely without producing garbage tokens.
 */
function extractKeywordsFromText(text: string): string[] {
  if (!text) return [];
  const matched = new Set<string>();

  // 1. Match curated high-value cross-industry terms
  for (const kw of INDUSTRY_KEYWORDS) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Short 2-letter acronyms (e.g. AI, PR, QA, UI, UX) must match case-sensitively to avoid false positives on words like "ai", "pr"
    const regex = kw.length <= 2 ? new RegExp(`\\b${escaped}\\b`) : new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(text)) {
      matched.add(kw);
    }
  }

  // 2. Extract capitalized industry acronyms & abbreviations (2 - 6 uppercase letters, e.g. AWS, GCP, SEO, PMP, CI/CD, M&A)
  const acronyms = text.match(/\b[A-Z]{2,6}(?:[\/&][A-Z]{2,6})?\b/g) || [];
  for (const a of acronyms) {
    const aLower = a.toLowerCase();
    if (!GENERAL_STOP_WORDS.has(aLower) && !UNIVERSAL_NOISE_WORDS.has(aLower) && !JD_HEADER_WORDS.has(aLower)) {
      matched.add(a);
    }
  }

  // 3. Extract technical tokens with internal symbols/digits (strictly short codes like C++, B2B, B2C, ISO-9001)
  const hyphenatedWords = text.match(/\b[\p{L}0-9]+(?:[-/][\p{L}0-9]+)+\b/gu) || [];
  for (const token of hyphenatedWords) {
    // A. Clean technical standards (e.g. C++, ISO-9001, B2B, B2C, A/B, TCP/IP, CI/CD)
    if (/^(?:C\+\+|B2B|B2C|A\/B|CI\/CD|TCP\/IP|ISO-\d+|SOC-\d+|Tier-\d+)$/i.test(token)) {
      matched.add(token);
      continue;
    }

    if (/ci\/cd/i.test(token)) {
      matched.add("CI/CD");
    }

    // B. Check if unhyphenated full phrase matches a known industry keyword or synonym
    const unhyphenated = token.replace(/[-/]/g, " ").trim();
    const matchedIndustry = INDUSTRY_KEYWORDS.find((kw) => kw.toLowerCase() === unhyphenated.toLowerCase());
    if (matchedIndustry) {
      matched.add(matchedIndustry);
      continue;
    }
    // Check if unhyphenated phrase matches any synonym group (e.g. Search-Engine-Optimization -> Search Engine Optimization)
    for (const group of SYNONYM_PAIRS) {
      const foundSyn = group.find((item) => item.toLowerCase() === unhyphenated.toLowerCase());
      if (foundSyn) {
        matched.add(foundSyn);
        break;
      }
    }

    // C. De-compound German/hyphenated phrases: only extract recognized skills or uppercase acronyms
    const subParts = token.split(/[-/]/).filter((p) => p.length >= 2);
    for (const part of subParts) {
      const partLower = part.toLowerCase();
      if (UNIVERSAL_NOISE_WORDS.has(partLower) || GENERAL_STOP_WORDS.has(partLower) || JD_HEADER_WORDS.has(partLower)) {
        continue;
      }
      if (
        INDUSTRY_KEYWORDS.some((kw) => kw.toLowerCase() === partLower) ||
        /^[A-Z]{2,6}$/.test(part)
      ) {
        const canonical = INDUSTRY_KEYWORDS.find((kw) => kw.toLowerCase() === partLower) || part;
        matched.add(canonical);
      }
    }
  }

  // 4. Extract prominent capitalized multi-word professional phrases (e.g. "Infrastructure as Code", "Cross-functional Leadership")
  const titleCasePhrases = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/g) || [];
  for (const phrase of titleCasePhrases) {
    const trimmed = phrase.trim();
    const trimmedLower = trimmed.toLowerCase();
    const words = trimmedLower.split(/\s+/);
    const lastWord = words[words.length - 1];

    if (
      trimmed.length > 5 &&
      !trimmedLower.startsWith("the ") &&
      !trimmedLower.startsWith("this ") &&
      !trimmedLower.startsWith("our ") &&
      !trimmedLower.startsWith("wir ") &&
      !trimmedLower.includes("gmbh") &&
      !trimmedLower.includes("team") &&
      !UNIVERSAL_NOISE_WORDS.has(lastWord) &&
      !words.some((w) => JD_HEADER_WORDS.has(w)) &&
      !words.some((w) => ["senior", "junior", "lead", "head", "director", "manager", "specialist", "analyst", "engineer"].includes(w))
    ) {
      matched.add(trimmed);
    }
  }

  return Array.from(matched);
}

function extractAllResumeText(resume: Resume): string {
  const parts: string[] = [];

  if (resume.contact) {
    parts.push(resume.contact.name || "");
    parts.push(resume.contact.email || "");
    parts.push(resume.contact.address || "");
  }

  if (Array.isArray(resume.sections)) {
    for (const section of resume.sections) {
      parts.push(section.title || "");
      if (section.content) parts.push(section.content);
      if (Array.isArray(section.items)) parts.push(...section.items);
      if (Array.isArray(section.categories)) {
        for (const cat of section.categories) {
          parts.push(cat.label || "");
          if (Array.isArray(cat.items)) parts.push(...cat.items);
        }
      }
      if (Array.isArray(section.entries)) {
        for (const entry of section.entries) {
          parts.push(entry.heading || "");
          parts.push(entry.subheading || "");
          if (Array.isArray(entry.bullets)) parts.push(...entry.bullets);
        }
      }
    }
  }

  return parts.join(" ");
}

/**
 * Calculates a ruthless, institutional-grade ATS Match Score (0 - 100%) comparing the candidate's resume
 * against target job description requirements and strict recruiter screening standards.
 */
export function calculateAtsScore(resume: Resume, jobDescription: string): AtsScoreResult {
  const resumeText = extractAllResumeText(resume);
  const cleanedJd = cleanJobDescription(jobDescription);
  const jdKeywords = extractKeywordsFromText(cleanedJd);
  const resumeKeywords = extractKeywordsFromText(resumeText);
  const explicitSkills = extractExplicitSkillsFromResume(resume);

  // Combine NLP-extracted resume keywords with candidate's explicit skills
  const resumeKeywordSet = new Set([
    ...resumeKeywords.map((k) => k.toLowerCase()),
    ...explicitSkills.map((k) => k.toLowerCase())
  ]);

  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  for (const kw of jdKeywords) {
    if (isKeywordSatisfied(kw, resumeText, resumeKeywordSet)) {
      matchedKeywords.push(kw);
    } else {
      missingKeywords.push(kw);
    }
  }

  // Also check if any of candidate's explicit skills appear in the JD
  for (const skill of explicitSkills) {
    const skillLower = skill.toLowerCase();
    if (
      jobDescription.toLowerCase().includes(skillLower) ||
      (SYNONYM_MAP.get(skillLower) || []).some((syn) => jobDescription.toLowerCase().includes(syn))
    ) {
      if (!matchedKeywords.some((m) => m.toLowerCase() === skillLower)) {
        matchedKeywords.push(skill);
      }
    }
  }

  // 1. Keyword Score (50% Weight - Primary ATS Match Pillar)
  // Evaluates coverage of hard skills, technologies, and academic requirements
  let keywordScore = 75; // baseline if no JD provided
  if (jdKeywords.length > 0) {
    const rawMatchRatio = matchedKeywords.length / jdKeywords.length;
    keywordScore = Math.min(98, Math.round(Math.pow(rawMatchRatio, 1.05) * 100));
  }

  // 2. Metrics & Quantification Audit (Audits Work Experience & Projects ONLY)
  // NEVER audit Education, Academic Coursework, CGPA, or Certifications!
  const allBullets: string[] = [];
  if (Array.isArray(resume.sections)) {
    for (const section of resume.sections) {
      const lowerTitle = (section.title || "").toLowerCase();
      const isEducation =
        lowerTitle.includes("education") ||
        lowerTitle.includes("academic") ||
        lowerTitle.includes("studies") ||
        lowerTitle.includes("degree") ||
        lowerTitle.includes("university") ||
        lowerTitle.includes("school");

      const isNonWork =
        isEducation ||
        section.type === "skills" ||
        section.type === "text" ||
        lowerTitle.includes("award") ||
        lowerTitle.includes("certification") ||
        lowerTitle.includes("language") ||
        lowerTitle.includes("interest") ||
        lowerTitle.includes("volunteer") ||
        lowerTitle.includes("coursework");

      if (isNonWork) continue;

      if (Array.isArray(section.entries)) {
        for (const entry of section.entries) {
          if (Array.isArray(entry.bullets)) {
            for (const b of entry.bullets) {
              const trimmed = b.trim();
              if (!trimmed) continue;
              // Skip CGPA, GPA, Coursework, Thesis, Degree notes wherever they appear
              if (/^\s*(cgpa|gpa|grade|marks|percentage|honors?|relevant coursework|coursework|thesis|major|minor)\b/i.test(trimmed)) {
                continue;
              }
              allBullets.push(trimmed);
            }
          }
        }
      }
    }
  }

  const metricRegex = /(?:[$€£¥₹]\s*\d+|\b\d+[%xXkKMbB]?\+?|\b\d+\s*(?:percent|%|users|clients|customers|accounts|patients|students|subscribers|members|leads|deals|calls|tickets|cases|orders|units|shipments|deliveries|campaigns|surveys|audits|facilities|stores|employees|staff|team\s*members|direct\s*reports|engineers|nurses|hires|candidates|vendors|partners|requests|queries|events|impressions|clicks|conversions|views|downloads|visitors|pageviews|ms|seconds|minutes|hours|days|weeks|months|years|reconciliations|invoices|transactions|records|rows|lines)|(?:\b(?:ARR|MRR|EBITDA|ROI|CAC|LTV|P&L|CSAT|NPS)\b\s*[:=]?\s*\d+)|\b\d+(?:\.\d+)?\s*\/\s*(?:5|10|100)\b)/i;
  let quantifiedCount = 0;
  let actionVerbCount = 0;
  const unquantifiedBullets: string[] = [];
  const passiveBullets: { bullet: string; phrase: string; name: string }[] = [];
  const fluffViolations: { bullet: string; term: string }[] = [];
  const lengthViolations: { bullet: string; reason: string }[] = [];

  for (const bullet of allBullets) {
    // Metric check
    if (metricRegex.test(bullet)) {
      quantifiedCount += 1;
    } else {
      unquantifiedBullets.push(bullet);
    }

    // Active verb check: clean markdown/bullet symbols and check first two words (e.g., 'Successfully launched' or 'Mitigated')
    const cleanBullet = bullet.replace(/^[\s\-\*\•\d\.\)\:]+/, "").trim();
    const leadingWords = cleanBullet
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w.toLowerCase().replace(/[^a-z]/g, ""))
      .filter(Boolean);
    if (leadingWords.some((w) => STRONG_ACTION_VERBS.has(w))) {
      actionVerbCount += 1;
    }

    // Passive / weak phrase audit
    for (const pattern of WEAK_PASSIVE_PATTERNS) {
      if (pattern.regex.test(bullet)) {
        passiveBullets.push({ bullet, phrase: pattern.phrase, name: pattern.name });
        break;
      }
    }

    // Fluff / cliché buzzword audit
    for (const buzz of CLICHE_BUZZWORDS) {
      if (buzz.regex.test(bullet)) {
        fluffViolations.push({ bullet, term: buzz.term });
        break;
      }
    }

    // Length check: too short (<8 words) or run-on (>36 words)
    const wordCount = bullet.split(/\s+/).length;
    if (wordCount < 8) {
      lengthViolations.push({ bullet, reason: "Stunted (<8 words), lacks professional depth and context" });
    } else if (wordCount > 36) {
      lengthViolations.push({ bullet, reason: "Run-on (>36 words), degrades recruiter scannability" });
    }
  }

  const totalBullets = Math.max(1, allBullets.length);
  const metricRatio = quantifiedCount / totalBullets;
  const actionVerbRatio = actionVerbCount / totalBullets;

  // 2. Content Quality & Measurable Impact Score (25% Weight)
  // Combines quantified outcomes and strong action verbs
  const rawMetricScore = Math.min(
    100,
    Math.round((metricRatio * 60) + (actionVerbRatio * 40))
  );
  const metricScore = Math.min(98, rawMetricScore);

  // 3. Structure & Section Completeness Score (25% Weight)
  // Evaluates ATS parser readability, contact completeness, and core section presence
  let structurePoints = 0;
  if (resume.contact?.name && resume.contact?.email) structurePoints += 25;
  const hasSummary = Array.isArray(resume.sections) && resume.sections.some(
    (s) => s.type === "text" || s.title.toLowerCase().includes("summary")
  );
  if (hasSummary) structurePoints += 25;
  const hasExperience = Array.isArray(resume.sections) && resume.sections.some(
    (s) => (s.type === "bullet_list" || s.type === "projects") && s.entries && s.entries.length > 0
  );
  if (hasExperience) structurePoints += 25;
  const hasSkills = Array.isArray(resume.sections) && resume.sections.some(
    (s) => s.type === "skills" || (s.categories && s.categories.length > 0) || (s.items && s.items.length > 0)
  );
  if (hasSkills) structurePoints += 25;

  const structureScore = Math.min(100, structurePoints);

  // ═══════════════════════════════════════════════════════════════
  // REFINED DEFICIENCIES & PENALTY SYSTEM (GENUINE SCREENING RISKS)
  // ═══════════════════════════════════════════════════════════════
  const redFlags: AtsRedFlag[] = [];
  let totalPenalties = 0;

  // Deduction 1: Passive voice / weak non-ownership verbs
  if (passiveBullets.length > 0) {
    const penalty = Math.min(6, passiveBullets.length * 2);
    totalPenalties += penalty;
    const sample = passiveBullets[0];
    redFlags.push({
      id: "flag-passive-voice",
      severity: passiveBullets.length >= 3 ? "critical" : "warning",
      category: "passive_voice",
      title: `${passiveBullets.length} Passive / Weak Action Phrasing Detected`,
      description: `Screeners penalize passive phrasing ('${sample.phrase}') because it signals task execution without proactive professional ownership.`,
      penaltyPoints: penalty,
      flaggedText: sample.bullet,
      remediation: "Replace with decisive tier-1 active verbs (e.g. 'Delivered', 'Spearheaded', 'Orchestrated', 'Engineered', 'Accelerated')."
    });
  }

  // Deduction 2: Extreme lack of quantification
  const unquantifiedCount = totalBullets - quantifiedCount;
  if (metricRatio < 0.35 && unquantifiedCount > 0) {
    const penalty = Math.min(6, Math.round(unquantifiedCount * 1.5));
    totalPenalties += penalty;
    const sample = unquantifiedBullets[0];
    redFlags.push({
      id: "flag-unquantified",
      severity: metricRatio < 0.20 ? "critical" : "warning",
      category: "unquantified_bullet",
      title: `Low Quantification Density (${Math.round(metricRatio * 100)}%)`,
      description: "Recruiters favor experience bullets with verifiable scale. Adding percentages, user counts, latency reductions, or volume benchmarks increases recruiter engagement.",
      penaltyPoints: penalty,
      flaggedText: sample,
      remediation: "Add measurable outcomes (e.g. % growth, cost/time savings, client/user volume, or latency improvements)."
    });
  }

  // Deduction 3: Cliché Buzzwords & Fluff
  if (fluffViolations.length > 0) {
    const penalty = Math.min(5, fluffViolations.length * 2);
    totalPenalties += penalty;
    const sample = fluffViolations[0];
    redFlags.push({
      id: "flag-cliche-fluff",
      severity: "warning",
      category: "cliche_fluff",
      title: `Subjective Fluff Buzzwords Found ('${sample.term}')`,
      description: "Subjective self-descriptors are discarded by ATS filters and viewed negatively by hiring managers without verifiable evidence.",
      penaltyPoints: penalty,
      flaggedText: sample.bullet,
      remediation: `Remove '${sample.term}' and replace with specific professional achievements and measurable outcomes.`
    });
  }

  // Deduction 4: Missing Primary Job Description Skills (Genuine Knockout Filter)
  if (jdKeywords.length >= 4 && missingKeywords.length > 0) {
    const missingRatio = missingKeywords.length / jdKeywords.length;
    if (missingRatio > 0.40) {
      const penalty = Math.min(10, Math.round(missingRatio * 12));
      totalPenalties += penalty;
      const topMissing = missingKeywords.slice(0, 4).join(", ");
      redFlags.push({
        id: "flag-missing-skills",
        severity: "critical",
        category: "missing_core_requirement",
        title: `Core JD Requirements Missing: ${topMissing}`,
        description: `ATS screening engines automatically gatekeep candidates who miss high-frequency JD skills. You are missing ${missingKeywords.length} of ${jdKeywords.length} target keywords.`,
        penaltyPoints: penalty,
        remediation: `Inject missing core competencies into your Skills and relevant experience bullets: ${topMissing}.`
      });
    }
  }

  // Deduction 5: Formatting / Bullet Length Violations
  if (lengthViolations.length > 0) {
    const penalty = Math.min(4, lengthViolations.length * 1);
    totalPenalties += penalty;
    const sample = lengthViolations[0];
    redFlags.push({
      id: "flag-length-violation",
      severity: "caution",
      category: "formatting_risk",
      title: `${lengthViolations.length} Work Bullet Length Violation${lengthViolations.length > 1 ? "s" : ""}`,
      description: "Experience bullets that are either under 8 words (too brief) or over 36 words (run-on) reduce recruiter reading speed and fail readability checks.",
      penaltyPoints: penalty,
      flaggedText: sample.bullet,
      remediation: "Reformat work bullets to optimal executive length (14 - 28 words per bullet)."
    });
  }

  // Deduction 6: Missing Professional Summary
  if (!hasSummary) {
    totalPenalties += 4;
    redFlags.push({
      id: "flag-no-summary",
      severity: "warning",
      category: "formatting_risk",
      title: "Missing Professional Summary",
      description: "Resumes without an executive 3-line summary suffer lower engagement in the first 6-second recruiter screen.",
      penaltyPoints: 4,
      remediation: "Add an authoritative 2-3 sentence Professional Summary at the top of your resume."
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // CALIBRATED REAL-WORLD ATS RATING (50% KW / 25% CONTENT / 25% STRUCT)
  // ═══════════════════════════════════════════════════════════════
  const rawWeighted = (keywordScore * 0.50) + (metricScore * 0.25) + (structureScore * 0.25);
  // Deductions capped at max 15 points to prevent unrealistic score collapse
  const effectivePenalties = Math.min(15, totalPenalties);
  const calculatedOverall = Math.round(rawWeighted - effectivePenalties);
  // Realistic score boundaries: 25% to 98%
  const overallScore = Math.max(25, Math.min(98, calculatedOverall));

  // Risk Level Classification
  let rejectionRisk: AtsScoreResult["rejectionRisk"] = "Moderate";
  let verdictSummary = "";

  if (overallScore < 50) {
    rejectionRisk = "Critical";
    verdictSummary = "🔴 Critical ATS Rejection Risk: Substantial red flags and deficiencies detected. This resume will likely be auto-filtered prior to human review.";
  } else if (overallScore < 70) {
    rejectionRisk = "High";
    verdictSummary = "🟠 High Rejection Risk: Significant gaps in quantified metrics or key JD skills. Requires revision to pass competitive screener cutoffs.";
  } else if (overallScore < 82) {
    rejectionRisk = "Moderate";
    verdictSummary = "🟡 Moderate ATS Match: Meets baseline qualifications but lacks the metric density or keyword depth needed for top-tier interview priority.";
  } else if (overallScore < 92) {
    rejectionRisk = "Competitive";
    verdictSummary = "🟢 Competitive Candidate: Strong alignment with target JD and measurable impact standards. Well-positioned for interview screening.";
  } else {
    rejectionRisk = "Elite";
    verdictSummary = "🏆 Elite Benchmark: Exceptional quantification, active verbs, and keyword alignment. Top 5% recruiter percentile.";
  }

  // Regulatory Audit Checklist
  const audit: AtsRegulatoryAudit = {
    metricCompliance: {
      passed: metricRatio >= 0.85,
      ratio: Math.round(metricRatio * 100),
      required: 85,
      label: "Quantified Impact & Scale (Target: ≥85%)",
    },
    actionVerbCompliance: {
      passed: actionVerbRatio >= 0.90 && passiveBullets.length === 0,
      ratio: Math.round(actionVerbRatio * 100),
      required: 90,
      label: "Decisive Active Verbs (Target: ≥90%, Zero Passive)",
    },
    keywordDensityCompliance: {
      passed: jdKeywords.length === 0 || (matchedKeywords.length / jdKeywords.length) >= 0.80,
      ratio: jdKeywords.length > 0 ? Math.round((matchedKeywords.length / jdKeywords.length) * 100) : 100,
      required: 80,
      label: "Target JD Keyword Match (Target: ≥80%)",
    },
    structuralIntegrityCompliance: {
      passed: structureScore >= 90,
      passedCount: Math.round(structureScore / 25),
      totalCount: 4,
      label: "ATS Structural Integrity (Summary, Skills, Exp, Contact)",
    },
    fluffFreeCompliance: {
      passed: fluffViolations.length === 0,
      violationsCount: fluffViolations.length,
      label: "Fluff-Free Audit (Zero Cliché Buzzwords)",
    },
  };

  // Build actionable suggestions
  const suggestions: string[] = [];
  for (const flag of redFlags) {
    suggestions.push(flag.remediation);
  }
  if (suggestions.length === 0) {
    suggestions.push("Exemplary ATS alignment. Resume strictly satisfies tier-1 recruiter standards.");
  }

  return {
    overallScore,
    keywordScore,
    metricScore,
    structureScore,
    matchedKeywords,
    missingKeywords,
    missingCriticalSkills: missingKeywords.slice(0, 6),
    quantifiedBulletsCount: quantifiedCount,
    totalBulletsCount: allBullets.length,
    metricPercentage: Math.round(metricRatio * 100),
    suggestions,
    redFlags,
    totalPenalties,
    rejectionRisk,
    verdictSummary,
    audit,
  };
}

