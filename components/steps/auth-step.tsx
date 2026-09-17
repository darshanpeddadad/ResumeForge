"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthStep() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
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
            setError("An account with this email already exists. Switching to Sign In...");
            setTimeout(() => {
              setIsSignUp(false);
              setError("Please enter your password to sign in.");
            }, 1200);
          } else {
            setError(rawMsg || res.error.statusText || "Failed to sign up");
          }
        } else {
          window.location.href = "/generate";
        }
      } else {
        const res = await authClient.signIn.email({
          email: email.trim().toLowerCase(),
          password,
          callbackURL: "/generate",
        });
        if (res.error) {
          setError(res.error.message || "Invalid email or password");
        } else {
          window.location.href = "/generate";
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 py-2 max-w-sm mx-auto w-full">
      <p className="text-sm text-muted-foreground text-center">
        {isSignUp ? "Create an account to continue" : "Sign in to continue"}
      </p>

      <form onSubmit={handleEmailAuth} className="w-full space-y-3">
        {isSignUp && (
          <div className="space-y-1">
            <Label htmlFor="auth-name" className="text-xs">Name</Label>
            <Input
              id="auth-name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required={isSignUp}
              autoComplete="name"
            />
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor="auth-email" className="text-xs">Email</Label>
          <Input
            id="auth-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="auth-password" className="text-xs">Password</Label>
          <Input
            id="auth-password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={isSignUp ? "new-password" : "current-password"}
          />
        </div>

        {error && (
          <p className="text-xs text-destructive text-center bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Processing..." : isSignUp ? "Create Account" : "Sign In"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => {
          setIsSignUp(!isSignUp);
          setError(null);
        }}
        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
      >
        {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
      </button>
    </div>
  );
}
