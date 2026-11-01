<div align="center">
  <img src="./jobin_logo_1781396131319.png" alt="JobIN Logo" width="150" />
  <h1>JobIN</h1>
  <p><strong>"Apply Smarter. Get Hired Faster."</strong></p>
  <p>An AI-powered SaaS platform that tailors resumes, generates cover letters, and tracks your job applications.</p>
</div>

---

## 📖 Overview

**JobIN** is an AI-powered SaaS platform designed to streamline the modern job search. It analyzes a candidate's uploaded resume alongside target job descriptions to generate ATS-optimized resumes and cover letters.

The platform features a full Kanban-style application tracker, robust admin portals, AI credit billing, and multi-tenant security powered by OCI Identity Domains.

## ✨ Key Features

- 🤖 **AI Resume Tailoring**: Instant ATS-optimization using Google Gemini AI.
- 📄 **AI Cover Letters**: Auto-generate personalized cover letters targeting specific hiring managers.
- 📊 **Application Tracker**: Visual Kanban board to track job pipelines (Applied, Interviewing, Offered).
- 💳 **Monetization & Credits**: Stripe-integrated billing with an "AI Credit" system.
- 🛡️ **Admin Portal**: Fully-featured dashboard for user management, support tickets, and metric tracking.
- ☁️ **Cloud Storage**: Private resume storage in OCI Object Storage using instance-principal authentication.

## 🛠️ Tech Stack

JobIN is built using a modern, decoupled monorepo architecture:

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS, Radix UI.
- **Backend**: NestJS 12, Node.js, TypeScript.
- **Database**: PostgreSQL, hosted on OCI for the OCI deployment.
- **ORM**: Prisma.
- **Authentication**: The web app offers Supabase email/password and Google sign-in, plus a separate OCI IAM Identity Domains OAuth 2.0/PKCE option. The API accepts both during the transition; Auth0 remains an optional alternative.
- **Storage**: OCI Object Storage (private bucket; the API issues short-lived, object-scoped download links).
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
Browser (Next.js) ──OCI access token───────────┐
                                               ├──> NestJS API ──Prisma──> PostgreSQL on OCI
Chrome extension ──Supabase token (migration)──┘        │
                                                ├──> OCI Object Storage (resume files)
                                                ├──> AI provider (resume/cover letter tasks)
                                                └──> Stripe (checkout, billing portal, webhooks)
