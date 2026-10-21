import type { Metadata } from 'next'
import { Inter, Titillium_Web } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-inter',
})

const titillium = Titillium_Web({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-titillium',
})

export const metadata: Metadata = {
  title: 'JobIN — Apply Smarter. Get Hired Faster.',
  description: 'Find relevant roles, tailor your application, and keep your job search moving with JobIN.',
}

import { QueryProvider } from '@/components/providers/query-provider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${titillium.variable}`}>
      <body className={inter.className}>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
