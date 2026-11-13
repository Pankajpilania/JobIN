'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import {
  LogOut,
  Menu,
  X,
  BarChart2,
  Users,
  CreditCard,
  DollarSign,
  Bot,
  AlertCircle,
  ChevronRight,
  Settings2,
  Tag,
  Bell,
  PanelsTopLeft,
  FileDown,
  ShieldCheck,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { BrandMark } from '@/components/brand-mark';
import { motion } from 'framer-motion';

const NAV = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: BarChart2,
    roles: ['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'SUPPORT_ADMIN', 'FINANCE_ADMIN'],
    permission: 'reports:dashboard',
  },
  {
    href: '/admin/users',
    label: 'Users',
    icon: Users,
    roles: ['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'SUPPORT_ADMIN', 'FINANCE_ADMIN'],
    permission: 'users:read',
  },
  {
    href: '/admin/subscriptions',
    label: 'Subscriptions',
    icon: CreditCard,
    roles: ['FINANCE_ADMIN'],
    permission: 'billing:read',
  },
  {
    href: '/admin/billing',
    label: 'Billing',
    icon: DollarSign,
    roles: ['FINANCE_ADMIN'],
    permission: 'billing:read',
  },
  {
    href: '/admin/payment-settings',
    label: 'Payment settings',
    icon: Settings2,
    roles: ['FINANCE_ADMIN'],
    permission: 'billing:read',
  },
  {
    href: '/admin/plans',
    label: 'Plans & AI credits',
    icon: CreditCard,
    roles: ['FINANCE_ADMIN'],
    permission: 'billing:read',
  },
  {
    href: '/admin/discount-codes',
    label: 'Discount codes',
    icon: Tag,
    roles: ['FINANCE_ADMIN'],
    permission: 'discounts:manage',
  },
  { href: '/admin/ai-settings', label: 'AI settings', icon: Bot, roles: ['SUPER_ADMIN'] },
  { href: '/admin/roles', label: 'Roles & permissions', icon: ShieldCheck, roles: ['SUPER_ADMIN'] },
  {
    href: '/admin/ai-usage',
    label: 'AI Usage',
    icon: Bot,
    roles: ['FINANCE_ADMIN', 'OPERATIONS_ADMIN'],
    permission: 'ai:read',
  },
  {
    href: '/admin/tickets',
    label: 'Support',
    icon: AlertCircle,
    roles: ['SUPPORT_ADMIN', 'OPERATIONS_ADMIN'],
    permission: 'support:read_tickets',
  },
  {
    href: '/admin/notifications',
    label: 'Notifications',
    icon: Bell,
    roles: ['OPERATIONS_ADMIN'],
    permission: 'notifications:send',
  },
  {
    href: '/admin/content',
    label: 'Site content',
    icon: PanelsTopLeft,
    roles: ['OPERATIONS_ADMIN'],
    permission: 'content:manage',
  },
  {
    href: '/admin/reports',
    label: 'Reports',
    icon: FileDown,
    roles: ['SUPER_ADMIN', 'FINANCE_ADMIN', 'OPERATIONS_ADMIN'],
    permission: 'reports:ai',
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isReady, isSignedIn, getToken, signOut, profile } = useAuth();
  const [adminVerified, setAdminVerified] = useState(false);
  const [adminRoles, setAdminRoles] = useState<string[]>([]);
  const [adminPermissions, setAdminPermissions] = useState<string[]>([]);
  const [adminError, setAdminError] = useState('');
  const [adminNavOpen, setAdminNavOpen] = useState(false);

  useEffect(() => {
    if (isReady && !isSignedIn) {
      router.replace('/admin-login');
    }
  }, [isReady, isSignedIn, router]);

  useEffect(() => {
    if (!isReady || !isSignedIn) return;
    let active = true;
    getToken()
      .then(async (token) => {
        if (!token) throw new Error('Your session has expired. Please sign in again.');
        const access = await apiClient.get<{
          allowed: boolean;
          roles?: string[];
          permissions?: string[];
        }>('/admin/access', token);
        if (active) {
          setAdminRoles(access.roles ?? []);
          setAdminPermissions(access.permissions ?? []);
          setAdminVerified(true);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setAdminError(error instanceof Error ? error.message : 'Could not verify admin access.');
        }
      });
    return () => {
      active = false;
    };
  }, [getToken, isReady, isSignedIn]);

  useEffect(() => {
    if (!adminNavOpen) return;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const previousOverflow = document.body.style.overflow;
    if (isMobile) document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAdminNavOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [adminNavOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
      router.refresh();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Could not sign out.');
    }
  };

  const displayName = profile.fullName || profile.email || 'Admin';
  const avatarUrl = profile.avatarUrl;

  const getInitials = (name?: string) => {
    if (!name) return 'A';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  if (!isReady || !isSignedIn || (!adminVerified && !adminError)) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          backgroundColor: 'var(--surface)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            height: '24px',
            width: '24px',
            borderRadius: '50%',
            border: '2px solid var(--brand)',
            borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `,
          }}
        />
      </div>
    );
  }

  if (adminError) {
    return (
      <div
        style={{
          display: 'grid',
          minHeight: '100vh',
          placeContent: 'center',
          gap: 12,
          padding: 24,
          textAlign: 'center',
        }}
      >
        <h1 style={{ color: 'var(--text-1)', margin: 0 }}>Admin access required</h1>
        <p style={{ color: 'var(--text-2)', margin: 0 }}>{adminError}</p>
        <p style={{ color: 'var(--text-3)', margin: 0 }}>
          Ask an administrator to grant your account an admin role, then sign out and back in.
        </p>
        <button onClick={handleSignOut} style={{ justifySelf: 'center' }}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div
      className="admin-portal-shell"
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--surface)',
        color: 'var(--text-1)',
      }}
    >
      {/* ── Sidebar Nav ── */}
      <aside
        id="admin-navigation"
        className={`admin-sidebar${adminNavOpen ? ' is-open' : ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          width: '256px',
          borderRight: '1px solid var(--border)',
          backgroundColor: 'rgba(255, 255, 255, 0.82)',
          color: 'var(--text-1)',
          flexShrink: 0,
          backdropFilter: 'blur(18px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(18px) saturate(1.2)',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            height: '64px',
            alignItems: 'center',
            gap: '10px',
            borderBottom: '1px solid var(--border)',
            padding: '0 20px',
            userSelect: 'none',
          }}
        >
          <Link
            href="/admin"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
          >
            <BrandMark size={32} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: 'var(--text-1)',
                  letterSpacing: '-0.3px',
                  lineHeight: 1,
                }}
              >
                JobIN
              </span>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: 'var(--brand)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginTop: '2px',
                  lineHeight: 1,
                }}
              >
                Admin Portal
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation list */}
        <nav
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px',
            paddingTop: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {NAV.filter(
            (item) =>
              adminRoles.includes('SUPER_ADMIN') ||
              (item.permission
                ? adminPermissions.includes(item.permission)
                : item.roles.some((role) => adminRoles.includes(role))),
          ).map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/admin' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setAdminNavOpen(false)}
                style={{ textDecoration: 'none' }}
              >
                <motion.div
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'var(--transition)',
                    cursor: 'pointer',
                    backgroundColor: active ? 'var(--brand-light)' : 'transparent',
                    color: active ? 'var(--brand)' : 'var(--text-2)',
                    border: active
                      ? '1px solid color-mix(in oklab, var(--brand) 20%, transparent)'
                      : '1px solid transparent',
                  }}
                >
                  <Icon
                    style={{
                      height: '16px',
                      width: '16px',
                      flexShrink: 0,
                      color: active ? 'var(--brand)' : 'var(--text-3)',
                    }}
                  />
                  <span style={{ flex: 1 }}>{label}</span>
                  {active && (
                    <ChevronRight
                      style={{ height: '12px', width: '12px', color: 'var(--brand-mid)' }}
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* User profile footer */}
        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: '16px',
            backgroundColor: 'var(--surface-2)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <Avatar
                src={avatarUrl}
                alt={displayName}
                fallback={getInitials(displayName)}
                size="sm"
              />
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-1)',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '120px',
                  }}
                >
                  {displayName}
                </p>
                <p
                  style={{
                    fontSize: '9px',
                    color: 'var(--brand)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: '2px 0 0 0',
                  }}
                >
                  SUPER ADMIN
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              style={{
                display: 'flex',
                height: '32px',
                width: '32px',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                color: 'var(--text-3)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-3)';
              }}
            >
              <LogOut style={{ height: '16px', width: '16px' }} />
            </button>
          </div>
        </div>
      </aside>

      {adminNavOpen && (
        <button
          type="button"
          className="admin-sidebar-backdrop"
          aria-label="Close admin navigation"
          onClick={() => setAdminNavOpen(false)}
        />
      )}

      {/* ── Main content wrapper ── */}
      <main
        className="admin-portal-main"
        style={{ flex: 1, overflowY: 'auto', padding: '32px', backgroundColor: 'var(--surface-2)' }}
      >
        <div className="admin-mobile-topbar">
          <button
            type="button"
            className="admin-menu-button"
            aria-label={adminNavOpen ? 'Close admin navigation' : 'Open admin navigation'}
            aria-expanded={adminNavOpen}
            aria-controls="admin-navigation"
            onClick={() => setAdminNavOpen((open) => !open)}
          >
            {adminNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <BrandMark size={26} />
          <span>
            JobIN <b>Admin</b>
          </span>
          <Avatar src={avatarUrl} alt={displayName} fallback={getInitials(displayName)} size="sm" />
        </div>
        <motion.div
          className="admin-page-content"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
