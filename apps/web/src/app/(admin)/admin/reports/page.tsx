'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { downloadAdminReport, type AdminReport, getAdminAccess } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Download, FileDown, LoaderCircle } from 'lucide-react';

const reports: Array<{
  id: AdminReport;
  title: string;
  description: string;
  permission: string;
}> = [
  {
    id: 'users',
    title: 'User directory',
    description: 'Account status, assigned roles, registration date, and last sign-in.',
    permission: 'reports:users',
  },
  {
    id: 'billing',
    title: 'Payments and refunds',
    description: 'Successful and failed payments, refund totals, currencies, and failure details.',
    permission: 'reports:billing',
  },
  {
    id: 'subscriptions',
    title: 'Subscriptions',
    description: 'Plans, account email, subscription status, billing periods, and cancellations.',
    permission: 'reports:subscriptions',
  },
  {
    id: 'ai-usage',
    title: 'AI usage and cost',
    description: 'Requests, model, token counts, and estimated provider cost.',
    permission: 'reports:ai',
  },
];

export default function AdminReportsPage() {
  const { getToken } = useAuth();
  const [token, setToken] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<AdminReport | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const authToken = await getToken();
        if (!authToken) throw new Error('Please sign in again to access reports.');
        const access = await getAdminAccess(authToken);
        if (active) {
          setToken(authToken);
          setRoles(access.roles ?? []);
          setPermissions(access.permissions ?? []);
        }
      } catch (error) {
        if (active) toast.error(error instanceof Error ? error.message : 'Could not load reports.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [getToken]);

  const download = async (report: AdminReport) => {
    setDownloading(report);
    try {
      await downloadAdminReport(token, report);
      toast.success('Report downloaded.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not download this report.');
    } finally {
      setDownloading(null);
    }
  };

  const visibleReports = reports.filter(
    (report) => roles.includes('SUPER_ADMIN') || permissions.includes(report.permission),
  );

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gap: 24 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            width: 44,
            height: 44,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 14,
            color: 'var(--brand)',
            background: 'var(--surface-2)',
          }}
        >
          <FileDown size={22} aria-hidden="true" />
        </span>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: 'var(--text-1)' }}>
            Reports
          </h1>
          <p style={{ margin: '5px 0 0', color: 'var(--text-3)' }}>
            Export current reports from JobIN’s stored records whenever you need them.
          </p>
        </div>
      </header>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <LoaderCircle className="animate-spin" aria-label="Loading report permissions" />
        </div>
      ) : (
        <section
          aria-label="Available reports"
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          }}
        >
          {visibleReports.map((report) => (
            <Card
              key={report.id}
              hoverEffect={false}
              style={{ padding: 20, display: 'grid', gap: 18 }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 17, color: 'var(--text-1)' }}>{report.title}</h2>
                <p
                  style={{
                    margin: '8px 0 0',
                    lineHeight: 1.55,
                    color: 'var(--text-3)',
                    fontSize: 13,
                  }}
                >
                  {report.description}
                </p>
              </div>
              <Button
                onClick={() => void download(report.id)}
                disabled={!token || downloading !== null}
              >
                {downloading === report.id ? (
                  <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
                ) : (
                  <Download size={16} aria-hidden="true" />
                )}
                {downloading === report.id ? 'Preparing…' : 'Download CSV'}
              </Button>
            </Card>
          ))}
        </section>
      )}
    </main>
  );
}
