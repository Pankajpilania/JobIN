# Dashboard QA findings

This log records issues found during local source review and browser testing with a user-provided
test session. The local Prisma database was initialized for API testing. The dashboard's
authenticated profile sync created one local user row; no application or resume records exist.

## Findings

1. **Protected dashboard routes were not protected.** Next.js did not register the root-level
   middleware because the app uses `src/app`. Anonymous requests could load `/dashboard`
   directly. Moved the middleware to `apps/web/src/middleware.ts`; verified that `/dashboard`
   and `/settings` redirect to sign-in in a production build.
2. **The sign-in aliases were blocked by the auth middleware.** The app links to `/auth/login`
   and `/auth/signup`, but neither route was in the public-route allowlist. Added both routes;
   verified `/auth/login` remains publicly accessible in the production build.
3. **The dashboard displayed a hard-coded `50 Credits` balance.** The top bar did not fetch a
   balance, so the displayed value could be wrong. Removed the placeholder until a real balance
   source is available.
4. **The notification bell was nonfunctional.** No user-facing notifications endpoint or action
   was wired to the button. Removed the misleading control pending a working notifications flow.
5. **Quick search did nothing.** The field had no state or submit behavior. It now filters
   dashboard pages and navigates to the first match on Enter.
6. **Dashboard API failures looked like valid empty data.** Statistics and resume cards defaulted
   to zero, while failed or pending activity requests appeared as an empty state. Cards now show
   loading/unavailable states, and failed requests display their error rather than claiming there
   is no data.
7. **Profile identity disappeared when the API was unavailable.** The dashboard greeting used
   Supabase metadata, but the sidebar and avatar only used the API profile response. Added a shared
   Supabase session profile fallback so dashboard identity remains consistent while the API is
   unavailable.
8. **The API initially had no local database or configuration.** The repository's existing setup
   is Prisma with PostgreSQL from Docker Compose. Started the existing PostgreSQL and Redis
   services, applied the Prisma schema to the fresh local database, and started the API on port
   4000. The API can verify Supabase bearer tokens using the public anon key when no service-role
   key is configured; this is sufficient for `auth.getUser()` and does not grant admin access.
9. **Action feedback was invisible throughout the app.** Pages called Sonner's `toast` API, but
   the root layout did not render its `Toaster`. Mounted a shared toaster so validation, success,
   and failure feedback is visible. API connection errors now show a concise message in the UI;
   the endpoint and underlying error remain available in the browser console.
10. **Closing the dashboard's Log Application dialog left its launch query in the URL.** A refresh
    reopened the dialog. Closing it now removes the one-shot `add=true` query, and the close icon
    has an accessible name and dialog semantics.
11. **Settings actions gave false feedback or represented unsaved values as functional.** The
    notification switches only changed local component state, plan and credit details were
    hard-coded, and the delete button only signed out. Removed the non-persistent switches and
    fabricated plan values, wired deactivation to the existing API endpoint, and made the API
    guard reject inactive accounts. The settings page now describes deactivation accurately; it
    does not claim to delete the Supabase account or erase retained data.
12. **Some account controls lacked accessible names and sign-out errors were ignored.** Added
    labels to settings inputs and the password-visibility control, and made sidebar sign-out
    failures visible instead of navigating as if sign-out succeeded.
13. **Interview voice input did not record anything.** Its button only changed local state and
    disabled typed answers. Removed the nonfunctional control and made the answer/send controls
    accessible by name.
14. **Interview coaching was presented as AI despite using local mock questions and randomized
    feedback.** Added a visible demo-mode notice clarifying that answers are simulated and not
    recorded or saved.

## Validation

- `npm run build --workspace=apps/web` passes.
- `npm run lint --workspace=apps/web` passes.
- Anonymous production smoke test: `/dashboard` and `/settings` redirect to `/sign-in`.
- Public production smoke test: `/auth/login`, `/auth/signup`, and `/sign-in` return HTTP 200.
- Authenticated browser test before backend startup: the dashboard identity rendered from the
  Supabase session, but API-backed cards showed explicit errors while the API was offline.
- Quick search filters results and Enter navigates to the selected page.
- Button interaction smoke test: View Tracker and Tailor navigation work; the dashboard Log
  Application action opens the form; tracker Kanban/List toggles and Add/Cancel work; submitting
  Tailor with no resume visibly reports its validation error.
- Log Application close test: the close button dismisses the dialog, removes `?add=true`, and a
  refresh does not reopen it.
- Settings review: notification controls are no longer presented as saved preferences, plan and
  credits are no longer fabricated, and profile deactivation uses the API instead of signing out
  only. Deactivation was not executed on the signed-in account.
- Settings password visibility control is labeled and can be toggled without changing account
  data.
- Interview validation and in-browser practice controls were tested without API writes. Removed
  the fake voice-recording control; the interface now identifies its simulated interview feedback.
- Cover-letter style selection and missing-resume validation both respond, with validation shown
  through the shared toast UI.
- Local backend health and readiness endpoints return HTTP 200; readiness confirms PostgreSQL
  connectivity.
- Reloaded the authenticated dashboard after starting the backend: API-backed stats and recent
  activity load successfully and show the expected empty state. The auth guard lazily synchronized
  the signed-in profile into the local database.
- Unauthenticated `GET /api/users/me` returns HTTP 401. The existing browser session loaded
  authenticated dashboard data after the backend started; no credentials were entered during
  verification.
- Prisma schema is applied to the local `jobin_db`; no migration files exist, so this local setup
  uses `prisma db push`. The local user, application, and resume tables contain zero records.
- The local database contains one lazily synchronized user profile and zero application/resume
  records. No application, resume, or account-setting mutations were submitted.
- PostgreSQL and Redis host ports are bound to loopback only.
- Mutating dashboard workflows remain untested.
