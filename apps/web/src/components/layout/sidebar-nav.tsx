'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  MessageSquare,
  Settings,
  Wand2,
  Pen,
  CreditCard,
  LogOut,
  ChevronRight,
  X,
  LifeBuoy,
  Download,
  Search,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useCurrentUser } from '@/hooks/use-user';
import { useSessionProfile } from '@/hooks/use-session-profile';
import { Avatar } from '../ui/avatar';
import { toast } from 'sonner';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/resumes', label: 'Resumes', icon: FileText },
  { href: '/tailor', label: 'AI Tailor', icon: Wand2, badge: 'AI' },
  { href: '/cover-letter', label: 'Cover Letter', icon: Pen, badge: 'AI' },
  { href: '/job-search', label: 'Job Search', icon: Search },
  { href: '/tracker', label: 'Job Tracker', icon: Briefcase },
  { href: '/interview', label: 'AI Copilot', icon: MessageSquare, badge: 'BETA' },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/upgrade', label: 'Upgrade plan', icon: CreditCard },
  { href: '/support', label: 'Support', icon: LifeBuoy },
  { href: '/extension', label: 'Chrome extension', icon: Download },
];

interface SidebarNavProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ isMobileOpen, onMobileClose }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const { data: user } = useCurrentUser();
  const sessionProfile = useSessionProfile();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not sign out.');
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <aside
      className={`dashboard-sidebar${isMobileOpen ? ' is-open' : ''}`}
      aria-label="Main navigation"
      aria-hidden={!isMobileOpen && undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '256px',
        borderRight: '1px solid var(--border)',
        backgroundColor: 'var(--surface)',
        color: 'var(--text-1)',
        flexShrink: 0,
      }}
    >
      {/* Logo: 32px square brand bg + wordmark weight 800 */}
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
          href="/dashboard"
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
          <span
            style={{
              fontWeight: 800,
              fontSize: '20px',
              letterSpacing: '-0.5px',
              color: 'var(--text-1)',
            }}
          >
            JobIN
          </span>
        </Link>
        <button
          type="button"
          className="dashboard-sidebar-close"
          aria-label="Close navigation menu"
          onClick={onMobileClose}
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav items */}
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
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link key={href} href={href} onClick={onMobileClose} style={{ textDecoration: 'none' }}>
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
                {badge && (
                  <span
                    style={{
                      borderRadius: '999px',
                      backgroundColor: 'rgba(79, 70, 229, 0.1)',
                      padding: '2px 6px',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'var(--brand)',
                    }}
                  >
                    {badge}
                  </span>
                )}
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

      {/* User Info & Log Out */}
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
          <Link
            href="/settings"
            onClick={onMobileClose}
            aria-label="Open profile settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              minWidth: 0,
              flex: 1,
              textDecoration: 'none',
            }}
          >
            <Avatar
              src={user?.avatarUrl || sessionProfile.avatarUrl}
              alt={user?.fullName || sessionProfile.fullName || 'User'}
              fallback={getInitials(user?.fullName || sessionProfile.fullName)}
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
                {user?.fullName || sessionProfile.fullName || 'User'}
              </p>
              <p
                style={{
                  fontSize: '10px',
                  color: 'var(--text-3)',
                  fontWeight: 600,
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '120px',
                }}
              >
                {user?.email || sessionProfile.email}
              </p>
            </div>
          </Link>
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
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
            marginTop: 12,
            fontSize: 11,
          }}
        >
          <Link href="/about" onClick={onMobileClose} style={{ color: 'var(--text-3)' }}>
            About
          </Link>
          <Link href="/contact" onClick={onMobileClose} style={{ color: 'var(--text-3)' }}>
            Contact
          </Link>
        </div>
      </div>
    </aside>
  );
};

export default SidebarNav;
