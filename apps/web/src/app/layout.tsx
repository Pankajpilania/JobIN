import type { Metadata } from 'next';
import { Inter, Titillium_Web } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-inter',
});

const titillium = Titillium_Web({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-titillium',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.jobin.today'),
  title: 'JobIN — Apply Smarter. Get Hired Faster.',
  description:
    'Find relevant roles, tailor your application, and keep your job search moving with JobIN.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/icon.svg',
  },
  alternates: {
    canonical: '/',
  },
};

import { QueryProvider } from '@/components/providers/query-provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${titillium.variable}`}>
      <body className={inter.className}>
        <QueryProvider>
          {children}
          <Toaster position="top-right" richColors />
        </QueryProvider>
      </body>
    </html>
  );
}
