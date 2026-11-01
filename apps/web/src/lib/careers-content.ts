import type { LucideIcon } from 'lucide-react';
import {
  ArrowUpRight,
  Bot,
  BriefcaseBusiness,
  Clock3,
  FileCheck2,
  MessageCircleMore,
  MousePointerClick,
  Sparkles,
  UsersRound,
} from 'lucide-react';

export const stats = [
  { value: 12000, suffix: '+', label: 'job seekers moving forward', icon: UsersRound },
  { value: 3, suffix: '×', label: 'more interview opportunities', icon: ArrowUpRight },
  { value: 8, suffix: ' hrs', label: 'saved on busy job-search weeks', icon: Clock3 },
  { value: 94, suffix: '%', label: 'feel more in control', icon: Sparkles },
];

export const jobHubStats = [
  { value: 2400000, label: 'roles in the job hub', icon: BriefcaseBusiness },
  { value: 18400, label: 'fresh opportunities today', icon: Sparkles },
];

export type LandingFeature = {
  title: string;
  description: string;
  icon: LucideIcon;
  eyebrow: string;
  highlight: string;
  metric: string;
};

export const features: LandingFeature[] = [
  {
    title: 'Find your kind of role',
    description:
      'Bring your goals into focus. Discover relevant openings without losing an evening to endless tabs.',
    icon: Sparkles,
    eyebrow: 'AI job matches',
    highlight: 'Roles that make sense for you',
    metric: '96% match',
  },
  {
    title: 'Spend less time on forms',
    description:
      'Let a thoughtful autofill flow handle repetitive application details while you stay in control.',
    icon: MousePointerClick,
    eyebrow: 'One-click autofill',
    highlight: 'Your next application, minus the busywork',
    metric: 'Ready to review',
  },
  {
    title: 'Show up as the right fit',
    description:
      'Shape your resume around a role’s real priorities, while keeping every claim true to your experience.',
    icon: FileCheck2,
    eyebrow: 'Tailored resume',
    highlight: 'Tell your story with clarity',
    metric: 'Resume aligned',
  },
  {
    title: 'Make warm connections',
    description:
      'Find better ways to reach out, follow up, and turn professional connections into meaningful conversations.',
    icon: MessageCircleMore,
    eyebrow: 'Referral toolkit',
    highlight: 'A human introduction goes a long way',
    metric: 'Message drafted',
  },
  {
    title: 'Get a copilot for the hard parts',
    description:
      'Prepare for interviews, explore your next move, and get practical help when you need a little momentum.',
    icon: Bot,
    eyebrow: 'AI career copilot',
    highlight: 'Walk into the conversation prepared',
    metric: 'Practice session ready',
  },
];

export const testimonials = [
  {
    quote:
      'I finally had one place to keep the search moving instead of starting from scratch every Monday.',
    name: 'Jordan Lee',
    role: 'Product designer',
    initials: 'JL',
    tone: 'mint',
  },
  {
    quote:
      'The tailored resume suggestions helped me explain my experience in a way that felt like me.',
    name: 'Priya Shah',
    role: 'Data analyst',
    initials: 'PS',
    tone: 'lavender',
  },
  {
    quote:
      'It made a long process feel much more manageable. I could focus on the conversations that mattered.',
    name: 'Alex Morgan',
    role: 'Software engineer',
    initials: 'AM',
    tone: 'peach',
  },
  {
    quote:
      'The interview practice was a calm way to get my thoughts together before the real thing.',
    name: 'Taylor Brooks',
    role: 'Customer success lead',
    initials: 'TB',
    tone: 'blue',
  },
  {
    quote:
      'Small steps, a clear tracker, and a little less guesswork. That changed my whole routine.',
    name: 'Sam Rivera',
    role: 'Operations manager',
    initials: 'SR',
    tone: 'yellow',
  },
  {
    quote: 'The best part is staying in control while the repetitive bits finally take less time.',
    name: 'Morgan Kim',
    role: 'Marketing specialist',
    initials: 'MK',
    tone: 'rose',
  },
];

export const faqs = [
  {
    question: 'What is JobIN?',
    answer:
      'JobIN is a job-search toolkit that brings job discovery, application organization, resume help, and interview preparation together in one place.',
  },
  {
    question: 'Is JobIN free to try?',
    answer:
      'Yes. You can create an account and explore the available free tools. Optional plans and their current prices are shown on the upgrade page.',
  },
  {
    question: 'Does the AI write things that are not true?',
    answer:
      'AI suggestions are meant to help you express your real experience. Review every generated result and only use statements that are accurate for you.',
  },
  {
    question: 'Can I use JobIN on mobile?',
    answer:
      'The JobIN website is responsive and works on mobile screens. The browser extension is available for supported desktop browsers.',
  },
  {
    question: 'How do I get help with my account?',
    answer:
      'Visit the Support page to ask the AI assistant a general question or send a ticket directly to the JobIN support team.',
  },
];

export const footerColumns = [
  {
    title: 'Explore',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Job search', href: '/job-search' },
      { label: 'Chrome extension', href: '/extension' },
    ],
  },
  {
    title: 'For you',
    links: [
      { label: 'Resume tools', href: '/resumes' },
      { label: 'Interview practice', href: '/interview' },
      { label: 'Plans', href: '/upgrade' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About JobIN', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Support', href: '/support' },
    ],
  },
  {
    title: 'Get started',
    links: [
      { label: 'Create an account', href: '/sign-up' },
      { label: 'Sign in', href: '/sign-in' },
    ],
  },
];
