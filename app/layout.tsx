import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { GeistSans } from "geist/font/sans";
import { Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space",
  display: "swap",
});

const SITE_URL = "https://resumeforge.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ResumeForge — Precision ATS Resume Builder",
    template: "%s | ResumeForge",
  },
  description:
    "Tailor your resume and outreach directly to any job description with Humanizer anti-AI intelligence. Bring your own API key — your data stays yours.",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "ResumeForge",
    title: "ResumeForge — Precision ATS Resume Builder",
    description:
      "Upload your resume, paste the job description, and get an ATS-optimized version in 10 seconds with Humanizer anti-AI intelligence. Multi-export to PDF, Word (.docx), and LaTeX.",
    images: [
      {
        url: "/og-image.png",
        width: 1600,
        height: 900,
        alt: "ResumeForge — Precision ATS Resume Builder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ResumeForge — Precision ATS Resume Builder",
    description:
      "AI resume tailoring and cold outreach drafts with anti-AI Humanizer intelligence. Bring your own API key — free and private.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/icon.svg?v=3",
    shortcut: "/icon.svg?v=3",
    apple: "/icon.svg?v=3",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="antialiased">
      <body className={cn(GeistSans.className, spaceGrotesk.variable)}>
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
