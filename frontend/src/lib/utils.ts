import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { type ApplicationStatus } from "@/types";
import { formatDistanceToNow, format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | undefined): string {
  if (!dateString) return "—";
  try {
    return format(new Date(dateString), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export function formatRelativeDate(dateString: string | undefined): string {
  if (!dateString) return "—";
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return "—";
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "…";
}

export function getStatusConfig(status: ApplicationStatus): {
  label: string;
  color: string;
  bg: string;
  dot: string;
} {
  const configs: Record<ApplicationStatus, { label: string; color: string; bg: string; dot: string }> = {
    SAVED:               { label: "Saved",           color: "text-slate-400",  bg: "bg-slate-400/10",  dot: "bg-slate-400"  },
    APPLIED:             { label: "Applied",          color: "text-blue-400",   bg: "bg-blue-400/10",   dot: "bg-blue-400"   },
    PHONE_SCREEN:        { label: "Phone Screen",     color: "text-cyan-400",   bg: "bg-cyan-400/10",   dot: "bg-cyan-400"   },
    INTERVIEW:           { label: "Interview",        color: "text-indigo-400", bg: "bg-indigo-400/10", dot: "bg-indigo-400" },
    TECHNICAL_ASSESSMENT:{ label: "Technical",        color: "text-violet-400", bg: "bg-violet-400/10", dot: "bg-violet-400" },
    FINAL_ROUND:         { label: "Final Round",      color: "text-amber-400",  bg: "bg-amber-400/10",  dot: "bg-amber-400"  },
    OFFER:               { label: "Offer 🎉",          color: "text-emerald-400",bg: "bg-emerald-400/10",dot: "bg-emerald-400"},
    REJECTED:            { label: "Rejected",         color: "text-red-400",    bg: "bg-red-400/10",    dot: "bg-red-400"    },
    WITHDRAWN:           { label: "Withdrawn",        color: "text-zinc-400",   bg: "bg-zinc-400/10",   dot: "bg-zinc-400"   },
  };
  return configs[status] ?? configs.SAVED;
}

export function getAtsScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

export function getAtsScoreLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 55) return "Fair";
  return "Needs Work";
}
