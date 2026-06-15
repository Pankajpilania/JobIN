import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'success' | 'neutral';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ style, variant = 'neutral', ...props }, ref) => {
    const isBrand = variant === 'brand';
    const isSuccess = variant === 'success';
    
    return (
      <span
        ref={ref}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          borderRadius: '999px',
          padding: '2px 10px',
          fontSize: '11px',
          fontWeight: 600,
          border: '1px solid',
          transition: 'var(--transition)',
          backgroundColor: isSuccess ? '#F0FDF4' : isBrand ? 'var(--brand-light)' : 'var(--surface-2)',
          color: isSuccess ? '#16A34A' : isBrand ? 'var(--brand)' : 'var(--text-2)',
          borderColor: isSuccess ? '#BBF7D0' : isBrand ? '#C7D2FE' : 'var(--border)',
          ...style
        }}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';
