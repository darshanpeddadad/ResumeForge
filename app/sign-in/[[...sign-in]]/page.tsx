"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/generate",
      });
      if (res.error) {
        setError(res.error.message || "Invalid email or password");
      } else {
        window.location.href = "/generate";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden bg-background">
      {/* Ambient Glow Orbs */}
      <div className="ambient-orb -top-20 -left-20 h-96 w-96 bg-[#c9a96e]/10" />
      <div className="ambient-orb -bottom-20 -right-20 h-96 w-96 bg-[#c9a96e]/5" />

      <div className="glass-card relative z-10 w-full max-w-sm space-y-5 p-7 rounded-3xl border border-border/50 shadow-2xl backdrop-blur-xl">
        <div className="space-y-2 text-center flex flex-col items-center">
          <Link href="/" className="inline-block hover:opacity-90 transition-opacity">
            <Logo size="lg" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-foreground pt-1">Welcome back</h1>
          <p className="text-xs text-muted-foreground">
            Sign in to continue to your tailored workspace
          </p>
        </div>

        <form onSubmit={handleEmailSignIn} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-xl border-border/50 bg-background/60 shadow-inner focus-visible:ring-primary"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="rounded-xl border-border/50 bg-background/60 shadow-inner focus-visible:ring-primary"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive text-center font-medium bg-destructive/10 p-2 rounded-lg border border-destructive/20">{error}</p>
          )}

          <Button type="submit" className="glossy-btn-primary w-full font-semibold text-primary-foreground" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/sign-up" className="underline hover:text-foreground">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
