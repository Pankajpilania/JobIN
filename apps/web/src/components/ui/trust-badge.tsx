import React from 'react';
import { cn } from '@/lib/utils';

export interface TrustBadgeProps {
  label: string;
  className?: string;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({ label, className }) => {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-light/40 dark:bg-brand-dark/15 px-3 py-1 text-[11px] font-semibold tracking-wide text-brand-dark dark:text-brand-light uppercase',
        className
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand"></span>
      </span>
      {label}
    </div>
  );
};
