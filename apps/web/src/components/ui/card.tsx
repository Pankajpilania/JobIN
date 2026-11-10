import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, style, hoverEffect = true, ...props }, ref) => {
    const surfaceColor =
      style?.backgroundColor === undefined || style.backgroundColor === 'var(--surface)'
        ? 'var(--surface)'
        : style.backgroundColor;

    return (
      <div
        ref={ref}
        className={`app-glass-card${hoverEffect ? ' app-glass-card-interactive' : ''}${className ? ` ${className}` : ''}`}
        style={{
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          padding: '24px',
          transition: 'var(--transition)',
          color: 'var(--text-1)',
          boxShadow: 'none',
          ...style,
          backgroundColor: surfaceColor,
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
        }}
        {...props}
      />
    );
  },
);

Card.displayName = 'Card';
