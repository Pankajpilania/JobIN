<div align="center">
  <img src="./jobin_logo_1781396131319.png" alt="JobIN Logo" width="150" />
  <h1>JobIN</h1>
  <p><strong>"Apply Smarter. Get Hired Faster."</strong></p>
  <p>An AI-powered SaaS platform that tailors resumes, generates cover letters, and tracks your job applications.</p>
</div>

---

## 📖 Overview

**JobIN** is an AI-powered SaaS platform designed to streamline the modern job search. It analyzes a candidate's uploaded resume alongside target job descriptions to generate ATS-optimized resumes and cover letters.

The platform features a full Kanban-style application tracker, robust admin portals, AI credit billing, and multi-tenant security powered by Supabase.

## ✨ Key Features

- 🤖 **AI Resume Tailoring**: Instant ATS-optimization using Google Gemini AI.
- 📄 **AI Cover Letters**: Auto-generate personalized cover letters targeting specific hiring managers.
- 📊 **Application Tracker**: Visual Kanban board to track job pipelines (Applied, Interviewing, Offered).
- 💳 **Monetization & Credits**: Stripe-integrated billing with an "AI Credit" system.
- 🛡️ **Admin Portal**: Fully-featured dashboard for user management, support tickets, and metric tracking.
- ☁️ **Cloud Storage**: Secure resume PDF parsing and storage via Cloudflare R2.

## 🛠️ Tech Stack

JobIN is built using a modern, decoupled monorepo architecture:

- **Frontend**: Next.js 15 (App Router), React, Tailwind CSS, Radix UI.
- **Backend**: NestJS, Node.js, TypeScript.
- **Database**: PostgreSQL hosted on Supabase.
- **ORM**: Prisma.
- **Authentication**: Supabase Auth (JWT).
- **Storage**: Cloudflare R2 (S3-Compatible).
- **AI Engine**: Admin-configurable Gemini, OpenAI, Anthropic, DeepSeek, NVIDIA NIM, and hosted Ollama providers.

---

## 📂 Project Structure

This repository uses a workspace structure:

```text
JobIN/
├── apps/
│   ├── api/            # NestJS API and Prisma schema/migrations
│   ├── web/            # Next.js 15 web application
│   └── extension/      # Chrome extension (Manifest V3)
├── docs/               # Product and architecture documentation
└── render.yaml         # Render API service configuration
```

The root-level `backend/` and `frontend/` directories are legacy snapshots; active development and deployment use the `apps/` workspaces.

---

## 🧭 End-to-end architecture and data flow

```text
Browser (Next.js) ──Supabase Auth JWT──┐
                                       ├──> NestJS API ──Prisma──> Supabase PostgreSQL
Chrome extension ──Supabase Auth JWT───┘        │
                                                ├──> Cloudflare R2 (resume files)
                                                ├──> AI provider (resume/cover letter tasks)
                                                └──> Stripe (checkout, billing portal, webhooks)
```

### Services and responsibilities

1. **Web application (`apps/web`)** — Next.js App Router UI for registration, sign-in, resume management, AI tools, job tracking, billing, and admin pages. It uses Supabase Auth in the browser and sends the current access token to the API. Browser-facing Supabase settings are `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; the API base URL is configured by `NEXT_PUBLIC_API_URL` (defaults to the Render API in production; set it to localhost for development).
2. **Chrome extension (`apps/extension`)** — Manifest V3 extension. Its popup/options/side panel communicate with the extension service worker; the worker detects supported job pages, requests autofill data, and calls the same API endpoints as the web app. The extension signs in with the same Supabase project and sends its access token as a bearer token. It does not connect directly to PostgreSQL or call AI providers.
3. **API (`apps/api`)** — NestJS is the trusted boundary for application data and privileged operations. `SupabaseAuthGuard` validates each bearer token with Supabase Auth, links the Supabase identity to a JobIN `User`, checks account status, and attaches database roles to the request. Controllers enforce endpoint authorization; services perform business logic.
4. **Database** — Supabase-hosted PostgreSQL stores JobIN users and roles, resumes and versions, applications, subscription and payment records, AI usage/credits, and admin configuration. Prisma schema and migrations are under `apps/api/prisma`. The API uses `DATABASE_URL` for pooled application connections and `DIRECT_URL` for migrations/direct database work.
5. **Resume file storage** — Uploaded resume objects are stored in Cloudflare R2 using its S3-compatible API; PostgreSQL stores object metadata, ownership, and keys. The API performs storage operations so browser clients do not receive R2 credentials.
6. **AI providers** — The API selects the configured provider/model and makes generation requests server-side. Admin-managed provider credentials are encrypted before persistence using `AI_SETTINGS_ENCRYPTION_KEY`; never expose provider keys to the web app or extension.
7. **Billing** — The API creates Stripe checkout/portal sessions and processes Stripe webhooks to update subscription/payment records. Manual UPI/bank-transfer requests are recorded in PostgreSQL and remain pending until an authorized finance administrator reviews them. Complimentary plans are assigned by an authorized administrator and are JobIN-managed rather than Stripe subscriptions.

### Typical request flows

- **Sign-in and protected API request:** Web or extension authenticates with Supabase Auth → Supabase issues an access token → client sends `Authorization: Bearer <token>` to the API → API validates it with Supabase → API looks up or creates the linked JobIN user and roles → endpoint performs an owner-scoped operation through Prisma → response returns to the client.
- **Resume and AI:** Client uploads a resume through the API → API validates ownership and stores the file in R2, with metadata in PostgreSQL → user selects a resume and supplies a job description → API calls the configured AI provider, stores the tailored version and usage/credit data → client loads the generated result from the API.
- **Subscription:** Client asks the API to start checkout → Stripe handles payment → Stripe webhook calls the API → API verifies the webhook signature using the raw request body and updates PostgreSQL. For manual payments, the user submits payment details/reference and an administrator approves or rejects the request in the admin portal.
- **Extension application workflow:** Extension content scripts identify supported job pages and extract job details → service worker requests profile/resume data from the authenticated API → the extension fills supported forms and can save the application to the same account's tracker.
- **Admin:** The API checks the signed-in user's database role for every admin operation. Role assignment is restricted to super admins. Provider keys, payment settings, complimentary plans, and account operations are stored/processed server-side.

### Extension and deployment configuration

- The extension's default API endpoint is `https://jobin-tmvb.onrender.com/api`; users can change it under **Extension Options → API Configuration**. Local development can override it with `VITE_API_URL=http://localhost:4000/api` in `apps/extension/.env.local`.
- The extension authenticates against the same Supabase project as the web app by default. Optional build overrides are documented in [`apps/extension/.env.example`](./apps/extension/.env.example). If using another Supabase project, set its URL and anon key and update the matching Supabase host in `apps/extension/manifest.json` before building.
- The extension manifest must include host permissions for the selected API and Supabase hosts. API calls originate from its extension service worker, not from a job-site content script; content scripts message the worker instead. Keep API authentication enabled—host permissions are not user authorization.
- The API's `CORS_ORIGIN` must list the deployed web app origin and local web origin used for development. The extension uses Chrome host permissions for service-worker cross-origin requests; do not solve integration issues by allowing arbitrary web origins.
- The API deploys from the repository root using [`render.yaml`](./render.yaml), runs Prisma migrations before startup, and exposes `/api/health`. The web app is deployed separately to Vercel. Configure secrets in Render/Vercel environment settings, not in source control. After changing API code or API environment settings, deploy the Render service; after changing web or extension code, deploy the respective web app or publish a new extension build.

