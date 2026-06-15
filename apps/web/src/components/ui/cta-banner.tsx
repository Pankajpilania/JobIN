import React from 'react';
import { Card } from './card';
import { Button } from './button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

export interface CTABannerProps {
  title: string;
  description: string;
  buttonText: string;
  buttonHref: string;
  className?: string;
}

export const CTABanner: React.FC<CTABannerProps> = ({
  title,
  description,
  buttonText,
  buttonHref,
  className,
}) => {
  return (
    <Card
      className={cn(
        'relative overflow-hidden text-center py-12 px-6 md:px-12 flex flex-col items-center justify-center gap-6 border-brand border-2 dark:border-brand-mid shadow-lg shadow-brand/10',
        className
      )}
      hoverEffect={false}
    >
      {/* Glow backgrounds */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[500px] -z-10 rounded-full bg-brand-light/40 dark:bg-brand-dark/10 blur-3xl pointer-events-none" />

      <h2 className="text-3xl md:text-4xl font-extrabold text-text-1 max-w-xl leading-tight">
        {title}
      </h2>
      <p className="text-sm md:text-base text-text-2 max-w-md leading-relaxed">
        {description}
      </p>
      
      <Link href={buttonHref} passHref>
        <Button variant="hero" className="flex items-center gap-2">
          {buttonText} <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </Card>
  );
};
