"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { File01Icon } from "@/components/ui/file-01";
import { MagicWand01Icon } from "@/components/ui/magic-wand-01";
import { Mail01Icon } from "@/components/ui/mail-01";
import { ArrowRight02Icon } from "@/components/ui/arrow-right-02";
import { Footer } from "@/components/footer";

export default function Page() {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.replace("/generate");
    }
  }, [session, router]);

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-background">
      {/* ─── Ambient Glow Background Orbs ─── */}
      <div className="ambient-orb top-[-100px] left-1/2 -translate-x-1/2 size-[650px] bg-primary/25 pointer-events-none" />
      <div className="ambient-orb top-[400px] -left-[150px] size-[500px] bg-purple-500/15 pointer-events-none" />
      <div className="ambient-orb top-[600px] -right-[150px] size-[550px] bg-blue-500/15 pointer-events-none" />

      <Navbar />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pt-32 pb-20 text-center max-w-4xl mx-auto w-full">
        {/* Floating Glossy Pill Badge */}
        <div className="glass-pill inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-semibold text-foreground/90 mb-8 tracking-wide transition-all hover:border-primary/40">
          <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Anti-AI Humanizer Engine</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">Word (.docx) & PDF</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-primary font-bold">ATS-Optimized</span>
        </div>

        {/* Proportional Headline */}
        <h1 className="max-w-3xl text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight bg-gradient-to-b from-foreground via-foreground to-foreground/80 bg-clip-text">
          Let’s be honest: our resume is currently a dumpster fire.
        </h1>
        <p className="mt-3 max-w-2xl text-xl sm:text-2xl font-semibold text-muted-foreground leading-snug">
          Allow me to save us both from professional embarrassment and actually fix it :)
        </p>

        {/* Emojis in a glass container */}
        <div className="my-5 inline-flex items-center gap-3 px-4 py-1.5 rounded-full glass-card text-2xl select-none shadow-xs">
          <span>💩</span>
          <span>💩</span>
          <span>💩</span>
        </div>

        {/* Subtitle */}
        <p className="max-w-xl text-sm sm:text-base text-muted-foreground leading-relaxed">
          Let&apos;s fix that. AI-tailored resumes, cover letters, and cold outreach drafts—all in one place, because writing them yourself is a form of self-harm. 💀
        </p>

        {/* Glossy CTA Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <Link href="/generate">
            <Button size="lg" className="h-13 px-8 text-sm sm:text-base font-bold text-white glossy-btn-primary rounded-xl shadow-lg gap-2">
              {session ? "Open the App" : "You can Start because it's free, not a click bait for real :("}
              <ArrowRight02Icon size={16} />
            </Button>
          </Link>
        </div>

        {/* Feature Cards with Glassmorphism */}
        <div className="mt-20 grid w-full gap-5 sm:grid-cols-3 text-left">
          <Feature
            icon={<File01Icon size={20} className="text-blue-500" />}
            title="Resume Tailoring"
            desc="AI rewrites your resume to match any job description in seconds—so you can pretend you actually custom-tailored it while you play Valorant."
          />
          <Feature
            icon={<MagicWand01Icon size={20} className="text-amber-500" />}
            title="Cover Letter"
            desc="Zero fluff, metric-driven cover letters strictly aligned with the target role—because nobody has ever gotten hired by talking about their passion for fast-paced environments."
          />
          <Feature
            icon={<Mail01Icon size={20} className="text-purple-500" />}
            title="Cold Message"
            desc="Auto-generated emails and LinkedIn DMs that actually get replies—saving you from the crushing despair of reading 'Thanks, but we're moving forward with other candidates'."
          />
        </div>

        <p className="mt-14 text-xs text-muted-foreground">
          Bring your own API key. Your data stays yours—because we&apos;re paranoid, too. 🔒
        </p>
      </main>

      <Footer />
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="glass-card group relative rounded-2xl p-5.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/30">
      <div className="mb-3.5 flex size-9 items-center justify-center rounded-xl bg-muted/60 border border-border/40 group-hover:scale-105 transition-transform">
        {icon}
      </div>
      <h2 className="text-sm font-bold text-foreground mb-1.5">{title}</h2>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}
