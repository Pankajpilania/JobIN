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
