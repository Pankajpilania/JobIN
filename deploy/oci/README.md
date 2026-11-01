# JobIN API on OCI Always Free

The frontend remains on Vercel. OCI hosts only the NestJS API and its PostgreSQL database. Caddy terminates HTTPS for `api.jobin.today` and forwards traffic to the API over the private Compose network.

| Component | Hosting |
| --- | --- |
| `jobin.today` and `www.jobin.today` | Vercel |
| `api.jobin.today` | OCI VM, Caddy HTTPS reverse proxy |
| PostgreSQL | Private Docker volume on the OCI VM |
| Authentication | OCI IAM Identity Domains for web; `oci_dual` accepts legacy extension tokens during migration |
| Resume and document storage | Private OCI Object Storage bucket |
| Email, payments, and AI | External providers |

This is a single-VM setup, not a highly available service. PostgreSQL and the API are not directly exposed to the internet.

## Always Free limits and cost guardrails

Oracle's current Always Free allocation for Ampere A1 is **2 OCPUs and 12 GB memory total**, plus **200 GB total block-volume storage**. Use the tenancy's home region and verify actual remaining quota before creating resources; capacity is not guaranteed. The selected Ubuntu 22.04 AArch64 image currently requires a **50 GB** boot volume, which remains within the 200 GB allowance. See [Always Free resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm).

- Keep the VM at or below the remaining A1 allowance and keep all boot/block volumes within the remaining 200 GB.
- Do not create a paid database, load balancer, or extra VM for this stack.
- OCI's published networking price list currently includes the first 10 TB/month of outbound transfer from the UK as free. Check the tenancy's cost estimate and billing meter for the actual public-IP configuration before launch; stop if the estimate is not $0.
- Set a budget/usage alarm and verify the billing dashboard after deployment. A usage alarm is not a hard spending cap.
- Always Free instances can be reclaimed if idle, and free-tier availability does not guarantee capacity.
- Keep Object Storage usage within the current Always Free allowance and monitor usage in the tenancy; excess usage may incur charges.

## 1. OCI network and VM

Create one VCN, one public subnet, one Internet Gateway, and one `VM.Standard.A1.Flex` instance in the tenancy's home region. Use no more than 2 OCPUs and 12 GB memory total and a 50 GB boot volume for the selected image. Assign one public IPv4 address for HTTPS; do not add a NAT Gateway or load balancer.

Allow inbound TCP 80 and 443 only. Do not open TCP 4000, 5432, or public SSH. PostgreSQL and the API stay on the private Docker network. For later administration, use OCI CLI Instance Agent Run Command with a narrowly scoped IAM policy or another approved private access method; this deployment does not create public SSH access or a Bastion.

### Instance Agent Run Command IAM

Create the dynamic group and policy before launching the VM so the instance can use Run Command during bootstrap. For a VM in the tenancy's root compartment, the dynamic-group matching rule is:

```text
instance.compartment.id = '<tenancy OCID>'
```

Attach this policy statement, replacing the group name if needed:

```text
Allow dynamic-group JobINRunCommandDynamicGroup to use instance-agent-command-execution-family in tenancy where request.instance.id=target.instance.id
```

The policy condition restricts each instance to commands targeting itself. Dynamic-group membership can take time to propagate; if the group is added after launch, allow up to 30 minutes and restart the instance agent or VM if necessary.

## 2. DNS and HTTPS

At the existing DNS provider, add or update only the `api` record:

```text
api.jobin.today  A  <OCI VM public IPv4 address>
```

Keep the existing nameservers and the `jobin.today` and `www.jobin.today` Vercel records unchanged. Caddy obtains and renews a public TLS certificate automatically after DNS resolves to the VM and ports 80/443 are reachable.

The Caddy configuration in `deploy/oci/Caddyfile` serves only `api.jobin.today` and proxies to `api:4000`. Do not expose the database or API container port directly.

## 3. API configuration and data

Copy the example environment file on the VM and set restrictive permissions:

```bash
cp deploy/oci/.env.example deploy/oci/.env
chmod 600 deploy/oci/.env
```

Set `POSTGRES_PASSWORD` to a fresh 64-character hexadecimal password, then configure the Supabase authentication values and any provider integrations that are enabled. Keep credentials only in `deploy/oci/.env`; never commit them or paste them into chat.

