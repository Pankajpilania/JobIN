# Deploy JobIN to OCI Always Free

This stack is designed to run the Next.js website, NestJS API, PostgreSQL, and Caddy on one OCI Compute VM:

- `jobin.today` and `www.jobin.today` serve the website.
- `api.jobin.today` serves the API.
- PostgreSQL is self-hosted on the VM and is not exposed to the internet.
- Supabase Auth, Cloudflare R2, Stripe, Resend, and configured AI providers remain external integrations. OCI Identity Domains remains staged; do not switch authentication until its signing-key access and production login flow are verified.

This is a single-VM design, not a managed-database or high-availability setup. The OCI VM has not been production-verified, so do not change production DNS or remove the existing Render/Vercel services until the final checklist passes.

## 1. Check Always Free eligibility and create the VM

Oracle documents the Always Free Ampere A1 allocation as up to 2 OCPUs and 12 GB of memory total, plus 200 GB of block-volume storage. A 47 GB boot volume is the documented minimum. Availability and any existing tenancy usage can reduce what is available. See [OCI Always Free resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) and [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/).

1. In the OCI Console, select `VM.Standard.A1.Flex`, allocate no more than the remaining Always Free OCPU/memory allowance, and select Ubuntu 24.04.
2. Confirm the shape is explicitly marked Always Free eligible and the final estimate does not use trial credits or include paid resources. Check the public IPv4 and reserved-IP costs too; stop if any charge is shown.
3. Keep total boot and block volumes within the tenancy's remaining Always Free storage. Do not create a paid load balancer or a separate paid database.
4. Use the existing public subnet only after confirming its route to the Internet Gateway and its security rules. Allow TCP 22 only from the administrator's trusted IP range, and TCP 80/443 from the internet. Do not allow inbound TCP 4000 or 5432.
5. Attach a stable public IP only if the Console confirms it remains within the free allowance. Keep the SSH private key local.

OCI Always Free resources have limits and may be reclaimed when idle. Monitor the account's usage and alarms; a free-tier label does not guarantee regional capacity.

## 2. Configure hostnames and DNS

The intended mapping is:

| Hostname | Service |
| --- | --- |
| `jobin.today` | Website |
| `www.jobin.today` | Website |
| `api.jobin.today` | API |

After the VM passes its pre-DNS health checks, create DNS records pointing all three hostnames to its stable public IP. Caddy obtains and renews HTTPS certificates automatically once public DNS resolves to the VM and ports 80/443 are reachable.

Do not point production DNS at an unverified instance. Until the domain cutover, keep the existing production records unchanged.

## 3. Install Docker and check out the release

Connect to the instance as the Ubuntu account. Install Docker Engine and the Compose plugin using Docker's official Ubuntu instructions. Verify:

```bash
docker --version
docker compose version
```

Clone the intended JobIN revision into a durable directory such as `/opt/jobin`. Do not use `sudo` for Git operations in the repository.

## 4. Configure secrets and database storage

Create the runtime environment file:

```bash
cd /opt/jobin
cp deploy/oci/.env.example deploy/oci/.env
chmod 600 deploy/oci/.env
openssl rand -hex 32
${EDITOR:-vi} deploy/oci/.env
```

Replace the PostgreSQL password with the output of `openssl rand -hex 32`. Keep the password URL-safe; Compose uses it in the private database connection string. Fill in the Supabase project URL and public anon key used by the existing sign-in flow, plus all required API credentials. Keep real values only in the VM's protected `deploy/oci/.env`; do not commit or paste them into chat.

The web image receives `NEXT_PUBLIC_*` values at build time. The provided Compose file builds the site with `NEXT_PUBLIC_API_URL=https://api.jobin.today/api` and the existing Supabase sign-in provider. Rebuild the web image after changing those public settings.

The API starts Prisma migrations on startup. For a database move, do not start the API against an empty database and then restore over it. First check the current Supabase PostgreSQL server version, take a tested backup, and use a compatible PostgreSQL image by setting `POSTGRES_IMAGE` if needed.

