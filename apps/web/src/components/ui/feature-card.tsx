import React from 'react';
import { Card } from './card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  iconBgClass?: string;
  className?: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon: Icon,
  title,
  description,
  iconBgClass = 'bg-brand/10 text-brand border-brand/20',
  className,
}) => {
  return (
    <Card className={cn('flex flex-col gap-4 hover:-translate-y-1 duration-200', className)}>
      <div className={cn('inline-flex h-11 w-11 items-center justify-center rounded-[10px] border flex-shrink-0', iconBgClass)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-base font-bold text-text-1 mb-1">{title}</h3>
        <p className="text-sm text-text-2 leading-relaxed">{description}</p>
      </div>
    </Card>
  );
};
