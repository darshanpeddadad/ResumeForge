"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { TARGET_COUNTRIES } from "@/lib/country-profiles";
import {
  Users,
  Activity,
  ShieldAlert,
  Sparkles,
  Globe,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Cpu,
  Layers,
  Search,
  Clock,
  Zap,
  Server,
  Database,
  ArrowUpRight,
  ShieldCheck,
  UserCheck,
  Radio,
  Download,
  LogOut,
  Laptop,
  Smartphone,
  Monitor,
  Eye,
  Flame,
  FileText,
  Mail,
  Send,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface StatsData {
  metrics: {
    totalUsers: number;
    activeSessions: number;
    onlineNow: number;
    totalGenerations: number;
    successRate: number;
  };
  timeline: {
    date: string;
    displayDate: string;
    resume: number;
    cover_letter: number;
    outreach: number;
    total: number;
  }[];
  features: {
    resume: number;
    coverLetter: number;
    outreach: number;
  };
  devices: { name: string; value: number }[];
  browsers: { name: string; value: number }[];
  providers: { provider: string; count: number }[];
  countries: { country: string; count: number }[];
  recentLogs: any[];
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt?: string;
  aiProvider: string | null;
  aiModel: string | null;
  isOnline: boolean;
  lastActiveAt: string;
  activeSessions: number;
  latestIp: string | null;
  latestDevice: string;
  totalGenerations: number;
}

interface UserSessionItem {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  isExpired: boolean;
  device: {
    os: string;
    browser: string;
  };
}

interface HealthData {
  status: string;
  timestamp: string;
  latencyMs: number;
  database: {
    status: string;
    latencyMs: number;
  };
  system: {
    nodeVersion: string;
    memoryRssMb: number | null;
    memoryHeapMb: number | null;
    uptimeSeconds: number;
  };
  aiCatalog: {
    defaultModels: Record<string, string>;
    availableProviders: string[];
  };
  countryProfilesCount: number;
}

function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "Just now";
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function AdminDashboardPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  const [isAdminUser, setIsAdminUser] = useState<boolean | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [logTypeFilter, setLogTypeFilter] = useState("all");
  const [logStatusFilter, setLogStatusFilter] = useState("all");
  const [health, setHealth] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState("US");
  const [isMounted, setIsMounted] = useState(false);

  // Real-time Auto-Refresh interval (off | 15s | 30s)
  const [autoRefreshRate, setAutoRefreshRate] = useState<"off" | "15s" | "30s">("off");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // User Deep-Dive Drawer
  const [selectedUserForDrawer, setSelectedUserForDrawer] = useState<UserItem | null>(null);
  const [drawerSessions, setDrawerSessions] = useState<UserSessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch all stats and verify admin status
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 401 || res.status === 403) {
        setIsAdminUser(false);
        return;
      }
      if (res.ok) {
        setIsAdminUser(true);
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to load admin stats:", err);
    }
  }, []);

  const fetchUsers = useCallback(async (query = "") => {
    try {
      const url = query ? `/api/admin/users?q=${encodeURIComponent(query)}` : "/api/admin/users";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  }, []);

  const fetchLogs = useCallback(async (type = "all", status = "all") => {
    try {
      const params = new URLSearchParams();
      if (type !== "all") params.set("type", type);
      if (status !== "all") params.set("status", status);
      params.set("limit", "100");

      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to load logs:", err);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/health");
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (err) {
      console.error("Failed to load health status:", err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.allSettled([
      fetchStats(),
      fetchUsers(userSearch),
      fetchLogs(logTypeFilter, logStatusFilter),
      fetchHealth(),
    ]);
    setLastRefreshedAt(new Date());
    setIsLoading(false);
  }, [fetchStats, fetchUsers, fetchLogs, fetchHealth, userSearch, logTypeFilter, logStatusFilter]);

  // Initial load
  useEffect(() => {
    if (!isPending && !session) {
      setIsLoading(false);
      return;
    }
    if (session) {
      refreshAll();
    }
  }, [session, isPending, router, refreshAll]);

  // Auto-refresh timer effect
  useEffect(() => {
    if (autoRefreshRate === "off" || !session || isAdminUser === false) return;
    const intervalMs = autoRefreshRate === "15s" ? 15000 : 30000;

    const timer = setInterval(() => {
      fetchStats();
      fetchUsers(userSearch);
      fetchLogs(logTypeFilter, logStatusFilter);
      fetchHealth();
      setLastRefreshedAt(new Date());
    }, intervalMs);

    return () => clearInterval(timer);
  }, [autoRefreshRate, session, isAdminUser, fetchStats, fetchUsers, fetchLogs, fetchHealth, userSearch, logTypeFilter, logStatusFilter]);

  // Fetch sessions when deep-dive drawer opens for a user
  const openUserDrawer = async (targetUser: UserItem) => {
    setSelectedUserForDrawer(targetUser);
    setLoadingSessions(true);
    try {
      const res = await fetch(`/api/admin/sessions?userId=${encodeURIComponent(targetUser.id)}`);
      if (res.ok) {
        const data = await res.json();
        setDrawerSessions(data.sessions || []);
      } else {
        setDrawerSessions([]);
      }
    } catch (err) {
      console.error("Failed to fetch sessions for drawer:", err);
      setDrawerSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  // Revoke session handler
  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to revoke this session? The user will be immediately logged out on that device.")) {
      return;
    }
    setRevokingSessionId(sessionId);
    try {
      const res = await fetch("/api/admin/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        setDrawerSessions((prev) => prev.filter((s) => s.id !== sessionId));
        // Refresh users and stats to update active session counts
        fetchUsers(userSearch);
        fetchStats();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to revoke session");
      }
    } catch {
      alert("Error contacting server");
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRoleToggle = async (targetUser: UserItem) => {
    const newRole = targetUser.role === "admin" ? "user" : "admin";
    if (
      !confirm(
        `Are you sure you want to change ${targetUser.email}'s role to "${newRole.toUpperCase()}"?`
      )
    ) {
      return;
    }

    setIsUpdatingRole(targetUser.id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUser.id, role: newRole }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
        );
        if (selectedUserForDrawer?.id === targetUser.id) {
          setSelectedUserForDrawer((prev) => (prev ? { ...prev, role: newRole } : null));
        }
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update user role");
      }
    } catch {
      alert("Error contacting server");
    } finally {
      setIsUpdatingRole(null);
    }
  };

  // CSV Export functions
  const handleExportUsersCSV = () => {
    if (!users.length) {
      alert("No users to export.");
      return;
    }
    const headers = ["ID", "Name", "Email", "Role", "Email Verified", "Status", "Last Active", "Active Sessions", "Total Generations", "AI Provider", "AI Model", "Joined"];
    const rows = users.map((u) => [
      `"${u.id}"`,
      `"${(u.name || "").replace(/"/g, '""')}"`,
      `"${u.email}"`,
      `"${u.role}"`,
      u.emailVerified ? "Yes" : "No",
      u.isOnline ? "Online Now" : "Offline",
      `"${u.lastActiveAt || ""}"`,
      u.activeSessions || 0,
      u.totalGenerations || 0,
      `"${u.aiProvider || ""}"`,
      `"${u.aiModel || ""}"`,
      `"${u.createdAt}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    downloadCsv(`resumeforge-users-${new Date().toISOString().split("T")[0]}.csv`, csvContent);
  };

  const handleExportLogsCSV = () => {
    if (!logs.length) {
      alert("No logs to export.");
      return;
    }
    const headers = ["ID", "Timestamp", "User Email", "Type", "Target Country", "Provider", "Model", "Duration (ms)", "Status", "Error Message"];
    const rows = logs.map((l) => [
      `"${l.id}"`,
      `"${l.createdAt}"`,
      `"${l.userEmail || "Anonymous"}"`,
      `"${l.type}"`,
      `"${l.targetCountry || ""}"`,
      `"${l.provider || ""}"`,
      `"${l.model || ""}"`,
      l.durationMs || "",
      `"${l.status}"`,
      `"${(l.errorMessage || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    downloadCsv(`resumeforge-audit-logs-${new Date().toISOString().split("T")[0]}.csv`, csvContent);
  };

  if (isPending || (isLoading && session)) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-background">
        <Navbar />
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Loading ResumeForge Admin...</p>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!session) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-between bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="glass-card max-w-md w-full border-border/50 p-6 text-center space-y-4 shadow-2xl backdrop-blur-xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="size-6" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl">Admin Authentication Required</CardTitle>
              <CardDescription>
                Please sign in with your administrator credentials to access the ResumeForge Admin Console.
              </CardDescription>
            </div>
            <Button
              className="glossy-btn-primary w-full text-xs font-semibold text-black"
              onClick={() => router.push("/sign-in?callbackUrl=/admin")}
            >
              Sign In to Continue
            </Button>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (isAdminUser === false) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-between bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="glass-card max-w-md w-full border-destructive/30 p-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldAlert className="size-6" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl">Access Restricted</CardTitle>
              <CardDescription>
                Your account ({session?.user.email}) does not have administrative privileges for ResumeForge.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              className="w-full text-xs font-semibold"
              onClick={() => router.push("/generate")}
            >
              Return to App
            </Button>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const onlineNowCount = stats?.metrics.onlineNow ?? 0;
  const activeUsersCount = users.filter((u) => u.isOnline).length;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-background">
      {/* Ambient Glow Orbs */}
      <div className="ambient-orb -top-24 -left-24 h-96 w-96 bg-primary/20 pointer-events-none" />
      <div className="ambient-orb top-1/3 -right-24 h-96 w-96 bg-indigo-500/15 pointer-events-none" />
      <div className="ambient-orb -bottom-24 left-1/4 h-80 w-80 bg-cyan-500/15 pointer-events-none" />

      <Navbar />

      <main className="relative z-10 flex flex-1 w-full max-w-6xl flex-col p-4 pt-24 pb-16 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-3xl font-black tracking-tight text-foreground">Admin Console</h1>
              <Badge className="bg-primary/20 text-primary border-primary/30 font-semibold text-[11px] px-2.5 py-0.5">
                Superadmin
              </Badge>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                {onlineNowCount} Online Now
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Live platform telemetry, traffic velocity, user presence, active sessions & generation audits.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Auto-Refresh Toggle */}
            <div className="flex items-center rounded-xl bg-muted/40 p-0.5 border border-border/50 text-xs">
              <span className="px-2 text-[11px] text-muted-foreground flex items-center gap-1">
                <Radio className="size-3 text-primary animate-pulse" /> Auto
              </span>
              <button
                type="button"
                onClick={() => setAutoRefreshRate("off")}
                className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  autoRefreshRate === "off" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Off
              </button>
              <button
                type="button"
                onClick={() => setAutoRefreshRate("15s")}
                className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  autoRefreshRate === "15s" ? "bg-background text-emerald-400 font-semibold shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                15s
              </button>
              <button
                type="button"
                onClick={() => setAutoRefreshRate("30s")}
                className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  autoRefreshRate === "30s" ? "bg-background text-emerald-400 font-semibold shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                30s
              </button>
            </div>

            {/* Manual Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAll}
              className="h-8 text-xs font-medium border-border/60 hover:bg-muted/50 rounded-xl"
            >
              <RefreshCw className="size-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Dashboard Tabs */}
        <Tabs defaultValue="overview" className="w-full space-y-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full bg-muted/40 p-1 rounded-2xl border border-border/40">
            <TabsTrigger value="overview" className="rounded-xl text-xs font-medium data-[state=active]:bg-background">
              <Activity className="size-3.5 mr-1.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl text-xs font-medium data-[state=active]:bg-background">
              <Users className="size-3.5 mr-1.5" />
              Users ({users.length})
            </TabsTrigger>
            <TabsTrigger value="logs" className="rounded-xl text-xs font-medium data-[state=active]:bg-background">
              <Clock className="size-3.5 mr-1.5" />
              Audit Logs
            </TabsTrigger>
            <TabsTrigger value="ai" className="rounded-xl text-xs font-medium data-[state=active]:bg-background">
              <Cpu className="size-3.5 mr-1.5" />
              AI & Health
            </TabsTrigger>
            <TabsTrigger value="ats" className="rounded-xl text-xs font-medium data-[state=active]:bg-background">
              <Globe className="size-3.5 mr-1.5" />
              ATS Profiles
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════════════════════
              TAB 1: OVERVIEW & REAL-TIME ANALYTICS
          ═══════════════════════════════════════════════════════ */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Online Now */}
              <Card className="glass-card border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium uppercase tracking-wider text-emerald-400">Online Now</span>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                  {onlineNowCount}
                </div>
                <p className="text-[11px] text-emerald-400/90 font-medium">Active in last 5m</p>
              </Card>

              {/* Total Users */}
              <Card className="glass-card border border-border/50 p-4 space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium uppercase tracking-wider">Total Users</span>
                  <Users className="size-4 text-primary" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-foreground">
                  {stats?.metrics.totalUsers ?? 0}
                </div>
                <p className="text-[11px] text-muted-foreground">Registered accounts</p>
              </Card>

              {/* Active Sessions */}
              <Card className="glass-card border border-border/50 p-4 space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium uppercase tracking-wider">Active Sessions</span>
                  <Zap className="size-4 text-amber-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-foreground">
                  {stats?.metrics.activeSessions ?? 0}
                </div>
                <p className="text-[11px] text-amber-400 font-medium">Valid unexpired tokens</p>
              </Card>

              {/* Generations */}
              <Card className="glass-card border border-border/50 p-4 space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium uppercase tracking-wider">Generations</span>
                  <Layers className="size-4 text-primary" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-foreground">
                  {stats?.metrics.totalGenerations ?? 0}
                </div>
                <p className="text-[11px] text-muted-foreground">Resumes, letters & outreach</p>
              </Card>

              {/* Reliability */}
              <Card className="glass-card border border-border/50 p-4 space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium uppercase tracking-wider">Success Rate</span>
                  <CheckCircle2 className="size-4 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-foreground">
                  {stats?.metrics.successRate ?? 100}%
                </div>
                <p className="text-[11px] text-emerald-400 font-medium">Pipeline reliability</p>
              </Card>
            </div>

            {/* 7-Day Interactive Activity Velocity Chart (Recharts) */}
            <Card className="glass-card border border-border/50 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Activity className="size-4 text-primary" />
                    Generation Velocity (Past 7 Days)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Volume of resumes, cover letters, and outreach emails synthesized by day
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-primary" />
                    <span className="text-muted-foreground">Resume</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-emerald-400" />
                    <span className="text-muted-foreground">Cover Letter</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-purple-400" />
                    <span className="text-muted-foreground">Outreach</span>
                  </div>
                </div>
              </div>

              <div className="h-64 w-full pt-2">
                {isMounted && stats?.timeline && stats.timeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={stats.timeline}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorResume" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorCover" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorOutreach" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis
                        dataKey="displayDate"
                        stroke="#737373"
                        fontSize={11}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#737373"
                        fontSize={11}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-xl border border-border/60 bg-popover/90 p-3 shadow-xl backdrop-blur-md text-xs space-y-1">
                                <div className="font-semibold text-foreground">{label}</div>
                                {payload.map((entry: any) => (
                                  <div
                                    key={entry.name}
                                    className="flex items-center justify-between gap-4 text-muted-foreground"
                                  >
                                    <span className="capitalize">{entry.name}:</span>
                                    <span className="font-semibold text-foreground">{entry.value}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="resume"
                        name="Resume"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorResume)"
                      />
                      <Area
                        type="monotone"
                        dataKey="cover_letter"
                        name="Cover Letter"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorCover)"
                      />
                      <Area
                        type="monotone"
                        dataKey="outreach"
                        name="Outreach"
                        stroke="#a855f7"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorOutreach)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Telemetry data compiling...
                  </div>
                )}
              </div>
            </Card>

            {/* Traffic & Device Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Feature Usage Mix */}
              <Card className="glass-card border border-border/50 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Layers className="size-4 text-primary" />
                    Feature Utilization
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">All-Time</Badge>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <FileText className="size-3 text-primary" /> Resume Optimizer
                      </span>
                      <span className="font-semibold text-foreground">{stats?.features?.resume ?? 0}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              ((stats?.features?.resume ?? 0) / Math.max(1, stats?.metrics?.totalGenerations ?? 1)) * 100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Mail className="size-3 text-emerald-400" /> Cover Letter Humanizer
                      </span>
                      <span className="font-semibold text-foreground">{stats?.features?.coverLetter ?? 0}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              ((stats?.features?.coverLetter ?? 0) / Math.max(1, stats?.metrics?.totalGenerations ?? 1)) * 100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Send className="size-3 text-purple-400" /> Outreach Messenger
                      </span>
                      <span className="font-semibold text-foreground">{stats?.features?.outreach ?? 0}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className="h-full bg-purple-400 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              ((stats?.features?.outreach ?? 0) / Math.max(1, stats?.metrics?.totalGenerations ?? 1)) * 100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Operating Systems */}
              <Card className="glass-card border border-border/50 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Monitor className="size-4 text-primary" />
                    Client Platforms (OS)
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">Active Sessions</Badge>
                </div>
                <div className="space-y-2">
                  {stats?.devices && stats.devices.length > 0 ? (
                    stats.devices.map((d) => (
                      <div key={d.name} className="flex items-center justify-between text-xs py-1">
                        <span className="font-medium text-foreground">{d.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-semibold">{d.value} session{d.value !== 1 ? "s" : ""}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {Math.round((d.value / Math.max(1, stats.metrics.activeSessions)) * 100)}%
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      No active sessions recorded.
                    </p>
                  )}
                </div>
              </Card>

              {/* Web Browsers */}
              <Card className="glass-card border border-border/50 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Globe className="size-4 text-primary" />
                    Web Browsers
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">Active Sessions</Badge>
                </div>
                <div className="space-y-2">
                  {stats?.browsers && stats.browsers.length > 0 ? (
                    stats.browsers.map((b) => (
                      <div key={b.name} className="flex items-center justify-between text-xs py-1">
                        <span className="font-medium text-foreground">{b.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-semibold">{b.value}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {Math.round((b.value / Math.max(1, stats.metrics.activeSessions)) * 100)}%
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      No browser data available.
                    </p>
                  )}
                </div>
              </Card>
            </div>

            {/* Provider Share & Target Country Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Active BYOK Providers */}
              <Card className="glass-card border border-border/50 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Cpu className="size-4 text-primary" />
                    BYOK AI Provider Breakdown
                  </CardTitle>
                  <Badge variant="outline" className="text-[11px]">User Configured</Badge>
                </div>
                <div className="space-y-3">
                  {stats?.providers && stats.providers.length > 0 ? (
                    stats.providers.map((p) => (
                      <div key={p.provider} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="capitalize font-medium text-foreground">{p.provider}</span>
                          <span className="text-muted-foreground">{p.count} users</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round((p.count / Math.max(1, stats.metrics.totalUsers)) * 100)
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      No active AI provider keys configured yet.
                    </p>
                  )}
                </div>
              </Card>

              {/* Target Markets / Countries */}
              <Card className="glass-card border border-border/50 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Globe className="size-4 text-primary" />
                    Target ATS Job Markets
                  </CardTitle>
                  <Badge variant="outline" className="text-[11px]">8 Regional Standards</Badge>
                </div>
                <div className="space-y-2">
                  {stats?.countries && stats.countries.length > 0 ? (
                    stats.countries.map((c) => {
                      const profile = TARGET_COUNTRIES.find((p) => p.code === c.country);
                      return (
                        <div
                          key={c.country}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-border/30 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">{profile?.flag || "🌐"}</span>
                            <span className="font-medium text-foreground">
                              {profile?.name || c.country}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {c.country}
                            </Badge>
                          </div>
                          <span className="font-semibold text-primary">
                            {c.count} generation{c.count !== 1 ? "s" : ""}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      No regional generations recorded yet.
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════
              TAB 2: USER DIRECTORY & DEEP-DIVE INSPECTOR
          ═══════════════════════════════════════════════════════ */}
          <TabsContent value="users" className="space-y-4">
            <Card className="glass-card border border-border/50 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-semibold">User Directory & Presence</CardTitle>
                    <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                      {activeUsersCount} Active Online
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Live presence tracking, deep device inspection, and one-click session revocation.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Search Bar */}
                  <div className="relative w-full sm:w-64">
                    <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by email or name..."
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        fetchUsers(e.target.value);
                      }}
                      className="h-8 text-xs pl-8 rounded-xl bg-muted/30"
                    />
                  </div>

                  {/* Export CSV */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportUsersCSV}
                    className="h-8 text-xs font-medium border-border/60 hover:bg-muted/50 rounded-xl whitespace-nowrap"
                  >
                    <Download className="size-3.5 mr-1.5" />
                    Export CSV
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground">
                      <th className="pb-2.5 font-medium">User</th>
                      <th className="pb-2.5 font-medium">Status & Presence</th>
                      <th className="pb-2.5 font-medium">Role</th>
                      <th className="pb-2.5 font-medium">Device & IP</th>
                      <th className="pb-2.5 font-medium">Generations</th>
                      <th className="pb-2.5 font-medium">AI Provider</th>
                      <th className="pb-2.5 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        {/* User Identity */}
                        <td className="py-3">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            {u.name || "Unnamed"}
                            {u.id === session?.user.id && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary/40 text-primary">
                                You
                              </Badge>
                            )}
                          </div>
                          <div className="text-muted-foreground text-[11px]">{u.email}</div>
                        </td>

                        {/* Presence / Last Active */}
                        <td className="py-3">
                          {u.isOnline ? (
                            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              Online Now
                            </div>
                          ) : (
                            <div className="text-muted-foreground text-[11px]">
                              {formatRelativeTime(u.lastActiveAt)}
                            </div>
                          )}
                          <div className="text-[10px] text-muted-foreground/70">
                            {u.activeSessions} active token{u.activeSessions !== 1 ? "s" : ""}
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3">
                          {u.role === "admin" ? (
                            <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-semibold">
                              Admin
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              User
                            </Badge>
                          )}
                        </td>

                        {/* Device & IP */}
                        <td className="py-3 text-muted-foreground">
                          <div className="font-medium text-foreground text-[11px]">
                            {u.latestDevice || "Unknown"}
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground/70">
                            {u.latestIp || "No IP logged"}
                          </div>
                        </td>

                        {/* Total Generations */}
                        <td className="py-3 font-semibold text-foreground">
                          {u.totalGenerations}
                        </td>

                        {/* BYOK Provider */}
                        <td className="py-3">
                          {u.aiProvider ? (
                            <div className="flex items-center gap-1.5 font-medium capitalize text-foreground">
                              <Cpu className="size-3 text-primary" />
                              {u.aiProvider} ({u.aiModel || "default"})
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">None</span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Inspect Drawer */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openUserDrawer(u)}
                              className="h-7 text-xs font-medium rounded-lg text-primary hover:text-primary hover:bg-primary/10"
                            >
                              <Eye className="size-3 mr-1" /> Inspect
                            </Button>

                            {/* Promote / Demote */}
                            <Button
                              variant={u.role === "admin" ? "outline" : "ghost"}
                              size="sm"
                              disabled={isUpdatingRole === u.id || u.id === session?.user.id}
                              onClick={() => handleRoleToggle(u)}
                              className="h-7 text-xs font-medium rounded-lg"
                            >
                              {u.role === "admin" ? (
                                <>
                                  <ShieldAlert className="size-3 mr-1 text-destructive" /> Demote
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="size-3 mr-1 text-primary" /> Make Admin
                                </>
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-muted-foreground">
                          No users found matching query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════
              TAB 3: GENERATION AUDIT LOGS
          ═══════════════════════════════════════════════════════ */}
          <TabsContent value="logs" className="space-y-4">
            <Card className="glass-card border border-border/50 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-semibold">Generation Audit Trail</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Chronological audit stream of all LLM execution events across the application.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={logTypeFilter}
                    onChange={(e) => {
                      setLogTypeFilter(e.target.value);
                      fetchLogs(e.target.value, logStatusFilter);
                    }}
                    className="h-8 text-xs rounded-xl border border-border/60 bg-muted/40 px-2 text-foreground"
                  >
                    <option value="all">All Types</option>
                    <option value="resume">Resume</option>
                    <option value="cover_letter">Cover Letter</option>
                    <option value="outreach">Outreach</option>
                  </select>

                  <select
                    value={logStatusFilter}
                    onChange={(e) => {
                      setLogStatusFilter(e.target.value);
                      fetchLogs(logTypeFilter, e.target.value);
                    }}
                    className="h-8 text-xs rounded-xl border border-border/60 bg-muted/40 px-2 text-foreground"
                  >
                    <option value="all">All Statuses</option>
                    <option value="success">Success</option>
                    <option value="error">Error</option>
                  </select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportLogsCSV}
                    className="h-8 text-xs font-medium border-border/60 hover:bg-muted/50 rounded-xl"
                  >
                    <Download className="size-3.5 mr-1.5" />
                    Export CSV
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground">
                      <th className="pb-2.5 font-medium">Timestamp</th>
                      <th className="pb-2.5 font-medium">User</th>
                      <th className="pb-2.5 font-medium">Type</th>
                      <th className="pb-2.5 font-medium">Target Country</th>
                      <th className="pb-2.5 font-medium">Provider & Model</th>
                      <th className="pb-2.5 font-medium">Latency</th>
                      <th className="pb-2.5 font-medium">Status & Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 text-muted-foreground whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="py-2.5 font-medium text-foreground">
                          {log.userEmail || "Anonymous"}
                        </td>
                        <td className="py-2.5">
                          <Badge variant="outline" className="capitalize text-[10px]">
                            {log.type.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="py-2.5 font-semibold text-foreground">
                          {log.targetCountry || "US"}
                        </td>
                        <td className="py-2.5 text-muted-foreground">
                          {log.provider || "-"} / {log.model || "-"}
                        </td>
                        <td className="py-2.5 text-muted-foreground">
                          {log.durationMs ? `${(Number(log.durationMs) / 1000).toFixed(1)}s` : "-"}
                        </td>
                        <td className="py-2.5">
                          {log.status === "success" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                              <CheckCircle2 className="size-3" /> Success
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 text-destructive font-medium">
                                <XCircle className="size-3" /> Failed
                              </span>
                              {log.errorMessage && (
                                <p className="text-[10px] text-destructive/80 max-w-xs truncate">
                                  {log.errorMessage}
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-muted-foreground">
                          No audit logs matching criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════
              TAB 4: AI PROVIDERS & SYSTEM HEALTH
          ═══════════════════════════════════════════════════════ */}
          <TabsContent value="ai" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="glass-card border border-border/50 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Core Database
                  </span>
                  <Database className="size-4 text-primary" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-base font-bold capitalize text-foreground">
                    {health?.database.status || "Healthy"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  PostgreSQL / Neon query latency: {health?.database.latencyMs ?? 0}ms
                </p>
              </Card>

              <Card className="glass-card border border-border/50 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Node Environment
                  </span>
                  <Server className="size-4 text-emerald-400" />
                </div>
                <div className="text-base font-bold text-foreground">
                  Node {health?.system.nodeVersion || "v20+"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Memory RSS: {health?.system.memoryRssMb ?? 0}MB · Heap: {health?.system.memoryHeapMb ?? 0}MB
                </p>
              </Card>

              <Card className="glass-card border border-border/50 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Country ATS Engine
                  </span>
                  <Globe className="size-4 text-primary" />
                </div>
                <div className="text-base font-bold text-foreground">
                  {health?.countryProfilesCount ?? 8} Profiles Active
                </div>
                <p className="text-xs text-muted-foreground">
                  US, UK, DE, CA, AU, SG, EU, GLOBAL calibrated
                </p>
              </Card>
            </div>

            {/* Model Defaults Catalog */}
            <Card className="glass-card border border-border/50 p-5 space-y-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Cpu className="size-4 text-primary" />
                Platform Default AI Model Catalog
              </CardTitle>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-border/40 bg-muted/20 space-y-1">
                  <div className="font-semibold text-foreground">Google Gemini</div>
                  <div className="text-primary font-mono text-[11px]">
                    {health?.aiCatalog.defaultModels.google || "gemini-2.5-flash"}
                  </div>
                  <p className="text-muted-foreground text-[10px]">
                    Fastest generation, 1M context token budget, native JSON schema support.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-border/40 bg-muted/20 space-y-1">
                  <div className="font-semibold text-foreground">OpenAI</div>
                  <div className="text-primary font-mono text-[11px]">
                    {health?.aiCatalog.defaultModels.openai || "gpt-4o"}
                  </div>
                  <p className="text-muted-foreground text-[10px]">
                    High reasoning benchmark, structured JSON output compliance.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-border/40 bg-muted/20 space-y-1">
                  <div className="font-semibold text-foreground">Anthropic</div>
                  <div className="text-primary font-mono text-[11px]">
                    {health?.aiCatalog.defaultModels.anthropic || "claude-3-5-sonnet-20241022"}
                  </div>
                  <p className="text-muted-foreground text-[10px]">
                    State of the art prose, natural human cadence, zero AI tell writing.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════
              TAB 5: ATS RULES & COUNTRY PROFILES INSPECTOR
          ═══════════════════════════════════════════════════════ */}
          <TabsContent value="ats" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Country List Sidebar */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                  Select Regional Standard
                </div>
                <div className="space-y-1">
                  {TARGET_COUNTRIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => setSelectedCountryCode(c.code)}
                      className={`w-full text-left p-3 rounded-xl text-xs transition-all flex items-center justify-between border ${
                        selectedCountryCode === c.code
                          ? "bg-primary/10 border-primary/40 text-foreground font-semibold shadow-sm"
                          : "bg-muted/20 border-border/30 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{c.flag}</span>
                        <span>{c.name}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {c.code}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>

              {/* Profile Details Inspector */}
              <div className="md:col-span-2">
                {(() => {
                  const activeProfile =
                    TARGET_COUNTRIES.find((c) => c.code === selectedCountryCode) ||
                    TARGET_COUNTRIES[0];
                  return (
                    <Card className="glass-card border border-border/50 p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-border/40 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{activeProfile.flag}</span>
                          <div>
                            <h3 className="text-base font-bold text-foreground">
                              {activeProfile.name} ({activeProfile.code})
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {activeProfile.description}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                          90+ ATS Optimized
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-primary uppercase tracking-wider">
                          Active Regional Directives & Length Budget
                        </div>
                        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-foreground font-medium">
                          {activeProfile.badge}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          System Prompt Specification Injected to LLM
                        </div>
                        <pre className="p-4 rounded-xl bg-muted/40 border border-border/40 text-xs leading-relaxed text-foreground font-mono overflow-x-auto whitespace-pre-wrap">
                          {activeProfile.atsGuidelines}
                        </pre>
                      </div>
                    </Card>
                  );
                })()}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* ═══════════════════════════════════════════════════════
          USER DEEP-DIVE SLIDE-OUT DRAWER (SHEET)
      ═══════════════════════════════════════════════════════ */}
      <Sheet
        open={Boolean(selectedUserForDrawer)}
        onOpenChange={(open) => {
          if (!open) setSelectedUserForDrawer(null);
        }}
      >
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto border-l border-border/60 bg-background/95 backdrop-blur-2xl p-6 space-y-6">
          {selectedUserForDrawer && (
            <>
              <SheetHeader className="p-0 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      selectedUserForDrawer.isOnline
                        ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
                        : "text-muted-foreground"
                    }`}
                  >
                    {selectedUserForDrawer.isOnline ? "🟢 Online Now" : "⚪ Offline"}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    User ID: {selectedUserForDrawer.id.slice(0, 8)}...
                  </span>
                </div>
                <SheetTitle className="text-xl font-bold text-foreground">
                  {selectedUserForDrawer.name || "Unnamed User"}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  {selectedUserForDrawer.email}
                </SheetDescription>
              </SheetHeader>

              {/* User Overview Stats */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-1">
                  <div className="text-muted-foreground text-[10px] uppercase">Account Role</div>
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    {selectedUserForDrawer.role === "admin" ? (
                      <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        User
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-1">
                  <div className="text-muted-foreground text-[10px] uppercase">Total Generations</div>
                  <div className="font-semibold text-foreground text-sm">
                    {selectedUserForDrawer.totalGenerations} requests
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-1">
                  <div className="text-muted-foreground text-[10px] uppercase">Last Seen Active</div>
                  <div className="font-semibold text-foreground">
                    {formatRelativeTime(selectedUserForDrawer.lastActiveAt)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-1">
                  <div className="text-muted-foreground text-[10px] uppercase">BYOK AI Provider</div>
                  <div className="font-semibold text-foreground capitalize">
                    {selectedUserForDrawer.aiProvider
                      ? `${selectedUserForDrawer.aiProvider} (${selectedUserForDrawer.aiModel || "default"})`
                      : "Default Platform AI"}
                  </div>
                </div>
              </div>

              {/* Active Sessions & Security Controls */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Zap className="size-3.5 text-amber-400" />
                    Active Sessions ({drawerSessions.length})
                  </h4>
                  <span className="text-[10px] text-muted-foreground">
                    Live Session Tokens
                  </span>
                </div>

                {loadingSessions ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : drawerSessions.length > 0 ? (
                  <div className="space-y-2.5">
                    {drawerSessions.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-xl border border-border/40 bg-muted/20 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {s.device.os === "Android" || s.device.os === "iOS" ? (
                              <Smartphone className="size-4 text-primary" />
                            ) : (
                              <Laptop className="size-4 text-primary" />
                            )}
                            <span className="font-semibold text-foreground">
                              {s.device.os} · {s.device.browser}
                            </span>
                          </div>

                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={revokingSessionId === s.id}
                            onClick={() => handleRevokeSession(s.id)}
                            className="h-6 text-[10px] px-2 rounded-lg"
                          >
                            <LogOut className="size-3 mr-1" />
                            {revokingSessionId === s.id ? "Revoking..." : "Revoke Session"}
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1 border-t border-border/20">
                          <div>
                            <span className="text-muted-foreground/70">IP: </span>
                            <span className="font-mono text-foreground">{s.ipAddress || "Unknown"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground/70">Last Active: </span>
                            <span>{formatRelativeTime(s.updatedAt)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground/70">Created: </span>
                            <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground/70">Expires: </span>
                            <span>{new Date(s.expiresAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-border/30 bg-muted/10 text-center text-xs text-muted-foreground">
                    No active sessions found for this user.
                  </div>
                )}
              </div>

              {/* Role Toggle in Drawer */}
              <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-foreground">Administrative Privileges</div>
                  <div className="text-[11px] text-muted-foreground">
                    Grant or revoke superadmin status on ResumeForge.
                  </div>
                </div>

                <Button
                  variant={selectedUserForDrawer.role === "admin" ? "outline" : "default"}
                  size="sm"
                  disabled={
                    isUpdatingRole === selectedUserForDrawer.id ||
                    selectedUserForDrawer.id === session?.user.id
                  }
                  onClick={() => handleRoleToggle(selectedUserForDrawer)}
                  className="h-8 text-xs font-semibold rounded-xl"
                >
                  {selectedUserForDrawer.role === "admin" ? "Demote to User" : "Promote to Admin"}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Footer />
    </div>
  );
}
