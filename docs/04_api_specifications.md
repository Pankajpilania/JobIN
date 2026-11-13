# JobIN API Reference

**Reviewed:** 13 November 2026. This is a controller-derived route map, not a generated OpenAPI contract. Source controllers and DTOs are authoritative. API base path is `/api`; local default is `http://localhost:4000/api`.

## Request and security conventions

- Protected routes take `Authorization: Bearer <provider access token>`.
- The NestJS `SupabaseAuthGuard` validates the configured identity provider(s), resolves the JobIN user, and rejects suspended/deleted accounts. The guard's name is historical; supported modes are configured through `AUTH_PROVIDER`.
- Admin routes add `AdminRoleGuard`, which requires an ACTIVE account and admin role, then checks the route permission or Super Admin role.
- JSON inputs pass through the global class-validator `ValidationPipe`: transform and whitelist are enabled, unknown properties are rejected.
- Global prefix is `/api`. Global throttle is 60 requests per minute; support chat has 6/minute and notification sends 2/minute.
- Successful `204` endpoints have no response body. Download endpoints return binary files. Errors use the API's standard JSON exception response; server errors conceal infrastructure details.

## Public and system routes

| Method | Path | Notes |
|---|---|---|
| `GET` | `/health` | Liveness status, timestamp, and process uptime. |
| `GET` | `/health/ready` | Database readiness; returns `503` when the database query fails. |
| `GET` | `/auth/oci/jwks` | Cacheable OCI public signing keys, with transient failures marked `no-store`. |
| `GET` | `/billing/checkout-options` | Publicly configured checkout plans/currencies/intervals. |
| `POST` | `/billing/webhook` | Stripe webhook; raw body signature verification. Configure required Stripe events. |
| `POST` | `/support/chat` | Public product-support chat; 6 requests/minute. Does not expose account-specific data. |
| `GET` | `/content/banners` | Active site banners within start/end time windows. |

## Signed-in user routes

| Method | Path | Request/behavior |
|---|---|---|
| `GET` | `/users/me` | Current profile. |
| `PATCH` | `/users/me` | Update supported profile fields. |
| `DELETE` | `/users/me` | Soft-delete current account (`204`). |
| `GET` | `/dashboard/summary` | Current-user dashboard data and plan usage. |
| `POST` | `/resumes/upload` | Multipart field `resume`; PDF, DOCX, or `.tex`, max 10 MiB. |
| `GET` | `/resumes` | List current user's resumes. |
| `GET` | `/resumes/:id` | Resume detail and authorized pre-signed download URL. |
| `PATCH` | `/resumes/:id` | Update title/default selection. |
| `DELETE` | `/resumes/:id` | Delete an owned resume (`204`). |
| `POST` | `/resumes/:id/analyse` | Analyze owned resume. |
| `POST` | `/resumes/:id/tailor` | Tailor for supplied role/job description; saves a version and evidence report. |
| `GET` | `/resumes/:id/versions` | List tailored versions. |
| `PATCH` | `/resumes/:id/versions/:versionId` | Save user edits to an owned version. |
| `GET` | `/resumes/:id/export/pdf` | PDF download; optional `versionId`, `template`, `pageSize`; response includes `X-PDF-Engine`. |
| `GET` | `/resumes/:id/export/docx` | DOCX download; supports the same version/template/page options. |
| `GET` | `/resumes/:id/export/latex` | LaTeX source download; supports the same version/template/page options. |
| `POST` | `/cover-letters/generate` | Generate and store a cover letter from validated inputs. |
| `GET` | `/cover-letters` | List current user's letters. |
| `GET` | `/cover-letters/:id` | Get one owned letter. |
| `DELETE` | `/cover-letters/:id` | Delete one owned letter (`204`). |
| `GET` | `/cover-letters/:id/export/pdf` | PDF download. |
| `GET` | `/cover-letters/:id/export/docx` | DOCX download. |
| `GET` | `/applications/stats` | Current user's application summary. |
| `GET` | `/applications/activity` | Recent application activity. |
| `POST` | `/applications` | Create an application tracker record. |
| `GET` | `/applications` | List applications; optional status filter. |
| `GET` | `/applications/:id` | Read owned application. |
| `PATCH` | `/applications/:id` | Update owned application fields/status. |
| `DELETE` | `/applications/:id` | Delete owned application (`204`). |
| `GET` | `/job-search` | Browse shared job catalogue. See filters below. |
| `POST` | `/job-search` | On-demand search public feeds; may import selected results into tracker according to request DTO. |
| `POST` | `/interview/question` | Generate personalized interview question; may spend an AI credit. |
| `POST` | `/interview/evaluate` | Evaluate candidate answer. |
| `GET` | `/billing/usage` | Current plan and AI credit usage. |
| `POST` | `/billing/create-checkout-session` | Create Stripe Checkout session. |
| `POST` | `/billing/portal` | Create customer-portal session. |

