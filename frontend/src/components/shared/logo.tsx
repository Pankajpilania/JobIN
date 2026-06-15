import Link from 'next/link'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'default' | 'lg'
  className?: string
  href?: string
}

export function Logo({ size = 'default', className, href = '/' }: LogoProps) {
  const sizes = {
    sm: { icon: 'w-6 h-6 text-xs', text: 'text-base' },
    default: { icon: 'w-8 h-8 text-sm', text: 'text-xl' },
    lg: { icon: 'w-10 h-10 text-base', text: 'text-2xl' },
  }

  const s = sizes[size]

  return (
    <Link href={href} className={cn('flex items-center gap-2.5 group', className)}>
      <div
        className={cn(
          'rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-glow_blue group-hover:scale-105 transition-transform duration-200',
          s.icon
        )}
      >
        <span className="text-white font-outfit font-bold">J</span>
      </div>
      <span className={cn('font-outfit font-bold gradient-text', s.text)}>
        JobIN
      </span>
    </Link>
  )
}
