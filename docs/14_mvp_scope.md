# MVP Scope Definition — JobIN

This document defines the strict functional boundaries, database parameters, and performance targets for the JobIN MVP launch, ensuring a high-quality initial release.

---

## 1. Feature Boundary Matrix

To maintain launch velocity, features are categorized as **In-Scope (MVP)** or **Out-of-Scope (Future Phases)**.

### 1.1 In-Scope Features (MVP)
*   **Authentication:** Sign-up, Sign-in, and OAuth credentials using **Clerk**.
*   **Resume manager:** Single PDF upload, text parsing (pdf-parse), and basic ATS keyword analysis using **OpenAI GPT-4o**.
*   **Resume Tailoring:** Single-document tailoring based on copy-pasted job descriptions. Outputs a downloadable PDF.
*   **Cover Letter Generator:** AI-generated cover letters based on resume context, exportable to TXT format.
*   **Job Tracker:** Single-view list layout with 5 statuses: *Saved, Applied, Interview, Offer, Rejected*.
*   **Chrome Extension:** Manifest V3 popup script allowing users to save jobs to their tracker and autofill Greenhouse and Lever application forms.
*   **Stripe Integration:** Checkout redirects for Free and Premium tiers (\$19/mo).
*   **Admin Dashboard:** Searchable grid to view users, track remaining credits, and suspend/activate accounts.

### 1.2 Out-of-Scope Features (Deferred to Post-MVP)
*   Pinecone vector job feeds and semantic matching algorithms.
*   AI Mock Interview sessions (text and voice modes).
*   Skill Gap analyzers and Udemy/Coursera learning path recommendations.
*   UK job board index integrations (Reed, TotalJobs).
*   Enterprise SSO (Auth0) and custom subdomains.
*   Recruiter database search and posting portals.
*   Automated application engines.

---

## 2. MVP Database Schema (Subset of Prisma Schema)

The MVP database isolates core entities:

```
[User] --------< [Resume]
  |                 |
  |--< [JobApplication]
  |                 |
  |--< [CoverLetter]
  |
  +--- [AICredits]
```

*   **Tables Implemented:** `User`, `Role`, `UserRole`, `Resume`, `CoverLetter`, `JobApplication`, `AICredits`, `Payment`, `AuditLog`.
*   **Deferred Tables:** `PlanFeature`, `SavedJob`, `JobListings`, `SupportTicket`, `TicketResponse`, `InterviewSession`, `SkillGap`, `UserActivityLog`.

---

## 3. MVP API Endpoints Checklist

Only the following endpoints are built and secured:

| Endpoint | Method | Auth Required | Purpose |
| :--- | :--- | :--- | :--- |
| `/auth/login` | `POST` | No | Authenticate user credentials |
| `/auth/register` | `POST` | No | Register new candidate accounts |
| `/resumes/upload` | `POST` | Yes | Upload base PDF resume to S3 |
| `/resumes/tailor` | `POST` | Yes | Tailor resume to JD via GPT-4o |
| `/cover-letters/generate` | `POST` | Yes | Generate custom cover letter |
| `/applications` | `GET` | Yes | Fetch list of tracked job applications |
| `/applications` | `POST` | Yes | Create tracked job application card |
| `/applications/{id}` | `PATCH` | Yes | Update tracker status |
| `/admin/users` | `GET` | Yes (Admin) | Search users list grid |
| `/admin/users/{id}/suspend` | `POST` | Yes (Admin) | Suspend offending user accounts |

---

## 4. MVP Performance Targets

*   **API Response Latency:** Less than 300ms for standard database queries.
*   **Resume Tailoring Pipeline:** Less than 10 seconds to generate a tailored resume PDF.
*   **Autofill Accuracy:** 90%+ target fill rate on Greenhouse and Lever forms.
*   **System Uptime:** Target of 99.0% uptime during the initial launch phase.
