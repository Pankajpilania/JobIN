import React from 'react';
import { Card } from './card';
import { ScorePill } from './score-pill';
import { Button } from './button';
import { Badge } from './badge';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';

export interface JobCardProps {
  title: string;
  companyName: string;
  logoUrl?: string;
  tags?: string[];
  matchScore: number;
  postedTime?: string;
  onApply?: () => void;
  applyText?: string;
  className?: string;
}

export const JobCard: React.FC<JobCardProps> = ({
  title,
  companyName,
  logoUrl,
  tags = [],
  matchScore,
  postedTime,
  onApply,
  applyText = 'Apply Now',
  className,
}) => {
  const initial = companyName.charAt(0).toUpperCase();

  return (
    <Card
      className={cn(
        'flex flex-col md:flex-row md:items-center justify-between gap-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-200',
        className
      )}
    >
      {/* Left section: Logo + Details */}
      <div className="flex items-start gap-4 flex-1 min-w-0">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`${companyName} logo`}
            className="h-11 w-11 rounded-[10px] object-cover bg-surface-2 border border-border flex-shrink-0"
          />
        ) : (
          <div className="h-11 w-11 rounded-[10px] bg-brand/10 border border-brand/20 text-brand font-bold text-lg flex items-center justify-center flex-shrink-0">
            {initial}
          </div>
        )}
        <div className="space-y-1.5 min-w-0">
          <h3 className="font-bold text-text-1 truncate leading-snug">{title}</h3>
          <p className="text-sm text-text-2 font-medium">{companyName}</p>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map((tag) => (
                <Badge key={tag} variant="neutral" className="text-[11px] py-0 px-2">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right section: Match pill + Apply + Posted Time */}
      <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 flex-shrink-0 border-t md:border-t-0 border-border pt-4 md:pt-0">
        <div className="flex items-center gap-3">
          <ScorePill score={matchScore} />
          {postedTime && (
            <span className="flex items-center gap-1 text-[11px] text-text-3 font-medium md:hidden">
              <Calendar className="h-3 w-3" />
              {postedTime}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {postedTime && (
            <span className="hidden md:flex items-center gap-1 text-[11px] text-text-3 font-medium">
              <Calendar className="h-3.5 w-3.5" />
              {postedTime}
            </span>
          )}
          <Button onClick={onApply} className="text-xs py-2 px-4">
            {applyText}
          </Button>
        </div>
      </div>
    </Card>
  );
};
