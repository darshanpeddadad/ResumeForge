# ⚡ ResumeForge

> Precision ATS Resume & Cover Letter Suite — built on top of [Subhraneel Goswami](https://github.com/subhraneel2005)'s open-source project foundation.

**ResumeForge** turns your existing resume (PDF or Word document) into an ATS-optimized, role-tailored resume in seconds. Features Humanizer anti-AI writing intelligence, live in-place LaTeX editing, Word (.docx) & PDF multi-format export, and targeted cover letters & cold outreach. Runs **100% on your own API keys** (BYOK) — bring your own key, delete your data anytime, zero subscription walls.

---

## ✨ Features

### 🎯 Tailored Resume in One Click
- Upload your existing resume (PDF or Word `.docx`) and paste the **job description** you're chasing.
- The AI rewrites and tailors your resume to that exact role, optimizing keywords for Applicant Tracking Systems (ATS) while preserving your authentic experience.
- Contact links (LinkedIn, GitHub, portfolio) are pulled straight from your document, so they always point to the real URLs.
- **Every AI change is highlighted** — added bullets, rewritten bullets, and new skills are color-coded so you can audit exactly what the AI changed before exporting.

### 📝 Live Editor & Multi-Format Export
- **Downloadable PDF**: Rendered and compiled entirely in your browser using `@react-pdf/renderer` — no server-side LaTeX toolchain needed.
- **Word Document (.docx)**: Export clean, professionally formatted Microsoft Word files.
- **LaTeX Source (`.tex`)**: Export standard Jake's Resume LaTeX code with an integrated live in-browser editor and instant preview.

### 🤖 Humanizer Anti-AI Writing Engine
- Replaces sterile AI fluff and buzzwords with punchy, metric-driven action verbs.
- Ensures resume bullets sound authentic, natural, and pass AI-content detection checks.

### ✉️ Cover Letter Generator
- Instantly crafts a targeted, professional cover letter tailored to the specific job description and company.
- Matches the tone and accomplishments of your optimized resume.

### 📧 Cold Outreach That Doesn't Suck
- Provide a job description and get a polished **cold email** and a snappy **cold DM** — written with your tailored resume in hand.
- Copy-paste ready for recruiters and hiring managers. Fire and forget.

### 🔐 Bring Your Own Key (BYOK)
- Add either an **OpenAI** or **Google AI** API key under **AI Settings** — it powers the resume tailor, cover letter, and outreach generator.
- Your key is encrypted server-side with AES-256. No server-side secrets, no middleman markup — every AI call is billed directly to *your* provider account.

### 🔒 Your Data, Your Call
- **Google or GitHub** sign-in via Better Auth.
- No subscription walls or lock-in. Your resumes and generated outreach stay private and in your hands.

---

## 🚀 Quick Start (for users)

1. **Sign in** with Google or GitHub.
2. Go to **AI Settings**, paste your **OpenAI** or **Google AI** API key.
3. Upload your resume → paste the job description → hit **Generate**.
4. Audit the highlighted changes, customize bullets in the live editor, and download your **PDF**, **Word (.docx)**, or **LaTeX** file.
5. Grab your matching **Cover Letter** and **Cold Outreach** messages and apply with confidence.

---

## 🧠 Technical Overview

Architecture & stack powering the product.

### Stack
- **Framework:** Next.js 16 (App Router, React 19, TypeScript)
- **UI:** Tailwind CSS + shadcn/ui
- **Auth:** Better Auth (Google + GitHub OAuth, cookies)
- **Database:** Drizzle ORM on Neon/Postgres (`lib/db/schema.ts`)
- **AI:** Vercel AI SDK (`ai` v7) with `@ai-sdk/openai` and `@ai-sdk/google`
- **PDF Engine:** `@react-pdf/renderer` (`components/pdf-resume.tsx`) — compiled client-side in the browser
- **Document Processing:** `pdfjs-dist`, `mammoth` (DOCX parsing), and `docx` (Word export)

### Key Modules
| Area | Where |
| --- | --- |
| Resume & Document Parsing | `lib/pdf-parser.ts`, `lib/document-parser.ts` |
| LaTeX Generation & Templates | `lib/latex-renderer.ts`, `lib/template-renderer.ts`, `templates/jake-resume.tex` |
| Live Preview & PDF Download | `components/pdf-resume.tsx`, `components/latex-preview.tsx`, `components/resume-preview.tsx` |
| Word (.docx) Export | `lib/docx-renderer.ts` |
| Humanizer Engine | `lib/humanizer.ts`, `app/api/humanize/route.ts` |
| Cover Letter & Outreach | `lib/cover-letter-generator.ts`, `lib/outreach-generator.ts`, `app/cover-letter/` |
| Visual Change Auditing | `lib/highlights.ts` |
| AI Settings & BYOK Encryption | `lib/encryption.ts`, `app/api/settings/ai-provider/route.ts`, `components/settings/ai-provider-form.tsx` |

### Environment
```env
DATABASE_URL=postgres://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...        # GitHub OAuth callback: /api/auth/callback/github
GITHUB_CLIENT_SECRET=...
BETTER_AUTH_SECRET=...      # also used as the encryption key for users' API keys
BETTER_AUTH_URL=http://localhost:3000
```
