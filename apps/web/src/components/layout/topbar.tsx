'use client';

import React from 'react';
import { Search, Bell, Zap } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-user';
import { Avatar } from '../ui/avatar';

export const Topbar: React.FC = () => {
  const { data: user } = useCurrentUser();

  // Deduct used credits from total, default to 50
  const remainingCredits = user?.aiCredits
    ? Math.max(0, user.aiCredits.totalCredits - user.aiCredits.usedCredits)
    : 50;

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
    <header style={{
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
      {/* Topbar Search */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '6px 12px',
        width: '256px',
        maxWidth: '100%'
      }}>
        <Search style={{ height: '16px', width: '16px', color: 'var(--text-3)' }} />
        <input
          type="text"
          placeholder="Quick search..."
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

      {/* Right controls: credits, notification bell, user avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Credits */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          borderRadius: '999px',
          border: '1px solid rgba(79, 70, 229, 0.2)',
          backgroundColor: 'var(--brand-light)',
          padding: '6px 12px',
          userSelect: 'none'
        }}>
          <Zap style={{ height: '14px', width: '14px', color: 'var(--brand)' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand)' }}>
            {remainingCredits} Credits
          </span>
        </div>

        {/* Notification Bell */}
        <button
          style={{
            position: 'relative',
            padding: '8px',
            color: 'var(--text-3)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '50%',
            transition: 'var(--transition)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Notifications"
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--surface-2)';
            e.currentTarget.style.color = 'var(--text-1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-3)';
          }}
        >
          <Bell style={{ height: '16px', width: '16px' }} />
          <span style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            height: '8px',
            width: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--brand)'
          }} />
        </button>

        {/* User Avatar */}
        <Avatar
          src={user?.avatarUrl}
          alt={user?.fullName || 'User'}
          fallback={getInitials(user?.fullName)}
          size="sm"
        />
      </div>
    </header>
  );
};

export default Topbar;
