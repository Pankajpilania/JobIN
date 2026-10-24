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

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS, Radix UI.
- **Backend**: NestJS 12, Node.js, TypeScript.
- **Database**: PostgreSQL hosted on Supabase.
- **ORM**: Prisma.
- **Authentication**: Supabase Auth by default; staged OCI IAM Identity Domains OAuth 2.0/PKCE support is prepared while retaining PostgreSQL. Auth0 remains an optional alternative.
- **Storage**: Cloudflare R2 (S3-Compatible).
- **AI Engine**: Admin-configurable Gemini, OpenAI, Anthropic, DeepSeek, NVIDIA NIM, and hosted Ollama providers.

---

## 📂 Project Structure

This repository uses a workspace structure:

```text
JobIN/
├── apps/
│   ├── api/            # NestJS API and Prisma schema/migrations
│   ├── web/            # Next.js 16 web application
│   └── extension/      # Chrome extension (Manifest V3)
├── docs/               # Product and architecture documentation
└── render.yaml         # Render API service configuration
```

The root-level `backend/` and `frontend/` directories are legacy snapshots; active development and deployment use the `apps/` workspaces.

---

## 🧭 End-to-end architecture and data flow

```text
Browser (Next.js) ──Supabase/OCI/Auth0 token───┐
                                               ├──> NestJS API ──Prisma──> Supabase PostgreSQL
Chrome extension ──Supabase/OCI/Auth0 token────┘        │
                                                ├──> Cloudflare R2 (resume files)
                                                ├──> AI provider (resume/cover letter tasks)
                                                └──> Stripe (checkout, billing portal, webhooks)
```

### Services and responsibilities

1. **Web application (`apps/web`)** — Next.js App Router UI for registration, sign-in, resume management, AI tools, job tracking, billing, and admin pages. It defaults to Supabase Auth, with OCI Identity Domains Authorization Code + PKCE and Auth0 available after explicit configuration. It sends an API access token to the backend; ID tokens are not used for API authorization. Provider settings are in the corresponding `.env.example` files.
2. **Chrome extension (`apps/extension`)** — Manifest V3 extension. Its popup/options/side panel communicate with the extension service worker; the worker detects supported job pages, requests autofill data, and calls the same API endpoints as the web app. It defaults to Supabase Auth and supports OCI/Auth0 Authorization Code + PKCE using Chrome Identity. It does not connect directly to PostgreSQL or call AI providers.
3. **API (`apps/api`)** — NestJS is the trusted boundary for application data and privileged operations. `SupabaseAuthGuard` validates Supabase, OCI, and Auth0 access tokens; staged `oci_dual` mode accepts both OCI and Supabase tokens. It links verified identities to a JobIN `User`, checks account status, and attaches database roles to the request. Controllers enforce endpoint authorization; services perform business logic.
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

- The extension's current API endpoint defaults to `https://jobin-tmvb.onrender.com/api`; users can change it under **Extension Options → API Configuration**. Local development can override it with `VITE_API_URL=http://localhost:4000/api` in `apps/extension/.env.local`. The build adds the configured API origin to extension host permissions.
- The extension authenticates against the same Supabase project as the web app by default. OCI/Auth0 builds add Chrome Identity and only the configured identity-provider host permission. OCI client registration requires the extension's stable Chrome Web Store ID.
- The extension manifest must include host permissions for the selected API and Supabase hosts. API calls originate from its extension service worker, not from a job-site content script; content scripts message the worker instead. Keep API authentication enabled—host permissions are not user authorization.
- The API's `CORS_ORIGIN` must list the deployed web app origin and local web origin used for development. The extension uses Chrome host permissions for service-worker cross-origin requests; do not solve integration issues by allowing arbitrary web origins.
- The current API deployment uses [`render.yaml`](./render.yaml), runs Prisma migrations before startup, and exposes `/api/health`. OCI Compute VM deployment files and the staged cutover instructions are in [`deploy/oci/README.md`](./deploy/oci/README.md). The web app is deployed separately to Vercel. Keep Render running as a rollback target until OCI is validated; do not copy production secrets into source control. After changing API code or API environment settings, deploy the active API service; after changing web or extension code, deploy the respective web app or publish a new extension build.

### Ten-minute inactivity timeout

The web app signs out an authenticated user after 10 minutes without pointer, keyboard, touch, wheel, or scroll activity. Activity timestamps are shared between tabs for the same signed-in user; returning to a hidden tab checks the elapsed time immediately. The timeout is client-side and does not replace API-side JWT validation or identity-provider token-expiry policies.

