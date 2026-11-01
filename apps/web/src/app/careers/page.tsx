import type { Metadata } from 'next';
import { CareersLandingPage } from '@/components/careers/landing-page';

export const metadata: Metadata = {
  title: 'Find Your Next Chapter | JobIN',
  description:
    'Discover relevant roles, make every application count, and get ready for what is next with JobIN.',
};

export default function CareersPage() {
  return <CareersLandingPage />;
}
