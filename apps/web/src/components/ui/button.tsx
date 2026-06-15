import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'hero';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ style, variant = 'primary', ...props }, ref) => {
    const isHero = variant === 'hero';
    const isGhost = variant === 'ghost';
    
    return (
      <button
        ref={ref}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          whiteSpace: 'nowrap',
          borderRadius: '8px',
          fontSize: isHero ? '16px' : '14px',
          fontWeight: isHero ? 700 : 600,
          padding: isHero ? '14px 28px' : '10px 20px',
          transition: 'var(--transition)',
          cursor: 'pointer',
          border: isGhost ? '1px solid var(--border)' : 'none',
          backgroundColor: isGhost ? 'transparent' : 'var(--brand)',
          color: isGhost ? 'var(--text-2)' : 'white',
          boxShadow: isGhost ? 'none' : 'var(--shadow-sm)',
          ...style
        }}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
