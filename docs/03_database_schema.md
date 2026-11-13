# JobIN Database Guide

**Reviewed:** 13 November 2026. The canonical schema is [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma); this guide summarizes its current models and relationships. It supersedes the earlier conceptual schema in this file, which contained unimplemented vectors, activity logs, and enterprise structures.

## Database and migration workflow

- Provider: PostgreSQL.
- Prisma schema: `apps/api/prisma/schema.prisma`.
- Connection settings: `DATABASE_URL` and `DIRECT_URL` in the API environment.
- Migrations: `apps/api/prisma/migrations/`; migrations are applied by the API production start command using `prisma migrate deploy`.
- Generate the client with `npm run db:generate --workspace=apps/api`.
- Apply local pending migrations only after checking which database the configured URLs target: `npm run db:migrate:deploy --workspace=apps/api`.
- Existing databases with tables but no `_prisma_migrations` history need baseline reconciliation before deployment. Never replay the initial schema against an existing production database.
- The schema is validated with Prisma; no database URL is embedded in source. Back up production data and review migration SQL before deploying changes.

## Model catalogue

### Identity, access, and audit

| Model | Purpose and key links |
|---|---|
| `User` | JobIN profile, provider subject IDs (`supabaseId`, `auth0Sub`, `ociSub`), account status, tenant ID, last login. Parent for resumes, applications, saved jobs, subscriptions, AI usage/credits, notifications, tickets, roles, and audit events. |
| `Role` | Named role such as `CANDIDATE`, `RECRUITER`, `SUPER_ADMIN`, `OPERATIONS_ADMIN`, `SUPPORT_ADMIN`, or `FINANCE_ADMIN`. |
| `Permission` | Unique action name and description, e.g. `billing:read` or `content:manage`. |
| `UserRole` | User ↔ role join; composite primary key `(userId, roleId)`. |
| `RolePermission` | Role ↔ permission join; composite primary key `(roleId, permissionId)`. |
| `AuditLog` | Admin/system action, target, before/after JSON, metadata, actor and IP string. Indexed by user, action, and timestamp. |

Super Admin is checked as a privileged role in the guard. The configurable role grants cover Operations, Support, and Finance roles. Assignment of user roles is not delegated through the role-permission editor.

### Plans, subscriptions, and payment records

| Model | Purpose and key links |
|---|---|
| `Plan` | Named subscription tier, monthly/yearly prices, currency, Stripe price fallback, enabled state, features and subscriptions. |
| `PlanFeature` | Key/value feature limits or settings attached to a plan. |
| `StripePriceConfig` | Stripe Price ID for a plan/currency/interval; unique per combination and Price ID. |
| `Subscription` | User and plan relation, Stripe subscription ID, lifecycle status, period bounds, cancellation fields, complimentary-access flag. Owns invoices and payments. |
| `Payment` | Payment intent/invoice reference, amount/currency/status, refund total, failure text and creation time. Relates to subscription. |
| `Invoice` | Stripe invoice and hosted/PDF URL references, paid amount and currency for a subscription. |
| `AICredits` | Optional per-user purchased/admin-granted AI credit balance, used amount, granting admin and optional expiry. |

Discount codes are created and managed in Stripe; the current database does not have a parallel promotion-code table. Payment amounts are `Float` in the current schema, not integer minor units.

### Resume and AI records

| Model | Purpose and key links |
|---|---|
| `Resume` | User-owned uploaded document metadata, object key/URL, parsed text, analysis JSON, default flag and ATS analysis field. |
| `ResumeVersion` | Tailored snapshot per resume with version number, content, report/keyword JSON, design/page-size options, scores and optional exported object key. Unique `(resumeId, versionNum)`. |
| `AIUsage` | User, optional resume, feature, model, token counts, estimated cost, tier and credit units. |
| `AIPlatformSettings` | Active provider/model and optional API base URL. |
| `AIProviderCredential` | Provider-indexed encrypted API key. Encryption key is configured separately in the API environment. |
| `CoverLetter` | User-owned generated letter, optional source resume, role/company, variant, content and word count. |

The API stores uploaded resume files in private object storage; PostgreSQL stores metadata, ownership, and object references. A stored URL/key is not a public authorization grant.

### Jobs and candidate activity

| Model | Purpose and key links |
|---|---|
| `Company` | Lightweight reusable employer record. |
| `JobApplication` | User-owned tracker entry with optional company, role/title, URL, status, dates, notes, source, salary and optional resume/letter IDs. |
| `SavedJob` | User bookmark for a job; optional company, URL, salary, posted and saved timestamps. |
| `JobListing` | Shared job-search catalogue item with source/board/external ID, title/company, location, work type, URL, description, tags, posting/active/seen timestamps. Unique `(source, sourceBoard, externalId)`. |
| `JobFeedSyncState` | Per-source/per-board attempt/success/next-run/error/count and short lock lease. Unique `(source, sourceBoard)`. |

Job search filters catalogue rows by active status and listing fields. Tracker data is separate and belongs to the user. Feed states enable independent retry/availability reporting and avoid marking unseen jobs closed after an incomplete source response.

### Support, notification, and public site content

| Model | Purpose and key links |
|---|---|
| `SupportTicket` | User-owned ticket, subject/body, status, priority, optional assignee and resolution time. |
| `TicketResponse` | Ticket conversation response, author ID and admin/user marker. |
| `Notification` | User-targeted email or in-app record, content, read/sent/created timestamps. |
| `SiteBanner` | Public announcement with text, optional paired link, variant, active window, creator and timestamps. |

Public support/contact forms currently route through Web3Forms and do not automatically create `SupportTicket` records. `Notification` records exist for admin sends; a full user-facing notification center is not implemented. `SiteBanner` is public only while active and within its optional schedule window.

## Enumerations

- `AccountStatus`: `ACTIVE`, `SUSPENDED`, `DELETED`.
- `SubscriptionStatus`: `ACTIVE`, `EXPIRED`, `CANCELLED`, `PAST_DUE`.
- `ApplicationStatus`: `SAVED`, `APPLIED`, `PHONE_SCREEN`, `INTERVIEW`, `TECHNICAL_ASSESSMENT`, `FINAL_ROUND`, `OFFER`, `REJECTED`, `WITHDRAWN`.
- `TicketStatus`: `OPEN`, `IN_PROGRESS`, `WAITING_ON_USER`, `WAITING_ON_INTERNAL_TEAM`, `RESOLVED`, `CLOSED`.
- `TicketPriority`: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- `NotificationType`: `EMAIL`, `IN_APP`, `PUSH` (current admin UI sends email or in-app).
- `CoverLetterVariant`: `STANDARD`, `CONCISE`, `DETAILED`, `HIRING_MANAGER`.

## Indexing, uniqueness, and deletion behavior

Read the schema for the exact constraints. Important unique keys include user email/provider subjects, role name, permission action, Stripe subscription/intent/invoice/price references, company name, source-board-external job identity, and per-resume version number. User-owned records cascade on user deletion where explicitly configured. `AuditLog.userId` is nullable and has no cascade rule so historical actions can remain.

The shared catalogue has compound source identity and active/posted, remote/posted, location, and source/active indexes. Feed sync state is unique by source/board and indexed for due/success checks. Do not assume every field has database row-level security; ownership is enforced in API service queries.

## Current exclusions

The active Prisma schema has no Pinecone/embedding, Elasticsearch, Redis cache/queue, `UserActivityLog`, `InterviewSession`, `SkillGap`, commission ledger, or email-verification boolean model. These appeared in older proposals or are future work. There is no organization membership/tenant schema beyond `User.tenantId`.
