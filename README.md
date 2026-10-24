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

*   🤖 **AI Resume Tailoring**: Instant ATS-optimization using Google Gemini AI.
*   📄 **AI Cover Letters**: Auto-generate personalized cover letters targeting specific hiring managers.
*   📊 **Application Tracker**: Visual Kanban board to track job pipelines (Applied, Interviewing, Offered).
*   💳 **Monetization & Credits**: Stripe-integrated billing with an "AI Credit" system.
*   🛡️ **Admin Portal**: Fully-featured dashboard for user management, support tickets, and metric tracking.
*   ☁️ **Cloud Storage**: Secure resume PDF parsing and storage via Cloudflare R2.

## 🛠️ Tech Stack

JobIN is built using a modern, decoupled monorepo architecture:

*   **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Radix UI.
*   **Backend**: NestJS, Node.js, TypeScript.
*   **Database**: PostgreSQL hosted on Supabase.
*   **ORM**: Prisma.
*   **Authentication**: Supabase Auth (JWT).
*   **Storage**: Cloudflare R2 (S3-Compatible).
*   **AI Engine**: Admin-configurable Gemini, OpenAI, Anthropic, DeepSeek, NVIDIA NIM, and hosted Ollama providers.

---

## 📂 Project Structure

This repository uses a workspace structure:

```text
JobIN/
├── apps/
│   ├── api/            # NestJS API and Prisma schema/migrations
│   ├── web/            # Next.js 14 web application
│   └── extension/      # Chrome extension (Manifest V3)
├── docs/               # Product and architecture documentation
└── render.yaml         # Render API service configuration
```

The root-level `backend/` and `frontend/` directories are legacy snapshots; active development and deployment use the `apps/` workspaces.

---

## 🚀 Local Development Setup

To run JobIN locally, you need Node.js (v20+), npm, and a Supabase project.

### 1. Prerequisites
Ensure Node.js 20+ and npm are installed. Copy `apps/api/.env.example` to `apps/api/.env` and configure the required local Supabase, database, and service settings. Configure the web app's public Supabase and API URL variables in `apps/web/.env.local`.

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
