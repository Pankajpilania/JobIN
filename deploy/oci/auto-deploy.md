# Automatic OCI API deployments

`.github/workflows/deploy-oci-api.yml` deploys the API stack after every push to
`main`. When a pull request is merged, its resulting push to `main` starts the
deployment. The workflow can also be started manually from GitHub Actions for
initial validation or recovery. Vercel continues to deploy the web app
separately.

The workflow uses a repository-scoped, self-hosted GitHub Actions runner on the
OCI VM. This avoids opening SSH or API ports to GitHub-hosted runners and avoids
putting OCI credentials in GitHub. It builds from the exact `main` checkout and
uses the VM's existing `/opt/jobin/deploy/oci/.env`; it never checks out or
modifies `/opt/jobin`.

## Before enabling

Confirm that the OCI VM is the server currently serving `api.jobin.today` and
that `/opt/jobin/deploy/oci/.env` is the production API configuration. The
repository's main README has also described Render as the current API host;
do not install a production runner on an unused OCI VM or an environment with
different database data.

Back up PostgreSQL and verify that the existing deployment uses the same
Compose project and volumes as `docker compose --env-file
deploy/oci/.env -f deploy/oci/compose.yaml` run from `/opt/jobin`. The workflow
uses that same Compose file and its default project name so it updates, rather
than recreates, the current services and database volume.

## One-time runner setup

1. In GitHub, open **Pankajpilania/JobIN → Settings → Actions → Runners → New
   self-hosted runner**. Choose **Linux** and **ARM64** and follow GitHub's
   current download and configuration instructions on the OCI VM. The
   registration token shown by GitHub is temporary; do not save it in the
   repository or commit it.
2. Register the runner specifically to this repository (not as an
   organization-wide runner) and add the custom label
   `jobin-oci-production`.
3. Install and run the runner as a dedicated, non-root deployment account.
   That account must be able to read `/opt/jobin/deploy/oci/.env`, execute
   `docker compose`, build images, and access the Docker daemon without
   interactive sudo. Membership in the `docker` group is effectively
   root-equivalent; only use a trusted, repository-scoped runner and do not
   expose it to pull-request or untrusted workflows.
4. Install the runner as a service and confirm it is **Idle** in the GitHub
   runner settings. If the deployment env file is stored somewhere other than
   `/opt/jobin/deploy/oci/.env`, update `DEPLOY_ENV_FILE` in the workflow to
   its actual protected path. Use a current Docker Compose v2 version supporting
   `up --wait` and `--wait-timeout`.
5. From GitHub's Actions tab, manually run the **Deploy OCI API** workflow
   against `main` once to validate the setup. Subsequent pushes to `main`,
   including merged pull requests, deploy automatically.

The deployment builds the API image on the VM, runs Prisma migrations through
the API's production startup command, waits for the Compose services to become
healthy, and checks `https://api.jobin.today/api/health/ready`. If deployment
or the readiness check fails, the workflow reports failure and prints recent
Compose logs. It does not roll back database migrations or replace the
PostgreSQL volume; maintain tested backups and review migrations before merging.

The runner is trusted production infrastructure with Docker access. Keep its
workflow restricted to pushes on `main`, require review before merges, and do
not add `pull_request` deployment triggers.
