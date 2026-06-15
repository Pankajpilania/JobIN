import React from 'react';
import { cn } from '@/lib/utils';

export interface SectionLayoutProps {
  eyebrow?: string;
  title: string; // supports HTML bold inside strong
  subtitle?: string;
  centered?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const SectionLayout: React.FC<SectionLayoutProps> = ({
  eyebrow,
  title,
  subtitle,
  centered = true,
  className,
  children,
}) => {
  return (
    <div className={cn('space-y-12', className)}>
      {/* Header section */}
      <div className={cn('flex flex-col gap-3', centered ? 'text-center items-center' : 'text-left items-start')}>
        {eyebrow && (
          <span className="text-[13px] font-bold text-brand dark:text-brand-mid uppercase tracking-[0.08em] leading-none select-none">
            {eyebrow}
          </span>
        )}
        <h2 
          className="text-3xl md:text-[38px] font-extrabold text-text-1 tracking-tight leading-tight"
          dangerouslySetInnerHTML={{ __html: title.replace(/<strong>(.*?)<\/strong>/g, `<strong class="text-brand dark:text-brand-mid font-extrabold">$1</strong>`) }}
        />
        {subtitle && (
          <p className="text-text-2 text-base max-w-[480px] leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {/* Content section */}
      {children && (
        <div className="w-full">
          {children}
        </div>
      )}
    </div>
  );
};