### Move application data from Supabase PostgreSQL

Plan a maintenance window. A final consistent snapshot requires stopping or otherwise preventing writes to the current API while the final export is taken. Do not let the old and new API instances write independently to different databases.

1. Take a rehearsal backup first and test restoring it on a non-production copy.
2. Export only the application `public` schema; Supabase Auth remains external:

   ```bash
   pg_dump --format=custom --schema=public --no-owner --no-privileges "$SUPABASE_DIRECT_URL" > jobin-public.dump
   ```

   Use a `pg_dump` client version compatible with the source PostgreSQL server. Transfer the dump to the VM over a secure channel.
3. On the VM, validate the Compose configuration and start only PostgreSQL:

   ```bash
   cd /opt/jobin
   docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml config
   docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml up -d db
   docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml ps
   ```

4. Restore into the new, otherwise empty `jobin` database. The command below assumes the example database/user names; use the values in `.env`:

   ```bash
   docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml exec -T db \
     pg_restore --username=jobin --dbname=jobin --no-owner --no-privileges --clean --if-exists \
     < jobin-public.dump
   ```

5. Check row counts and key records against the source, verify Prisma migration history, and test application reads/writes before directing users to the new database. Retain an encrypted, off-VM backup and document a restore test; the Docker volume alone is not a backup.

## 5. Build and run the OCI stack

After database restoration and configuration:

```bash
cd /opt/jobin
docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml config
docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml up -d --build
docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml ps
docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml logs --tail=200 db api web caddy
```

The database is available only on the Docker network. Only Caddy publishes ports 80/443; do not publish PostgreSQL or the API port. Confirm the `db`, `api`, and `web` services are healthy before testing the site.

Before changing DNS, test the API readiness endpoint and website directly against the VM's public IP using the intended Host header:

```bash
curl --fail -H "Host: api.jobin.today" http://<OCI_PUBLIC_IP>/api/health
curl --fail -H "Host: api.jobin.today" http://<OCI_PUBLIC_IP>/api/health/ready
curl --fail -H "Host: www.jobin.today" http://<OCI_PUBLIC_IP>/
```

Then verify sign-in, database reads and writes, uploads/downloads, email, AI-provider calls, Stripe webhooks, CORS from both website hostnames, and extension access. Do not set `AUTH_PROVIDER=oci` until OCI signing-key access and the full login flow are verified.

## 6. Cut over after verification

Only after database and direct-IP smoke checks pass:

1. Point `jobin.today`, `www.jobin.today`, and `api.jobin.today` to the OCI public IP.
2. Wait for DNS propagation and confirm Caddy obtains valid TLS certificates for all three names.
3. Test the production website, API health/readiness, authentication, critical workflows, integrations, and extension builds against the public names.
4. Keep the old database backup until the new service has passed its agreed observation period. Once the OCI cutover is confirmed, remove the Render service as requested. Vercel can also be retired after the OCI-hosted website is verified.

Build and publish an extension release configured with `VITE_API_URL=https://api.jobin.today/api`; do this only after the API is verified. Existing extension installations may continue using their bundled API URL until updated.

This database move is not automatically reversible: new writes made on OCI are not present in the old Supabase database. Before cutover, agree on a rollback window and preserve the final source backup. A rollback after OCI accepts writes requires a deliberate export/restore or reconciliation; simply pointing clients back at the old API can lose newer data.

## 7. Updates and maintenance

For a code update:

```bash
cd /opt/jobin
git fetch
git checkout <approved-revision>
docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml up -d --build
docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml ps
```

Caddy certificate state and PostgreSQL data are stored in Docker volumes. Back up PostgreSQL independently and test restores regularly. Monitor free-tier usage, disk space, container health, and OCI idle-resource notifications.
