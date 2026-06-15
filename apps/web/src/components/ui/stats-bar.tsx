import React from 'react';
import { Card } from './card';
import { cn } from '@/lib/utils';

export interface StatItem {
  value: string;
  label: string;
}

export interface StatsBarProps {
  items: StatItem[];
  className?: string;
}

export const StatsBar: React.FC<StatsBarProps> = ({ items, className }) => {
  return (
    <Card
      className={cn(
        'grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 divide-y md:divide-y-0 md:divide-x divide-border p-6 md:p-8',
        className
      )}
      hoverEffect={false}
    >
      {items.map((item, i) => (
        <div
          key={i}
          className={cn(
            'flex flex-col items-center justify-center text-center gap-1.5',
            i >= 2 ? 'pt-6 md:pt-0' : '', // Mobile top padding for items 3, 4
            i === 1 ? 'pt-6 md:pt-0 border-t md:border-t-0 border-border md:border-none' : '' // Mobile top padding for item 2
          )}
        >
          <span className="font-extrabold text-3xl md:text-4xl text-brand dark:text-brand-mid tracking-tight">
            {item.value}
          </span>
          <span className="text-xs text-text-3 font-semibold uppercase tracking-wider">
            {item.label}
          </span>
        </div>
      ))}
    </Card>
  );
};
