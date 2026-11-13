# JobIN API

This is the NestJS 12 backend for the JobIN SaaS platform. API routes are prefixed with `/api`; see the [current project guide](../../docs/17_current_project_guide.md) and [API reference](../../docs/04_api_specifications.md) for the route, access-control, and data-model maps.

## Resume tailoring pipeline

The authenticated resume flow accepts PDF, DOCX, and `.tex` source files. PDF and DOCX text is extracted on the API; PDFs with little embedded text are sent to Poppler/Tesseract OCR (the production API image includes both). LaTeX is treated as source text and parsed without executing uploaded TeX commands. The tailoring model returns a validated profile, job requirement analysis, evidence links from rewritten claims back to original resume excerpts, missing requirement notes, and a role-alignment estimate. Estimates are informational and are not an employer ATS score or hiring prediction.

Tailored versions store the evidence report and chosen design/page settings. The dashboard lets users compare original and tailored text, edit and save a version, choose one of five single-column templates, select A4 or US Letter, and download PDF, DOCX, or editable LaTeX. PDF export tries the configured `LATEX_COMPILER` (Tectonic by default) with untrusted-input mode and validates the generated PDF; if the compiler is unavailable or fails, it falls back to the native ATS PDFKit renderer and reports that engine in the `X-PDF-Engine` response header. The production Docker image includes a checksum-pinned Tectonic compiler and prewarms its TeX bundle; local API hosts can install Tectonic and set `LATEX_COMPILER` to its executable path, or use the PDFKit fallback. Temporary OCR and TeX working files are removed after processing.

The resume tailoring migration is `20261112_resume_tailoring_report`. Recent admin feature migrations include `20261113_admin_payment_management`, `20261113_admin_role_permissions`, and `20261113_admin_site_banners`. Existing databases that have tables but no `_prisma_migrations` history need their baseline reconciled before `prisma migrate deploy`; the API's production start command applies pending migrations on startup. Review and back up the target database before applying production migrations.

## API deployment

The API production start command runs `prisma migrate deploy` before starting the server. Keep `DATABASE_URL` configured on the Render service so pending schema migrations are applied before requests reach the application. This also covers Render services whose Start Command is configured directly in the dashboard.

Use `GET /api/health` as a liveness probe and `GET /api/health/ready` as a PostgreSQL readiness probe. Configure uptime monitoring according to the selected hosting plan and provider's current recommendations; an external ping is not a substitute for a supported always-on service plan or a readiness/alerting strategy.

## Admin-managed AI providers

Set `AI_SETTINGS_ENCRYPTION_KEY` in the API environment before saving provider keys from Admin → AI settings. Generate a key with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"` and keep it stable; changing it makes previously encrypted provider keys unreadable. The key itself must never be committed or shared. Supported adapters are Gemini, OpenAI, Anthropic, DeepSeek, Groq, Kimi/Moonshot, NVIDIA, and Ollama. Ollama must use an endpoint reachable from the API service.

Stripe customer-portal management, refunds, and subscription cancellation require a valid `STRIPE_SECRET_KEY` on the API service. Admin user deletion is restricted to Super Admins and needs provider/storage-specific configuration to remove linked identity and stored resume objects; verify the configured auth-provider credentials before relying on full external cleanup.

## Admin permissions and new features

The API checks that an admin user is active and has an admin role. Most admin routes then require an explicit `Permission.action` grant. The `SUPER_ADMIN` role retains a guarded bypass for permission-gated routes; editing role grants, assigning user roles, permanently deleting users, and changing AI provider settings are Super Admin-only. Changes to roles, account status/billing, refunds, banners, notification sends, and reports write audit events where implemented.

The admin portal now includes user status/activity and plan tools, subscription/payment reports, full/partial Stripe refunds, discount-code management, public homepage banner scheduling, email/in-app notifications, streamed CSV exports, and an Operations/Support/Finance role editor. Apply the admin migrations listed above before using the matching endpoints. Public support/contact forms still use Web3Forms and do not automatically create rows in the admin ticket queue. There is no separate manual verification flag or commission ledger in the current schema.

## Public job search feeds

Job search uses the public Arbeitnow and Remotive feeds without board configuration. Optional employer-specific boards can be added as comma-separated public board names in `JOB_SEARCH_GREENHOUSE_BOARDS`, `JOB_SEARCH_LEVER_BOARDS`, and `JOB_SEARCH_ASHBY_BOARDS`. For Ashby, use the final path segment from the employer's `jobs.ashbyhq.com` URL. Configure the variables on the API service to enable those boards.

