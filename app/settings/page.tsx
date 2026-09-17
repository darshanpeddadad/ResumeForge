"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { AiProviderForm } from "@/components/settings/ai-provider-form";

export default function SettingsPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/sign-in?callbackUrl=/settings");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-background">
      {/* Ambient Glow Orbs */}
      <div className="ambient-orb -top-24 -left-24 h-96 w-96 bg-primary/20" />
      <div className="ambient-orb top-1/3 -right-24 h-96 w-96 bg-indigo-500/15" />
      <div className="ambient-orb -bottom-24 left-1/4 h-80 w-80 bg-cyan-500/15" />

      <Navbar />

      <main className="relative z-10 flex flex-1 w-full items-center justify-center p-4 pt-24 pb-12">
        <div className="w-full max-w-3xl space-y-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure your BYOK AI provider API keys & preferences
            </p>
          </div>
          <AiProviderForm />
        </div>
      </main>

      <Footer />
    </div>
  );
}