### OCI Identity Domains OAuth migration (staged)

JobIN can use OCI IAM Identity Domains for web and extension sign-in while keeping Supabase PostgreSQL, Prisma data, and user roles. Supabase remains the default until OCI sign-in and API access are verified. The API supports `AUTH_PROVIDER=oci_dual` for staged testing with both Supabase and OCI tokens, then `AUTH_PROVIDER=oci` for an intentional full switch. Keep Render available for rollback until the OCI API and client integrations are verified.

1. Use the existing **Free** identity domain. Retrieve its OpenID discovery document from `https://<identity-domain-host>/.well-known/openid-configuration`; use the returned tenant-specific endpoints and JWKS URL. The issuer must match the discovered `https://identity.oraclecloud.com/` value. OCI protects the JWKS REST endpoint: an unauthenticated request returns `401`, while an authorized OCI access token can retrieve the signing keys.
2. Configure the `JobIN Web` public OAuth client for **Authorization Code + PKCE** and refresh tokens. Keep implicit flow disabled. Register only the production web origins as redirect and post-logout URLs. A separate development client should be used for `localhost`.
3. Register `https://api.jobin.today` as an API resource/audience in the identity domain and define a protected scope. In OCI's resource-server scope editor, enter `/jobin-api` (the console combines it with the audience); authorize the web client for the resulting full scope `https://api.jobin.today/jobin-api`. Use that full scope in `NEXT_PUBLIC_OCI_API_SCOPE` and `VITE_OCI_API_SCOPE`, and set `OCI_API_AUDIENCE` to `https://api.jobin.today`. OCI may emit the scope claim as `/jobin-api`; the API audience remains `https://api.jobin.today`. Never send an ID token to the API—the clients send the access token.
4. Enable OCI self-registration and verified-email enforcement if JobIN accounts are created through OCI. Password recovery and changes are then handled by the OCI-hosted sign-in page. The API links a verified OCI email to an existing JobIN record without replacing its legacy Supabase ID or roles.
5. Apply the additive OCI identity migration and generate the Prisma client before testing:

   ```bash
   npm run db:migrate:deploy --workspace=apps/api
   npm run db:generate --workspace=apps/api
   ```