```

### Services and responsibilities

1. **Web application (`apps/web`)** — Next.js App Router UI for registration, sign-in, resume management, AI tools, job tracking, billing, and admin pages. It uses OCI Identity Domains Authorization Code + PKCE by default and sends an API access token to the backend; ID tokens are not used for API authorization. Provider settings are in the corresponding `.env.example` files.
2. **Chrome extension (`apps/extension`)** — Manifest V3 extension. Its popup/options/side panel communicate with the extension service worker; the worker detects supported job pages, requests autofill data, and calls the same API endpoints as the web app. It defaults to Supabase Auth and supports OCI/Auth0 Authorization Code + PKCE using Chrome Identity. It does not connect directly to PostgreSQL or call AI providers.
3. **API (`apps/api`)** — NestJS is the trusted boundary for application data and privileged operations. `SupabaseAuthGuard` validates OCI and Auth0 access tokens; `oci_dual` also accepts Supabase tokens for clients that have not migrated and for the web app's separate Google sign-in option. It links verified identities to a JobIN `User`, checks account status, and attaches database roles to the request. A Supabase identity can match an existing JobIN user by email only after email confirmation; when the database record already has a Supabase ID, API requests continue using that canonical ID without replacing it. Controllers enforce endpoint authorization; services perform business logic.
4. **Database** — PostgreSQL stores JobIN users and roles, resumes and versions, applications, subscription and payment records, AI usage/credits, and admin configuration. The OCI deployment runs PostgreSQL in a private Docker volume on the OCI Always Free VM. Prisma schema and migrations are under `apps/api/prisma`; connection strings are supplied by `DATABASE_URL` and `DIRECT_URL`.
5. **Resume file storage** — Uploaded resume objects are stored in a private OCI Object Storage bucket; PostgreSQL stores object metadata, ownership, and keys. The API uses the OCI VM's instance principal for storage operations and issues short-lived, single-object download links after authorization checks.
6. **AI providers** — The API selects the configured provider/model and makes generation requests server-side. Admin-managed provider credentials are encrypted before persistence using `AI_SETTINGS_ENCRYPTION_KEY`; never expose provider keys to the web app or extension.
7. **Billing** — The API creates Stripe checkout/portal sessions and processes Stripe webhooks to update subscription/payment records. Stripe is the only customer payment method. Complimentary plans are assigned by an authorized administrator and are JobIN-managed rather than Stripe subscriptions.

### Typical request flows

- **Sign-in and protected API request:** The web app authenticates with OCI Identity Domains → OCI issues an access token → client sends `Authorization: Bearer <token>` to the API → API validates it using OCI signing keys and verified user info → API looks up or creates the linked JobIN user and roles → endpoint performs an owner-scoped operation through Prisma → response returns to the client.
- **Resume and AI:** Client uploads a resume through the API → API validates ownership and stores the file in OCI Object Storage, with metadata in PostgreSQL → user selects a resume and supplies a job description → API calls the configured AI provider, stores the tailored version and usage/credit data → client loads the generated result from the API.
- **Subscription:** Client asks the API to start checkout → Stripe handles payment → Stripe webhook calls the API → API verifies the webhook signature using the raw request body and updates PostgreSQL. Customers manage active Stripe subscriptions through Stripe's customer portal.
- **Extension application workflow:** Extension content scripts identify supported job pages and extract job details → service worker requests profile/resume data from the authenticated API → the extension fills supported forms and can save the application to the same account's tracker.
- **Admin:** The API checks the signed-in user's database role for every admin operation. Role assignment is restricted to super admins. Provider keys, payment settings, complimentary plans, and account operations are stored/processed server-side.

### Extension and deployment configuration

- Build the production extension with `VITE_API_URL=https://api.jobin.today/api` and `VITE_AUTH_PROVIDER=oci` in `apps/extension/.env.local`. The OCI extension client uses the same identity domain and user accounts as the web app, but it is a separate OAuth client. Its refresh token is stored in trusted extension storage and used to renew access tokens; users may need to sign in again if the identity provider revokes or expires that refresh token.
- Publish the extension to the Chrome Web Store and register its stable extension redirect URI with the OCI public OAuth client before enabling OCI sign-in. Set `VITE_OCI_METADATA_URL`, `VITE_OCI_CLIENT_ID`, and `VITE_OCI_API_SCOPE` for the extension build. The build adds the API and configured identity-provider origins to extension host permissions.
- Set `NEXT_PUBLIC_CHROME_EXTENSION_URL` in the web deployment to the public Chrome Web Store listing URL. Until the extension is published and this value is set, the web download page shows that the listing is coming soon.
- The extension manifest must include host permissions for the selected API and Supabase hosts. API calls originate from its extension service worker, not from a job-site content script; content scripts message the worker instead. Keep API authentication enabled—host permissions are not user authorization.
- The API's `CORS_ORIGIN` must list the deployed web app origin and local web origin used for development. The extension uses Chrome host permissions for service-worker cross-origin requests; do not solve integration issues by allowing arbitrary web origins.
- The current API deployment uses [`render.yaml`](./render.yaml), runs Prisma migrations before startup, and exposes `/api/health`. OCI Compute VM deployment files and the staged cutover instructions are in [`deploy/oci/README.md`](./deploy/oci/README.md). The web app is deployed separately to Vercel. Keep Render running as a rollback target until OCI is validated; do not copy production secrets into source control. After changing API code or API environment settings, deploy the active API service; after changing web or extension code, deploy the respective web app or publish a new extension build.

### Ten-minute inactivity timeout

The web app signs out an authenticated user after 10 minutes without pointer, keyboard, touch, wheel, or scroll activity. Activity timestamps are shared between tabs for the same signed-in user; returning to a hidden tab checks the elapsed time immediately. The timeout is client-side and does not replace API-side JWT validation or identity-provider token-expiry policies.

### OCI Identity Domains OAuth configuration

Regular users keep the configured web sign-in experience (Supabase email/password and Google, plus OCI when enabled). The admin portal uses Supabase email/password and its cookie-backed session independently of the user's OCI session. PostgreSQL, Prisma data, and JobIN roles remain independent of the identity provider. For an OCI API deployment that serves both user and admin sessions, keep `AUTH_PROVIDER=oci_dual`; it accepts OCI and Supabase tokens. Verified Supabase email can link to an existing OCI account while preserving its OCI subject.

1. Use the existing **Free** identity domain. Retrieve its OpenID discovery document from `https://<identity-domain-host>/.well-known/openid-configuration`; use the returned tenant-specific endpoints and JWKS URL. The issuer must match the discovered `https://identity.oraclecloud.com/` value. Enable **Configure client access** under the identity domain's signing-certificate settings so its public JWKS URL is readable without authentication; the JWKS contains public verification keys only.
2. Configure the `JobIN Web` public OAuth client for **Authorization Code + PKCE** and refresh tokens. Keep implicit flow disabled. Register `https://jobin.today` and `https://www.jobin.today` as redirect and post-logout URLs. A separate development client should be used for `localhost`.
3. To show Google alongside OCI on JobIN's sign-in and sign-up pages, configure the Google provider in Supabase and allow the deployed callback URL (for example, `https://jobin.today/auth/callback`) in Supabase's redirect URL settings. Keep `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured for the web build. Alternatively, Google can be configured under **Identity Providers → Social** in OCI to authenticate from OCI's hosted page; that is separate from the Google button provided by Supabase.
4. Register `https://api.jobin.today` as an API resource/audience in the identity domain and define a protected scope. In OCI's resource-server scope editor, enter `/jobin-api` (the console combines it with the audience); authorize the web client for the resulting full scope `https://api.jobin.today/jobin-api`. Use that full scope in `NEXT_PUBLIC_OCI_API_SCOPE`, and set `OCI_API_AUDIENCE` to `https://api.jobin.today`. OCI may emit the scope claim as `/jobin-api`; the API audience remains `https://api.jobin.today`. Never send an ID token to the API—the clients send the access token.
5. Enable OCI self-registration and verified-email enforcement if JobIN accounts are created through OCI. Password recovery and changes are then handled by the OCI-hosted sign-in page. The API links a verified OCI email to an existing JobIN record without replacing its legacy Supabase ID or roles.
6. Apply the additive OCI identity migration and generate the Prisma client before testing:

   ```bash
   npm run db:migrate:deploy --workspace=apps/api
   npm run db:generate --workspace=apps/api
   ```

