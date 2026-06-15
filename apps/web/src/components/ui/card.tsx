import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ style, hoverEffect = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          borderRadius: 'var(--radius)',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          padding: '24px',
          transition: 'var(--transition)',
          color: 'var(--text-1)',
          boxShadow: hoverEffect ? 'var(--shadow-sm)' : 'none',
          ...style
        }}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';
