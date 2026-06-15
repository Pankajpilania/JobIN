# Database Schema Design — JobIN

This document defines the relational database model, vector index structure, and caching keyspace configurations for the JobIN SaaS platform.

---

## 1. Prisma Relational Schema (PostgreSQL)

Below is the complete database schema defined for Prisma. It establishes multi-tenant constraints, billing structures, user trackers, audit logging, and AI token tracking.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ==========================================
// USER & ACCESS CONTROL MODULES
// ==========================================

model User {
  id                String             @id @default(uuid())
  email             String             @unique
  fullName          String
  passwordHash      String?            // Null if registered via OAuth (Google/LinkedIn)
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  status            AccountStatus      @default(ACTIVE) // ACTIVE, SUSPENDED, DELETED
  country           String?
  lastLoginAt       DateTime?
  tenantId          String?            // Links to Enterprise Org if applicable
  
  // Relations
  roles             UserRole[]
  subscriptions     Subscription[]
  resumes           Resume[]
  coverLetters      CoverLetter[]
  jobApplications   JobApplication[]
  savedJobs         SavedJob[]
  aiUsage           AIUsage[]
  aiCredits         AICredits?
  supportTickets    SupportTicket[]
  auditLogs         AuditLog[]
  activityLogs      UserActivityLog[]
  interviewSessions InterviewSession[]
  skillGaps         SkillGap[]
}

enum AccountStatus {
  ACTIVE
  SUSPENDED
  DELETED
}

model Role {
  id          String           @id @default(uuid())
  name        String           @unique // SUPER_ADMIN, OPERATIONS_ADMIN, SUPPORT_ADMIN, FINANCE_ADMIN, CANDIDATE
  permissions RolePermission[]
  users       UserRole[]
}

model Permission {
  id          String           @id @default(uuid())
  action      String           @unique // e.g. "users:read", "billing:write", "ai:bypass_limits"
  roles       RolePermission[]
}

model RolePermission {
  roleId       String
  permissionId String
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
}

model UserRole {
  userId String
  roleId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  role   Role   @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
}

// ==========================================
// BILLING & SUBSCRIPTIONS MODULE
// ==========================================

model Plan {
  id            String         @id @default(uuid())
  name          String         @unique // FREE, PREMIUM, PRO, ENTERPRISE
  stripePriceId String         @unique
  priceMonthly  Float
  priceYearly   Float
  currency      String         @default("GBP")
  features      PlanFeature[]
  subscriptions Subscription[]
}

model PlanFeature {
  id          String   @id @default(uuid())
  planId      String
  plan        Plan     @relation(fields: [planId], references: [id], onDelete: Cascade)
  featureKey  String   // "autofill_limit", "resume_versions", "ai_messages"
  value       String   // e.g. "100", "5", "unlimited", "true"
}

model Subscription {
  id                   String             @id @default(uuid())
  userId               String
  user                 User               @relation(fields: [userId], references: [id])
  planId               String
  plan                 Plan               @relation(fields: [planId], references: [id])
  status               SubscriptionStatus @default(ACTIVE) // ACTIVE, EXPIRED, CANCELLED, PAST_DUE
  stripeSubscriptionId String             @unique
  currentPeriodStart   DateTime
  currentPeriodEnd     DateTime
  cancelAtPeriodEnd    Boolean            @default(false)
  cancellationReason   String?
  createdAt            DateTime           @default(now())
  payments             Payment[]
  invoices             Invoice[]
}

enum SubscriptionStatus {
  ACTIVE
  EXPIRED
  CANCELLED
  PAST_DUE
}

model Payment {
  id             String       @id @default(uuid())
  subscriptionId String
  subscription   Subscription @relation(fields: [subscriptionId], references: [id])
  stripeIntentId String       @unique
  amount         Float
  currency       String
  status         String       // "succeeded", "failed"
  createdAt      DateTime     @default(now())
}

model Invoice {
  id             String       @id @default(uuid())
  subscriptionId String
  subscription   Subscription @relation(fields: [subscriptionId], references: [id])
  stripeInvoiceId String      @unique
  invoiceUrl     String
  pdfUrl         String
  createdAt      DateTime     @default(now())
}

// ==========================================
// RESUME & DOCUMENT MANAGER
// ==========================================

model Resume {
  id           String          @id @default(uuid())
  userId       String
  user         User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  title        String          // e.g. "Software Engineer Default"
  s3Url        String
  atsScore     Int             @default(0)
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
  versions     ResumeVersion[]
  applications JobApplication[]
}

model ResumeVersion {
  id         String   @id @default(uuid())
  resumeId   String
  resume     Resume   @relation(fields: [resumeId], references: [id], onDelete: Cascade)
  versionNum Int
  s3Url      String
  changes    String?  // Description of changes made
  createdAt  DateTime @default(now())
}

model CoverLetter {
  id             String           @id @default(uuid())
  userId         String
  user           User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  jobTitle       String
  companyName    String
  content        String           @db.Text
  createdAt      DateTime         @default(now())
  applications   JobApplication[]
}

// ==========================================
// JOB TRACKING & APPLICATIONS
// ==========================================

model JobListings {
  id              String           @id @default(uuid())
  title           String
  companyName     String
  location        String
  description     String           @db.Text
  salaryRange     String?
  sourceBoard     String           // "LinkedIn", "Reed", "Indeed"
  visaSponsorship Boolean          @default(false)
  url             String           @unique
  createdAt       DateTime         @default(now())
  applications    JobApplication[]
  savedJobs       SavedJob[]
}

