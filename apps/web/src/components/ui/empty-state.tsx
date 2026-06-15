import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-lg bg-surface-2/40 py-16 gap-4',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand border border-brand/20">
        <Icon className="h-6 w-6" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-base font-bold text-text-1">{title}</h3>
        <p className="text-xs text-text-3 font-medium leading-relaxed">
          {description}
        </p>
      </div>
      {actionText && onAction && (
        <Button onClick={onAction} className="text-xs py-2 px-4 mt-2">
          {actionText}
        </Button>
      )}
    </div>
  );
};
// Default export for convenience if needed
export default EmptyState;
