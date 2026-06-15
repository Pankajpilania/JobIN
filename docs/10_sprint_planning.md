# Sprint Planning (MVP Phase) — JobIN

This document defines the detailed sprint plans for Phase 1 (MVP) of the JobIN project, allocating tasks, defining story points (SP), and establishing the Definition of Done (DoD).

---

## Sprint 1: Setup & Core Infrastructure (2 Weeks)
*   **Goal:** Setup Next.js frontend, NestJS backend, PostgreSQL database schemas, and Clerk authentication middleware.
*   **Total Story Points:** 24 SP

### Tasks
1.  Initialize NestJS boilerplate with TypeScript modules and Prisma ORM configuration. (3 SP)
2.  Initialize Next.js 14 App Router workspace with TailwindCSS, ShadCN UI, and Zod. (3 SP)
3.  Deploy Postgres relational schema migrations and setup local Redis docker container. (5 SP)
4.  Configure Clerk Authentication on frontend routes and backend Guard middleware. (5 SP)
5.  Develop AWS S3 document upload REST endpoint (supporting PDF/DOCX files). (5 SP)
6.  Write basic endpoint unit tests using Jest. (3 SP)

*   **Dependencies:** Database instance configuration must precede S3 upload testing.
*   **Definition of Done (DoD):**
    *   Auth credentials protect API endpoints.
    *   S3 uploads return 201 Created statuses and store files successfully.
    *   CI pipeline executes lint checks with zero errors.

---

## Sprint 2: AI Analyzers & Stripe Integration (2 Weeks)
*   **Goal:** Deploy AI-driven ATS resume analysis and Stripe payment tiers.
*   **Total Story Points:** 28 SP

### Tasks
1.  Integrate OpenAI GPT-4o API for initial resume text scoring and analysis. (8 SP)
2.  Build frontend dashboard resume upload page and display raw score indicators. (5 SP)
3.  Design and implement Stripe Subscription pricing tables (Free vs Premium keys). (5 SP)
4.  Create NestJS webhook listener updating user tier status on Stripe purchase success. (5 SP)
5.  Create Admin dashboard user metrics list view showing user registration tables. (5 SP)

*   **Dependencies:** Sprint 1 auth guards must protect billing modification calls.
*   **Definition of Done (DoD):**
    *   AI scoring returns normalized values (0-100) and suggestion arrays within 5 seconds.
    *   Webhook listener updates subscriptions correctly on Postgres.
    *   Stripe checkout works end-to-end.

---

## Sprint 3: Extension Base & Cover Letter (2 Weeks)
*   **Goal:** Configure Manifest V3 Chrome Extension popup, scraper, and cover letter generators.
*   **Total Story Points:** 26 SP

### Tasks
1.  Configure Manifest V3 boilerplate with background service workers. (5 SP)
2.  Develop DOM scraper in content script parsing LinkedIn page layouts. (5 SP)
3.  Implement AI Cover Letter generator using Claude 3.5 Sonnet context models. (5 SP)
4.  Build job saving endpoint (`POST /applications`) triggered by extension popup click. (5 SP)
5.  Create Candidate Dashboard list view to display tracked job cards. (3 SP)
6.  Build PDF export generator for tailored cover letters. (3 SP)

*   **Dependencies:** GPT/Claude AI orchestrator module must be functional.
*   **Definition of Done (DoD):**
    *   Extension parses title and company on LinkedIn and communicates to background script.
    *   Clicking "Save Job" inside popup creates a row in PostgreSQL under the correct user.
    *   Cover Letter exports to a clean, downloadable PDF format.

---

## Sprint 4: Extension Autofill & Onboarding (2 Weeks)
*   **Goal:** Deploy Greenhouse/Lever form autofill engines and candidate onboarding flows.
*   **Total Story Points:** 32 SP

### Tasks
1.  Develop autofill form element mapping logic in Content Scripts for Greenhouse and Lever. (8 SP)
2.  Implement NestJS resume tailoring pipeline endpoint (`POST /resumes/tailor`). (8 SP)
3.  Build interactive Candidate Onboarding multi-step UI flow. (5 SP)
4.  Implement user activity logging and audit writes on admin interventions. (5 SP)
5.  Conduct full system end-to-end integration tests and fix critical bug blockers. (6 SP)

*   **Dependencies:** Content Script configuration must support background message calls.
*   **Definition of Done (DoD):**
    *   Extension autofills 90%+ Greenhouse/Lever form fields on page load.
    *   Tailoring pipeline generates modified resumes under 10 seconds.
    *   Integration test coverage exceeds 80%.
