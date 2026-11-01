# JobIN Route Inventory

**Audit date:** 2026-11-01
**Scope:** Read-only source review of the web app, API route declarations, and available local browser smoke tests. No application code was changed for this audit.

## Stack and routing

- **Web:** Next.js 16 App Router, React 19, TypeScript. Source is under `apps/web/src/app`; route groups `(dashboard)` and `(admin)` do not appear in URLs.
- **Styling:** global CSS variables and CSS, Tailwind configuration, inline styles, and CSS modules on the new `/careers` page. Framer Motion is installed and used by selected routes, not globally.
- **State/data:** local React state, TanStack Query hooks, `apiClient`, auth hooks, Supabase/OCI/Auth0 adapters, and Sonner toasts.
- **API:** NestJS under `apps/api/src`, global `/api` prefix, Supabase auth guards on most user/admin endpoints.
- **Mobile:** no separate mobile app folder was found. The website uses responsive CSS. No web manifest/PWA declaration or viewport metadata was found in the inspected web app source.
- **Tests:** API Jest specs exist. No web Playwright config, web E2E suite, axe suite, or audit/validate scripts were found. `.github/workflows` currently contains an OCI deployment workflow, not a validation workflow.

## Web pages and route files

| URL | Source | Purpose and major UI states |
|---|---|---|
| `/` | `apps/web/src/app/page.tsx` | Marketing homepage: hero, job search/filter tabs, feature/process content, pricing, CTAs, and footer. |
| `/careers` | `apps/web/src/app/careers/page.tsx` | Additional marketing page: responsive nav, hero, stats, job hub, feature tabs/accordion, testimonials, FAQ, quick search, footer. Some metrics and testimonials are illustrative placeholders. |
| `/jobs` | `apps/web/src/app/(dashboard)/jobs/page.tsx` | Search handoff route that redirects to `/job-search` with supported query parameters. It is an intermediate route, not a separate search experience. |
| `/about` | `apps/web/src/app/about/page.tsx` | Public informational page. |
| `/extension` | `apps/web/src/app/extension/page.tsx` | Public extension overview/download CTA. |
| `/support` | `apps/web/src/app/support/page.tsx` | Public AI support chat and Web3Forms support ticket form; a direct email fallback is shown. |
| `/contact` | `apps/web/src/app/contact/page.tsx` | Public Web3Forms contact form and email fallback. |
| `/sign-in` | `apps/web/src/app/sign-in/[[...sign-in]]/page.tsx` | Public email/password and configured provider sign-in; optional Google and OCI actions depend on environment. |
| `/sign-up` | `apps/web/src/app/sign-up/[[...sign-up]]/page.tsx` | Public sign-up, provider sign-up, email confirmation/resend path. |
| `/auth/login` | `apps/web/src/app/auth/login/page.tsx` | Legacy/compatibility auth route; see source for provider-specific behavior. |
| `/auth/signup` | `apps/web/src/app/auth/signup/page.tsx` | Legacy/compatibility auth route; see source for provider-specific behavior. |
| `/admin-login` | `apps/web/src/app/admin-login/page.tsx` | Public admin sign-in UI with password visibility and auth errors. |
| `/forgot-password` | `apps/web/src/app/forgot-password/page.tsx` | Password reset request for Supabase; hosted provider path directs users to provider sign-in. |
| `/reset-password` | `apps/web/src/app/reset-password/page.tsx` | Password update form for a valid reset session. |
| `/auth/callback` | `apps/web/src/app/auth/callback/route.ts` | OAuth/email confirmation callback; exchanges Supabase code and redirects to a validated same-origin target. |
| `/dashboard` | `apps/web/src/app/(dashboard)/dashboard/page.tsx` | Authenticated KPIs, activity, profile/plan credits, quick links, and empty/loading/error states. |
| `/job-search` | `apps/web/src/app/(dashboard)/job-search/page.tsx` | Authenticated search by keyword/location, remote and auto-import options, result/source status. |
| `/tracker` | `apps/web/src/app/(dashboard)/tracker/page.tsx` | Application tracker in board/list views; create/update/delete, status drag-and-drop, sorting/filtering, detail/add dialogs. |
| `/resume` | `apps/web/src/app/(dashboard)/resume/page.tsx` | Resume-related entry route; inspect the route implementation for its redirect/content behavior. |
| `/resumes` | `apps/web/src/app/(dashboard)/resumes/page.tsx` | Resume upload, list, analysis, default selection, removal, and export/detail navigation. |
| `/resumes/[id]` | `apps/web/src/app/(dashboard)/resumes/[id]/page.tsx` | Resume detail/editing, versions, analysis/tailoring, and PDF/DOCX/LaTeX export actions as implemented. |
| `/tailor` | `apps/web/src/app/(dashboard)/tailor/page.tsx` | Tailor a selected resume for a job description; results, keyword analysis, original/tailored tabs. |
| `/cover-letter` | `apps/web/src/app/(dashboard)/cover-letter/page.tsx` | Generate and manage cover letters, variants/history, exports. |
| `/interview` | `apps/web/src/app/(dashboard)/interview/page.tsx` | AI interview question/answer practice and evaluation. |
| `/settings` | `apps/web/src/app/(dashboard)/settings/page.tsx` | Profile, password/account controls, plan/credits, sign-out and destructive actions. |
| `/upgrade` | `apps/web/src/app/(dashboard)/upgrade/page.tsx` | Plan/currency/interval selection, price availability, Stripe checkout. Billing portal action is in the shared plan/credits panel. |
| `/admin` | `apps/web/src/app/(admin)/admin/page.tsx` | Admin overview metrics. |
| `/admin/ai-settings` | `apps/web/src/app/(admin)/admin/ai-settings/page.tsx` | Configure active AI provider/model/credentials/base URL. |
| `/admin/ai-usage` | `apps/web/src/app/(admin)/admin/ai-usage/page.tsx` | AI usage metrics/history. |
| `/admin/billing` | `apps/web/src/app/(admin)/admin/billing/page.tsx` | Billing/revenue/subscription analytics. |
| `/admin/payment-settings` | `apps/web/src/app/(admin)/admin/payment-settings/page.tsx` | Configure Stripe plan prices. |
| `/admin/subscriptions` | `apps/web/src/app/(admin)/admin/subscriptions/page.tsx` | Inspect/manage user subscriptions and grant/update plan access. |
| `/admin/tickets` | `apps/web/src/app/(admin)/admin/tickets/page.tsx` | Admin ticket list/detail, reply/status updates, notifications. |
| `/admin/users` | `apps/web/src/app/(admin)/admin/users/page.tsx` | Admin user search/pagination, activity, plan/credit updates, removal. |

