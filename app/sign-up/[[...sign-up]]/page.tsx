"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExistingUser, setIsExistingUser] = useState(false);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setIsExistingUser(false);

    try {
      const res = await authClient.signUp.email({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim() || email.split("@")[0],
        callbackURL: "/generate",
      });

      if (res.error) {
        const rawMsg = res.error.message || "";
        const rawCode = (res.error as { code?: string }).code || "";
        const isAlreadyExists =
          rawCode.includes("USER_ALREADY_EXISTS") ||
          rawMsg.toLowerCase().includes("user already exists") ||
          rawMsg.toLowerCase().includes("already exists") ||
          res.error.status === 422;

        if (isAlreadyExists) {
          setIsExistingUser(true);
          setError("An account with this email already exists. Please sign in instead.");
        } else {
          setError(rawMsg || res.error.statusText || "Failed to create account. Please check your credentials.");
        }
      } else {
        window.location.href = "/generate";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration error");
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
          <h1 className="text-xl font-bold tracking-tight text-foreground pt-1">Create an account</h1>
          <p className="text-xs text-muted-foreground">
            Get started with your tailored AI career workspace
          </p>
        </div>

        <form onSubmit={handleEmailSignUp} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-medium">Name</Label>
            <Input
              id="name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className="rounded-xl border-border/50 bg-background/60 shadow-inner focus-visible:ring-primary"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="rounded-xl border-border/50 bg-background/60 shadow-inner focus-visible:ring-primary"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="rounded-xl border-border/50 bg-background/60 shadow-inner focus-visible:ring-primary"
            />
          </div>

          {error && (
            <div className="text-xs text-destructive text-center font-medium bg-destructive/10 p-3 rounded-xl border border-destructive/20 space-y-1.5">
              <p>{error}</p>
              {isExistingUser && (
                <Link
                  href="/sign-in"
                  className="inline-block font-semibold text-primary underline underline-offset-2 hover:opacity-80"
                >
                  Click here to Sign In →
                </Link>
              )}
            </div>
          )}

          <Button type="submit" className="glossy-btn-primary w-full font-semibold text-primary-foreground" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="underline hover:text-foreground">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
