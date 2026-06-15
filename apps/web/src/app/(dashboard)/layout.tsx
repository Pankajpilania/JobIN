'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { Topbar } from '@/components/layout/topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--surface)', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          height: '24px',
          width: '24px',
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
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--surface)', color: 'var(--text-1)' }}>
      {/* Sidebar nav */}
      <SidebarNav />

      {/* Topbar + Content area */}
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar />
        
        <main style={{ flex: 1, overflowY: 'auto', padding: '32px', backgroundColor: 'var(--surface-2)' }}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            style={{ height: '100%' }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
