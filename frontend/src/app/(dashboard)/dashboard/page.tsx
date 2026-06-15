"use client";

import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import {
  Send, Calendar, Trophy, FileText,
  Zap, TrendingUp, Plus, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { getStatusConfig, formatRelativeDate } from "@/lib/utils";
import { useApplications } from "@/hooks/use-applications";
import type { ApplicationStatus } from "@/types";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } },
};

// ─── ATS Score Ring ───────────────────────────────────────────────────────────
function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(217 33% 14%)" strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <span className="absolute text-sm font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ title, value, subtitle, icon: Icon, trend, color = "blue" }: {
  title: string; value: string | number; subtitle?: string;
  icon: React.ElementType; trend?: string; color?: "blue" | "green" | "indigo" | "amber";
}) {
  const colorMap = {
    blue:   { bg: "bg-blue-500/10",   border: "border-blue-500/20",   icon: "text-blue-400"   },
    green:  { bg: "bg-emerald-500/10",border: "border-emerald-500/20",icon: "text-emerald-400" },
    indigo: { bg: "bg-indigo-500/10", border: "border-indigo-500/20", icon: "text-indigo-400"  },
    amber:  { bg: "bg-amber-500/10",  border: "border-amber-500/20",  icon: "text-amber-400"   },
  }[color];

  return (
    <motion.div variants={item}>
      <Card className={`glass-card hover:border-border transition-all duration-300 ${colorMap.border}`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
              <p className="text-3xl font-outfit font-bold text-foreground">{value}</p>
              {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
              {trend && (
                <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
                  <TrendingUp className="h-3 w-3" />
                  {trend}
                </div>
              )}
            </div>
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colorMap.bg}`}>
              <Icon className={`h-5 w-5 ${colorMap.icon}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useUser();
  const { data: applications, isLoading } = useApplications();

  const recent = applications?.slice(0, 5) ?? [];
  const thisWeek = applications?.filter((a) => {
    const d = new Date(a.createdAt);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return d > weekAgo;
  }).length ?? 0;

  const interviews = applications?.filter((a) =>
    (["INTERVIEW", "TECHNICAL_ASSESSMENT", "FINAL_ROUND"] as ApplicationStatus[]).includes(a.status)
  ).length ?? 0;

  return (
    <div className="max-w-7xl space-y-8">
      {/* Welcome header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="font-outfit text-3xl font-bold">
          Welcome back,{" "}
          <span className="gradient-text">{user?.firstName ?? "there"}</span> 👋
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s your job search overview for today.
        </p>
      </motion.div>

      {/* Stats grid */}
      <motion.div
        variants={container} initial="hidden" animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard title="Applied This Week" value={thisWeek} icon={Send} color="blue" trend="+12% vs last week" />
        <StatCard title="Active Interviews" value={interviews} icon={Calendar} color="green" />
        <StatCard title="Resume Health" value="84" subtitle="Good · Last updated today" icon={FileText} color="indigo" />
        <StatCard title="AI Credits" value="420" subtitle="Resets monthly" icon={Zap} color="amber" />
      </motion.div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Applications */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        >
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Applications</CardTitle>
              <Link href="/tracker">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2 px-6 pb-6 pt-0">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))
              ) : recent.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Briefcase className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  <p className="text-sm">No applications yet.</p>
                  <Link href="/tracker">
                    <Button variant="outline" size="sm" className="mt-3 gap-1">
                      <Plus className="h-3.5 w-3.5" /> Add your first application
                    </Button>
                  </Link>
                </div>
              ) : (
                recent.map((app) => {
                  const cfg = getStatusConfig(app.status);
                  return (
                    <motion.div
                      key={app.id}
                      whileHover={{ x: 2 }}
                      className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-secondary/40"
                    >
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/20">
                        <span className="text-xs font-bold text-blue-300">
                          {app.companyName[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{app.jobTitle}</p>
                        <p className="truncate text-xs text-muted-foreground">{app.companyName}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.bg} ${cfg.color}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{formatRelativeDate(app.createdAt)}</span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        >
          <Card className="glass-card h-full">
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-6">
              {[
                { label: "Upload Resume",   href: "/resumes",  icon: FileText,  color: "from-blue-600 to-blue-700"   },
                { label: "Add Application", href: "/tracker",  icon: Plus,      color: "from-indigo-600 to-indigo-700"},
                { label: "AI Copilot Chat", href: "/copilot",  icon: Zap,       color: "from-violet-600 to-violet-700"},
                { label: "Interview Prep",  href: "/interview",icon: Trophy,    color: "from-emerald-600 to-emerald-700"},
              ].map(({ label, href, icon: Icon, color }) => (
                <Link key={label} href={href}>
                  <motion.div
                    whileHover={{ x: 3, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-3 rounded-lg border border-border/60 bg-secondary/30 p-3 cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${color}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium">{label}</span>
                    <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                  </motion.div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

// Missing import fix
function Briefcase(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  );
}
