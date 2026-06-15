"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Plus, Briefcase, MapPin, Calendar, Trash2,
  ChevronDown, Search, Filter,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { getStatusConfig, formatDate } from "@/lib/utils";
import { useApplications, useCreateApplication, useUpdateApplication, useDeleteApplication } from "@/hooks/use-applications";
import type { ApplicationStatus, JobApplication } from "@/types";

const ALL_STATUSES: ApplicationStatus[] = [
  "SAVED", "APPLIED", "PHONE_SCREEN", "INTERVIEW",
  "TECHNICAL_ASSESSMENT", "FINAL_ROUND", "OFFER", "REJECTED", "WITHDRAWN",
];

const createSchema = z.object({
  jobTitle: z.string().min(1, "Job title is required"),
  companyName: z.string().min(1, "Company name is required"),
  location: z.string().optional(),
  status: z.enum([
    "SAVED", "APPLIED", "PHONE_SCREEN", "INTERVIEW",
    "TECHNICAL_ASSESSMENT", "FINAL_ROUND", "OFFER", "REJECTED", "WITHDRAWN",
  ] as const).default("SAVED"),
  notes: z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

// ─── Status filter tabs ───────────────────────────────────────────────────────
function StatusTabs({
  active,
  counts,
  onChange,
}: {
  active: ApplicationStatus | "ALL";
  counts: Record<string, number>;
  onChange: (s: ApplicationStatus | "ALL") => void;
}) {
  const tabs: Array<ApplicationStatus | "ALL"> = ["ALL", ...ALL_STATUSES];
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {tabs.map((s) => {
        const cfg = s === "ALL" ? null : getStatusConfig(s);
        const isActive = active === s;
        const count = s === "ALL"
          ? Object.values(counts).reduce((a, b) => a + b, 0)
          : (counts[s] ?? 0);
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200
              ${isActive
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-muted-foreground border border-transparent hover:border-border hover:text-foreground"
              }`}
          >
            {cfg && <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />}
            {s === "ALL" ? "All" : cfg!.label}
            {count > 0 && (
              <span className={`rounded-full px-1.5 text-[10px] ${isActive ? "bg-primary/20" : "bg-secondary"}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Application row ──────────────────────────────────────────────────────────
function ApplicationRow({
  app,
  onStatusChange,
  onDelete,
}: {
  app: JobApplication;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onDelete: (id: string) => void;
}) {
  const cfg = getStatusConfig(app.status);
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-center gap-4 rounded-xl border border-border/60 bg-card/40 p-4 hover:border-border transition-all duration-200"
    >
      {/* Company initial */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/15 font-bold text-blue-300 text-sm">
        {app.companyName[0].toUpperCase()}
      </div>

      {/* Title / company */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate">{app.jobTitle}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">{app.companyName}</span>
          {app.location && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <MapPin className="h-2.5 w-2.5" /> {app.location}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Applied date */}
      {app.appliedDate && (
        <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {formatDate(app.appliedDate)}
        </div>
      )}

      {/* Status select */}
      <Select value={app.status} onValueChange={(v) => onStatusChange(app.id, v as ApplicationStatus)}>
        <SelectTrigger className={`w-40 h-8 text-xs ${cfg.bg} ${cfg.color} border-none`}>
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {ALL_STATUSES.map((s) => {
            const c = getStatusConfig(s);
            return (
              <SelectItem key={s} value={s}>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                  {c.label}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Delete */}
      <button
        onClick={() => onDelete(app.id)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

// ─── Add Application Dialog ───────────────────────────────────────────────────
function AddApplicationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateApplication();
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { status: "SAVED" },
  });

  const onSubmit = async (data: CreateForm) => {
    try {
      await create.mutateAsync(data);
      toast.success("Application added to tracker!");
      reset();
      onClose();
    } catch {
      toast.error("Failed to add application. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Application</DialogTitle>
          <DialogDescription>Track a new job application in your pipeline.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Job Title *</Label>
            <Input placeholder="Senior Software Engineer" {...register("jobTitle")} />
            {errors.jobTitle && <p className="text-xs text-destructive">{errors.jobTitle.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Company *</Label>
            <Input placeholder="Acme Corp" {...register("companyName")} />
            {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input placeholder="London, UK · Remote" {...register("location")} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select defaultValue="SAVED" onValueChange={(v) => setValue("status", v as ApplicationStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((s) => {
                  const c = getStatusConfig(s);
                  return (
                    <SelectItem key={s} value={s}>
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                        {c.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea placeholder="Referral from John, salary £80k..." rows={3} {...register("notes")} />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? "Adding..." : (<><Plus className="h-4 w-4" /> Add Application</>)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tracker Page ─────────────────────────────────────────────────────────────
export default function TrackerPage() {
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const { data: applications, isLoading } = useApplications();
  const updateApplication = useUpdateApplication();
  const deleteApplication = useDeleteApplication();

  // Build counts map
  const counts: Record<string, number> = {};
  applications?.forEach((a) => {
    counts[a.status] = (counts[a.status] ?? 0) + 1;
  });

  // Filter
  const filtered = (applications ?? []).filter((a) => {
    const matchStatus = statusFilter === "ALL" || a.status === statusFilter;
    const matchSearch =
      !search ||
      a.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
      a.companyName.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleStatusChange = async (id: string, status: ApplicationStatus) => {
    try {
      await updateApplication.mutateAsync({ id, data: { status } });
      toast.success("Status updated.");
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteApplication.mutateAsync(id);
      toast.success("Application removed.");
    } catch {
      toast.error("Failed to delete application.");
    }
  };

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="font-outfit text-3xl font-bold">
            <span className="gradient-text">Job</span> Tracker
          </h1>
          <p className="mt-1 text-muted-foreground">
            {applications?.length ?? 0} application{applications?.length !== 1 ? "s" : ""} in your pipeline.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Add Application
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by job title or company..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {/* Status tabs */}
        <StatusTabs active={statusFilter} counts={counts} onChange={setStatusFilter} />
      </motion.div>

      {/* Application list */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        className="space-y-2"
      >
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
            <Briefcase className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">
              {search || statusFilter !== "ALL" ? "No applications match your filters." : "No applications yet."}
            </p>
            {statusFilter === "ALL" && !search && (
              <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => setAddOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Add your first application
              </Button>
            )}
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((app) => (
              <ApplicationRow
                key={app.id}
                app={app}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        )}
      </motion.div>

      <AddApplicationDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