model SavedJob {
  id           String      @id @default(uuid())
  userId       String
  user         User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  jobListingId String
  jobListing   JobListings @relation(fields: [jobListingId], references: [id], onDelete: Cascade)
  savedAt      DateTime    @default(now())

  @@unique([userId, jobListingId])
}

model JobApplication {
  id             String            @id @default(uuid())
  userId         String
  user           User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  jobListingId   String
  jobListing     JobListings       @relation(fields: [jobListingId], references: [id])
  resumeId       String?
  resume         Resume?           @relation(fields: [resumeId], references: [id])
  coverLetterId  String?
  coverLetter    CoverLetter?      @relation(fields: [coverLetterId], references: [id])
  status         ApplicationStatus @default(SAVED)
  appliedDate    DateTime?
  notes          String?           @db.Text
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt
}

enum ApplicationStatus {
  SAVED
  APPLIED
  PHONE_SCREEN
  INTERVIEW
  TECHNICAL_ASSESSMENT
  FINAL_ROUND
  OFFER
  REJECTED
  WITHDRAWN
}

// ==========================================
// AI TRACKING & UTILITY MODULES
// ==========================================

model AICredits {
  id        String   @id @default(uuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  remaining Int      @default(0)
  updatedAt DateTime @default(now())
}

model AIUsage {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  modelName String   // "gpt-4o", "claude-3-5-sonnet", "gemini-pro"
  promptTokens Int
  completionTokens Int
  estimatedCost Float
  createdAt DateTime @default(now())
}

model SupportTicket {
  id          String         @id @default(uuid())
  userId      String
  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  subject     String
  description String         @db.Text
  status      TicketStatus   @default(OPEN)
  priority    TicketPriority @default(MEDIUM)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  responses   TicketResponse[]
}

enum TicketStatus {
  OPEN
  IN_PROGRESS
  WAITING_ON_USER
  WAITING_ON_INTERNAL_TEAM
  RESOLVED
  CLOSED
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

model TicketResponse {
  id        String        @id @default(uuid())
  ticketId  String
  ticket    SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  senderId  String        // Maps to User ID (Agent or Customer)
  message   String        @db.Text
  isInternal Boolean      @default(false) // Admin internal notes
  createdAt DateTime      @default(now())
}

model AuditLog {
  id           String   @id @default(uuid())
  userId       String?  // Admin performing action
  user         User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  ipAddress    String
  action       String   // "user.suspend", "subscription.billing_override"
  targetEntity String   // e.g. "User ID: xxxxxxxx"
  beforeState  Json?
  afterState   Json?
  createdAt    DateTime @default(now())
}

model UserActivityLog {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  ipAddress String
  device    String
  action    String   // "login", "resume.tailored"
  createdAt DateTime @default(now())
}

model InterviewSession {
  id          String              @id @default(uuid())
  userId      String
  user        User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  roleTitle   String
  companyName String
  transcript  Json                // Array of messages in context
  createdAt   DateTime            @default(now())
}

model SkillGap {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  skillName   String
  category    String   // "Hard", "Soft", "Tool"
  recommendedLearning String // Links/Name of courses
  createdAt   DateTime @default(now())
}
```

---

## 2. PostgreSQL Indexing Strategy

To maintain sub-200ms page loads on transactional lists, the following indexes are generated:

*   **Composite Unique Key on User Saved Jobs:**
    `@@unique([userId, jobListingId])` -> Stops duplicate job saves, and indexes both paths.
*   **Logical Isolation Keys:**
    `CREATE INDEX idx_user_tenant ON "User"("tenantId");` -> Quick routing verification for corporate environments.
*   **Search Indices on Listings:**
    `CREATE INDEX idx_job_sponsor ON "JobListings"("visaSponsorship");` -> Boosts filtering speeds when toggling Skilled Worker tags.
*   **Application Pipeline Sorting:**
    `CREATE INDEX idx_app_status ON "JobApplication"("userId", "status");` -> Speeds up Kanban view rendering.

---

## 3. Pinecone Vector Database Schema

Semantic match calculations use a dedicated Pinecone vector index.

*   **Index Dimension:** 1536 (matching OpenAI `text-embedding-3-small` / `text-embedding-ada-002`).
*   **Distance Metric:** `Cosine Similarity`.
*   **Payload Metadata Structure:**
    ```json
    {
      "userId": "string (GUID mapping to Postgres User.id)",
      "resumeId": "string (GUID mapping to Postgres Resume.id)",
      "skills": ["string (comma separated clean tags)"],
      "experienceYears": "number",
      "preferredLocations": ["string"],
      "visaSponsorshipRequired": "boolean"
    }
    ```

---

## 4. Redis Keyspace Configurations

Redis is configured to run on port 6379 under AWS ElastiCache.

| Data Type | Keyspace Pattern | Purpose | Expiry Policy |
| :--- | :--- | :--- | :--- |
| **String** | `rate:limit:<ip_address>:<endpoint>` | API Protection (sliding window) | 60 seconds |
| **Hash** | `session:auth:<jwt_jti>` | Validated OAuth user states | 24 Hours |
| **Hash** | `chat:session:<user_id>:<session_id>` | AI Career Copilot context log | 7 days |
| **BullMQ** | `bull:<queue_name>:*` | BullMQ resume parsing task configurations | Managed by BullMQ library |
