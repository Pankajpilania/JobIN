# Deploy JobIN to OCI Always Free

This stack is designed to run the Next.js website, NestJS API, PostgreSQL, and Cloudflare Tunnel on one OCI Compute VM:

- Cloudflare Tunnel routes `jobin.today` and `www.jobin.today` to the website and `api.jobin.today` to the API.
- The VM has no inbound application ports; Cloudflare Tunnel makes outbound connections to Cloudflare.
- PostgreSQL is self-hosted on the VM and is not exposed to the internet.
- Supabase Auth, Cloudflare R2, Stripe, Resend, and configured AI providers remain external integrations. OCI Identity Domains remains staged; do not switch authentication until its signing-key access and production login flow are verified.

This is a single-VM design, not a managed-database or high-availability setup. A Cloudflare Tunnel removes the need for inbound public IPv4, but the VM still needs outbound connectivity to Cloudflare, the container registries, and every configured external integration. The current IPv4-only VCN has a private subnet routed through a NAT gateway for outbound access. The NAT gateway and any related egress charges have not been confirmed as Always Free; verify the tenancy's billing and usage before treating this deployment as strictly Always Free.

## 1. Check Always Free eligibility and create the VM

Oracle documents the Always Free Ampere A1 allocation as up to 2 OCPUs and 12 GB of memory total, plus 200 GB of block-volume storage. A 47 GB boot volume is the documented minimum. Availability and any existing tenancy usage can reduce what is available. See [OCI Always Free resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) and [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/).

1. In the OCI Console, select `VM.Standard.A1.Flex`, allocate no more than the remaining Always Free OCPU/memory allowance, and use Oracle Linux 9 (the current instance draft) or Ubuntu 24.04.
2. Confirm the shape and boot volume are explicitly Always Free eligible and the final estimate does not use trial credits or include paid resources. This deployment does not need an inbound public IPv4. Verify whether the existing NAT gateway and its egress are included in the tenancy's free allowance; do not assume they are free.
3. Keep total boot and block volumes within the tenancy's remaining Always Free storage. Do not create a paid load balancer or a separate paid database.
4. Do not assign a public IPv4 to the VM or open inbound TCP 22, 80, 443, 4000, or 5432. Keep the SSH private key local. Use the enabled OCI Compute Instance Run Command plugin for provisioning without inbound SSH.
5. The private subnet already routes `0.0.0.0/0` through the tenancy's NAT gateway. Before relying on this path for deployment traffic, confirm the gateway and expected egress usage do not create charges outside the Always Free allowance. If they do, stop and choose a verified free egress option rather than adding public access.

OCI Always Free resources have limits and may be reclaimed when idle. Monitor the account's usage and alarms; a free-tier label does not guarantee regional capacity.

## 2. Prepare Cloudflare DNS and Tunnel

The intended mapping is:

| Hostname | Service |
| --- | --- |
| `jobin.today` | Website |
| `www.jobin.today` | Website |
| `api.jobin.today` | API |

For non-production checks, reserve `staging.jobin.today` for the web app and `api.staging.jobin.today` for the API. Never route `api.jobin.today` or either production website hostname to the staging stack. The Cloudflare zone is still pending registrar nameserver changes, so do not change nameservers or production records just to expose staging; keep staging private until a safe staging DNS path is available.

The Cloudflare Free zone has been added but is pending until its registrar nameservers are changed. Its automatic scan imported five DNS records, including current website records. Treat this as a partial scan, not a complete backup: export the authoritative GoDaddy zone and compare every record, especially MX, SPF, DKIM, DMARC, verification, and service records. Do not delete or replace the existing Vercel/Render records during preparation.

Create a remotely managed Cloudflare Tunnel named `jobin-oci`. Store its token only in the protected `deploy/oci/cloudflared-token` file on the VM; do not commit it or paste it into chat. The Compose service reads the token from a mounted secret file instead of putting it in its command line or container environment. Add these published application routes in Cloudflare:

| Public hostname | Service URL |
| --- | --- |
| `jobin.today` | `http://web:3000` |
| `www.jobin.today` | `http://web:3000` |
| `api.jobin.today` | `http://api:4000` |

Cloudflare must be able to resolve the service names on the Compose network. The `cloudflared` service joins that network and has no published ports. Cloudflare terminates public HTTPS; the tunnel connection to these internal HTTP services is carried over the outbound tunnel.

When a safe staging DNS path is available, add separate routes for `staging.jobin.today` to `http://web:3000` and `api.staging.jobin.today` to `http://api:4000`. Do not route production hostnames to staging. The staging database is a copy of application data; before making either staging hostname public, sanitize production personal data or restrict access with a Cloudflare Access policy for the authorized test group.

Changing the registrar nameservers is a separate DNS-authority change. The selected `staging.jobin.today` host cannot resolve through Cloudflare while the zone is pending. Before any nameserver change, complete and verify the full GoDaddy DNS export, then obtain explicit approval for a nameserver-only activation that preserves every production record and keeps the Vercel/Render routes unchanged. After Cloudflare is authoritative, add and protect the staging routes and test them end to end. Switching production hostnames to OCI is a later, separate cutover that must wait until staging passes.

## 3. Install Docker and check out the release

Use OCI Compute Instance Run Command for diagnostics and non-root setup; the plugin is enabled and avoids inbound SSH access. On the current Oracle Linux image, Run Command executes as `ocarun`, which is not root and cannot use `sudo` by default. Do not assume Run Command can install system packages, and never include secrets in command content because OCI retains it.