### Ten-minute inactivity timeout

The web app signs out an authenticated user after 10 minutes without pointer, keyboard, touch, wheel, or scroll activity. Activity timestamps are shared between tabs for the same signed-in user; returning to a hidden tab checks the elapsed time immediately. The timeout is client-side and does not replace API-side JWT validation or any Supabase token-expiry policy.

---

## 🚀 Local Development Setup

To run JobIN locally, you need Node.js (v20+), npm, and a Supabase project.

### 1. Prerequisites

Ensure Node.js 20+ and npm are installed. Copy `apps/api/.env.example` to `apps/api/.env` and configure the required local Supabase, database, and service settings. Copy `apps/web/.env.example` to `apps/web/.env.local` and configure its public Supabase and API URL variables.

### 2. Install Dependencies

```bash
# From the repository root
npm ci
npm run db:generate --workspace=apps/api
```

### 3. Database Migration

Apply pending migrations to the configured database:

```bash
npm run db:migrate:deploy --workspace=apps/api
```

### 4. Start the Application

**Start the API (NestJS)**

```bash
npm run dev:api
# The API will start on http://localhost:4000/api
```

**Start the Frontend (Next.js)**

```bash
npm run dev:web
# The UI will start on http://localhost:3000
```

**Build the Chrome extension**

```bash
npm run build:extension
```

For local extension development, copy `apps/extension/.env.example` to `apps/extension/.env.local`, set `VITE_API_URL` to the local API, and set the Supabase URL/key for the project you intend to use. Update the extension's manifest host permissions if those hosts differ from the defaults.

---

## 🌐 Publishing & Deployment

The API deploys to Render using [render.yaml](./render.yaml); the web app deploys to Vercel from `apps/web`. Review the [production deployment plan](./docs/11_production_deployment_plan.md) and [API environment setup](./apps/api/README.md) before deploying.

### Manual plan payments

The upgrade page accepts UPI payment references in INR and bank-transfer references in GBP. Default amounts are INR 1,599 / GBP 15 for Pro and INR 2,999 / GBP 29 for Pro Max. A finance administrator must verify each reference before the subscription is activated. Approved manual payments are recorded in billing history and replace any previous active plan.

Monthly AI credit allowances are 20 for Free, 100 for Pro, and 500 for Pro Max. Apply the `20261023_update_monthly_ai_credit_limits` Prisma migration to update existing plan records.

The supplied QR images are served from `apps/web/public/payments/inr-payment.jpeg` and `apps/web/public/payments/gbp-payment.jpeg`. Initial public payment options can use `NEXT_PUBLIC_INR_PAYMENT_QR_URL`, `NEXT_PUBLIC_GBP_BANK_QR_URL`, and `NEXT_PUBLIC_GBP_BANK_DETAILS`. After database migration, finance admins can change each method label, payment instructions, QR URL, and plan amount at `/admin/payment-settings`. Payment instructions and QR URLs are displayed publicly to customers; never put secrets in them.

### Admin access

Sign in at `/sign-in` using an account that exists in JobIN. From `apps/api`, assign the admin role after the user has signed in at least once:

```bash
npx ts-node prisma/seed-admin.ts --email=admin@example.com
```

Then open `/admin`. The API verifies the database role; a normal signed-in account does not have admin access. Admins can review pending references at `/admin/payment-requests`, inspect users and their plans at `/admin/users`, and grant or change a user's plan from that user's details panel. Finance admins and super admins can manage manual payment settings.

Apply the payment-request, manual-payment-settings, and AI-credit schema migrations, and regenerate Prisma Client, before running or deploying the API:

```bash
npm run db:migrate:deploy --workspace=apps/api
npm run db:generate --workspace=apps/api
```

## 📚 Architectural Documentation

Product requirements, architecture, API specifications, deployment, and product plans are maintained in [`docs/`](./docs/).

---

<div align="center">
  <i>Built to revolutionize the job search.</i>
</div>
