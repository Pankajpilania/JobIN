<div align="center">
  <img src="./jobin_logo_1781396131319.png" alt="JobIN Logo" width="150" />
  <h1>JobIN</h1>
  <p><strong>"Apply Smarter. Get Hired Faster."</strong></p>
  <p>An AI-powered SaaS platform that tailors resumes, generates cover letters, and tracks your job applications.</p>
</div>

---

## 📖 Overview

**JobIN** is a next-generation SaaS platform designed to streamline the modern job search. Leveraging Google Gemini 1.5 Flash AI, JobIN analyzes a candidate's uploaded resume alongside target job descriptions to instantly generate ATS-optimized, highly-tailored resumes and cover letters. 

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
*   **AI Engine**: Google Gemini API.

---

## 📂 Project Structure

This repository uses a workspace structure:

```text
JobIN/
├── apps/
│   └── web/           # Next.js 14 Frontend Application
├── backend/           # NestJS REST API
├── prisma/            # Global database schemas and migrations
└── docs/              # Comprehensive architectural documentation
```

---

## 🚀 Local Development Setup

To run JobIN locally, you need Node.js (v20+), npm, and a Supabase project.

### 1. Prerequisites
Ensure you have your environment variables set up. Copy the `.env.example` files to `.env` in both the root directory and the `apps/web` directory, and fill in your Supabase credentials, Stripe Keys, and Gemini API keys.

### 2. Install Dependencies
```bash
# In the root directory
npm install

# In the backend directory
cd backend
npm install

# In the frontend directory
cd ../apps/web
npm install
```

### 3. Database Migration
Sync the Prisma schema with your local or cloud Supabase PostgreSQL database:
```bash
# From the backend directory
npx prisma generate
npx prisma db push
```

### 4. Start the Application

**Start the Backend (NestJS)**
```bash
cd backend
npm run dev
# The API will start on http://localhost:4000/api/v1
```

**Start the Frontend (Next.js)**
```bash
cd apps/web
npm run dev
# The UI will start on http://localhost:3000
```

---

## 🌐 Publishing & Deployment

For deploying the application to live production environments (Vercel, Render, etc.), please refer to the comprehensive [Production Deployment Guide](deployment_guide.md).

### Manual plan payments

The upgrade page accepts UPI payment references in INR and bank-transfer references in GBP. Amounts are INR 1,599 / GBP 15 for Pro and INR 2,999 / GBP 29 for Pro Max. A finance administrator must verify each reference before the subscription is activated.

Monthly AI credit allowances are 20 for Free, 100 for Pro, and 500 for Pro Max. Apply the `20261023_update_monthly_ai_credit_limits` Prisma migration to update existing plan records.

The supplied QR images are served from `apps/web/public/payments/inr-payment.jpeg` and `apps/web/public/payments/gbp-payment.jpeg`. To replace them, configure the public image URLs with `NEXT_PUBLIC_INR_PAYMENT_QR_URL` and `NEXT_PUBLIC_GBP_BANK_QR_URL`. Optional GBP transfer instructions can be shown using `NEXT_PUBLIC_GBP_BANK_DETAILS`. These values are displayed to customers; do not put secrets in them.

Apply the new payment-request and AI-credit schema with the repository's Prisma migration deployment command before deploying the API:

```bash
npm run db:migrate:deploy --workspace=apps/api
npm run db:generate --workspace=apps/api
```

## 📚 Architectural Documentation

JobIN includes a full suite of technical specifications and architectural plans. You can find these in the `/docs` folder:

1. `01_prd.md` - Product Requirements Document
2. `02_system_architecture.md` - System Architecture & Diagrams
3. `03_database_schema.md` - Database & Schema Design
4. `04_api_specifications.md` - REST API Definitions
5. `...` and more.

---

<div align="center">
  <i>Built to revolutionize the job search.</i>
</div>
