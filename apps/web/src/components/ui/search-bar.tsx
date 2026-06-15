import React from 'react';
import { Search } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (val: string) => void;
  // Select configs for filtering
  filterOptions?: {
    name: string;
    value: string;
    options: { label: string; value: string }[];
    onChange: (val: string) => void;
  }[];
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search jobs...',
  value,
  onChange,
  filterOptions = [],
  onSubmit,
  className,
}) => {
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) onSubmit(e);
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      className={cn(
        'w-full flex flex-col md:flex-row items-stretch md:items-center bg-surface border-[1.5px] border-border rounded-lg p-2 gap-2 md:gap-3 shadow-[0_4px_24px_rgba(79,70,229,0.08)] hover:border-brand-mid focus-within:border-brand transition-all duration-200',
        className
      )}
    >
      {/* Input container */}
      <div className="flex items-center gap-2 flex-1 px-2 py-1">
        <Search className="h-5 w-5 text-text-3 flex-shrink-0" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full bg-transparent border-0 outline-none text-sm text-text-1 placeholder:text-text-3"
        />
      </div>

      {/* Filters & Submit button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3 flex-shrink-0">
        {filterOptions.map((filter, i) => (
          <React.Fragment key={filter.name}>
            {/* Divider (only visible on large screens) */}
            <div className="hidden sm:block h-6 w-[1.5px] bg-border/80 self-center" />
            <select
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className="bg-transparent border border-border sm:border-0 rounded-md sm:rounded-none px-3 py-2 sm:py-0 text-xs text-text-2 font-medium focus:outline-none cursor-pointer"
            >
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-surface text-text-1">
                  {opt.label}
                </option>
              ))}
            </select>
          </React.Fragment>
        ))}

        <Button type="submit" className="text-xs px-5 py-2.5">
          Search
        </Button>
      </div>
    </form>
  );
};
