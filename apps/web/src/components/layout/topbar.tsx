'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu, Search } from 'lucide-react';
import { useSessionProfile } from '@/hooks/use-session-profile';
import { Avatar } from '../ui/avatar';

const searchItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Resumes', href: '/resumes' },
  { label: 'AI Tailor', href: '/tailor' },
  { label: 'Cover Letter', href: '/cover-letter' },
  { label: 'Job Tracker', href: '/tracker' },
  { label: 'AI Copilot', href: '/interview' },
  { label: 'Settings', href: '/settings' },
];

interface TopbarProps {
  isMobileNavOpen: boolean;
  onMobileMenuClick: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ isMobileNavOpen, onMobileMenuClick }) => {
  const router = useRouter();
  const sessionProfile = useSessionProfile();
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const searchResults = searchItems.filter((item) =>
    item.label.toLowerCase().includes(search.trim().toLowerCase())
  );

  const navigateToSearchResult = (href: string) => {
    setSearch('');
    setSearchOpen(false);
    router.push(href);
  };

  return (
    <header className="dashboard-topbar" style={{
      position: 'sticky',
      top: 0,
      zIndex: 40,
      display: 'flex',
      height: '64px',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      borderBottom: '1px solid var(--border)',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(8px)',
      padding: '0 24px'
    }}>
      <button
        type="button"
        className="dashboard-menu-button"
        aria-label="Open navigation menu"
        aria-expanded={isMobileNavOpen}
        onClick={onMobileMenuClick}
      >
        <Menu size={21} />
      </button>
      {/* Topbar Search */}
      <div className="dashboard-search" style={{ position: 'relative', width: '256px', maxWidth: '100%' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '6px 12px',
        }}>
          <Search style={{ height: '16px', width: '16px', color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            type="search"
            placeholder="Search pages..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setSearchOpen(false);
              } else if (event.key === 'Enter' && searchResults[0]) {
                event.preventDefault();
                navigateToSearchResult(searchResults[0].href);
              }
            }}
            aria-label="Search dashboard pages"
            style={{
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '13px',
            color: 'var(--text-1)',
            width: '100%'
            }}
          />
        </div>
        {searchOpen && searchResults.length > 0 && (
          <nav
            id="dashboard-search-results"
            aria-label="Dashboard pages"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              zIndex: 50,
              padding: '4px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              backgroundColor: 'var(--surface)',
              boxShadow: 'var(--shadow-card)',
              maxHeight: '320px',
              overflowY: 'auto',
            }}
          >
            {searchResults.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  setSearch('');
                  setSearchOpen(false);
                }}
                style={{
                  display: 'block',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  color: 'var(--text-1)',
                  fontSize: '13px',
                  textDecoration: 'none',
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {/* User avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link
          href="/settings"
          aria-label="Open profile settings"
          title="Profile settings"
          style={{ display: 'inline-flex', borderRadius: '999px', outlineOffset: '3px' }}
        >
          <Avatar
            src={sessionProfile.avatarUrl}
            alt={sessionProfile.fullName || 'User'}
            fallback={getInitials(sessionProfile.fullName)}
            size="sm"
          />
        </Link>
      </div>
    </header>
  );
};

export default Topbar;