6. Set the non-secret metadata URL, public client ID, API scope, and API URL in the matching web and extension environment variables. The web OIDC client and extension retrieve signing keys through the API's cacheable `/api/auth/oci/jwks` endpoint because OCI's JWKS URL requires authorization. Configure `OCI_ISSUER`, `OCI_JWKS_URL`, `OCI_USERINFO_URL`, `OCI_API_AUDIENCE`, and `OCI_API_SCOPE` in the API environment. Create a separate confidential OCI client for signing-key retrieval, assign the verified `Authenticated Client` application role (not Identity Domain Administrator), and set its `OCI_JWKS_CLIENT_ID` and `OCI_JWKS_CLIENT_SECRET` only in the API secret store. Oracle documents application-role grants to apps through the `/admin/v1/Grants` endpoint in [Working with Apps](https://docs.oracle.com/en/cloud/paas/identity-cloud/idcsa/WorkingWithApps.html). If the role is not available in the console picker, verify its exact role ID and assignment path with OCI before granting anything; do not substitute an administrator role. This built-in role is broader than key retrieval, so keep its credential backend-only and dedicated to this purpose. Do not reuse the public web/extension client or the user-deletion management client, and never put client secrets in the browser, extension, Git, or chat.
7. The Chrome extension OAuth client must be configured only after the extension has a stable Chrome Web Store ID. Register its exact `chrome.identity.getRedirectURL()` URI; the extension is not published yet, so this client registration remains pending. Build the extension with `VITE_AUTH_PROVIDER=oci` only after the client ID and API scope are set.
8. Test with the OCI API using `AUTH_PROVIDER=oci_dual`, then set the web and extension provider to `oci`. Verify verified-email linking, user roles, API calls, logout, account recovery, and extension flows. Switch the API to `AUTH_PROVIDER=oci` only after Supabase Auth is no longer needed. Do not change Vercel API URLs, DNS, or shut down Render as part of identity-provider setup.
9. Admin deletion of OCI identities requires a separate confidential management client with the OCI Identity Domains `urn:opc:idm:__myscopes__` token scope and only the user-management privilege needed to delete users. Store its ID and secret only as `OCI_MANAGEMENT_CLIENT_ID` and `OCI_MANAGEMENT_CLIENT_SECRET` in the API secret store, with `OCI_DOMAIN_URL` set to the identity-domain host. If these settings are absent, the admin API refuses deletion rather than deleting only the JobIN record.

### Optional Auth0 migration (staged; Supabase remains the default)

Auth0 is prepared as an alternative identity provider; enabling it is an explicit deployment cutover. Supabase-hosted PostgreSQL, Prisma data, user roles, billing, resumes, and application data stay in place. Do not change the provider variables until the Auth0 tenant and applications are configured and verified. Do not paste client secrets into the frontend, extension, or repository.

1. Create an Auth0 tenant, a **Single Page Application** for the web app, and an Auth0 **API** with identifier `https://api.jobin.today` (or the exact audience you will configure). Use RS256 JWTs.
2. Configure the SPA callback/logout/origin URLs for local development and the production web origin. The extension uses `chrome.identity.getRedirectURL()`; for a loaded unpacked extension it will be similar to `https://<extension-id>.chromiumapp.org/`. Add that exact URL to the Auth0 application's Allowed Callback URLs and add the extension origin where Auth0 requires it. Keep callback URLs limited to the known app origins.
3. Add a Post Login Action to the Auth0 flow so verified identity data is present in the API access token:

   ```js
   exports.onExecutePostLogin = async (event, api) => {
     const claim = 'https://jobin.today/';
     api.accessToken.setCustomClaim(`${claim}email`, event.user.email);
     api.accessToken.setCustomClaim(`${claim}email_verified`, event.user.email_verified === true);
     api.accessToken.setCustomClaim(`${claim}name`, event.user.name || '');
     api.accessToken.setCustomClaim(`${claim}picture`, event.user.picture || '');
   };
   ```

   The API rejects tokens without a verified email. Keep email verification enabled for the Auth0 database connection; existing JobIN rows are linked only after Auth0 reports the same verified email.
4. Apply the additive `auth0Sub` database migration before allowing Auth0 sign-in:

   ```bash
   npm run db:migrate:deploy --workspace=apps/api
   npm run db:generate --workspace=apps/api
   ```

5. Set non-secret provider values in the corresponding hosting/build environments using the three `.env.example` files: `NEXT_PUBLIC_AUTH0_DOMAIN`, `NEXT_PUBLIC_AUTH0_CLIENT_ID`, and `NEXT_PUBLIC_AUTH0_AUDIENCE` for web; `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, and `VITE_AUTH0_AUDIENCE` for the extension; and `AUTH0_DOMAIN` plus `AUTH0_AUDIENCE` for the API. Keep `AUTH_PROVIDER=supabase` and `NEXT_PUBLIC_AUTH_PROVIDER=supabase` until Auth0 is ready.
6. For a rollback-safe cutover, first configure the API with `AUTH_PROVIDER=dual` so it accepts verified Supabase and Auth0 tokens. Then deploy the configured web app and build/reload/publish the configured extension with `NEXT_PUBLIC_AUTH_PROVIDER=auth0` and `VITE_AUTH_PROVIDER=auth0`. Verify sign-in, email linking, roles, API access, extension access, and account recovery. Once Supabase login is no longer needed, set the API to `AUTH_PROVIDER=auth0`. Roll back by switching web and extension to `supabase` while the API remains `dual`.
7. Auth0 account deletion from the admin panel additionally requires a Machine-to-Machine application authorized for the Auth0 Management API with only the `delete:users` scope. Configure `AUTH0_MANAGEMENT_CLIENT_ID` and `AUTH0_MANAGEMENT_CLIENT_SECRET` only in the API host's secret store.

The extension's Auth0 manifest permissions are generated from its configured domain during the Vite build. After changing its Auth0 domain, rebuild the extension, add its Chrome Identity callback URL to Auth0, and reload the unpacked extension before testing.

---

## 🚀 Local Development Setup

To run JobIN locally, you need Node.js 20.19+ (or 22.12+), npm, and a Supabase project.

### 1. Prerequisites

Ensure Node.js 20.19+ (or 22.12+) and npm are installed. Copy `apps/api/.env.example` to `apps/api/.env` and configure the required local Supabase, database, and service settings. Copy `apps/web/.env.example` to `apps/web/.env.local` and configure its public Supabase and API URL variables.

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
