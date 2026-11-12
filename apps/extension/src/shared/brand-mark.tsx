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
