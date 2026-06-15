"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard, FileText, Briefcase, MessageSquare,
  Mic, Settings, Zap, ChevronRight,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/dashboard",      label: "Dashboard",      icon: LayoutDashboard },
  { href: "/resumes",        label: "Resumes",         icon: FileText        },
  { href: "/tracker",        label: "Job Tracker",     icon: Briefcase       },
  { href: "/copilot",        label: "AI Copilot",      icon: MessageSquare,  badge: "AI" },
  { href: "/interview",      label: "Interview Prep",  icon: Mic             },
  { href: "/settings",       label: "Settings",        icon: Settings        },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border/60 bg-card/40 backdrop-blur-md">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border/60 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="font-outfit text-xl font-bold gradient-text">JobIN</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                  active
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-sm shadow-primary/10"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-lg bg-primary/8"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <Icon className={cn("h-4 w-4 flex-shrink-0", active && "text-primary")} />
                <span className="font-medium">{item.label}</span>
                {item.badge && (
                  <Badge className="ml-auto text-[10px] px-1.5 py-0" variant="default">
                    {item.badge}
                  </Badge>
                )}
                {active && <ChevronRight className="ml-auto h-3 w-3 text-primary/60" />}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="border-t border-border/60 p-4">
        <div className="flex items-center gap-3 rounded-lg p-2">
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt={user.fullName ?? "User"} className="h-8 w-8 rounded-full ring-2 ring-primary/30" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-xs font-bold text-white">
              {user?.firstName?.[0] ?? "U"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.fullName ?? "Loading..."}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
