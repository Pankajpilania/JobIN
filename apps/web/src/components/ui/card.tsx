import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, style, hoverEffect = true, ...props }, ref) => {
    const surfaceColor =
      style?.backgroundColor === undefined || style.backgroundColor === 'var(--surface)'
        ? 'rgba(255, 255, 255, 0.78)'
        : style.backgroundColor;

    return (
      <div
        ref={ref}
        className={`app-glass-card${hoverEffect ? ' app-glass-card-interactive' : ''}${className ? ` ${className}` : ''}`}
        style={{
          borderRadius: 'var(--radius)',
          border: '1px solid rgba(255, 255, 255, 0.82)',
          padding: '24px',
          transition: 'var(--transition)',
          color: 'var(--text-1)',
          boxShadow: hoverEffect ? 'var(--shadow-sm)' : 'none',
          ...style,
          backgroundColor: surfaceColor,
          backdropFilter: 'blur(18px) saturate(1.24)',
          WebkitBackdropFilter: 'blur(18px) saturate(1.24)',
        }}
        {...props}
      />
    );
  },
);

Card.displayName = 'Card';
