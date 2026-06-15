"use client";

import { UserButton } from "@clerk/nextjs";
import { Bell, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  credits?: number;
}

export function Header({ credits = 0 }: HeaderProps) {
  return (
    <header className="glass-nav sticky top-0 z-40 flex h-16 items-center justify-between px-6">
      <div />

      <div className="flex items-center gap-4">
        {/* AI Credits */}
        <div className="flex items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1.5">
          <Zap className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-xs font-semibold text-blue-300">{credits} credits</span>
        </div>

        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-secondary transition-colors">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-500" />
        </button>

        {/* Clerk user button */}
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: "h-9 w-9 ring-2 ring-primary/30",
            },
          }}
        />
      </div>
    </header>
  );
}
