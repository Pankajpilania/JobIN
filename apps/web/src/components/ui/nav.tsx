'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from './button';
import { ArrowRight } from 'lucide-react';

export const Nav: React.FC = () => {
  return (
    <nav className="sticky top-0 z-50 h-16 border-b border-border bg-surface/80 backdrop-blur-md flex items-center justify-between px-6 md:px-12 select-none">
      {/* Logo: 32px square brand bg + wordmark weight 800 */}
      <div className="flex items-center gap-2.5">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white font-black text-lg shadow-sm">
            J
          </div>
          <span className="font-extrabold text-xl tracking-tight text-text-1">
            JobIN
          </span>
        </Link>
      </div>

      {/* Nav Links */}
      <div className="hidden md:flex items-center gap-1.5">
        <a href="#features" className="text-sm font-semibold text-text-2 hover:text-text-1 hover:bg-surface-2 px-3 py-2 rounded-md transition-colors">
          Features
        </a>
        <a href="#how-it-works" className="text-sm font-semibold text-text-2 hover:text-text-1 hover:bg-surface-2 px-3 py-2 rounded-md transition-colors">
          How it Works
        </a>
        <a href="#pricing" className="text-sm font-semibold text-text-2 hover:text-text-1 hover:bg-surface-2 px-3 py-2 rounded-md transition-colors">
          Pricing
        </a>
      </div>

      {/* Auth Action Buttons */}
      <div className="flex items-center gap-3">
        <Link href="/sign-in" className="text-sm font-semibold text-text-2 hover:text-text-1 px-3.5 py-2 transition-colors">
          Sign In
        </Link>
        <Link href="/sign-up" passHref>
          <Button variant="primary" className="text-xs py-2 px-4 flex items-center gap-1">
            Get Started Free <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </nav>
  );
};
export default Nav;
