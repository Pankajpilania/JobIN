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
  BarChart2,
  Users,
  CreditCard,
  DollarSign,
  Bot,
  AlertCircle,
  ChevronRight,
  Settings2,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { motion } from 'framer-motion';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: BarChart2 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/admin/billing', label: 'Billing', icon: DollarSign },
  { href: '/admin/payment-settings', label: 'Payment settings', icon: Settings2 },
  { href: '/admin/ai-settings', label: 'AI settings', icon: Bot },
  { href: '/admin/ai-usage', label: 'AI Usage', icon: Bot },
  { href: '/admin/tickets', label: 'Support', icon: AlertCircle },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isReady, isSignedIn, getToken, signOut, profile } = useAuth();
  const [adminVerified, setAdminVerified] = useState(false);
  const [adminError, setAdminError] = useState('');

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
        await apiClient.get<{ allowed: boolean }>('/admin/access', token);
        if (active) setAdminVerified(true);
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
            <div
              style={{
                display: 'flex',
                height: '32px',
                width: '32px',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                backgroundColor: 'var(--brand)',
                color: 'white',
                fontWeight: 900,
                fontSize: '18px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              J
            </div>
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
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/admin' && pathname.startsWith(href));
            return (
              <Link key={href} href={href} style={{ textDecoration: 'none' }}>
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
                    border: active ? '1px solid rgba(79, 70, 229, 0.2)' : '1px solid transparent',
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
                      style={{ height: '12px', width: '12px', color: 'rgba(79, 70, 229, 0.5)' }}
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
            backgroundColor: 'rgba(248, 249, 255, 0.3)',
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

      {/* ── Main content wrapper ── */}
      <main
        className="admin-portal-main"
        style={{ flex: 1, overflowY: 'auto', padding: '32px', backgroundColor: 'var(--surface-2)' }}
      >
        <motion.div
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