The shared job catalogue refreshes Arbeitnow and configured Greenhouse, Lever, and Ashby boards every six hours. The first sync starts when the API boots; later checks run every 30 minutes and only fetch feeds that are due. Failed feeds retry after 30 minutes. Each feed has its own lock and status, so overlapping API instances do not intentionally refresh the same board concurrently. Listings are marked closed only after a complete, successful snapshot; incomplete feeds never close unseen listings. Remotive remains available for on-demand search but is excluded from this shared catalogue sync because its [public API terms](https://remotive.com/remote-jobs/api) restrict republishing its listings on third-party job sites without permission.

## Discount codes and Stripe test verification

Finance admins create and deactivate global percentage codes in Admin → Discount codes. Each code can be valid once, for a limited number of months, or forever, and can have a UTC redemption cutoff and global redemption cap. Customers enter codes on Stripe Checkout. Checkout collects a payment method even when the first invoice is £0, because a finite 100% discount can be followed by a paid renewal. Stripe webhooks activate the subscription after Checkout completes; the invoice amount due is zero when a full discount applies, and a partial discount leaves the remainder due at checkout.

Run the focused API checks with `npm test --workspace=apps/api -- src/admin/dto/discount-code.dto.spec.ts src/admin/admin.service.discount-code.spec.ts src/billing/billing.service.spec.ts`.

To verify Stripe's test-mode behavior against temporary test objects, configure `STRIPE_SECRET_KEY` with an `sk_test_` key in `apps/api/.env`, then run from the repository root:

```sh
npm run verify:discount-codes:test-mode --workspace=apps/api
```

The script refuses live keys, checks 100% and 25% discounts against a £100 recurring test price, and verifies global scope, expiry, redemption caps, deactivation, payment-method collection, and a finite renewal duration. It expires open test Checkout sessions and deactivates/removes temporary test objects afterward. Keep production keys out of local test configuration.

### Configure employer boards

Board names are the path segment used by each provider's public job-board URL. Separate multiple board names with commas; invalid names are ignored, and at most 20 boards per provider are loaded.

```dotenv
JOB_SEARCH_GREENHOUSE_BOARDS=acme,exampleco
JOB_SEARCH_LEVER_BOARDS=acme,exampleco
JOB_SEARCH_ASHBY_BOARDS=Acme,ExampleCo
```

Leave a setting empty to disable that provider's company boards. The default Arbeitnow feed needs no configuration. These sources cover only the selected public feeds and configured employers; this is not a complete index of the job market. JobIN does not scrape LinkedIn, Indeed, or other sites that do not provide a suitable public feed here. Keep the original job link and provider attribution visible when showing a listing.

### Apply and verify the catalogue migration

For a new database, apply migrations from the repository root:

```sh
npm run db:migrate:deploy --workspace=apps/api
```

Check migration status with:

```sh
npm exec --workspace=apps/api -- prisma migrate status --schema=prisma/schema.prisma
```

The API starts catalogue sync only after both `JobListing` and `JobFeedSyncState` exist. An existing database that already has application tables but no `_prisma_migrations` history needs its baseline reconciled before running `migrate deploy`; do not replay the initial schema against that database. Once the migration is applied, the API starts the first feed refresh automatically. Check `GET /api/job-search` while authenticated for listing totals, each configured feed's availability, and `lastSyncedAt`.

Browse the synced catalogue with the authenticated `GET /api/job-search` endpoint. It accepts `query`, `location`, `remoteOnly`, `visaSponsorshipOnly`, `source` (`Arbeitnow`, `Greenhouse`, `Lever`, or `Ashby`), `postedWithin` (`24h`, `7d`, or `30d`), `sort` (`newest` or `relevance`), `page`, and `pageSize` (up to 100). The sponsorship filter checks listing titles, descriptions, and tags for positive sponsorship wording while excluding common explicit “no sponsorship” wording; it is a text-based signal, not a guarantee of eligibility. Matching listings include a `visaSponsorshipLikely` flag for the UI. Responses include pagination totals, source availability, and the most recent successful sync time. The existing authenticated `POST /api/job-search` endpoint remains for on-demand search and optional tracker imports.
