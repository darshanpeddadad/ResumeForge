"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { File01Icon } from "@/components/ui/file-01";
import { Login01Icon } from "@/components/ui/login-01";
import { Logout01Icon } from "@/components/ui/logout-01";
import { Settings01Icon } from "@/components/ui/settings-01";
import { Logo } from "@/components/logo";

export function Navbar() {
  const { data: session } = authClient.useSession();

  const handleSignOut = () => {
    authClient.signOut();
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 backdrop-blur-xl transition-all"
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
        <Link href="/generate">
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

        <Link href="/cover-letter">
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

        {session ? (
          <div className="flex items-center gap-2">
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
            {session.user.image && (
              <Image
                src={session.user.image}
                alt={session.user.name || "User"}
                width={28}
                height={28}
                className="rounded-full"
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              style={{ color: "rgba(245,245,240,0.6)", fontSize: "0.8rem" }}
              onClick={handleSignOut}
            >
              <Logout01Icon size={13} className="mr-1.5" />
              Sign Out
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            style={{ color: "rgba(245,245,240,0.6)", fontSize: "0.8rem" }}
            onClick={() => (window.location.href = "/sign-in")}
          >
            <Login01Icon size={13} className="mr-1.5" />
            Sign In
          </Button>
        )}
      </div>
    </nav>
  );
}
