import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#4F46E5',
          dark: '#3730A3',
          light: '#EEF2FF',
          mid: '#818CF8',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          2: '#F8F9FF',
          3: '#F1F0FF',
        },
        tx: {
          1: '#0F0E1A',
          2: '#4B4B6A',
          3: '#9494B0',
        },
        bdr: '#E4E4F0',
      },
      borderRadius: {
        DEFAULT: '14px',
        sm: '8px',
        pill: '999px',
        md: '10px',
        lg: '14px',
        xl: '20px',
      },
      boxShadow: {
        card: '0 4px 24px rgba(79,70,229,.08)',
        sm: '0 2px 16px rgba(79,70,229,.06)',
        hover: '0 8px 32px rgba(79,70,229,.12)',
      },
    },
  },
  plugins: [],
}

export default config
