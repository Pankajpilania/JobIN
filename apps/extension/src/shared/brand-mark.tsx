export function BrandMark({ size = 28, color = '#008c60' }: { size?: number; color?: string }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path
        d="M13.5 13.5 20 7l6.5 6.5M20 12.5v10.25c0 6.5-3.6 10.25-9 10.25-4 0-6.75-2.1-8-5.2"
        stroke={color}
        strokeWidth="5.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandLogo({
  size = 28,
  textColor = 'currentColor',
}: {
  size?: number;
  textColor?: string;
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: Math.max(6, size * 0.22) }}>
      <BrandMark size={size} />
      <span
        style={{
          color: textColor,
          fontSize: size * 0.64,
          fontWeight: 800,
          letterSpacing: '-0.045em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        Job<span style={{ color: 'var(--primary)' }}>IN</span>
      </span>
    </span>
  );
}
