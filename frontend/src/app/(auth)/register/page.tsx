'use client'

import { SignUp } from '@clerk/nextjs'
import { motion } from 'framer-motion'
import { Sparkles, Target, BarChart3, TrendingUp, Zap } from 'lucide-react'
import { Logo } from '@/components/shared/logo'
import Link from 'next/link'

const perks = [
  { icon: Sparkles, title: 'Free forever plan', text: 'Start with 5 free AI tailors per month, no card needed.' },
  { icon: Target, title: 'ATS score in seconds', text: 'Know exactly how your resume ranks before you apply.' },
  { icon: BarChart3, title: 'Full application tracker', text: 'Manage every application, stage, and note in one place.' },
  { icon: Zap, title: 'Instant onboarding', text: 'Upload your resume and start applying in under 2 minutes.' },
]

export default function RegisterPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left panel */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-blue-500/10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(263,70%,50%) 1px, transparent 1px), linear-gradient(90deg, hsl(263,70%,50%) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10">
          <Logo size="lg" />
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-md">
          <h2 className="text-4xl font-outfit font-bold mb-4 leading-tight">
            Start applying{' '}
            <span className="gradient-text-indigo">smarter today</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
            Create your free account and transform your job search in minutes.
          </p>

          <div className="grid grid-cols-1 gap-4">
            {perks.map((perk, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                className="flex items-start gap-4 glass-card p-4 rounded-xl"
              >
                <div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <perk.icon className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold mb-0.5">{perk.title}</p>
                  <p className="text-xs text-muted-foreground">{perk.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 glass-card p-4 rounded-xl">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">400+ new users</strong> joined this week
            </p>
          </div>
        </div>
      </motion.div>

      {/* Right panel - Clerk SignUp */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center justify-center p-8 relative"
      >
        <div className="absolute inset-0 mesh-gradient opacity-30" />
        <div className="relative z-10 w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <Logo size="lg" />
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h1 className="text-3xl font-outfit font-bold mb-2">Create your account</h1>
            <p className="text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
                Sign in
              </Link>
            </p>
          </div>

          <SignUp
            appearance={{
              variables: {
                colorPrimary: 'hsl(217, 91%, 60%)',
                colorBackground: 'hsl(224, 20%, 8%)',
                colorText: 'hsl(210, 40%, 98%)',
                colorTextSecondary: 'hsl(215, 20%, 55%)',
                colorInputBackground: 'hsl(224, 15%, 14%)',
                colorInputText: 'hsl(210, 40%, 98%)',
                borderRadius: '0.75rem',
                fontFamily: 'Inter, sans-serif',
              },
              elements: {
                card: 'bg-transparent shadow-none',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                socialButtonsBlockButton:
                  'bg-white/5 border border-white/10 text-foreground hover:bg-white/10 transition-all',
                formButtonPrimary:
                  'bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 transition-opacity',
                formFieldInput:
                  'bg-white/5 border-white/10 text-foreground focus:border-blue-500',
                footerAction: 'hidden',
                dividerLine: 'bg-white/10',
                dividerText: 'text-muted-foreground',
              },
            }}
            redirectUrl="/onboarding"
          />
        </div>
      </motion.div>
    </div>
  )
}
