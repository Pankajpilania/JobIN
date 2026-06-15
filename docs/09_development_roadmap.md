# Development Roadmap — JobIN

This document defines the 12-month chronological roadmap for the JobIN SaaS platform, outlining core milestones, resource allocations, and architectural evolutions.

---

## 1. Roadmap Phases Overview

```
Months 1-3             Months 4-6             Months 7-9             Months 10-12
+---------------+      +------------------+   +-------------------+  +---------------------+
| Phase 1: MVP  | ---> | Phase 2: Core    | -> | Phase 3: Growth   | -> | Phase 4: Enterprise |
| Basic Autofill|      | Vector Match DB  |   | AI Interview Coach|  | White-Label & SSO   |
| Stripe & Auth |      | Kanban Tracker   |   | Skill Gap Paths   |  | SOC 2 Compliance    |
+---------------+      +------------------+   +-------------------+  +---------------------+
```

---

## 2. Phase Breakdown & Deliverables

### Phase 1 — MVP (Months 1–3): Foundation & Validation
*   **Focus:** Core resume analysis, basic tailoring, extension autofill helper, and billing.
*   **Deliverables:**
    *   Authentication via Clerk (Google/LinkedIn OAuth + Email credentials).
    *   Resume Upload API with simple text parsing (pdf-parse) and S3 integration.
    *   AI resume analyzer & tailoring pipeline using OpenAI GPT-4o.
    *   Chrome Extension v1 supporting job saving and basic Greenhouse + Lever form autofill.
    *   Stripe Billing Integration (Free and Premium subscription tiers).
    *   Admin dashboard skeleton listing users and credit balances.
*   **Infrastructure:** AWS ECS (Fargate) + Postgres RDS + single-node Redis cache.

### Phase 2 — Core Platform (Months 4–6): Vector Scaling & UX
*   **Focus:** Advanced matching database, interactive pipeline trackers, and extension side panel.
*   **Deliverables:**
    *   Full ATS scoring engine parsing complex layout patterns.
    *   Pinecone Vector Database integration for semantic match scores.
    *   Smart Job Feed aggregation via Elasticsearch indexing of scraped listings.
    *   Interactive Kanban board with Drag-and-drop animations and calendar syncing.
    *   AI Career Copilot chat workspace with memory buffers held in Redis.
    *   Chrome Extension v2 featuring the `chrome.sidePanel` and overlay match scores.
*   **Infrastructure:** Migration from AWS ECS to AWS EKS (Kubernetes) to support scaling.

### Phase 3 — Growth Features (Months 7–9): Interview Prep & UK Boards
*   **Focus:** Advanced AI simulation coaching, UK job boards, and automated workflows.
*   **Deliverables:**
    *   AI Skill Gap Analyzer recommending learning paths (Udemy, Coursera links).
    *   Alumni and recruiter referral network template generator.
    *   Text-based AI Mock Interview Coach grading candidate responses on a 10-point scale.
    *   UK-first job board indexers (Reed, TotalJobs, CV-Library APIs).
    *   Admin Support Ticket dashboard and refund management system.
    *   Multi-model orchestration routing to Anthropic Claude 3.5 Sonnet for resume rewrites.
*   **Infrastructure:** Dedicated Pinecone pods and Elasticsearch cluster expansion.

### Phase 4 — Scale & Enterprise (Months 10–12): Enterprise & Security
*   **Focus:** Enterprise SSO, multi-tenant subdomains, and SOC 2 Type II compliance audits.
*   **Deliverables:**
    *   Auth0 Integration supporting SAML SSO (Okta, Azure AD).
    *   White-label domains routing (e.g., custom candidate portal logos, custom styles).
    *   Automated Application Engine (submitting applications to approved matches).
    *   Voice mock interview coach utilizing web sockets and streaming APIs.
    *   SOC 2 compliance roadmap audit logging verification.
    *   Enterprise data deletion/export GDPR controls dashboard.
*   **Infrastructure:** Multi-AZ RDS configurations and AWS WAF Shield deployment.

---

## 3. Milestones & Resource Allocations

| Milestone | Target Month | Required Resources | Critical Risk | Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **M1: MVP Launch** | Month 3 | 1 Frontend, 1 Backend, 1 Devops | Extension rejection by Chrome Store | Use pre-release channels for early validation. |
| **M2: Semantic Search Live**| Month 5 | 1 Backend, 1 AI Engineer | High Pinecone query latency | Implement Redis cache layers on similar searches. |
| **M3: Interview Coach Live**| Month 8 | 1 Frontend, 1 AI Engineer | High AI token cost overhead | Route analysis to Gemini Pro; implement rate limits. |
| **M4: SOC 2 Readiness** | Month 11 | 1 Devops, 1 Security Auditor | Incomplete audit logs | Enforce Prisma audit logging hooks in Sprint 6. |
