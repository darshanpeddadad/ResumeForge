"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";

interface StatsData {
  metrics: {
    totalUsers: number;
    activeSessions: number;
    totalGenerations: number;
    successRate: number;
  };
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
  aiProvider: string | null;
  aiModel: string | null;
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
    setIsLoading(false);
  }, [fetchStats, fetchUsers, fetchLogs, fetchHealth, userSearch, logTypeFilter, logStatusFilter]);

  useEffect(() => {
    if (!isPending && !session) {
      setIsLoading(false);
      return;
    }
    if (session) {
      refreshAll();
    }
  }, [session, isPending, router, refreshAll]);

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

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-background">
      {/* Ambient Glow Orbs */}
      <div className="ambient-orb -top-24 -left-24 h-96 w-96 bg-primary/20" />
      <div className="ambient-orb top-1/3 -right-24 h-96 w-96 bg-indigo-500/15" />
      <div className="ambient-orb -bottom-24 left-1/4 h-80 w-80 bg-cyan-500/15" />

      <Navbar />

      <main className="relative z-10 flex flex-1 w-full max-w-6xl flex-col p-4 pt-24 pb-16 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl font-black tracking-tight text-foreground">Admin Console</h1>
              <Badge className="bg-primary/20 text-primary border-primary/30 font-semibold text-[11px] px-2.5 py-0.5">
                Superadmin
              </Badge>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Monitor platform metrics, user access, AI telemetry, and generation logs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAll}
              className="h-8 text-xs font-medium border-border/60 hover:bg-muted/50 rounded-xl"
            >
              <RefreshCw className="size-3.5 mr-1.5" />
              Refresh Data
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
              TAB 1: OVERVIEW & ANALYTICS
          ═══════════════════════════════════════════════════════ */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

              <Card className="glass-card border border-border/50 p-4 space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium uppercase tracking-wider">Active Sessions</span>
                  <Zap className="size-4 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-foreground">
                  {stats?.metrics.activeSessions ?? 0}
                </div>
                <p className="text-[11px] text-emerald-400 font-medium">Valid unexpired tokens</p>
              </Card>

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
                  <Badge variant="outline" className="text-[11px]">8 Standards</Badge>
                </div>
                <div className="space-y-2">
                  {stats?.countries && stats.countries.length > 0 ? (
                    stats.countries.map((c) => {
                      const profile = TARGET_COUNTRIES.find((p) => p.code === c.country);
                      return (
                        <div
                          key={c.country}
                          className="flex items-center justify-between p-2 rounded-xl bg-muted/20 text-xs border border-border/30"
                        >
                          <div className="flex items-center gap-2 font-medium">
                            <span>{profile?.flag || "🌐"}</span>
                            <span>{profile?.name || c.country}</span>
                            <span className="text-muted-foreground">({c.country})</span>
                          </div>
                          <Badge variant="secondary" className="text-[11px] font-semibold">
                            {c.count} generations
                          </Badge>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-muted-foreground py-4 text-center">
                      Recent country breakdown will populate as resumes are generated.
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Recent Generation Event Stream */}
            <Card className="glass-card border border-border/50 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  Recent Generation Activity
                </CardTitle>
                <span className="text-xs text-muted-foreground">Last 10 events</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground">
                      <th className="pb-2 font-medium">Time</th>
                      <th className="pb-2 font-medium">User</th>
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium">Target</th>
                      <th className="pb-2 font-medium">Provider / Model</th>
                      <th className="pb-2 font-medium">Latency</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {stats?.recentLogs && stats.recentLogs.length > 0 ? (
                      stats.recentLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 text-muted-foreground whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
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
                            {log.provider || "default"} / {log.model || "standard"}
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
                              <span className="inline-flex items-center gap-1 text-destructive font-medium">
                                <XCircle className="size-3" /> Error
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-muted-foreground">
                          No generation events recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════
              TAB 2: USER MANAGEMENT
          ═══════════════════════════════════════════════════════ */}
          <TabsContent value="users" className="space-y-4">
            <Card className="glass-card border border-border/50 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-semibold">User Directory</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Inspect accounts, active AI providers, and assign admin privileges.
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-72">
                  <div className="relative w-full">
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
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground">
                      <th className="pb-2.5 font-medium">User</th>
                      <th className="pb-2.5 font-medium">Role</th>
                      <th className="pb-2.5 font-medium">Email Verified</th>
                      <th className="pb-2.5 font-medium">Active AI Provider</th>
                      <th className="pb-2.5 font-medium">Joined</th>
                      <th className="pb-2.5 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3">
                          <div className="font-semibold text-foreground">{u.name || "Unnamed"}</div>
                          <div className="text-muted-foreground text-[11px]">{u.email}</div>
                        </td>
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
                        <td className="py-3">
                          {u.emailVerified ? (
                            <span className="text-emerald-400 font-medium inline-flex items-center gap-1">
                              <CheckCircle2 className="size-3" /> Yes
                            </span>
                          ) : (
                            <span className="text-muted-foreground">No</span>
                          )}
                        </td>
                        <td className="py-3">
                          {u.aiProvider ? (
                            <div className="flex items-center gap-1.5 font-medium capitalize text-foreground">
                              <Cpu className="size-3 text-primary" />
                              {u.aiProvider} ({u.aiModel || "default"})
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">None configured</span>
                          )}
                        </td>
                        <td className="py-3 text-muted-foreground whitespace-nowrap">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-right">
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
                                <ShieldCheck className="size-3 mr-1 text-primary" /> Promote Admin
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
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

                <div className="flex items-center gap-2">
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

      <Footer />
    </div>
  );
}
