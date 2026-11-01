# JobIN Feature Matrix

**Audit date:** 2026-11-01
**Method:** Source inspection plus limited local browser smoke checks. No feature or business-logic changes were made for this audit.

## Status key

- **Working (source-wired):** implementation and a corresponding handler/API path are present. Unless explicitly stated, it has not been exercised end to end.
- **Partial:** some expected behavior is present, but a capability is incomplete, a dependency is absent, or known behavior is inconsistent.
- **Broken:** reproduced in local browser or confirmed from route/configuration wiring.
- **Untested:** source inventory alone does not establish behavior, or there is no test evidence.

The repo has no web E2E runner. No live sign-in, email delivery, AI provider request, Stripe payment, database mutation, or extension install was performed. API Jest specs cover selected service/controller units, not the web feature rows below.

## Marketing and public pages

| Route / surface | Interactive features and relevant state | Status | Evidence / limitation |
|---|---|---|---|
| `/` marketing | Landing sections; job filters/tabs; keyword search navigation; pricing and sign-up CTAs. | Working (source-wired); runtime untested | Search/filter state and submit handler are in `apps/web/src/app/page.tsx`; no E2E tests. |
| `/careers` landing | Audience toggle, feature menu/tabs, mobile menu, stats counters, mobile feature accordion, FAQ, quick search, CTA links. | Partial | Locally rendered and responsive smoke-tested. Audience toggle only changes its selected UI state; no employer destination/content change. Quick search passes query/location/remote mode through `/jobs`; hybrid/on-site and experience values are not consumed by the existing search page. Mobile feature panel does not truly collapse the selected first item. |
| `/careers` sample social proof | Count-up stats, job-hub totals, sample testimonial cards, expert quote. | Partial | Content explicitly marks numbers and testimonials illustrative. Replace with verified, authorized evidence before production. |
| `/jobs` search handoff | Carries title, location, work model, experience; redirects into existing authenticated search. | Partial | Title/location and Remote are mapped to existing controls. Work model other than Remote and experience are not applied by `/job-search`; the handoff does not automatically execute a search. |
| `/about` | Informational content/navigation. | Untested | Local route returned HTTP 200; no interactive flow. |
| `/extension` | Product information/extension CTA. | Untested | Local route not independently interaction-tested; actual install flow is not validated. |
| `/support` | AI chat calls `POST /api/support/chat`; support ticket uses Web3Forms; direct email fallback. | Partial | UI renders. API service test/build passed previously, but local API is unavailable; AI provider request and delivered support email were not tested. Tickets are email submissions, not records in the admin ticket database. |
| `/contact` | Contact form submits to Web3Forms; email fallback. | Partial | UI renders; no test email sent. Delivery depends on production Web3Forms access-key/inbox configuration. |

## Authentication and account access

| Route / surface | Interactive features and relevant state | Status | Evidence / limitation |
|---|---|---|---|
| `/sign-in` | Password sign-in; optional Google/OCI/hosted provider; password visibility; `next` redirect and error states. | Working (source-wired); runtime untested | Auth provider dispatch in `apps/web/src/app/sign-in/[[...sign-in]]/page.tsx`; no provider credentials/session used in audit. |
| `/sign-up` | Registration; optional provider signup; confirmation/resend states; safe same-origin return path. | Working (source-wired); runtime untested | Auth dispatch in `apps/web/src/app/sign-up/[[...sign-up]]/page.tsx`; email/provider verification not exercised. |
| `/auth/login`, `/auth/signup` | Compatibility auth routes. | Untested | Route files exist; behavior depends on their source/provider configuration. |
| `/admin-login` | Admin credential sign-in, password visibility, loading/error. | Working (source-wired); runtime untested | Credentials and admin authorization were not exercised. |
| `/forgot-password` | Supabase reset-email request; hosted-provider guidance. | **Broken (unauthenticated route)** | Local unauthenticated navigation redirects to `/sign-in`; proxy public-route allowlist does not include `/forgot-password`. |
| `/reset-password` | New password and confirmation; mismatch/provider errors; update then redirect. | **Broken (unauthenticated route)** | Local unauthenticated navigation redirects to `/sign-in`; proxy public-route allowlist does not include `/reset-password`. Reset links cannot reach this screen in the tested state. |
| `/auth/callback` | Same-origin redirect validation, Supabase code exchange, error redirect. | Partial | Source path is implemented; no real OAuth/confirmation exchange tested. |
| Protected-route redirect | Unauthenticated dashboard/admin access redirects to sign-in/admin-login. | Partial | Proxy and layouts implement checks; no full provider/session matrix tested. |

## User dashboard and job workflow