## Framework-level and non-page states

| State | Implementation/evidence | Audit note |
|---|---|---|
| Not found / 404 | No `not-found.tsx` was found. | Next.js fallback is used; no branded 404 screen was identified. |
| Global runtime error | `apps/web/src/app/global-error.tsx` | Sentry capture and a retry action exist. No nested route `error.tsx` boundaries were found. |
| Loading | No App Router `loading.tsx` files were found. | Individual pages use local loading state; the dashboard layout also has a brief mount spinner. |
| Toasts | Sonner is mounted in `apps/web/src/app/layout.tsx`; page/API handlers call `toast.*`. | Global toast surface exists, but glass/motion behavior is not centralized. |
| Dialogs/panels | Tracker add/edit dialogs and admin ticket/notification panels are locally implemented. | Not all use a common dialog primitive; focus, Escape, reduced motion, and mobile behavior need route-level tests. |
| Billing/invoices | No dedicated invoice page or invoice-download route was found. Stripe portal API supports invoice management; a shared plan/credits panel links to the portal. | Invoice access is via external customer portal, not an in-app invoice screen. |
| Notifications | Admin notification send UI/API exists. | No user-facing notification center route was found. |
| Profile/onboarding | Profile editing is included in Settings; signup captures account details. | No standalone profile or onboarding route was found. |
| API-only routes | Controllers include health/readiness, auth JWKS, user profile, dashboard summary, resumes, job tracking/search, cover letters, interview, billing, support AI, and admin operations. | API handlers are not web pages and are listed in the Feature Matrix. |

## Local browser smoke performed

- `http://localhost:3000/`, `/careers`, `/support`, `/contact`, `/about`, `/sign-in`, and `/sign-up` returned HTTP 200 in the local browser.
- `/careers` rendered at 360, 390, 430, and 768 CSS pixel viewport widths with no horizontal overflow in the tested DOM width check.
- At 390px, the `/careers` mobile menu opened, initially moved focus into the drawer, and closed on Escape. Full keyboard-cycle/focus restoration and screen-reader testing were not performed.
- `/forgot-password` and `/reset-password` redirected to `/sign-in` in the local unauthenticated browser. This is a confirmed route accessibility defect for reset flows (see Feature Matrix).
- No logged-in session, configured local API, Stripe test account, or extension runtime was used. Dynamic API, auth, payment, and browser-extension workflows remain unverified.

## Important scope notes

- Statuses in the accompanying reports are based on source evidence, with the limited smoke-test results above called out separately. “Working” means the source contains a connected UI-to-handler/API path; it does **not** mean the production integration has been exercised.
- This inventory describes the current worktree, including the uncommitted `/careers` route and recent support/contact additions.
