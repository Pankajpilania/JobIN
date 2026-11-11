import type { Metadata } from 'next';
import { LegalDocument, type LegalSection } from '@/components/legal/legal-document';

export const metadata: Metadata = {
  title: 'Privacy policy | JobIN',
  description: 'How JobIN collects, uses, stores, and protects personal information.',
};

const sections: LegalSection[] = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    content: (
      <>
        <p>
          JobIN is the data controller for this job-search platform. For questions about this
          notice, access requests, or deletion requests, contact{' '}
          <a href="mailto:info@jobin.today">info@jobin.today</a>.
        </p>
      </>
    ),
  },
  {
    id: 'information-we-collect',
    title: 'Information we collect',
    content: (
      <>
        <ul>
          <li>
            <strong>Account and profile details:</strong> name, email address, profile image,
            country, sign-in provider identifiers, and account activity.
          </li>
          <li>
            <strong>Job-search materials:</strong> résumés and their extracted text, résumé
            versions and analysis, cover letters, interview preparation content, saved roles,
            applications, notes, and preferences you add.
          </li>
          <li>
            <strong>Service and support information:</strong> requests you submit, support
            messages, subscription status, invoices and payment references, and records of AI
            features used.
          </li>
          <li>
            <strong>Technical information:</strong> security and diagnostic logs, device and
            browser information made available by the service, and information needed to protect
            accounts and keep the platform working.
          </li>
          <li>
            <strong>Extension information:</strong> when you use the JobIN browser extension, it
            can read job details from the page you are viewing to identify a role. The extension
            stores sign-in and preference data in browser extension storage and sends job details
            to JobIN when you use a feature such as saving or tailoring that role.
          </li>
        </ul>
        <p>
          Public job listings are collected from job-board feeds. Those listings can include a
          role, employer, location, description, salary information, tags, and a link to the
          original posting.
        </p>
      </>
    ),
  },
  {
    id: 'how-we-use-information',
    title: 'How we use information',
    content: (
      <>
        <p>We use information to:</p>
        <ul>
          <li>create and secure your account and provide the features you request;</li>
          <li>search, filter, save, and organise job opportunities and applications;</li>
          <li>analyse or tailor job-search materials and prepare AI-generated suggestions when you request them;</li>
          <li>manage subscriptions, payments, receipts, support requests, and service messages;</li>
          <li>monitor reliability, diagnose errors, prevent misuse, and protect the service; and</li>
          <li>meet legal, accounting, and security obligations.</li>
        </ul>
        <p>
          Where data-protection law requires a lawful basis, we generally process account and
          feature data to perform our agreement with you, billing records to meet legal obligations,
          and security or reliability information for our legitimate interests in operating and
          protecting JobIN. We rely on consent where a feature or law requires it, and you can
          withdraw consent where consent is the basis.
        </p>
      </>
    ),
  },
  {
    id: 'ai-and-job-matching',
    title: 'AI features and job matching',
    content: (
      <>
        <p>
          When you choose an AI feature, the résumé, job description, prompt, or other content
          needed for that request is sent to the AI provider configured for JobIN. The provider
          processes it to return the requested result. AI results and match indicators are
          suggestions to help your search; they do not make employment decisions for you.
        </p>
        <p>
          Review generated content before using it. JobIN does not submit an application to an
          employer unless you take an action through a feature that supports that submission.
        </p>
      </>
    ),
  },
  {
    id: 'sharing',
    title: 'Who we share information with',
    content: (
      <>
        <p>
          We share information with service providers only as needed to run the features they
          support. Depending on your account and the active configuration, these can include:
        </p>
        <ul>
          <li>Supabase, Auth0, or Oracle Cloud Infrastructure for account sign-in;</li>
          <li>Oracle Cloud Infrastructure for résumé and other file storage;</li>
          <li>the AI provider configured for résumé, cover-letter, and interview features;</li>
          <li>Stripe for checkout, subscription management, and payment records;</li>
          <li>email, support-form, and error-monitoring providers for messages and diagnostics; and</li>
          <li>public job boards to retrieve listings and their original application links.</li>
        </ul>
        <p>
          Payment card details are entered with Stripe; JobIN stores subscription and payment
          references rather than your full card number. Employers and job boards have their own
          privacy practices when you follow an external listing or apply on their site.
        </p>
      </>
    ),
  },
  {
    id: 'cookies-and-storage',
    title: 'Cookies and browser storage',
    content: (
      <p>
        JobIN and its sign-in provider may use cookies or browser storage that are needed to keep
        you signed in, protect your account, and remember settings. The browser extension also uses
        extension storage for its sign-in state, preferences, and cached information needed by its
        features. You can remove extension data through your browser settings; doing so may sign you
        out or reset preferences.
      </p>
    ),
  },
  {
    id: 'international-transfers',
    title: 'International processing',
    content: (
      <p>
        JobIN and its providers may process information in countries other than where you live.
        Where data-protection law requires safeguards for an international transfer, the relevant
        provider and JobIN use a recognised transfer mechanism or another lawful safeguard.
        Contact us if you would like information about a particular transfer.
      </p>
    ),
  },
  {
    id: 'retention-and-deletion',
    title: 'Retention and deletion',
    content: (
      <>
        <p>
          We keep information while your account is active and for as long as needed to provide the
          service, resolve disputes, keep appropriate security and billing records, and meet legal
          obligations. The exact period depends on the type of record and why it is held. Backups
          and security records may remain for a limited period after a deletion request.
        </p>
        <p>
          In-app account deletion currently marks the account as deleted; it does not immediately
          erase every related résumé, application, or stored file. To request deletion of those
          materials, email <a href="mailto:info@jobin.today">info@jobin.today</a>. We will review
          and handle the request subject to records we must retain by law or for a valid dispute or
          security need.
        </p>
      </>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your choices and rights',
    content: (
      <>
        <p>
          Depending on where you live and the law that applies, you may be able to request access
          to, correction of, deletion of, or restriction of your personal information; object to
          certain processing; request a portable copy; or withdraw consent. Contact us using the
          email above and tell us which account the request concerns. We may need to verify your
          identity before responding.
        </p>
        <p>
          If you are in the UK, you can also raise a concern with the{' '}
          <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noreferrer">
            Information Commissioner’s Office
          </a>
          . The ICO recommends explaining the purposes, lawful bases, recipients, transfers,
          retention, and individual rights in a privacy notice.
        </p>
      </>
    ),
  },
  {
    id: 'security-and-changes',
    title: 'Security and changes',
    content: (
      <>
        <p>
          We use technical and organisational measures intended to protect information. No online
          service can promise absolute security. Keep your sign-in details private and contact us
          promptly if you think your account has been accessed without permission.
        </p>
        <p>
          We may update this policy when the service or its data practices change. We will update
          the date above and provide additional notice where required.
        </p>
      </>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Privacy policy"
      introduction={
        <p>
          This page explains what information JobIN handles when you use the website, job-search
          workspace, or browser extension, why we use it, and how to contact us about it.
        </p>
      }
      sections={sections}
    />
  );
}