| Route / surface | Interactive features and relevant state | Status | Evidence / limitation |
|---|---|---|---|
| `/dashboard` | KPI loading/error/empty states, activity feed, plan/credit panel, navigation links. | Working (source-wired); runtime untested | Uses dashboard summary/profile hooks and animated counters; no API/browser session. |
| `/job-search` | Keyword/location search, remote-only, auto-import, result/source error display, tracker cache invalidation. | Working (source-wired); runtime untested | `POST /api/job-search` integration is present; providers and authenticated search were not exercised. |
| `/tracker` | Add/edit/delete application; board/list view; drag-and-drop status; sorting/filtering; detail dialog; toasts. | Working (source-wired); runtime untested | Uses application CRUD hooks and dnd-kit. Dialog focus trap/Escape/mobile behavior and mutations were not tested. |
| `/resume` | Resume entry/redirect behavior. | Untested | Route exists; no user flow was exercised. |
| `/resumes` | PDF/DOCX upload; size/type validation; list; analyze; set default; delete; detail navigation. | Working (source-wired); runtime untested | Uses `react-dropzone` and API hooks. No upload or API mutation performed. |
| `/resumes/[id]` | Resume detail, edit/analysis/version/export controls. | Working (source-wired); runtime untested | API endpoints exist; no detail fixture or download tested. |
| `/tailor` | Resume/job-description input; AI tailor; keyword/result tabs; suggestions. | Working (source-wired); runtime untested | Uses tailor hook; provider response/export behavior not exercised. |
| `/cover-letter` | Generate variants; choose resume; view/manage history; export. | Working (source-wired); runtime untested | Uses cover-letter hooks and API exports; no generation/download tested. |
| `/interview` | Generate question, answer/evaluate, session/credit state. | Working (source-wired); runtime untested | Uses interview endpoints; provider and credit behavior not tested. |
| `/settings` | Update profile; password controls; delete account; sign out; plan/credit controls. | Working (source-wired); runtime untested | Mutations and destructive confirmation/recovery flows not tested. |
| `/upgrade` | Select plan, GBP/INR currency and monthly/yearly interval; load configured prices; create Stripe Checkout; checkout return/error states. | Partial | Frontend/API path exists, but live configured prices, signed-in checkout, success, failure, cancellation, and portal flows were not exercised. |
| Billing portal / invoices | Portal launch from plan/credits panel; Stripe-hosted subscription/payment/invoice management. | Partial | API and UI link exist; external portal not opened. No in-app invoice-list route found. |

## Admin features

All routes below are protected by the admin layout/check, but no authenticated admin session or live API was used.

| Route / surface | Interactive features and relevant state | Status | Evidence / limitation |
|---|---|---|---|
| `/admin` | Metrics overview. | Untested | Fetch/loading/error wiring exists; data endpoint not called in this audit. |
| `/admin/ai-settings` | Load/save provider/model/base URL/key settings. | Working (source-wired); runtime untested | Admin API calls present; no credentials changed. |
| `/admin/ai-usage` | Load and inspect usage analytics. | Untested | Page/API wiring present; no data load test. |
| `/admin/billing` | Revenue, subscriptions, invoice payment analytics/charts. | Untested | Page/API wiring present; no data load test. |
| `/admin/payment-settings` | Load/edit/save Stripe prices. | Working (source-wired); runtime untested | API calls present; no Stripe configuration changed. |
| `/admin/subscriptions` | List/search/filter/paginate and update user subscription/plan access. | Working (source-wired); runtime untested | API calls and edit controls present; mutations not tested. |
| `/admin/tickets` | List/filter tickets; detail panel; status update; email reply; notification compose/send. | Partial | Admin API actions exist. Public support submissions currently use Web3Forms and are not persisted to these ticket records, so these flows are not connected end to end. |
| `/admin/users` | Search/filter/paginate, inspect activity, edit credits/plan, delete. | Working (source-wired); runtime untested | Admin API calls present; destructive/update flows not tested. |

## Shared feedback and platform states

| Feature | Status | Finding |
|---|---|---|
| Toasts | Partial | Sonner is globally mounted and used, but transition and glass styling are not centrally specified or tested. |
| Skeletons/loading | Partial | A pulse skeleton component and route-local loading states exist; shimmer, reduced motion, and coverage are inconsistent. |
| Empty/error pages | Partial | Some data pages have local error/empty states and a global error retry exists. There is no custom 404, no route-local error boundaries, and no global loading route. |
| Dialog/drawer behavior | Untested | Interactions are implemented in page-local components; no automated focus, keyboard, screen-reader, or narrow-screen dialog tests exist. |
| Search/pagination/export | Partial | Several pages implement these capabilities. Coverage differs by page; no end-to-end test verifies filtering, pagination boundaries, export contents, or downloads. |
| App/mobile browser install | Untested / absent | No PWA manifest or install test found. |

## API capability inventory

Source declares these API feature families: `/api/health`, `/api/auth/oci/jwks`, `/api/users/me`, `/api/dashboard/summary`, `/api/resumes`, `/api/applications`, `/api/job-search`, `/api/cover-letters`, `/api/interview`, `/api/billing`, `/api/support/chat`, and `/api/admin`. Methods cover CRUD, upload, exports, AI generation, Stripe checkout/portal/webhook, and admin ticket/user/billing operations. Unit test files exist for selected API services and guards; there is no route-wide contract/E2E coverage.

## Prioritized gaps

1. **P0 — Restore password recovery access:** add intended reset pages to public route handling, then test request → email/callback → update password for every configured auth provider.
2. **P1 — Add a web E2E baseline:** Playwright route/feature coverage for sign-in/out, job tracking, resume upload/export, settings, support ticket, checkout mocks, and admin access.
3. **P1 — Connect support intake:** decide whether support forms must also persist to `SupportTicket`; currently they bypass admin ticket management.
4. **P1 — Close current landing search/audience gaps:** honor all submitted search filters and make the audience toggle meaningful or remove it.
5. **P1 — Validate paid flows:** test checkout/portal with Stripe test mode, including GBP/INR availability, cancellation, failure, return, and invoice access.
6. **P2 — Test dynamic data features:** mock and assert loading, empty, error, pagination, upload rejection, CRUD, and export states.
7. **P2 — Define accessibility behavior for local dialogs:** focus entry/return, Tab loop, Escape, announce updates, touch targets, and mobile sizing.
8. **P3 — Remove placeholder social proof before launch:** replace illustrative figures, testimonials, and expert quote with verified content or remove them.
