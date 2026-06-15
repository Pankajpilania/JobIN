import React from 'react';
import Image from 'next/image';

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'User',
  fallback = 'U',
  size = 'md',
  _className,
}) => {
  const sizePixels = {
    sm: 32,
    md: 40,
    lg: 48,
  };
  const sizePx = sizePixels[size];

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        overflow: 'hidden',
        backgroundColor: 'var(--brand-light)',
        color: 'var(--brand)',
        fontWeight: 700,
        userSelect: 'none',
        border: '1px solid var(--border)',
        flexShrink: 0,
        width: `${sizePx}px`,
        height: `${sizePx}px`,
        fontSize: size === 'sm' ? '12px' : size === 'md' ? '14px' : '16px',
      }}
    >
      {src ? (
        <Image src={src} alt={alt} width={36} height={36} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span>{fallback}</span>
      )}
    </div>
  );
};
