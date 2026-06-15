import React from 'react';
import { Card } from './card';
import { cn } from '@/lib/utils';

export interface StepCardProps {
  number: string;
  title: string;
  description: string;
  className?: string;
}

export const StepCard: React.FC<StepCardProps> = ({
  number,
  title,
  description,
  className,
}) => {
  return (
    <Card className={cn('relative overflow-hidden flex flex-col gap-3', className)}>
      <span className="font-mono text-5xl font-black text-brand-light dark:text-brand-dark/20 select-none">
        {number}
      </span>
      <div>
        <h3 className="text-base font-bold text-text-1 mb-1">{title}</h3>
        <p className="text-sm text-text-2 leading-relaxed">{description}</p>
      </div>
    </Card>
  );
};
