'use client';

import React from 'react';
import { useState, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  LayoutGrid,
  List,
  X,
  ExternalLink,
  Calendar,
  MapPin,
  DollarSign,
  Briefcase,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import {
  useAllApplications,
  useCreateApplication,
  useUpdateApplication,
  useDeleteApplication,
} from '@/hooks/use-applications';
import type { JobApplication, ApplicationStatus, CreateApplicationPayload } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ColumnConfig {
  id: ApplicationStatus;
  label: string;
  badgeVariant: 'brand' | 'success' | 'neutral';
}

const COLUMNS: ColumnConfig[] = [
  { id: 'SAVED',                label: 'Saved',               badgeVariant: 'neutral' },
  { id: 'APPLIED',              label: 'Applied',             badgeVariant: 'brand'   },
  { id: 'PHONE_SCREEN',         label: 'Phone Screen',        badgeVariant: 'brand'   },
  { id: 'INTERVIEW',            label: 'Interview',           badgeVariant: 'brand'   },
  { id: 'TECHNICAL_ASSESSMENT', label: 'Technical',           badgeVariant: 'brand'   },
  { id: 'FINAL_ROUND',          label: 'Final Round',         badgeVariant: 'brand'   },
  { id: 'OFFER',                label: 'Offer 🎉',            badgeVariant: 'success' },
  { id: 'REJECTED',             label: 'Rejected',            badgeVariant: 'neutral' },
  { id: 'WITHDRAWN',            label: 'Withdrawn',           badgeVariant: 'neutral' },
];

const colById = Object.fromEntries(COLUMNS.map(c => [c.id, c])) as Record<ApplicationStatus, ColumnConfig>;

const SOURCES = ['LinkedIn', 'Indeed', 'Company Website', 'Glassdoor', 'Referral', 'Recruiter', 'Job Board', 'Other'];

function AddApplicationModal({ onClose }: { onClose: () => void }) {
  const createApp = useCreateApplication();
  const [form, setForm] = useState<CreateApplicationPayload>({
    jobTitle: '',
    companyName: '',
    location: '',
    jobUrl: '',
    salary: '',
    status: 'APPLIED',
    notes: '',
    source: '',
    appliedDate: new Date().toISOString().split('T')[0],
  });

  const set = (key: keyof CreateApplicationPayload, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.jobTitle || !form.companyName) {
      toast.error('Job title and company name are required');
      return;
    }
    try {
      await createApp.mutateAsync(form);
      toast.success('Application added successfully!');
      onClose();
    } catch {
      toast.error('Failed to save application');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        padding: '16px'
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        style={{ width: '100%', maxWidth: '512px' }}
      >
        <Card hoverEffect={false} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-1)' }}>
              <Briefcase style={{ height: '18px', width: '18px', color: 'var(--brand)' }} />
              <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Add Application</h2>
            </div>
            <button
              onClick={onClose}
              style={{
                borderRadius: '6px',
                padding: '6px',
                color: 'var(--text-3)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'var(--transition)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface-2)';
                e.currentTarget.style.color = 'var(--text-1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-3)';
              }}
            >
              <X style={{ height: '16px', width: '16px' }} />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Job Title *</label>
                <input
                  value={form.jobTitle}
                  onChange={e => set('jobTitle', e.target.value)}
                  required
                  placeholder="Senior Software Engineer"
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-2)',
                    padding: '10px 12px',
                    fontSize: '14px',
                    color: 'var(--text-1)',
                    outline: 'none',
                    fontWeight: 500
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company *</label>
                <input
                  value={form.companyName}
                  onChange={e => set('companyName', e.target.value)}
                  required
                  placeholder="Acme Corp"
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-2)',
                    padding: '10px 12px',
                    fontSize: '14px',
                    color: 'var(--text-1)',
                    outline: 'none',
                    fontWeight: 500
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</label>
                <input
                  value={form.location ?? ''}
                  onChange={e => set('location', e.target.value)}
                  placeholder="London, UK"
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-2)',
                    padding: '10px 12px',
                    fontSize: '14px',
                    color: 'var(--text-1)',
                    outline: 'none',
                    fontWeight: 500
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Salary Range</label>
                <input
                  value={form.salary ?? ''}
                  onChange={e => set('salary', e.target.value)}
                  placeholder="£80k - £100k"
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-2)',
                    padding: '10px 12px',
                    fontSize: '14px',
                    color: 'var(--text-1)',
                    outline: 'none',
                    fontWeight: 500
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={form.status}
                    onChange={e => set('status', e.target.value)}
                    style={{
                      width: '100%',
                      appearance: 'none',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface-2)',
                      padding: '10px 12px',
                      fontSize: '14px',
                      color: 'var(--text-1)',
                      outline: 'none',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    {COLUMNS.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown style={{ pointerEvents: 'none', position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', height: '14px', width: '14px', color: 'var(--text-3)' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date Applied</label>
                <input
                  type="date"
                  value={form.appliedDate ?? ''}
                  onChange={e => set('appliedDate', e.target.value)}
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-2)',
                    padding: '10px 12px',
                    fontSize: '14px',
                    color: 'var(--text-1)',
                    outline: 'none',
                    fontWeight: 500
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source</label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={form.source ?? ''}
                    onChange={e => set('source', e.target.value)}
                    style={{
                      width: '100%',
                      appearance: 'none',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface-2)',
                      padding: '10px 12px',
                      fontSize: '14px',
                      color: 'var(--text-1)',
                      outline: 'none',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Select source…</option>
                    {SOURCES.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <ChevronDown style={{ pointerEvents: 'none', position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', height: '14px', width: '14px', color: 'var(--text-3)' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Job URL</label>
                <input
                  type="url"
                  value={form.jobUrl ?? ''}
                  onChange={e => set('jobUrl', e.target.value)}
                  placeholder="https://linkedin.com/…"
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-2)',
                    padding: '10px 12px',
                    fontSize: '14px',
                    color: 'var(--text-1)',
                    outline: 'none',
                    fontWeight: 500
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</label>
              <textarea
                value={form.notes ?? ''}
                onChange={e => set('notes', e.target.value)}
                rows={3}
                placeholder="Key contacts, interview notes, follow-up actions…"
                style={{
                  width: '100%',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface-2)',
                  padding: '10px 12px',
                  fontSize: '14px',
                  color: 'var(--text-1)',
                  outline: 'none',
                  resize: 'none',
                  fontWeight: 500
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', paddingTop: '12px' }}>
              <Button type="button" variant="ghost" onClick={onClose} style={{ flex: 1 }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createApp.isPending} style={{ flex: 1 }}>
                {createApp.isPending ? 'Saving…' : 'Save Application'}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function KanbanCard({
  app,
  onDelete,
}: {
  app: JobApplication;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: app.id,
    data: { status: app.status },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    touchAction: 'none',
    userSelect: 'none' as const
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card
        style={{
          cursor: 'grab',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
        hoverEffect={true}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.jobTitle}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 500, margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.companyName}</p>
          </div>
          <div style={{
            display: 'flex',
            height: '28px',
            width: '28px',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            backgroundColor: 'var(--brand-light)',
            color: 'var(--brand)',
            fontWeight: 800,
            fontSize: '11px',
            border: '1px solid rgba(79, 70, 229, 0.1)',
            flexShrink: 0
          }}>
            {app.companyName.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Metadata */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
          {app.location && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: 'var(--text-3)', fontWeight: 600 }}>
              <MapPin style={{ height: '12px', width: '12px' }} /> {app.location}
            </span>
          )}
          {app.salary && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: 'var(--text-3)', fontWeight: 600 }}>
              <DollarSign style={{ height: '12px', width: '12px' }} /> {app.salary}
            </span>
          )}
          {app.appliedDate && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: 'var(--text-3)', fontWeight: 600 }}>
              <Calendar style={{ height: '12px', width: '12px' }} />
              {new Date(app.appliedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '8px' }}>
          {app.source ? (
            <Badge variant="neutral" style={{ fontSize: '9px', padding: '0px 6px' }}>
              {app.source}
            </Badge>
          ) : (
            <div />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {app.jobUrl && (
              <a
                href={app.jobUrl}
                target="_blank"
                rel="noreferrer"
                onClick={e => e.stopPropagation()}
                style={{
                  padding: '4px',
                  borderRadius: '4px',
                  color: 'var(--text-3)',
                  transition: 'var(--transition)'
                }}
                title="Job URL"
              >
                <ExternalLink style={{ height: '14px', width: '14px' }} />
              </a>
            )}
            <button
              onClick={e => {
                e.stopPropagation();
                onDelete(app.id);
              }}
              style={{
                padding: '4px',
                borderRadius: '4px',
                color: 'var(--text-3)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
              title="Delete Log"
            >
              <Trash2 style={{ height: '14px', width: '14px' }} />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function KanbanColumn({
  col,
  applications,
  onDelete,
}: {
  col: ColumnConfig;
  applications: JobApplication[];
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div style={{ display: 'flex', width: '288px', flexDirection: 'column', gap: '12px', flexShrink: 0 }}>
      {/* Column header: status name + count pill */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px', paddingLeft: '4px', paddingRight: '4px', userSelect: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-1)' }}>{col.label}</span>
          <Badge variant={col.badgeVariant} style={{ fontSize: '10px', padding: '0px 6px', fontWeight: 700 }}>
            {applications.length}
          </Badge>
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          minHeight: '500px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          borderRadius: '8px',
          border: '1px solid',
          borderColor: isOver ? 'var(--brand)' : 'transparent',
          padding: '10px',
          transition: 'var(--transition)',
          backgroundColor: isOver ? 'rgba(79, 70, 229, 0.05)' : 'var(--surface-2)'
        }}
      >
        {applications.map(app => (
          <KanbanCard key={app.id} app={app} onDelete={onDelete} />
        ))}
        {applications.length === 0 && (
          <div
            style={{
              display: 'flex',
              height: '80px',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              border: '1px dashed',
              borderColor: isOver ? 'var(--brand)' : 'var(--border)',
              transition: 'var(--transition)',
              userSelect: 'none',
              color: isOver ? 'var(--brand)' : 'var(--text-3)'
            }}
          >
            <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              {isOver ? 'Drop Here' : 'No Items'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

type SortKey = 'companyName' | 'jobTitle' | 'status' | 'updatedAt' | 'appliedDate';

function ListView({
  applications,
  onDelete,
  onStatusChange,
}: {
  applications: JobApplication[];
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    return [...applications].sort((a, b) => {
      const av = (a[sortKey] ?? '') as string;
      const bv = (b[sortKey] ?? '') as string;
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [applications, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const th = (key: SortKey, label: string) => (
    <th
      onClick={() => toggleSort(key)}
      style={{
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        padding: '14px 16px',
        textAlign: 'left',
        fontSize: '12px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--text-3)',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--surface-2)',
        transition: 'var(--transition)'
      }}
    >
      {label} {sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  );

  if (!sorted.length) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        textAlign: 'center',
        gap: '12px',
        border: '1px dashed var(--border)',
        borderRadius: '10px',
        backgroundColor: 'rgba(248, 249, 255, 0.2)'
      }}>
        <Briefcase style={{ height: '40px', width: '40px', color: 'var(--text-3)', opacity: 0.4 }} />
        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-2)', margin: 0 }}>No applications yet</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
      <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse', color: 'var(--text-1)' }}>
        <thead>
          <tr>
            {th('jobTitle', 'Role')}
            {th('companyName', 'Company')}
            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-2)', userSelect: 'none' }}>
              Location
            </th>
            {th('status', 'Status')}
            {th('appliedDate', 'Applied')}
            {th('updatedAt', 'Updated')}
            <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-2)', userSelect: 'none' }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((app, i) => {
            const _col = colById[app.status];
            return (
              <motion.tr
                key={app.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                style={{ borderBottom: '1px solid rgba(228, 228, 240, 0.6)', transition: 'var(--transition)' }}
              >
                <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-1)' }}>{app.jobTitle}</td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      display: 'flex',
                      height: '24px',
                      width: '24px',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                      backgroundColor: 'var(--brand-light)',
                      color: 'var(--brand)',
                      border: '1px solid rgba(79, 70, 229, 0.2)',
                      fontSize: '10px',
                      fontWeight: 900
                    }}>
                      {app.companyName.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600 }}>{app.companyName}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px', color: 'var(--text-2)', fontWeight: 500 }}>{app.location ?? '—'}</td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <select
                      value={app.status}
                      onChange={e => onStatusChange(app.id, e.target.value as ApplicationStatus)}
                      style={{
                        appearance: 'none',
                        borderRadius: '999px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--surface)',
                        padding: '4px 28px 4px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: 'var(--text-2)',
                        outline: 'none'
                      }}
                    >
                      {COLUMNS.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown style={{ pointerEvents: 'none', position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', height: '12px', width: '12px', color: 'var(--text-3)' }} />
                  </div>
                </td>
                <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-3)', fontWeight: 600 }}>
                  {app.appliedDate
                    ? new Date(app.appliedDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: '2-digit',
                      })
                    : '—'}
                </td>
                <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-3)', fontWeight: 600 }}>
                  {new Date(app.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                    {app.jobUrl && (
                      <a
                        href={app.jobUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          borderRadius: '4px',
                          padding: '4px',
                          color: 'var(--text-3)',
                          transition: 'var(--transition)'
                        }}
                        title="Job URL"
                      >
                        <ExternalLink style={{ height: '16px', width: '16px' }} />
                      </a>
                    )}
                    <button
                      onClick={() => onDelete(app.id)}
                      style={{
                        borderRadius: '4px',
                        padding: '4px',
                        color: 'var(--text-3)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                      title="Delete Log"
                    >
                      <Trash2 style={{ height: '16px', width: '16px' }} />
                    </button>
                  </div>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TrackerContent() {
  const searchParams = useSearchParams();
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [showAdd, setShowAdd] = useState(searchParams.get('add') === 'true');
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: applications = [], isLoading } = useAllApplications();
  const updateApp = useUpdateApplication();
  const deleteApp = useDeleteApplication();

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const draggedApp = applications.find(a => a.id === active.id);
    const newStatus = over.id as ApplicationStatus;

    if (!draggedApp || draggedApp.status === newStatus) return;

    try {
      await updateApp.mutateAsync({ id: draggedApp.id, status: newStatus });
      toast.success(`Moved to ${colById[newStatus]?.label ?? newStatus}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleStatusChange = async (id: string, status: ApplicationStatus) => {
    try {
      await updateApp.mutateAsync({ id, status });
      toast.success(`Status updated successfully`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this application?')) return;
    try {
      await deleteApp.mutateAsync(id);
      toast.success('Application deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const activeApp = applications.find(a => a.id === activeId);

  const byStatus = useMemo(() => {
    const map: Record<string, JobApplication[]> = {};
    COLUMNS.forEach(c => {
      map[c.id] = [];
    });
    applications.forEach(a => {
      (map[a.status] ??= []).push(a);
    });
    return map;
  }, [applications]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '100vh' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between' }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-1)', margin: 0, letterSpacing: '-1.2px' }}>
              <span style={{ color: 'var(--brand)' }}>Job</span> Tracker
            </h1>
            <p style={{ marginTop: '4px', color: 'var(--text-2)', fontSize: '14px', fontWeight: 500, margin: '4px 0 0 0' }}>
              {applications.length} application{applications.length !== 1 ? 's' : ''} tracked total
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', userSelect: 'none' }}>
            {/* View toggle */}
            <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', padding: '4px' }}>
              <button
                onClick={() => setView('kanban')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  transition: 'var(--transition)',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: view === 'kanban' ? 'var(--brand-light)' : 'transparent',
                  color: view === 'kanban' ? 'var(--brand)' : 'var(--text-3)'
                }}
              >
                <LayoutGrid style={{ height: '14px', width: '14px' }} /> Kanban
              </button>
              <button
                onClick={() => setView('list')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  transition: 'var(--transition)',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: view === 'list' ? 'var(--brand-light)' : 'transparent',
                  color: view === 'list' ? 'var(--brand)' : 'var(--text-3)'
                }}
              >
                <List style={{ height: '14px', width: '14px' }} /> List
              </button>
            </div>

            {/* Add button */}
            <Button onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '10px 16px' }}>
              <Plus style={{ height: '16px', width: '16px' }} /> Add Application
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Loading */}
      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{
            height: '32px',
            width: '32px',
            borderRadius: '50%',
            border: '2px solid var(--brand)',
            borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite'
          }} />
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}} />
        </div>
      )}

      {/* Kanban board */}
      {!isLoading && view === 'kanban' && (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div style={{ overflowX: 'auto', paddingBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '16px', width: 'max-content' }}>
              {COLUMNS.map(col => (
                <KanbanColumn
                  key={col.id}
                  col={col}
                  applications={byStatus[col.id] ?? []}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>

          <DragOverlay>
            {activeApp && (
              <div style={{
                width: '256px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                padding: '16px',
                boxShadow: 'var(--shadow-card)',
                opacity: 0.9,
                transform: 'scale(1.02) rotate(1deg)',
                userSelect: 'none'
              }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeApp.jobTitle}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 500, margin: '4px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeApp.companyName}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* List view */}
      {!isLoading && view === 'list' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <ListView
            applications={applications}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        </motion.div>
      )}

      {/* Add application modal */}
      <AnimatePresence>
        {showAdd && <AddApplicationModal onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
    </div>
  );
}

export default function TrackerPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            height: '32px',
            width: '32px',
            borderRadius: '50%',
            border: '2px solid var(--brand)',
            borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite'
          }} />
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}} />
        </div>
      }
    >
      <TrackerContent />
    </Suspense>
  );
}
