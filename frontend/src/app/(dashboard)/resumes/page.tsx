"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Upload, FileText, Trash2, Star, MoreHorizontal,
  AlertCircle, CheckCircle, Clock,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { apiClient } from "@/lib/api-client";
import { formatFileSize, formatRelativeDate, getAtsScoreColor, getAtsScoreLabel } from "@/lib/utils";
import { useResumes } from "@/hooks/use-resumes";
import type { Resume } from "@/types";

// ─── Upload Zone ──────────────────────────────────────────────────────────────
function UploadZone({ onUploaded }: { onUploaded: () => void }) {
  const { getToken } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(async (accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;

    const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!validTypes.includes(file.type)) {
      toast.error("Only PDF and DOCX files are accepted.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10 MB.");
      return;
    }

    setUploading(true);
    setProgress(30);

    try {
      const token = await getToken();
      const fd = new FormData();
      fd.append("resume", file);
      setProgress(60);
      await apiClient.uploadFile("/resumes/upload", fd, token ?? undefined);
      setProgress(100);
      toast.success("Resume uploaded successfully!");
      onUploaded();
    } catch (err: unknown) {
      toast.error((err as { message?: string }).message ?? "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [getToken, onUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div
        {...getRootProps()}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-all duration-300 cursor-pointer
          ${isDragActive ? "border-primary bg-primary/8 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-primary/4"}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-4 w-full max-w-xs">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/25">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}>
                <Clock className="h-6 w-6 text-blue-400" />
              </motion.div>
            </div>
            <p className="text-sm font-medium">Uploading & analyzing...</p>
            <Progress value={progress} className="w-full" />
          </div>
        ) : (
          <>
            <div className={`flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-300 mb-4
              ${isDragActive ? "bg-primary/20 border-primary/40" : "bg-secondary border-border"}`}>
              <Upload className={`h-6 w-6 transition-colors ${isDragActive ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <p className="text-base font-semibold mb-1">
              {isDragActive ? "Drop your resume here" : "Drag & drop your resume"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">or click to browse · PDF or DOCX · max 10 MB</p>
            <Button variant="outline" size="sm">Browse files</Button>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── Resume Card ──────────────────────────────────────────────────────────────
function ResumeCard({ resume, onDeleted, onSetDefault }: {
  resume: Resume;
  onDeleted: () => void;
  onSetDefault: () => void;
}) {
  const { getToken } = useAuth();
  const scoreColor = getAtsScoreColor(resume.atsScore);
  const scoreLabel = getAtsScoreLabel(resume.atsScore);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (resume.atsScore / 100) * circ;
  const strokeColor = resume.atsScore >= 80 ? "#22c55e" : resume.atsScore >= 60 ? "#f59e0b" : "#ef4444";

  const handleDelete = async () => {
    try {
      const token = await getToken();
      await apiClient.delete(`/resumes/${resume.id}`, token ?? undefined);
      toast.success("Resume deleted.");
      onDeleted();
    } catch {
      toast.error("Failed to delete resume.");
    }
  };

  const handleSetDefault = async () => {
    try {
      const token = await getToken();
      await apiClient.patch(`/resumes/${resume.id}/set-default`, {}, token ?? undefined);
      toast.success("Set as default resume.");
      onSetDefault();
    } catch {
      toast.error("Failed to set default.");
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
    >
      <Card className="glass-card hover:border-primary/25 transition-all duration-300">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            {/* File icon */}
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
              <FileText className="h-6 w-6 text-blue-400" />
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="truncate text-sm font-semibold">{resume.title}</p>
                {resume.isDefault && (
                  <Badge variant="default" className="text-[10px] gap-1 px-1.5 py-0">
                    <Star className="h-2.5 w-2.5" /> Default
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {resume.mimeType === "application/pdf" ? "PDF" : "DOCX"} · {formatFileSize(resume.fileSize)}
                {" · "}{formatRelativeDate(resume.createdAt)}
              </p>

              {/* ATS score bar */}
              <div className="mt-3 flex items-center gap-2">
                <svg width="64" height="64" className="-rotate-90 flex-shrink-0">
                  <circle cx="32" cy="32" r={r} fill="none" stroke="hsl(217 33% 14%)" strokeWidth={5} />
                  <circle cx="32" cy="32" r={r} fill="none" stroke={strokeColor} strokeWidth={5}
                    strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 1s ease-out" }}
                  />
                </svg>
                <div>
                  <p className={`text-xl font-bold font-outfit ${scoreColor}`}>{resume.atsScore}</p>
                  <p className="text-xs text-muted-foreground">ATS · {scoreLabel}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            {!resume.isDefault && (
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={handleSetDefault}>
                <Star className="h-3 w-3" /> Set Default
              </Button>
            )}
            <Button variant="ghost" size="sm" className="ml-auto gap-1 text-xs text-destructive hover:text-destructive" onClick={handleDelete}>
              <Trash2 className="h-3 w-3" /> Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Resumes Page ─────────────────────────────────────────────────────────────
export default function ResumesPage() {
  const { data: resumes, isLoading, refetch } = useResumes();

  return (
    <div className="max-w-5xl space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-outfit text-3xl font-bold">
          <span className="gradient-text">Resume</span> Manager
        </h1>
        <p className="mt-1 text-muted-foreground">Upload and manage your resumes. Each gets an instant ATS health score.</p>
      </motion.div>

      <UploadZone onUploaded={() => refetch()} />

      {/* Resume list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-outfit text-lg font-semibold">Your Resumes</h2>
          {resumes && resumes.length > 0 && (
            <Badge variant="secondary">{resumes.length} resume{resumes.length !== 1 ? "s" : ""}</Badge>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
          </div>
        ) : !resumes || resumes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center"
          >
            <FileText className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No resumes yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Upload your first resume above to get started</p>
          </motion.div>
        ) : (
          <motion.div
            layout
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence>
              {resumes.map((r) => (
                <ResumeCard
                  key={r.id}
                  resume={r}
                  onDeleted={() => refetch()}
                  onSetDefault={() => refetch()}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
