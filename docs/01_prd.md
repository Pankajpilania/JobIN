# Product Requirements Document (PRD) — JobIN

**Document Version:** 1.0.0  
**Author:** Senior Product Architect  
**Status:** Approved  

---

## 1. Executive Summary & Tagline

JobIN is a comprehensive SaaS platform designed to optimize, track, and automate the job search process. By leveraging multi-model AI orchestration, an advanced ATS analyzer, and a powerful browser autofill engine, JobIN reduces application time and enhances candidate matching.

*   **Tagline:** "Apply Smarter. Get Hired Faster."
*   **Target Market:** Global job seekers with a primary focus on the UK, EU, and US markets.

---

## 2. User Personas & Role-Based Access Control (RBAC)

### 2.1 Candidate
*   **Objective:** Optimize their resume, track active job pipelines, build custom cover letters, autofill applications, and prepare for interviews.
*   **Key Needs:** Speed, accuracy in parsing, clear match insights, automated tracking, and interview simulations.

### 2.2 Recruiter
*   **Objective:** Find candidates whose profiles are highly optimized and fit technical roles.
*   **Key Needs:** Semantic search filtering, direct messaging, and pipeline tracking (candidate-consented only).

### 2.3 System Administrator (Super Admins, Finance, Operations, Support, Content, Analytics)
*   **Objective:** Manage plans, audit AI token costs, moderate content, resolve tickets, and configure platform parameters.
*   **Key Needs:** Granular RBAC tables, real-time cost-to-revenue reporting, and emergency kill-switches.

---

## 3. Core Product Functional Requirements

### 3.1 Web Application Dashboard
*   **Overview Screen:** Must display user registration progress, active application funnels, upcoming interview schedules, resume health checks, and remaining AI credits.
*   **Smart Job Discovery Feed:** Real-time job cards ranked by match scores (0-100%). Users can search, filter by Skilled Worker Visa (UK) / H1B (US), remote options, and salary ranges.
*   **Job Tracker:** Interactive Kanban board (Saved, Applied, Phone Screen, Interview, Assessment, Offer, Rejected, etc.) with calendar synchronization.

### 3.2 Chrome Extension ("JobIN Copilot")
*   **Page Detection:** Must auto-detect when a user visits a supported job board (LinkedIn, Reed, Indeed, Glassdoor, CV-Library, etc.) or major ATS application pages (Workday, Greenhouse, Lever, Ashby).
*   **Side Panel Workflow:** Renders the ATS match score overlay, highlights missing keywords, and lets the user generate tailored resumes or cover letters in under 10 seconds.
*   **Form Autofill Engine:** Automatically extracts input fields (text boxes, textareas, checkboxes, dropdowns) and maps them to candidate profile properties. Uploads matching resume versions and answers screening questions automatically.

### 3.3 Admin Portal
*   **Real-time Analytics:** Tracks monthly recurring revenue (MRR), annual recurring revenue (ARR), registration volumes, and total AI credits spent.
*   **User Management:** Actionable grid to view users, suspend/delete accounts, reset credentials, assign/deduct AI credits, and impersonate users (with secure audit trails).
*   **Subscription & Billing:** Integration with Stripe for tier management (Free, Premium, Pro, Enterprise), including limit configurations (monthly applications, resume versions, etc.).
*   **AI Usage Console:** Displays token count and costs split by provider (OpenAI, Anthropic, Gemini). Allows global model selection.
*   **Support Ticket Center:** Integrated ticket queue supporting status transitions (Open, In Progress, Waiting on User, Resolved).
*   **Audit logs:** Tracks all admin actions. Retention policy: 90 days hot storage, 1 year cold storage.

---

## 4. AI & Resume Optimization Engine Requirements

### 4.1 AI Resume Tailor
*   Takes an existing resume and job description.
*   Rewrites bullet points utilizing the **XYZ Formula**: *Accomplished [X] as measured by [Y], by doing [Z]*.
*   Quantifies achievements with AI estimation if metrics are absent.
*   Outputs a customized resume, missing keyword checklist, and a skill gap report within 10 seconds.

### 4.2 ATS Optimization Engine
*   Checks for layout compatibility issues (multiple columns, nested tables, graphical charts, header/footer parsing errors).
*   Calculates a detailed **ATS Score (0-100)**.
*   Provides section-by-section suggestions for improvement.

### 4.3 AI Job Match Score
*   Calculates relative category matching weights:
    *   Skills Match (40%)
    *   Experience Match (30%)
    *   Education & Certifications (15%)
    *   Industry & Location Match (15%)
*   Visualizes Category Match Percentages inside the Dashboard and Chrome extension Side Panel.

### 4.4 AI Career Copilot ("JobIN Copilot")
*   Persistent chat workspace retaining full conversation history.
*   Capable of writing cold outreach messages, negotiating salaries, and giving mock interview critiques.

### 4.5 AI Interview Assistant
*   Generates behavioral and technical questions based on candidate experience and target job descriptions.
*   Formulates structured STAR format answers (Situation, Task, Action, Result).
*   Provides mock text-based chat sessions (voice simulations targeted for future release).

### 4.6 AI Insider Referral Engine
*   Identifies target contacts (alumni, hiring managers) based on parsed public networking layouts.
*   Generates connection templates and follows up automatically.

---

## 5. Privacy, Compliance, and Security

### 5.1 GDPR and UK GDPR Compliance
*   **Consent:** Explicit cookie consent banners and opt-in prompts for AI parsing data.
*   **Article 17 (Right to Erasure):** A single-click "GDPR Purge" button on the user profile that completely deletes candidate details, resumes from AWS S3, vector embeddings from Pinecone, and logs from PostgreSQL within 24 hours.
*   **Article 20 (Data Portability):** Export user details, resume formats, and tracker logs in JSON/CSV formats in one click.
*   **Data Minimization:** No storage of non-essential PII. AI processing strictly processes context tags rather than broad personal profiles.

### 5.2 Security Specifications
*   **Encryption at Rest:** All Postgres databases and S3 files encrypted with AES-256.
*   **Encryption in Transit:** TLS 1.3 enforced for all APIs.
*   **Authentication:** Multi-factor Authentication (MFA) enabled. Session timeouts auto-logout admin staff after 15 minutes of inactivity.

---

## 6. Non-Functional Requirements (NFRs) & SLA

*   **Performance:** All API endpoints must return within 200ms (excluding AI pipelines). Resume tailoring must execute in <10 seconds.
*   **Uptime:** SLA guarantee of 99.9% uptime for Premium, Pro, and Enterprise tiers.
*   **Scalability:** Multi-tenant architecture with logical PostgreSQL isolation to handle 500,000+ active candidates.
*   **Rate Limits:** Standard endpoint protection against scraping and abuse:
    *   Free Tier: 60 requests/min.
    *   Premium Tier: 300 requests/min.
    *   Pro Tier: 1,000 requests/min.