Set `CORS_ORIGIN` to the exact production Vercel origins:

```text
CORS_ORIGIN=https://jobin.today,https://www.jobin.today
```

The stack creates a **new, empty PostgreSQL database** and applies Prisma migrations when the API starts. Those migrations create the schema and seed the baseline plans, roles, and permissions. It does not migrate data from Supabase or another database. Keep any existing source database unchanged unless a separately tested export/restore is approved.

### OCI Object Storage

The API uses the `jobin-resumes` Standard-tier bucket in the home region with public access disabled. It authenticates through the VM's instance principal; do not add OCI user API keys or Object Storage credentials to `.env`.

The API VM is in the `JobINResumeStorageVm` dynamic group, matched only by its instance OCID. The `JobINResumeBucketObjects` policy grants that group object management only on the `jobin-resumes` bucket. Do not broaden this group or policy. Short-lived download links are limited to one object and are created only after the API checks ownership.

Configure these values in `deploy/oci/.env`:

```text
OCI_AUTH_MODE=instance_principal
OCI_REGION=uk-london-1
OCI_OBJECT_STORAGE_NAMESPACE=lrky3blu0nc9
OCI_OBJECT_STORAGE_BUCKET=jobin-resumes
```

Existing Cloudflare R2 objects are not copied automatically. Keep the existing R2 bucket intact until any files referenced by the database have been deliberately migrated and verified.

### OCI IAM Identity Domains OAuth 2.0

The API and web application already support OCI OpenID Connect. Configure the Free Identity Domain with:

- An OAuth resource for `https://api.jobin.today` and the `https://api.jobin.today/jobin-api` scope.
- A public web client using Authorization Code + PKCE, with redirect and post-logout URIs `https://jobin.today` and `https://www.jobin.today`.
- Enable **Configure client access** under **Settings → Access signing certificate** so clients can retrieve the domain's public signing keys without logging in. The key endpoint returns public verification keys only; no confidential OAuth client is needed for this request.
- Google as a social identity provider, enabled in the sign-in policy assigned to the JobIN web application. Register `https://<identity-domain-host>/oauth2/v1/social/callback` in the Google OAuth client.
- The domain's self-registration and verified-email requirements, then test sign-up and sign-in before the production cutover.

Set the API to `AUTH_PROVIDER=oci_dual` while the Chrome extension still uses Supabase. Configure the API's OCI issuer, audience, scope, userinfo URL, domain URL, and JWKS URL, then redeploy the API. In Vercel Production set `NEXT_PUBLIC_AUTH_PROVIDER=oci`, `NEXT_PUBLIC_OCI_METADATA_URL` to the domain's OIDC discovery URL, `NEXT_PUBLIC_OCI_CLIENT_ID`, and `NEXT_PUBLIC_OCI_API_SCOPE`; redeploy so the public settings are included in the frontend build. After the extension has its own registered OCI client and is migrated, set the API to `AUTH_PROVIDER=oci` to disable Supabase token acceptance.

## 4. Deploy and verify

Check out the intended release into a durable directory such as `/opt/jobin`, then validate and start the backend:

```bash
cd /opt/jobin
docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml config
docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml up -d --build
docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml ps
docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml logs --tail=200 db api proxy
```

Wait for `db` and `api` to become healthy. Verify the API routes from the VM and from a client outside the VM:

```bash
curl -fsS https://api.jobin.today/api/health
curl -fsS https://api.jobin.today/api/health/ready
```

## 5. Connect the Vercel frontend

In the Vercel project that deploys the website, set `NEXT_PUBLIC_API_URL` to `https://api.jobin.today/api` and `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` to the Web3Forms access key for the `159ring@gmail.com` inbox, then redeploy. `NEXT_PUBLIC_*` values are bundled at build time, so changing a variable alone does not update an existing deployment. Keep Preview pointed at Production only if that is intentional.

The web app's fallback API URL is also `https://api.jobin.today/api`; an explicit Vercel variable is recommended so the deployment configuration remains visible.

## 6. Operations

```bash
docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml pull
docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml up -d --build
docker compose --env-file deploy/oci/.env -f deploy/oci/compose.yaml ps
```

Back up PostgreSQL off the VM regularly and test restoration; a Docker volume on the same VM is not a backup. Monitor OCI resource usage, billing, disk space, container health, and Caddy certificate renewal.
