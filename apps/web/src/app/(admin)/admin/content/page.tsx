'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
  createSiteBanner,
  deactivateSiteBanner,
  listSiteBanners,
  SiteBanner,
  SiteBannerInput,
  updateSiteBanner,
} from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { PanelsTopLeft, Plus, RefreshCw, X } from 'lucide-react';

const inputStyle = {
  width: '100%',
  border: '1px solid var(--border)',
  borderRadius: 9,
  background: 'var(--surface)',
  color: 'var(--text-1)',
  padding: '10px 12px',
  font: 'inherit',
} as const;

const emptyForm = {
  title: '',
  message: '',
  linkText: '',
  linkUrl: '',
  variant: 'INFO' as SiteBannerInput['variant'],
  isActive: true,
  startsAt: '',
  endsAt: '',
};

function toLocalInput(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toUtc(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

export default function AdminContentPage() {
  const { getToken } = useAuth();
  const [token, setToken] = useState('');
  const [rows, setRows] = useState<SiteBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(
    async (authToken = token) => {
      if (!authToken) return;
      setLoading(true);
      try {
        setRows(await listSiteBanners(authToken));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not load site content.');
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    let active = true;
    void getToken().then(async (authToken) => {
      if (!active || !authToken) return;
      setToken(authToken);
      await load(authToken);
    });
    return () => {
      active = false;
    };
  }, [getToken, load]);

  const reset = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const edit = (banner: SiteBanner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title,
      message: banner.message,
      linkText: banner.linkText ?? '',
      linkUrl: banner.linkUrl ?? '',
      variant: banner.variant,
      isActive: banner.isActive,
      startsAt: toLocalInput(banner.startsAt),
      endsAt: toLocalInput(banner.endsAt),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    if (Boolean(form.linkText.trim()) !== Boolean(form.linkUrl.trim())) {
      toast.error('Provide both the link label and URL, or leave both empty.');
      return;
    }
    const data: SiteBannerInput = {
      title: form.title.trim(),
      message: form.message.trim(),
      linkText: form.linkText.trim() || null,
      linkUrl: form.linkUrl.trim() || null,
      variant: form.variant,
      isActive: form.isActive,
      startsAt: toUtc(form.startsAt) ?? null,
      endsAt: toUtc(form.endsAt) ?? null,
    };
    setSaving(true);
    try {
      if (editingId) await updateSiteBanner(token, editingId, data);
      else await createSiteBanner(token, data);
      toast.success(editingId ? 'Banner updated.' : 'Banner created.');
      reset();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save the banner.');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (banner: SiteBanner) => {
    if (
      !token ||
      !window.confirm(`Deactivate “${banner.title}”? It will stop appearing publicly.`)
    ) {
      return;
    }
    try {
      await deactivateSiteBanner(token, banner.id);
      toast.success('Banner deactivated.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not deactivate the banner.');
    }
  };

  const updateForm = (key: keyof typeof emptyForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gap: 24 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            display: 'grid',
            placeItems: 'center',
            background: 'var(--surface-2)',
            color: 'var(--brand)',
          }}
        >
          <PanelsTopLeft size={22} aria-hidden="true" />
        </span>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: 'var(--text-1)' }}>
            Site content
          </h1>
          <p style={{ margin: '5px 0 0', color: 'var(--text-3)' }}>
            Manage homepage banners without a code or app update.
          </p>
        </div>
      </header>

      <Card hoverEffect={false} style={{ padding: 24 }}>
        <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-1)' }}>
              {editingId ? 'Edit banner' : 'Create a banner'}
            </h2>
            {editingId && (
              <Button type="button" variant="ghost" onClick={reset} aria-label="Cancel editing">
                <X size={16} /> Cancel
              </Button>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gap: 14,
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            }}
          >
            <label style={{ display: 'grid', gap: 6, color: 'var(--text-2)', fontWeight: 650 }}>
              Title
              <input
                required
                maxLength={80}
                value={form.title}
                onChange={(e) => updateForm('title', e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: 6, color: 'var(--text-2)', fontWeight: 650 }}>
              Style
              <select
                value={form.variant}
                onChange={(e) => updateForm('variant', e.target.value as typeof form.variant)}
                style={inputStyle}
              >
                <option value="INFO">Information</option>
                <option value="PROMO">Promotion</option>
                <option value="WARNING">Important notice</option>
              </select>
            </label>
          </div>

          <label style={{ display: 'grid', gap: 6, color: 'var(--text-2)', fontWeight: 650 }}>
            Message
            <textarea
              required
              maxLength={500}
              rows={3}
              value={form.message}
              onChange={(e) => updateForm('message', e.target.value)}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </label>

          <div
            style={{
              display: 'grid',
              gap: 14,
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            }}
          >
            <label style={{ display: 'grid', gap: 6, color: 'var(--text-2)', fontWeight: 650 }}>
              Link label (optional)
              <input
                maxLength={40}
                value={form.linkText}
                onChange={(e) => updateForm('linkText', e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: 6, color: 'var(--text-2)', fontWeight: 650 }}>
              Link URL (HTTPS or site path)
              <input
                maxLength={2048}
                value={form.linkUrl}
                onChange={(e) => updateForm('linkUrl', e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>

          <div
            style={{
              display: 'grid',
              gap: 14,
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            }}
          >
            <label style={{ display: 'grid', gap: 6, color: 'var(--text-2)', fontWeight: 650 }}>
              Starts at (optional)
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => updateForm('startsAt', e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: 6, color: 'var(--text-2)', fontWeight: 650 }}>
              Ends at (optional)
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => updateForm('endsAt', e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--text-2)' }}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => updateForm('isActive', e.target.checked)}
            />
            Active
          </label>
          <div>
            <Button type="submit" disabled={saving}>
              {saving ? <RefreshCw size={16} /> : <Plus size={16} />}
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create banner'}
            </Button>
          </div>
        </form>
      </Card>

      <Card hoverEffect={false} style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: 18,
            borderBottom: '1px solid var(--border)',
            fontWeight: 750,
            color: 'var(--text-1)',
          }}
        >
          Banners ({rows.length})
        </div>
        {loading ? (
          <div style={{ padding: 36, display: 'flex', justifyContent: 'center' }}>
            <RefreshCw className="animate-spin" aria-label="Loading banners" />
          </div>
        ) : rows.length === 0 ? (
          <p style={{ padding: 24, color: 'var(--text-3)' }}>No banners have been created yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-1)' }}>
              <thead>
                <tr
                  style={{
                    textAlign: 'left',
                    background: 'var(--surface-2)',
                    color: 'var(--text-3)',
                  }}
                >
                  <th style={{ padding: 12 }}>Banner</th>
                  <th style={{ padding: 12 }}>Style</th>
                  <th style={{ padding: 12 }}>Status</th>
                  <th style={{ padding: 12 }}>Updated</th>
                  <th style={{ padding: 12, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((banner) => (
                  <tr key={banner.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: 12, minWidth: 240 }}>
                      <strong>{banner.title}</strong>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                        {banner.message}
                      </div>
                    </td>
                    <td style={{ padding: 12 }}>{banner.variant}</td>
                    <td style={{ padding: 12 }}>
                      <Badge variant={banner.isActive ? 'success' : 'neutral'}>
                        {banner.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td style={{ padding: 12, whiteSpace: 'nowrap', color: 'var(--text-3)' }}>
                      {new Date(banner.updatedAt).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ padding: 12, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Button variant="ghost" onClick={() => edit(banner)}>
                        Edit
                      </Button>
                      {banner.isActive && (
                        <Button variant="ghost" onClick={() => deactivate(banner)}>
                          Deactivate
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  );
}
