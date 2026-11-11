import type { Metadata } from 'next';
import { LegalDocument, type LegalSection } from '@/components/legal/legal-document';

export const metadata: Metadata = {
  title: 'Terms of service | JobIN',
  description: 'Terms for using the JobIN website, job-search tools, and browser extension.',
};

const sections: LegalSection[] = [
  {
    id: 'using-jobin',
    title: 'Using JobIN',
    content: (
      <p>
        These terms apply when you use the JobIN website, account, job-search workspace, AI tools,
        or browser extension. By using the service, you agree to these terms. If you do not agree,
        do not use the service. The Privacy Policy explains how personal information is handled.
      </p>
    ),
  },
  {
    id: 'account',
    title: 'Your account',
    content: (
      <>
        <p>
          Keep your account information accurate and protect your sign-in details. You are
          responsible for activity through your account unless it results from a security issue
          outside your control. Contact us promptly if you believe someone else has access.
        </p>
        <p>You may stop using JobIN and request account closure at any time.</p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    content: (
      <p>
        Use JobIN lawfully and for your own job search. Do not interfere with the service, attempt
        unauthorised access, upload malicious code, misrepresent another person, or use automation
        to abuse the service or job boards. Do not upload content you have no right to use or share.
        We may restrict access when reasonably needed to protect users, providers, or the service.
      </p>
    ),
  },
  {
    id: 'your-content',
    title: 'Your content',
    content: (
      <p>
        You keep your rights to the résumés, notes, job descriptions, and other material you submit.
        You give JobIN permission to host, process, and display that material only as needed to
        provide the features you request, protect the service, and meet legal obligations. You are
        responsible for checking that your material is accurate and that you may use it.
      </p>
    ),
  },
  {
    id: 'job-listings',
    title: 'Job listings and external websites',
    content: (
      <>
        <p>
          Job listings come from public feeds and employer or job-board systems. They may change,
          expire, contain errors, or be removed after they are collected. Always check the original
          posting for current details, eligibility, sponsorship, compensation, and application
          instructions.
        </p>
        <p>
          Links to employer and job-board websites take you to third-party services. Their content,
          application process, and terms are controlled by those organisations. JobIN does not
          guarantee that a listing is still open or that an employer will respond.
        </p>
      </>
    ),
  },
  {
    id: 'ai-tools',
    title: 'AI tools and suggestions',
    content: (
      <p>
        AI-generated résumé edits, cover letters, interview prompts, and match indicators are
        suggestions. They may be incomplete, inaccurate, or unsuitable for your circumstances.
        Review and edit them before relying on them or sharing them with an employer. JobIN does not
        promise an interview, job offer, or particular employment outcome.
      </p>
    ),
  },
  {
    id: 'plans-and-payments',
    title: 'Plans, billing, and cancellation',
    content: (
      <>
        <p>
          Some JobIN features may be offered on free or paid plans. Before you pay, the checkout
          will show the applicable plan, price, currency, billing period, and any discount. Paid
          subscriptions are billed by Stripe using the payment method and renewal terms shown at
          checkout.
        </p>
        <p>
          You can manage or cancel an active subscription through the billing portal linked from
          your account. The portal will show the effect and timing of cancellation. Refunds and
          cancellation rights are handled according to the terms shown when you purchase and any
          rights that cannot legally be limited.
        </p>
      </>
    ),
  },
  {
    id: 'availability',
    title: 'Availability and changes',
    content: (
      <p>
        We may update, improve, suspend, or discontinue parts of JobIN. We will take reasonable
        steps to give notice when a material change affects a paid feature or your rights. We do
        not promise uninterrupted availability, since the service depends on networks, providers,
        and public job feeds that can be unavailable.
      </p>
    ),
  },
  {
    id: 'intellectual-property',
    title: 'JobIN materials',
    content: (
      <p>
        JobIN and its licensors retain rights in the service, software, design, and branding. These
        terms give you a personal, limited, revocable permission to use the service for your job
        search. They do not transfer ownership of JobIN materials to you.
      </p>
    ),
  },
  {
    id: 'responsibility',
    title: 'Responsibility and legal rights',
    content: (
      <p>
        Nothing in these terms removes rights or remedies that the law says cannot be excluded or
        limited. To the extent the law allows, JobIN is not responsible for indirect or
        consequential loss resulting from your use of third-party listings or external websites.
        Any other limits on liability apply only to the extent permitted by law.
      </p>
    ),
  },
  {
    id: 'changes-and-contact',
    title: 'Changes and contact',
    content: (
      <p>
        We may revise these terms as JobIN changes. The updated version and date will appear on
        this page. If you have a question or complaint, contact{' '}
        <a href="mailto:info@jobin.today">info@jobin.today</a>.
      </p>
    ),
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalDocument
      title="Terms of service"
      introduction={
        <p>
          These terms set out the basic rules for using JobIN and its job-search features. Please
          read them before creating an account or subscribing to a paid plan.
        </p>
      }
      sections={sections}
    />
  );
}
