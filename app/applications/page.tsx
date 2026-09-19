"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TARGET_COUNTRIES } from "@/lib/country-profiles";
import {
  FolderKanban,
  Plus,
  Search,
  FileText,
  Mail,
  Send,
  Trash2,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";

interface SavedApplicationItem {
  id: string;
  userId: string;
  jobTitle: string;
  companyName: string;
  targetCountry: string;
  atsScore: number;
  status: "saved" | "applied" | "interviewing" | "offer" | "rejected" | "archived";
  resumeData: string | null;
  latexCode: string | null;
  coverLetter: string | null;
  outreach: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const KANBAN_COLUMNS: {
  id: SavedApplicationItem["status"];
  title: string;
  color: string;
  bg: string;
  border: string;
}[] = [
  {
    id: "saved",
    title: "Saved",
    color: "text-muted-foreground",
    bg: "bg-muted/15",
    border: "border-border/40",
  },
  {
    id: "applied",
    title: "Applied",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/25",
  },
  {
    id: "interviewing",
    title: "Interviewing",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
  },
  {
    id: "offer",
    title: "Offer Received",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
  },
  {
    id: "rejected",
    title: "Rejected",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/25",
  },
  {
    id: "archived",
    title: "Archived",
    color: "text-muted-foreground/60",
    bg: "bg-muted/10",
    border: "border-border/30",
  },
];

export default function ApplicationsVaultPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  const [applications, setApplications] = useState<SavedApplicationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<SavedApplicationItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"resume" | "cover" | "outreach">("resume");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    try {
      const res = await fetch("/api/applications");
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
      }
    } catch (err) {
      console.error("Failed to load saved applications:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in?callbackUrl=/applications");
      return;
    }
    if (session) {
      fetchApplications();
    }
  }, [session, isPending, router, fetchApplications]);

  const handleStatusChange = async (appId: string, newStatus: SavedApplicationItem["status"]) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
    );

    try {
      await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: appId, status: newStatus }),
      });
    } catch (err) {
      console.error("Failed to update status:", err);
      fetchApplications();
    }
  };

  const handleDelete = async (appId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this saved application from your vault?")) {
      return;
    }

    setApplications((prev) => prev.filter((a) => a.id !== appId));
    if (selectedApp?.id === appId) {
      setIsDetailOpen(false);
      setSelectedApp(null);
    }

    try {
      await fetch(`/api/applications?id=${encodeURIComponent(appId)}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Failed to delete application:", err);
      fetchApplications();
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const openAppDetail = (app: SavedApplicationItem) => {
    setSelectedApp(app);
    setIsDetailOpen(true);
    setActiveTab("resume");
  };

  const filteredApps = applications.filter(
    (a) =>
      a.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: applications.length,
    interviewing: applications.filter((a) => a.status === "interviewing").length,
    offers: applications.filter((a) => a.status === "offer").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
  };

  if (isPending || (isLoading && session)) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-background">
        <Navbar />
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Loading Application Vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-background">
      <div className="ambient-orb -top-24 -left-24 h-96 w-96 bg-primary/20 pointer-events-none" />
      <div className="ambient-orb top-1/3 -right-24 h-96 w-96 bg-indigo-500/15 pointer-events-none" />

      <Navbar />

      <main className="relative z-10 flex flex-1 w-full max-w-[1600px] flex-col p-4 pt-24 pb-16 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <FolderKanban className="size-6 text-primary" />
              <h1 className="text-3xl font-black tracking-tight text-foreground">
                Application Vault & Tracker
              </h1>
              <Badge className="bg-primary/20 text-primary border-primary/30 font-semibold text-[11px] px-2.5 py-0.5">
                {stats.total} Saved
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Your command center for tailored resumes, cover letters, outreach messages, and interview stages.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-64">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter by company or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 text-xs pl-8 rounded-xl bg-muted/30"
              />
            </div>

            <Button
              onClick={() => router.push("/generate")}
              className="glossy-btn-primary h-9 px-3.5 text-xs font-semibold text-black rounded-xl"
            >
              <Plus className="size-3.5 mr-1" /> Tailor New Role
            </Button>
          </div>
        </div>

        {/* Metric Summary Row (4 cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="glass-card border border-border/50 p-3.5 space-y-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Total Applications
            </span>
            <div className="text-2xl font-black text-foreground">{stats.total}</div>
          </Card>

          <Card className="glass-card border border-border/50 p-3.5 space-y-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Interviewing
            </span>
            <div className="text-2xl font-black text-amber-400">{stats.interviewing}</div>
          </Card>

          <Card className="glass-card border border-border/50 p-3.5 space-y-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Offers Received
            </span>
            <div className="text-2xl font-black text-emerald-400">{stats.offers}</div>
          </Card>

          <Card className="glass-card border border-border/50 p-3.5 space-y-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Rejected
            </span>
            <div className="text-2xl font-black text-rose-400">{stats.rejected}</div>
          </Card>
        </div>

        {/* Kanban Board Columns (6 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start">
          {KANBAN_COLUMNS.map((col) => {
            const colApps = filteredApps.filter((a) => a.status === col.id);
            return (
              <div
                key={col.id}
                className={`rounded-2xl border ${col.border} ${col.bg} p-3 space-y-3 flex flex-col min-h-[420px] transition-all`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-border/20">
                  <span className={`text-xs font-bold uppercase tracking-wider ${col.color}`}>
                    {col.title}
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold">
                    {colApps.length}
                  </Badge>
                </div>

                {/* Application Cards in Column */}
                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {colApps.map((app) => {
                    const country = TARGET_COUNTRIES.find((c) => c.code === app.targetCountry);
                    return (
                      <div
                        key={app.id}
                        onClick={() => openAppDetail(app)}
                        className="group relative rounded-xl border border-border/50 bg-background/80 hover:bg-background hover:border-primary/40 p-3 space-y-2 shadow-sm hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="font-bold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1">
                              {app.companyName}
                            </div>
                            <div className="text-[11px] text-muted-foreground line-clamp-1">
                              {app.jobTitle}
                            </div>
                          </div>

                          <span className="text-sm shrink-0" title={country?.name || app.targetCountry}>
                            {country?.flag || "🌐"}
                          </span>
                        </div>

                        {/* Badges: ATS Score & Status */}
                        <div className="flex items-center justify-between pt-1 text-[10px]">
                          {app.atsScore > 0 ? (
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1.5 py-0 font-bold ${
                                app.atsScore >= 90
                                  ? "text-emerald-400 border-emerald-500/30"
                                  : app.atsScore >= 70
                                  ? "text-amber-400 border-amber-500/30"
                                  : "text-rose-400 border-rose-500/30"
                              }`}
                            >
                              {app.atsScore}% ATS
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">Ready</span>
                          )}

                          <div className="flex items-center gap-1 text-muted-foreground group-hover:text-foreground text-[10px]">
                            <span>Inspect</span>
                            <ChevronRight className="size-2.5" />
                          </div>
                        </div>

                        {/* Quick Status Mover */}
                        <div className="pt-2 border-t border-border/20 flex items-center justify-between text-[10px]">
                          <select
                            value={app.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              handleStatusChange(app.id, e.target.value as SavedApplicationItem["status"])
                            }
                            className="h-6 text-[10px] rounded-lg border border-border/40 bg-muted/40 px-1 text-foreground"
                          >
                            <option value="saved">Saved</option>
                            <option value="applied">Applied</option>
                            <option value="interviewing">Interviewing</option>
                            <option value="offer">Offer</option>
                            <option value="rejected">Rejected</option>
                            <option value="archived">Archived</option>
                          </select>

                          <button
                            type="button"
                            onClick={(e) => handleDelete(app.id, e)}
                            className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {colApps.length === 0 && (
                    <div className="h-32 flex items-center justify-center border border-dashed border-border/30 rounded-xl text-[11px] text-muted-foreground/60 text-center p-2">
                      No jobs in {col.title}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════
          APPLICATION DETAIL INSPECTOR MODAL
      ═══════════════════════════════════════════════════════ */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-background/95 backdrop-blur-2xl border-border/60 p-6 space-y-4">
          {selectedApp && (
            <>
              <DialogHeader className="p-0 space-y-1">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={`text-xs uppercase font-bold ${
                      selectedApp.status === "rejected"
                        ? "text-rose-400 border-rose-500/40 bg-rose-500/10"
                        : selectedApp.status === "offer"
                        ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
                        : selectedApp.status === "interviewing"
                        ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
                        : selectedApp.status === "applied"
                        ? "text-blue-400 border-blue-500/40 bg-blue-500/10"
                        : "text-muted-foreground border-border/40"
                    }`}
                  >
                    {selectedApp.status === "offer" ? "Offer Received" : selectedApp.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Created {new Date(selectedApp.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  {selectedApp.jobTitle} at {selectedApp.companyName}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Target Country Standard: {selectedApp.targetCountry} · ATS Match: {selectedApp.atsScore}%
                </DialogDescription>
              </DialogHeader>

              {/* Tab Selector */}
              <div className="flex items-center gap-1.5 border-b border-border/40 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("resume")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    activeTab === "resume"
                      ? "bg-primary text-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="size-3.5" /> Tailored Resume LaTeX
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("cover")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    activeTab === "cover"
                      ? "bg-primary text-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Mail className="size-3.5" /> Cover Letter
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("outreach")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    activeTab === "outreach"
                      ? "bg-primary text-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Send className="size-3.5" /> Cold Outreach
                </button>
              </div>

              {/* Tab Content Display */}
              <div className="space-y-2">
                {activeTab === "resume" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">LaTeX Source Code</span>
                      {selectedApp.latexCode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(selectedApp.latexCode!, "latex")}
                          className="h-7 text-xs font-medium"
                        >
                          {copiedKey === "latex" ? (
                            <>
                              <Check className="size-3 mr-1 text-emerald-400" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="size-3 mr-1" /> Copy LaTeX
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    <pre className="p-3.5 rounded-xl bg-muted/30 border border-border/40 text-xs font-mono max-h-72 overflow-y-auto whitespace-pre-wrap text-foreground">
                      {selectedApp.latexCode || "No LaTeX source saved."}
                    </pre>
                  </div>
                )}

                {activeTab === "cover" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Tailored Cover Letter</span>
                      {selectedApp.coverLetter && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            let textToCopy = selectedApp.coverLetter!;
                            try {
                              const parsed = JSON.parse(selectedApp.coverLetter!);
                              textToCopy = parsed.body || parsed.text || selectedApp.coverLetter!;
                            } catch {}
                            handleCopy(textToCopy, "cover");
                          }}
                          className="h-7 text-xs font-medium"
                        >
                          {copiedKey === "cover" ? (
                            <>
                              <Check className="size-3 mr-1 text-emerald-400" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="size-3 mr-1" /> Copy Letter
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    <div className="p-4 rounded-xl bg-muted/30 border border-border/40 text-xs leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap text-foreground font-sans">
                      {(() => {
                        if (!selectedApp.coverLetter) return "No cover letter generated for this role.";
                        try {
                          const parsed = JSON.parse(selectedApp.coverLetter);
                          return parsed.body || parsed.text || JSON.stringify(parsed, null, 2);
                        } catch {
                          return selectedApp.coverLetter;
                        }
                      })()}
                    </div>
                  </div>
                )}

                {activeTab === "outreach" && (
                  <div className="space-y-3">
                    {(() => {
                      if (!selectedApp.outreach) return <p className="text-xs text-muted-foreground">No cold outreach saved for this role.</p>;
                      try {
                        const parsed = JSON.parse(selectedApp.outreach);
                        return (
                          <>
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-foreground">Cold Email Pitch</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopy(parsed.coldEmail || "", "email")}
                                  className="h-6 text-[11px]"
                                >
                                  {copiedKey === "email" ? "Copied!" : "Copy Email"}
                                </Button>
                              </div>
                              <pre className="p-3 rounded-xl bg-muted/30 border border-border/40 text-xs whitespace-pre-wrap font-sans text-foreground">
                                {parsed.coldEmail || "N/A"}
                              </pre>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-foreground">LinkedIn / Recruiter DM</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopy(parsed.coldDM || "", "dm")}
                                  className="h-6 text-[11px]"
                                >
                                  {copiedKey === "dm" ? "Copied!" : "Copy DM"}
                                </Button>
                              </div>
                              <pre className="p-3 rounded-xl bg-muted/30 border border-border/40 text-xs whitespace-pre-wrap font-sans text-foreground">
                                {parsed.coldDM || "N/A"}
                              </pre>
                            </div>
                          </>
                        );
                      } catch {
                        return <pre className="text-xs">{selectedApp.outreach}</pre>;
                      }
                    })()}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
