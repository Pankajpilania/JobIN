import React from 'react';
import { Card } from './card';
import { Button } from './button';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export interface PricingPlanProps {
  name: string;
  price: string;
  period?: string;
  popular?: boolean;
  features: string[];
  buttonText: string;
  buttonHref: string;
  onSelect?: () => void;
  className?: string;
}

export const PricingCard: React.FC<PricingPlanProps> = ({
  name,
  price,
  period = '/mo',
  popular = false,
  features,
  buttonText,
  buttonHref,
  onSelect,
  className,
}) => {
  return (
    <Card
      className={cn(
        'relative flex flex-col gap-6 p-8 transition-all duration-300 bg-surface border border-border h-full',
        popular ? 'border-brand border-2 dark:border-brand-mid shadow-lg shadow-brand/10 md:scale-105' : '',
        className
      )}
      hoverEffect={!popular}
    >
      {popular && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-brand text-white text-[11px] font-bold uppercase tracking-wider px-3.5 py-1 shadow-sm">
          Most Popular
        </span>
      )}

      {/* Plan Header */}
      <div className="space-y-2.5">
        <h3 className="text-[13px] font-bold text-text-3 uppercase tracking-wider leading-none">
          {name}
        </h3>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black text-text-1 tracking-tight select-none">
            {price}
          </span>
          {period && (
            <span className="text-sm font-semibold text-text-3">{period}</span>
          )}
        </div>
      </div>

      <hr className="border-border/60" />

      {/* Feature List */}
      <ul className="flex-1 space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-text-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5">
              <Check className="h-3.5 w-3.5" />
            </span>
            <span className="leading-snug">{feature}</span>
          </li>
        ))}
      </ul>

      {/* Button */}
      <div className="pt-2">
        <Link href={buttonHref} passHref>
          <Button
            variant={popular ? 'primary' : 'ghost'}
            className="w-full text-sm font-semibold"
            onClick={onSelect}
          >
            {buttonText}
          </Button>
        </Link>
      </div>
    </Card>
  );
};
