import React from 'react';
import { Card } from './card';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  company: string;
  avatarUrl?: string;
  rating?: number;
  className?: string;
}

export const TestimonialCard: React.FC<TestimonialCardProps> = ({
  quote,
  author,
  role,
  company,
  avatarUrl,
  rating = 5,
  className,
}) => {
  const initial = author.charAt(0).toUpperCase();

  return (
    <Card className={cn('flex flex-col justify-between gap-5', className)}>
      <div className="space-y-3">
        <div className="flex gap-0.5 text-amber-500">
          {Array.from({ length: rating }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-current" />
          ))}
        </div>
        <p className="text-sm text-text-2 italic leading-relaxed">
          &ldquo;{quote}&rdquo;
        </p>
      </div>
      
      <div className="flex items-center gap-3 pt-2 border-t border-border/50">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={author}
            className="h-10 w-10 rounded-full object-cover border border-border"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-brand/10 border border-brand/20 text-brand font-bold text-sm flex items-center justify-center flex-shrink-0">
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-bold text-text-1 truncate">{author}</p>
          <p className="text-xs text-text-3 truncate font-medium">
            {role} @ {company}
          </p>
        </div>
      </div>
    </Card>
  );
};