Resume routes check owner identity. Download responses are attachments and are not normal JSON. Tailoring alignment values are estimates, not a promise about an employer's ATS.

### Catalogue query

`GET /job-search` accepts typed query parameters defined in `apps/api/src/job-search/dto/browse-job-listings.dto.ts`: keyword query, location, remote-only, likely visa sponsorship, source, posting-age window, sort, page, and page size (capped at 100). Response includes paginated listings, source availability, and latest successful sync time. Sponsorship is inferred from listing wording, not a visa eligibility guarantee. Exact field names/enums should be read from the DTO to avoid duplicating validation rules here.

## Admin endpoints

All endpoints below require an active admin account and appropriate admin authorization. A Super Admin bypasses permission checks except the account must remain active.

| Method | Path | Authorization |
|---|---|---|
| `GET` | `/admin/access` | Any active admin role; returns role names and assigned permissions. |
| `GET` | `/admin/metrics` | `reports:dashboard` |
| `GET` | `/admin/users` | `users:read` |
| `GET` | `/admin/users/:id/activity` | `users:read` |
| `PATCH` | `/admin/users/:id` | `users:read`; service separately restricts status and billing changes; assigning roles requires Super Admin. |
| `DELETE` | `/admin/users/:id` | Super Admin; external identity/storage configuration may be required. |
| `GET` | `/admin/subscriptions`, `/admin/billing`, `/admin/stripe-prices` | `billing:read` |
| `POST` | `/admin/stripe-prices` | `billing:write` |
| `GET`, `POST` | `/admin/discount-codes` | `discounts:manage` |
| `PATCH` | `/admin/discount-codes/:id/deactivate` | `discounts:manage` |
| `POST` | `/admin/payments/:id/refund` | `payments:refund`; optional partial amount in Stripe minor units. |
| `GET`, `POST` | `/admin/ai-settings` | Super Admin |
| `GET` | `/admin/ai-usage` | `ai:read` |
| `GET` | `/admin/tickets` | `support:read_tickets` |
| `PATCH` | `/admin/tickets/:id` | `support:write_tickets` |
| `POST` | `/admin/tickets/:id/reply` | `support:write_tickets` |
| `POST` | `/admin/notifications/send` | `notifications:send`; 2/minute. |
| `GET`, `POST` | `/admin/content/banners` | `content:manage` |
| `PATCH`, `DELETE` | `/admin/content/banners/:id` | `content:manage`; DELETE deactivates the banner. |
| `GET` | `/admin/reports/users.csv` | `reports:users` |
| `GET` | `/admin/reports/billing.csv` | `reports:billing` |
| `GET` | `/admin/reports/subscriptions.csv` | `reports:subscriptions` |
| `GET` | `/admin/reports/ai-usage.csv` | `reports:ai` |
| `GET` | `/admin/roles` | Super Admin |
| `PATCH` | `/admin/roles/:id/permissions` | Super Admin; only Operations, Support and Finance roles are editable. `admin:access` must be retained. |

Admin notifications target one user or an audience resolved by the service. They create notification records and send email for email delivery. Public support/contact Web3Forms submissions are currently not automatically persisted as admin tickets.

## Database and deployment dependencies

The Prisma schema is the data contract. New admin capabilities require their migrations before the API is deployed: `20261113_admin_payment_management`, `20261113_admin_role_permissions`, and `20261113_admin_site_banners`. Do not apply migrations from this document; use the controlled environment deployment process. Existing databases without migration history may need baseline reconciliation.

See [`apps/api/README.md`](../apps/api/README.md) for job feed source limitations, resume processing dependencies, discount-code test mode, and deployment notes. See the [project guide](./17_current_project_guide.md) for environment setup, architecture, security controls and route-group overview.
