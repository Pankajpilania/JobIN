'use client'

import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  BarChart3,
  Target,
  Chrome,
  MessageSquare,
  Zap,
  ArrowRight,
  CheckCircle2,
  Star,
  TrendingUp,
  Users,
  Briefcase,
  ChevronRight,
} from 'lucide-react'
import { Logo } from '@/components/shared/logo'

/* ─────────────── Animation variants ─────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
}

const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5 } },
}

/* ─────────────── Data ─────────────── */
const stats = [
  { value: '1M+', label: 'Applications Sent', icon: Briefcase },
  { value: '94%', label: 'ATS Score Average', icon: Target },
  { value: '3×', label: 'More Interviews', icon: TrendingUp },
  { value: '400K+', label: 'Jobs Daily', icon: Zap },
]

const features = [
  {
    icon: Sparkles,
    title: 'AI Resume Tailor',
    description: 'Instantly customise your resume for any job description. Our AI analyses requirements and rewrites your bullet points to maximise match score.',
    color: 'from-blue-500 to-cyan-500',
    glow: 'group-hover:shadow-glow_blue',
  },
  {
    icon: Target,
    title: 'ATS Optimizer',
    description: 'Beat the bots. Real-time ATS scoring shows exactly which keywords are missing and how to get past automated screening systems.',
    color: 'from-indigo-500 to-purple-500',
    glow: 'group-hover:shadow-glow_indigo',
  },
  {
    icon: BarChart3,
    title: 'Job Tracker',
    description: 'Keep every application organised in one place. Track status, set reminders, and never lose track of an opportunity again.',
    color: 'from-emerald-500 to-teal-500',
    glow: 'group-hover:shadow-glow_emerald',
  },
  {
    icon: Chrome,
    title: 'Chrome Extension',
    description: 'Apply to jobs on LinkedIn, Indeed, and more without leaving the page. One-click application with your AI-tailored resume.',
    color: 'from-orange-500 to-amber-500',
    glow: 'group-hover:shadow-[0_0_30px_hsl(38,92%,50%,0.35)]',
  },
  {
    icon: MessageSquare,
    title: 'AI Interview Coach',
    description: 'Practice with AI-generated interview questions specific to your target role. Get instant feedback and model answers.',
    color: 'from-pink-500 to-rose-500',
    glow: 'group-hover:shadow-[0_0_30px_hsl(330,80%,60%,0.35)]',
  },
  {
    icon: Zap,
    title: 'Smart Job Feed',
    description: 'Personalised job recommendations powered by your profile, skills, and past applications. Find the right jobs faster.',
    color: 'from-violet-500 to-indigo-500',
    glow: 'group-hover:shadow-glow_indigo',
  },
]

