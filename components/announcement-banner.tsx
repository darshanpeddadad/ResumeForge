"use client";

import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, X, Sparkles } from "lucide-react";

interface Announcement {
  id: string;
  message: string;
  type: "info" | "warning" | "success";
  isActive: boolean;
  createdAt: string;
}

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    async function fetchAnnouncement() {
      try {
        const res = await fetch("/api/announcements");
        if (res.ok) {
          const data = await res.json();
          if (data.announcement && data.announcement.isActive) {
            const dismissedKey = `rf_dismissed_${data.announcement.id}`;
            const alreadyDismissed = sessionStorage.getItem(dismissedKey);
            if (!alreadyDismissed) {
              setAnnouncement(data.announcement);
              setIsDismissed(false);
            }
          }
        }
      } catch {
        // Silently ignore network failures for announcement banner
      }
    }

    fetchAnnouncement();
  }, []);

  const handleDismiss = () => {
    if (announcement) {
      sessionStorage.setItem(`rf_dismissed_${announcement.id}`, "true");
    }
    setIsDismissed(true);
  };

  if (!announcement || isDismissed) return null;

  const getBannerStyles = () => {
    switch (announcement.type) {
      case "warning":
        return "bg-amber-500/15 border-b border-amber-500/30 text-amber-300";
      case "success":
        return "bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300";
      case "info":
      default:
        return "bg-primary/10 border-b border-primary/25 text-foreground";
    }
  };

  const getBannerIcon = () => {
    switch (announcement.type) {
      case "warning":
        return <AlertCircle className="size-4 shrink-0 text-amber-400" />;
      case "success":
        return <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />;
      case "info":
      default:
        return <Sparkles className="size-4 shrink-0 text-primary" />;
    }
  };

  return (
    <div
      role="alert"
      className={`relative z-50 flex items-center justify-between px-4 py-2 text-xs transition-all backdrop-blur-md ${getBannerStyles()}`}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2 pr-6">
        {getBannerIcon()}
        <span className="font-medium leading-normal">{announcement.message}</span>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss announcement"
        className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
