"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { File01Icon } from "@/components/ui/file-01";
import { Login01Icon } from "@/components/ui/login-01";
import { Logout01Icon } from "@/components/ui/logout-01";
import { Settings01Icon } from "@/components/ui/settings-01";
import { ShieldCheck, FolderKanban } from "lucide-react";
import { Logo } from "@/components/logo";
import { AnnouncementBanner } from "@/components/announcement-banner";

export function Navbar() {
  const { data: session } = authClient.useSession();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!session?.user) {
      setIsAdmin(false);
      return;
    }
    // Check if role is admin on the user object directly
    if ((session.user as any)?.role === "admin") {
      setIsAdmin(true);
      return;
    }
    // Asynchronously verify with server API
    fetch("/api/admin/check")
      .then((res) => res.json())
      .then((data) => setIsAdmin(Boolean(data.isAdmin)))
      .catch(() => setIsAdmin(false));
  }, [session]);

  const handleSignOut = () => {
    authClient.signOut();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col">
      <AnnouncementBanner />
      <nav
        className="flex items-center justify-between px-6 py-3 backdrop-blur-xl transition-all"
        style={{
          background: "rgba(0,0,0,0.82)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="flex items-center gap-3">
          <Link href="/">
            <Logo size="md" />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link href={session ? "/generate" : "/sign-in?callbackUrl=/generate"}>
            <button
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.5rem 1.1rem",
                borderRadius: "999px",
                fontWeight: 600,
                fontSize: "0.82rem",
                color: "#000",
                background: "#c9a96e",
                border: "1px solid rgba(201,169,110,0.4)",
                boxShadow: "0 4px 18px rgba(201,169,110,0.3)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#e8c97a";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 24px rgba(201,169,110,0.5)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#c9a96e";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 18px rgba(201,169,110,0.3)";
              }}
            >
              <File01Icon size={13} />
              Generate
            </button>
          </Link>

          <Link href={session ? "/cover-letter" : "/sign-in?callbackUrl=/cover-letter"}>
            <Button
              variant="outline"
              size="sm"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(245,245,240,0.85)",
                fontSize: "0.8rem",
              }}
            >
              <File01Icon size={13} className="mr-1.5" />
              Cover Letter
            </Button>
          </Link>

          <Link href={session ? "/applications" : "/sign-in?callbackUrl=/applications"}>
            <Button
              variant="outline"
              size="sm"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(245,245,240,0.85)",
                fontSize: "0.8rem",
              }}
            >
              <FolderKanban size={13} className="mr-1.5 text-primary" />
              Vault & Tracker
            </Button>
          </Link>

          {session ? (
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  style={{
                    background: "rgba(201,169,110,0.1)",
                    border: "1px solid rgba(201,169,110,0.25)",
                    color: "#e8c97a",
                    fontSize: "0.8rem",
                  }}
                  onClick={() => (window.location.href = "/admin")}
                >
                  <ShieldCheck size={13} className="mr-1.5 text-primary" />
                  Admin
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(245,245,240,0.7)",
                  fontSize: "0.8rem",
                }}
                onClick={() => (window.location.href = "/settings")}
              >
                <Settings01Icon size={13} className="mr-1.5" />
                Settings
              </Button>
              <div className="flex items-center gap-2 pl-2">
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name ?? "User"}
                    width={28}
                    height={28}
                    className="rounded-full ring-1 ring-white/20"
                  />
                ) : (
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
                    style={{
                      background: "rgba(201,169,110,0.2)",
                      color: "#e8c97a",
                      border: "1px solid rgba(201,169,110,0.4)",
                    }}
                  >
                    {session.user.name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                )}
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "rgba(245,245,240,0.7)",
                  }}
                >
                  {session.user.name?.split(" ")[0]}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  style={{
                    color: "rgba(245,245,240,0.5)",
                    fontSize: "0.8rem",
                  }}
                  onClick={handleSignOut}
                >
                  <Logout01Icon size={13} />
                </Button>
              </div>
            </div>
          ) : (
            <Link href="/sign-in">
              <Button
                variant="outline"
                size="sm"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "rgba(245,245,240,0.9)",
                  fontSize: "0.8rem",
                }}
              >
                <Login01Icon size={13} className="mr-1.5" />
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