const plans = [
  {
    name: 'Free',
    price: '£0',
    period: '/month',
    description: 'Perfect for getting started',
    features: [
      '5 AI resume tailors/month',
      'Basic ATS scoring',
      'Job tracker (10 applications)',
      'Email support',
    ],
    cta: 'Get Started Free',
    highlight: false,
    ctaVariant: 'outline',
  },
  {
    name: 'Premium',
    price: '£15',
    period: '/month',
    description: 'For serious job seekers',
    features: [
      '50 AI resume tailors/month',
      'Advanced ATS optimizer',
      'Unlimited job tracking',
      'Chrome extension',
      'AI interview coach (10 sessions)',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    highlight: true,
    badge: 'Most Popular',
    ctaVariant: 'default',
  },
  {
    name: 'Pro',
    price: '£29',
    period: '/month',
    description: 'For power users & recruiters',
    features: [
      'Unlimited AI tailoring',
      'Full ATS suite + analytics',
      'Unlimited everything',
      'Chrome extension',
      'Unlimited interview coaching',
      'Smart job feed',
      'Dedicated account manager',
    ],
    cta: 'Go Pro',
    highlight: false,
    ctaVariant: 'outline',
  },
]

/* ─────────────── Sub-components ─────────────── */
function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 glass-nav"
    >
      <div className="container mx-auto flex items-center justify-between h-16 px-6">
        <Logo />
        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
          <Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          <Link href="#" className="hover:text-foreground transition-colors">Blog</Link>
          <Link href="#" className="hover:text-foreground transition-colors">Docs</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity glow-blue btn-glow"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </motion.nav>
  )
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden hero-bg">
      {/* Background orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(hsl(217,91%,60%) 1px, transparent 1px), linear-gradient(90deg, hsl(217,91%,60%) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="text-center max-w-5xl mx-auto"
        >
          {/* Badge */}
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full text-sm mb-8">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-muted-foreground">Powered by GPT-4o &</span>
            <span className="gradient-text font-semibold">Advanced AI</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className="font-outfit text-6xl sm:text-7xl lg:text-8xl font-bold leading-[1.05] mb-6"
          >
            Apply Smarter.{' '}
            <span className="block">
              <span className="gradient-text">Get Hired Faster.</span>
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            variants={fadeUp}
            className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            JobIN uses AI to tailor your resume for every job, beat ATS systems, and track all your applications — so you can focus on landing the role, not the paperwork.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/register"
              className="group flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:opacity-90 transition-all duration-300 glow-blue hover:scale-105"
            >
              Start For Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#features"
              className="flex items-center gap-2 glass-card px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all duration-300"
            >
              See How It Works
              <ChevronRight className="w-5 h-5" />
            </Link>
          </motion.div>

          {/* Social proof */}
          <motion.div variants={fadeUp} className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-background bg-gradient-to-br from-blue-500 to-indigo-600"
                  style={{ backgroundImage: `linear-gradient(${i * 45}deg, hsl(217,91%,60%), hsl(263,70%,50%))` }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1 ml-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span>Loved by <strong className="text-foreground">12,000+</strong> job seekers</span>
          </motion.div>
        </motion.div>

        {/* Dashboard preview mockup */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-20 max-w-5xl mx-auto"
        >
          <div className="glass-card p-2 rounded-2xl glow-blue">
            <div className="glass-card rounded-xl overflow-hidden">
              {/* Mock browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                </div>
                <div className="flex-1 glass-card rounded-md py-1 px-3 text-xs text-muted-foreground text-center">
                  app.jobin.io/dashboard
                </div>
              </div>

              {/* Mock dashboard content */}
              <div className="p-6 bg-gradient-to-br from-slate-900/50 to-slate-800/20 grid grid-cols-12 gap-4 min-h-[300px]">
                {/* Sidebar mock */}
                <div className="col-span-2 flex flex-col gap-3">
                  {['Dashboard', 'Resumes', 'Tracker', 'AI Coach'].map((item, i) => (
                    <div
                      key={item}
                      className={`h-8 rounded-lg flex items-center px-3 text-xs ${i === 0 ? 'bg-blue-500/20 text-blue-400' : 'text-muted-foreground'}`}
                    >
                      {item}
                    </div>
                  ))}
                </div>

                {/* Main content mock */}
                <div className="col-span-10 flex flex-col gap-4">
                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-3">
                    {['12 Applications', '87% ATS Score', '3 Interviews', '150 Credits'].map((s, i) => (
                      <div key={s} className="glass-card p-3 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">{s.split(' ').slice(1).join(' ')}</div>
                        <div className={`text-lg font-bold font-outfit ${i === 1 ? 'text-emerald-400' : i === 0 ? 'text-blue-400' : 'text-foreground'}`}>
                          {s.split(' ')[0]}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Applications table mock */}
                  <div className="glass-card rounded-lg overflow-hidden">
                    <div className="px-4 py-2 border-b border-white/5 text-xs font-semibold text-muted-foreground">Recent Applications</div>
                    {['Google · SWE · Interview', 'Stripe · Backend · Applied', 'Figma · Design · Offer'].map((row, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2 border-b border-white/5 last:border-0">
                        <span className="text-xs text-foreground">{row.split('·')[0]}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          row.includes('Interview') ? 'badge-interview' :
                          row.includes('Applied') ? 'badge-applied' :
                          'badge-offer'
                        }`}>
                          {row.split('·')[2].trim()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function StatsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="py-20 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-blue-500/5" />
      <div className="container mx-auto px-6">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate={isInView ? 'show' : 'hidden'}
          className="grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              className="glass-card p-6 rounded-xl text-center group hover:border-blue-500/30 transition-all duration-300"
            >
              <stat.icon className="w-6 h-6 text-blue-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <div className="text-4xl font-outfit font-bold gradient-text mb-2">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function FeaturesSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="features" ref={ref} className="py-32 relative">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate={isInView ? 'show' : 'hidden'}
          className="text-center mb-20"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full text-sm mb-6">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="gradient-text-indigo font-medium">Powerful Features</span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-5xl font-outfit font-bold mb-6">
            Everything you need to{' '}
            <span className="gradient-text">land your dream job</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-xl text-muted-foreground max-w-2xl mx-auto">
            JobIN combines cutting-edge AI with powerful tools to give you an unfair advantage in your job search.
          </motion.p>
        </motion.div>

        {/* Features grid */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate={isInView ? 'show' : 'hidden'}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={fadeUp}
              className={`glass-card p-6 rounded-xl group transition-all duration-300 cursor-default hover:border-white/20 ${feature.glow}`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} p-2.5 mb-5 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-full h-full text-white" />
              </div>
              <h3 className="text-lg font-outfit font-semibold mb-3 group-hover:gradient-text transition-all">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
              <div className="mt-4 flex items-center gap-1 text-sm text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Learn more <ArrowRight className="w-3 h-3" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function PricingSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="pricing" ref={ref} className="py-32 relative">
      {/* Background */}
      <div className="absolute inset-0 mesh-gradient opacity-50" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate={isInView ? 'show' : 'hidden'}
          className="text-center mb-20"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full text-sm mb-6">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="gradient-text font-medium">Simple Pricing</span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-5xl font-outfit font-bold mb-6">
            Invest in your <span className="gradient-text">career</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-xl text-muted-foreground max-w-xl mx-auto">
            Start free, upgrade when you're ready. Cancel anytime, no questions asked.
          </motion.p>
        </motion.div>

        {/* Pricing cards */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate={isInView ? 'show' : 'hidden'}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={fadeUp}
              className={`relative rounded-2xl p-8 flex flex-col transition-all duration-300 ${
                plan.highlight
                  ? 'bg-gradient-to-b from-blue-500/20 to-indigo-500/10 border border-blue-500/40 glow-blue scale-105'
                  : 'glass-card hover:border-white/20'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full">
                  {plan.badge}
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-outfit font-bold mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-outfit font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`w-full text-center py-3 rounded-xl font-semibold transition-all duration-300 ${
                  plan.highlight
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:opacity-90 hover:scale-105'
                    : 'glass-card border border-white/20 hover:bg-white/10'
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function CTASection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="py-32">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-4xl mx-auto text-center"
        >
          <div className="glass-card rounded-3xl p-16 overflow-hidden">
            {/* Background glow */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full text-sm mb-8">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-muted-foreground">Join 12,000+ job seekers</span>
              </div>
              <h2 className="text-5xl font-outfit font-bold mb-6">
                Ready to land your{' '}
                <span className="gradient-text">dream job?</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-10 max-w-xl mx-auto">
                Start your free account today. No credit card required. Upgrade when you're ready.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="group flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:opacity-90 transition-all duration-300 glow-blue hover:scale-105"
                >
                  Start For Free Today
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-white/8 py-16">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12">
          <div className="md:col-span-2">
            <Logo />
            <p className="text-sm text-muted-foreground mt-4 max-w-xs leading-relaxed">
              AI-powered job application platform. Apply smarter, get hired faster.
            </p>
            <div className="flex items-center gap-1 mt-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="text-xs text-muted-foreground ml-2">4.9/5 from 1,200+ reviews</span>
            </div>
          </div>

          {[
            {
              title: 'Product',
              links: ['Features', 'Pricing', 'Chrome Extension', 'API', 'Changelog'],
            },
            {
              title: 'Company',
              links: ['About', 'Blog', 'Careers', 'Press', 'Contact'],
            },
            {
              title: 'Legal',
              links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR'],
            },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold font-outfit mb-4">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/8 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© 2024 JobIN Ltd. All rights reserved.</p>
          <p className="text-sm text-muted-foreground">Built with ❤️ in London, UK 🇬🇧</p>
        </div>
      </div>
    </footer>
  )
}

/* ─────────────── Main page ─────────────── */
export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </main>
  )
}