7. Enable **Configure client access** under the OCI identity domain's **Settings → Access signing certificate**. This makes the domain's public signing keys available to clients without login. Set the non-secret metadata URL, public client ID, API scope, and API URL in Vercel Production. The web OIDC client retrieves keys through the API's cacheable `/api/auth/oci/jwks` endpoint. Configure `OCI_ISSUER`, `OCI_JWKS_URL`, `OCI_USERINFO_URL`, `OCI_API_AUDIENCE`, and `OCI_API_SCOPE` in the API environment. No OAuth client secret is needed for JWKS retrieval.
8. The Chrome extension OAuth client must be configured only after the extension has a stable Chrome Web Store ID. Register the exact `chrome.identity.getRedirectURL()` value for that extension, enable Authorization Code + PKCE and refresh tokens, and authorize the API scope. Build with `VITE_AUTH_PROVIDER=oci`; keep the API in `oci_dual` during migration, then verify all clients before switching to `oci` when Supabase Auth is no longer needed.
9. Test verified-email linking, user roles, web API calls, logout, Google sign-in, and account recovery. Do not change Vercel API URLs, DNS, or shut down Render as part of identity-provider setup.
10. Admin deletion of OCI identities requires a separate confidential management client with the OCI Identity Domains `urn:opc:idm:__myscopes__` token scope and only the user-management privilege needed to delete users. Store its ID and secret only as `OCI_MANAGEMENT_CLIENT_ID` and `OCI_MANAGEMENT_CLIENT_SECRET` in the API secret store. If these settings are absent, the admin API refuses deletion rather than deleting only the JobIN record.

### Optional Auth0 alternative

Auth0 is prepared as an alternative identity provider. PostgreSQL, Prisma data, user roles, billing, resumes, and application data stay in place. Do not paste client secrets into the frontend, extension, or repository.

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

To run JobIN locally, you need Node.js 20.19+ (or 22.12+), npm, an OCI Identity Domain OAuth client, PostgreSQL, and the service credentials for any enabled integrations.

### 1. Prerequisites

Ensure Node.js 20.19+ (or 22.12+) and npm are installed. Copy `apps/api/.env.example` to `apps/api/.env` and configure the database and OCI Identity Domain settings. Copy `apps/web/.env.example` to `apps/web/.env.local` and configure the public OCI and API URL variables.

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

### Stripe billing

Stripe Checkout is the only customer payment method. Configure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in the private API environment. Create active recurring Stripe Prices for each plan, currency (INR and GBP), and billing interval (monthly and yearly); enter the Price IDs at `/admin/payment-settings`. The API validates each Price against the configured Stripe account before saving. The webhook endpoint is `/api/billing/webhook`; configure it in Stripe to send checkout completion, subscription created/updated/deleted, and invoice payment succeeded/failed events.

Customers manage active Stripe subscriptions through the billing portal in their account settings. JobIN admins manage Stripe Price IDs and view billing analytics in the admin portal; manage refunds and disputes in the Stripe Dashboard. Never store Stripe secret keys in the web app, database, or source repository.

The `20261030_stripe_only_billing` Prisma migration deletes historical manual-payment requests, manually generated payment rows, and manual subscription records, then removes the manual-payment tables. This intentionally ends any active manual-payment access at migration time. Take a database backup and review affected users before applying it. Complimentary/admin-managed plans and Stripe subscriptions are preserved.

Monthly AI credit allowances are 20 for Free, 100 for Pro, and 500 for Pro Max. Apply the `20261023_update_monthly_ai_credit_limits` Prisma migration to update existing plan records.

### Admin access

The admin portal uses Supabase email/password and a cookie-managed Supabase session; regular users keep the configured OCI, Supabase email/password, and Google sign-in experience. Sign in at `/admin-login` with a Supabase account that exists in JobIN. The API must accept Supabase tokens (`AUTH_PROVIDER=oci_dual` on OCI deployments). From `apps/api`, assign the admin role after the user has signed in at least once:

```bash
npx ts-node prisma/seed-admin.ts --email=admin@example.com
```

Then open `/admin`. The API verifies the database role; a normal signed-in account does not have admin access. Admins can inspect users and their plans at `/admin/users`, grant or change a user's complimentary plan from that user's details panel, and finance admins can manage Stripe Price IDs at `/admin/payment-settings`.

Back up the database before applying the Stripe-only migration because it deletes manual-payment history and ends manually granted subscriptions. Apply pending schema migrations and regenerate Prisma Client before running or deploying the API:

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
