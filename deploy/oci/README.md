# Deploy the JobIN API to Oracle Cloud Infrastructure

This deploys only the NestJS API to an OCI Compute VM. Vercel continues to host the web app, Supabase PostgreSQL and Cloudflare R2 remain in place, and Supabase Auth stays active until the separately staged OCI Identity Domains migration is verified. Render remains available during the API migration and should not be removed until OCI has been verified.

## 1. Create the OCI VM

In the OCI Console, create an Ubuntu 24.04 Compute instance in your selected region. Choose a shape with enough memory for Node.js, Docker, Prisma migrations, and API workloads; check current regional availability and pricing rather than assuming a free-tier shape is available. Attach a reserved public IPv4 address so DNS does not change when the VM is restarted.

Create or attach a Network Security Group with ingress rules:

- TCP 22 from your trusted administrator IP range only.
- TCP 80 and 443 from the internet for Caddy's ACME HTTP/TLS challenges and HTTPS API traffic.
- Do not expose TCP 4000, PostgreSQL, Redis, or Docker management ports publicly.

Keep SSH private-key access secured. Do not copy API secrets into instance user-data, shell history, Git, or this repository.

## 2. Point DNS at OCI

Create an `A` record for the API hostname (for example, `api.jobin.today`) pointing to the reserved public IPv4 address. Wait for public DNS resolution before starting Caddy; Caddy obtains and renews the HTTPS certificate automatically.

## 3. Install Docker and check out the code

Connect to the instance as the Ubuntu account and install Docker Engine with the Compose plugin using Docker's official Ubuntu instructions. Verify `docker --version` and `docker compose version`.

Clone the repository to a durable directory, such as `/opt/jobin`, and check out the branch/revision to deploy. Do not use `sudo` for Git operations in the user's checkout. Build commands below assume the repository root is `/opt/jobin`.

## 4. Configure secrets on the VM

Create the runtime environment file from the template:

```bash
cd /opt/jobin
cp deploy/oci/.env.example deploy/oci/.env
chmod 600 deploy/oci/.env
${EDITOR:-vi} deploy/oci/.env
```

Set `API_DOMAIN`, `CORS_ORIGIN`, and all API credentials/connection strings. Copy values from the existing Render environment into the OCI VM's environment file using a secure channel; do not copy the attached local `.env.example` snapshot as though it contained production secrets. For Supabase PostgreSQL, use the existing production `DATABASE_URL` and `DIRECT_URL`. Keep `AUTH_PROVIDER=supabase` until OCI Identity Domains and the API resource scope are configured and verified; use `oci_dual` for staged testing before switching fully to `oci`.

The API's startup command applies pending Prisma migrations before serving traffic. Back up the production database and review pending migrations before the first OCI start. Do not run two copies of the API against the same database during a migration that is not safe for concurrent old/new application versions.

## 5. Start and verify OCI

```bash
cd /opt/jobin
docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml config
docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml up -d --build
docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml ps
docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml logs --tail=200 api caddy
curl --fail https://api.jobin.today/api/health
curl --fail https://api.jobin.today/api/health/ready
```

Use the actual value of `API_DOMAIN` in place of `api.jobin.today`. Confirm that `/api/health` responds and `/api/health/ready` reports a connected database. Then exercise authenticated endpoints and verify Stripe webhooks, email, R2 uploads/downloads, AI-provider calls, CORS from the web app, and extension API access. Check `docker compose ps` for healthy containers.

## 6. Cut over clients only after verification

The current web and extension defaults still point to Render. Do not switch them before OCI validation:

1. Update the Vercel production environment variable `NEXT_PUBLIC_API_URL` to `https://<API_DOMAIN>/api`, then redeploy the web app.
2. Set `VITE_API_URL=https://<API_DOMAIN>/api` in the extension build environment and build a new extension package. The build adds the API host permission and updates existing installs that still use the previous bundled Render URL; user-selected custom API URLs remain unchanged. Publish/reload that build.
3. Verify sign-in, core API operations, file uploads, AI generation, billing/Stripe webhooks, admin workflows, and extension operations against OCI.
4. Keep Render available as the rollback target until production traffic is confirmed healthy. Roll back clients by restoring their former API URLs.

The hostname-based HTTPS endpoint stays stable if the OCI instance IP is reserved. Point `CORS_ORIGIN` to the exact deployed web origins; do not allow all origins.

## 7. Updates, restart, and rollback

For a later code update, fetch and check out the intended revision on the VM, then run:

```bash
cd /opt/jobin
docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml up -d --build
docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml ps
```

View logs with `docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml logs -f api caddy`. Caddy certificate state is kept in the named Docker volumes and survives container replacement. Back up the VM configuration and database independently; containers are not a database backup.

If OCI fails, point Vercel and extension clients back to the Render API URL. Do not delete the Render service or its configuration until the OCI cutover and rollback window are complete.
