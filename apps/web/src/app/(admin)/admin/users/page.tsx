'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState, useCallback } from 'react';
import { listUsers, updateUser, getUserActivity } from '@/lib/admin-api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { X, RefreshCw, Search, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

function UserModal({
  userId, token, onClose,
}: { userId: string; token: string; onClose: () => void }) {
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status,  setStatus]  = useState('');
  const [credits, setCredits] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    getUserActivity(token, userId).then(d => {
      setData(d);
      setStatus(d.user.status);
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load user activity details');
      onClose();
    });
  }, [token, userId, onClose]);

  const save = async () => {
    setSaving(true);
    try {
      await updateUser(token, userId, {
        status: status,
        grantCredits: credits ? parseInt(credits) : undefined,
      });
      setSaved(true);
      toast.success('User details updated successfully!');
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error('Failed to update user actions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
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
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxWidth: '512px' }}
        onClick={e => e.stopPropagation()}
      >
        <Card hoverEffect={false} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '8px', color: 'var(--text-3)', fontSize: '12px', fontWeight: 600, userSelect: 'none' }}>
              <RefreshCw style={{ height: '18px', width: '18px', animation: 'spin 1s linear infinite', color: 'var(--brand)' }} />
              <span>Loading details...</span>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border)', padding: '20px' }}>
                <Avatar
                  src={data.user.avatarUrl}
                  alt={data.user.fullName || 'User'}
                  fallback={data.user.fullName?.charAt(0) ?? '?'}
                  size="md"
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.user.fullName}</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600, margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.user.email}</p>
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

              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px', maxHeight: '60vh', overflowY: 'auto' }}>
                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {[
                    { label: 'Resumes', value: data.resumes.length },
                    { label: 'Applications', value: data.applications.length },
                    { label: 'AI Cost', value: `$${data.totalCostUsd}` },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--brand)' }}>
                        {value}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', marginTop: '4px' }}>
                        {label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions form */}
                <div style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                    Admin Settings
                  </h4>
                  <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Account Status
                      </label>
                      <div style={{ position: 'relative' }}>
                        <select
                          value={status}
                          onChange={e => setStatus(e.target.value)}
                          style={{
                            width: '100%',
                            appearance: 'none',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--surface)',
                            padding: '10px 12px',
                            fontSize: '14px',
                            color: 'var(--text-1)',
                            outline: 'none',
                            fontWeight: 500,
                            cursor: 'pointer'
                          }}
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="SUSPENDED">Suspended</option>
                          <option value="DELETED">Deleted</option>
                        </select>
                        <ChevronDown style={{ pointerEvents: 'none', position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', height: '14px', width: '14px', color: 'var(--text-3)' }} />
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Grant AI Credits
                      </label>
                      <input
                        type="number"
                        value={credits}
                        onChange={e => setCredits(e.target.value)}
                        placeholder="e.g. 100"
                        style={{
                          width: '100%',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--surface)',
                          padding: '10px 12px',
                          fontSize: '14px',
                          color: 'var(--text-1)',
                          outline: 'none',
                          fontWeight: 500
                        }}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={save}
                    disabled={saving}
                    style={{ fontSize: '12px', padding: '8px 16px', alignSelf: 'flex-start' }}
                  >
                    {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Changes'}
                  </Button>
                </div>

                {/* AI Usage history logs */}
                {data.aiUsage.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                      Recent AI Requests
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '144px', overflowY: 'auto' }}>
                      {data.aiUsage.slice(0, 8).map((u: any) => (
                        <div
                          key={u.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            border: '1px solid rgba(228, 228, 240, 0.6)',
                            backgroundColor: 'var(--surface-2)',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 500
                          }}
                        >
                          <span style={{ color: 'var(--text-2)' }}>
                            {u.feature} · <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>{u.modelName}</span>
                          </span>
                          <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>
                            {u.totalTokens.toLocaleString()} tokens
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const { getToken } = useAuth();
  const [users, setUsers] = useState<any>({ data: [], meta: {} });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [token, setToken] = useState('');

  const load = useCallback(async (tk?: string) => {
    const t = tk ?? token;
    if (!t) return;
    setLoading(true);
    try {
      const res = await listUsers(t, { search, status, page, limit: 25 });
      setUsers(res);
    } catch {
      toast.error('Failed to load user list');
    } finally {
      setLoading(false);
    }
  }, [token, search, status, page]);

  useEffect(() => {
    getToken().then(t => {
      if (t) {
        setToken(t);
        load(t);
      }
    });
  }, [getToken, load]);

  useEffect(() => {
    load();
  }, [search, status, page, load]);

  const { data: rows = [], meta = {} } = users;

  const getBadgeVariant = (s: string) => {
    if (s === 'ACTIVE') return 'success';
    if (s === 'SUSPENDED') return 'brand';
    return 'neutral';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh' }}>
      {selected && token && (
        <UserModal
          userId={selected}
          token={token}
          onClose={() => {
            setSelected(null);
            load();
          }}
        />
      )}

      {/* Header */}
      <div style={{ userSelect: 'none' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-1)', margin: 0, letterSpacing: '-1.2px' }}>
          User Management
        </h1>
        <p style={{ marginTop: '8px', color: 'var(--text-2)', fontSize: '14px', fontWeight: 500, margin: '8px 0 0 0' }}>
          {(meta as any).total?.toLocaleString() ?? '—'} registered platform users total
        </p>
      </div>

      {/* Filters: Search & Select */}
      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '10px 16px',
          flex: 1,
          minWidth: '280px'
        }}>
          <Search style={{ height: '16px', width: '16px', color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search users by name or email address..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              color: 'var(--text-1)',
              fontWeight: 500
            }}
          />
        </div>

        <div style={{ position: 'relative', minWidth: '180px' }}>
          <select
            value={status}
            onChange={e => {
              setStatus(e.target.value);
              setPage(1);
            }}
            style={{
              width: '100%',
              appearance: 'none',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              padding: '10px 36px 10px 16px',
              fontSize: '14px',
              color: 'var(--text-2)',
              fontWeight: 500,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DELETED">Deleted</option>
          </select>
          <ChevronDown style={{ pointerEvents: 'none', position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', height: '16px', width: '16px', color: 'var(--text-3)' }} />
        </div>
      </div>

      {/* Table grid */}
      <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
        <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse', color: 'var(--text-1)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-2)', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '12px' }}>
              <th style={{ padding: '14px 16px', textAlign: 'left', userSelect: 'none' }}>Name</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', userSelect: 'none' }}>Email Address</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', userSelect: 'none' }}>Status</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', userSelect: 'none' }}>Subscription Plan</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', userSelect: 'none' }}>Joined Date</th>
              <th style={{ padding: '14px 16px', textAlign: 'right', userSelect: 'none' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '64px 16px', textAlign: 'center', color: 'var(--text-3)', fontWeight: 600, fontSize: '12px', userSelect: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <RefreshCw style={{ height: '16px', width: '16px', animation: 'spin 1s linear infinite', color: 'var(--brand)' }} />
                    <span>Loading users data...</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '64px 16px', textAlign: 'center', color: 'var(--text-3)', fontWeight: 600, fontSize: '12px', userSelect: 'none' }}>
                  No matches found for criteria
                </td>
              </tr>
            ) : (
              rows.map((user: any) => {
                const planName = user.subscriptions?.[0]?.plan?.name ?? 'Free';
                return (
                  <motion.tr
                    key={user.id}
                    style={{ borderBottom: '1px solid rgba(228, 228, 240, 0.6)', transition: 'var(--transition)' }}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Avatar
                          src={user.avatarUrl}
                          alt={user.fullName || 'User'}
                          fallback={user.fullName?.charAt(0) ?? '?'}
                          size="sm"
                        />
                        <span style={{ fontWeight: 700 }}>{user.fullName}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-2)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                      {user.email}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <Badge variant={getBadgeVariant(user.status)}>
                        {user.status}
                      </Badge>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-2)', fontWeight: 700 }}>
                      {planName}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-3)', fontWeight: 600, fontSize: '12px' }}>
                      {new Date(user.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <Button
                        onClick={() => setSelected(user.id)}
                        variant="ghost"
                        style={{ fontSize: '12px', padding: '4px 12px' }}
                      >
                        View User
                      </Button>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination control */}
      {(meta as any).totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', paddingTop: '8px', userSelect: 'none' }}>
          {Array.from({ length: (meta as any).totalPages }, (_, i) => i + 1)
            .slice(Math.max(0, page - 3), Math.min((meta as any).totalPages, page + 2))
            .map(p => {
              const active = p === page;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: active ? 'var(--brand)' : 'var(--border)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                    backgroundColor: active ? 'var(--brand-light)' : 'var(--surface)',
                    color: active ? 'var(--brand)' : 'var(--text-3)'
                  }}
                >
                  {p}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