For privileged setup without assigning a public IP, use a temporary OCI Bastion session. Prefer managed SSH when the Bastion plugin is running. If it is not, use SSH port forwarding and temporarily allow TCP 22 only from the Bastion's private endpoint `/32` in the private subnet. Remove the temporary ingress rule and Bastion session when finished; never expose SSH to `0.0.0.0/0`.

The VM needs a dynamic group that matches only its instance OCID and this IAM policy:

```text
Allow dynamic-group <run-command-instance-group> to use instance-agent-command-execution-family in tenancy where request.instance.id=target.instance.id
```

The operator creating commands also needs `manage instance-agent-command-family` in the VM's compartment. If the instance is added to a dynamic group after launch, OCI may take up to 30 minutes to start polling for commands.

Docker does not list Oracle Linux among its supported installation platforms. On the current Oracle Linux 9.8 VM, Docker Engine and Compose were installed from Docker's RHEL repository and verified, but Docker's support for this Oracle Linux derivative is unverified. For a vendor-supported deployment, use Ubuntu 24.04 or another distribution on Docker's supported-platform list and follow its official instructions. Verify:

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

Replace the PostgreSQL password with the output of `openssl rand -hex 32`. Keep the password URL-safe; Compose uses it in the private database connection string.

For staging, use a separate Supabase project from the production project. Create it only if the Supabase organization remains on its Free plan; do not upgrade or add paid resources for staging. This project is for authentication only: disable the Data API and automatic table exposure if available, do not import production auth users, and do not use production service-role or OAuth-provider credentials. For private pre-DNS tests, set its Auth Site URL to `http://localhost:3000` and allow `http://localhost:3000/auth/callback`. When the approved staging hostname is active, add `https://staging.jobin.today/auth/callback` and set the Site URL to `https://staging.jobin.today`. If Google sign-in is tested, configure a separate staging OAuth client and its Supabase callback URL in that provider; otherwise leave that provider disabled.

Use the staging project's URL and public anon key for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Leave `SUPABASE_SERVICE_ROLE_KEY` unset initially; the API can validate Supabase access tokens with the public key. If a staging-only admin feature requires server-side Supabase access, configure a key from the staging project only. For private tests, use `CORS_ORIGIN=http://localhost:3000`, `NEXT_PUBLIC_URL=http://localhost:3000`, and `NEXT_PUBLIC_API_URL=http://localhost:4000/api`. After the approved staging routes are active, switch those values to `CORS_ORIGIN=https://staging.jobin.today`, `NEXT_PUBLIC_URL=https://staging.jobin.today`, and `NEXT_PUBLIC_API_URL=https://api.staging.jobin.today/api`. Leave optional integrations unset until test credentials are ready; never copy production R2, Stripe, email, AI, Sentry, or service-role secrets. Keep real values only in the VM's protected `deploy/oci/.env`; do not commit or paste secrets into chat.

For browser tests before DNS activation, use a temporary, uncommitted Compose override that binds the web and API ports to `127.0.0.1` only, then access those ports through a Bastion SSH port forward. Never bind them to `0.0.0.0` or open public ingress. Remove the override and close the Bastion session when private tests are complete.

The web image receives `NEXT_PUBLIC_*` values at build time. `deploy/oci/.env.example` uses production-domain defaults; override them with the staging values above during staging checks. Rebuild the web image after changing any public settings.

Create a private token file from the tunnel token shown in Cloudflare. Do not print the token in terminal output or include it in `.env`:

```bash
install -m 600 /dev/null deploy/oci/cloudflared-token
${EDITOR:-vi} deploy/oci/cloudflared-token
```

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
docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml logs --tail=200 db api web cloudflared
```

The database and application services are available only on the Docker network. No container publishes a host port. Confirm the `db`, `api`, and `web` services are healthy, then confirm `cloudflared` reports a healthy, connected tunnel in Cloudflare.

Before changing production DNS, test the API readiness endpoint and website locally on the VM:

```bash
docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml exec api \
  node -e "Promise.all(['/api/health','/api/health/ready'].map(async p => { const r = await fetch('http://127.0.0.1:4000' + p); if (!r.ok) process.exitCode = 1; console.log(p, r.status); }))"
docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml exec web \
  node -e "fetch('http://127.0.0.1:3000/').then(r => { console.log('/', r.status); if (r.status >= 500) process.exitCode = 1; })"
```

Test a temporary Cloudflare Tunnel hostname and verify sign-in, database reads and writes, uploads/downloads, email, AI-provider calls, Stripe webhooks, CORS, and extension access. Use test credentials and test integrations where available. Do not set `AUTH_PROVIDER=oci` until OCI signing-key access and the full login flow are verified.

## 6. Cut over after verification

Only after the full Cloudflare-zone audit, database checks, and non-production tunnel smoke tests pass:

1. Change the GoDaddy registrar nameservers to the Cloudflare nameservers. Do not transfer the domain registration.
2. Confirm the complete existing DNS zone is resolving through Cloudflare and the old production website, API, and mail records still work.
3. Add/enable the Cloudflare Tunnel routes for `jobin.today`, `www.jobin.today`, and `api.jobin.today`, then verify HTTPS and application behavior on all three.
4. Test the production website, API health/readiness, authentication, critical workflows, integrations, and extension builds against the public names.
5. Keep the old database backup until the new service has passed its agreed observation period. Once the OCI cutover is confirmed, remove the Render service as requested. Vercel can also be retired after the OCI-hosted website is verified.

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

PostgreSQL data is stored in a Docker volume. Back it up independently and test restores regularly. Monitor free-tier usage, disk space, container health, and OCI idle-resource notifications.
