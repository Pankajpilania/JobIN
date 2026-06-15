import React from 'react';
import { Badge } from './badge';
import { cn } from '@/lib/utils';

export interface ScorePillProps {
  score: number;
  className?: string;
}

export const ScorePill: React.FC<ScorePillProps> = ({ score, className }) => {
  const getVariant = () => {
    if (score >= 95) return 'success';
    if (score >= 75) return 'brand';
    return 'neutral';
  };

  return (
    <Badge
      variant={getVariant()}
      className={cn('font-mono font-bold tracking-tight text-xs px-2.5 py-0.5', className)}
    >
      {score}% Match
    </Badge>
  );
};
