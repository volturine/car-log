# Self-hosting

Run Car Log as a single Node service with SQLite and on-disk photo storage.
This guide covers Docker production deployment, PR previews, Tailscale Serve,
configuration, backups, and recovery.

## Requirements

- Docker Engine with Compose v2
- For public deployments: a reverse proxy that terminates TLS (or the
  Tailscale overlay below)
- Persistent volumes for the SQLite database and uploaded photos

## Production (recommended)

Pull the multi-architecture image from GitHub Container Registry:

```sh
cp .env.example .env
```

Edit `.env` at minimum:

| Variable             | Guidance                                                                      |
| -------------------- | ----------------------------------------------------------------------------- |
| `CAR_LOG_IMAGE`      | Pin a release, e.g. `ghcr.io/volturine/car-log:1.2.3`, or an immutable digest |
| `BETTER_AUTH_SECRET` | Long random secret (`openssl rand -base64 32`), ≥ 32 chars                    |
| `CAR_LOG_ORIGIN`     | Exact public origin, must be **https** in production                          |
| `CAR_LOG_PORT`       | Host port (default `3000`)                                                    |

```sh
docker compose --project-directory . -f docker/compose.production.yaml pull
docker compose --project-directory . -f docker/compose.production.yaml up -d
docker compose --project-directory . -f docker/compose.production.yaml ps
```

The app listens on container port **3000**. The production template:

- Runs with a read-only application filesystem and `no-new-privileges`
- Stores SQLite under the `car-log-data` volume (`/data/car-log.db`)
- Stores photo uploads under `car-log-uploads` (`/app/uploads`)
- Refuses to boot without `BETTER_AUTH_SECRET` set

### Build locally instead of pulling

```sh
docker compose --project-directory . -f docker/compose.yaml up -d --build
```

Uses `docker/compose.yaml` (development-oriented defaults, loose auth secret).
Prefer `docker/compose.production.yaml` + a pinned GHCR image for real
deployments.

## Preview a pull-request image

CI publishes each same-repo PR as `dev-<n>` / `dev-sha-<commit>` (amd64 only).
Run that image beside production with a separate Compose project and port:

```sh
cp .env.dev.example .env.dev
# Set CAR_LOG_IMAGE=ghcr.io/volturine/car-log:dev-<pr>
docker compose --project-directory . -f docker/compose.dev.yaml --env-file .env.dev pull
docker compose --project-directory . -f docker/compose.dev.yaml --env-file .env.dev up -d
```

Defaults: host port **3100**, project name `car-log-dev`, isolated volumes.
Change the tag in `.env.dev` and run `pull` + `up -d` again to switch PRs.
Do not point this stack at the production volumes or auth secret.

## Tailscale Serve

Optional overlay: `docker/compose.tailscale.yaml`. A sidecar joins your tailnet
as `TS_HOSTNAME` and [Serve](https://tailscale.com/docs/reference/tailscale-cli/serve)
terminates HTTPS with a MagicDNS certificate, proxying to the `app` container.
No public ports or extra reverse proxy.

In the Tailscale admin console:

1. Enable **MagicDNS** and **HTTPS Certificates** (DNS page).
2. Create an [auth key](https://login.tailscale.com/admin/settings/keys) or
   [OAuth client](https://login.tailscale.com/admin/settings/oauth) (`auth_keys`
   write). OAuth nodes need a tag in ACLs and
   `TS_EXTRA_ARGS=--advertise-tags=tag:container`. Append `?ephemeral=false` to
   an OAuth secret so the machine survives restarts.
3. Do **not** enable Funnel. Serve is tailnet-only.

Set in `.env`:

```sh
TS_HOSTNAME=car-log
TS_AUTHKEY=tskey-auth-…   # or tskey-client-…?ephemeral=false
CAR_LOG_ORIGIN=https://car-log.your-tailnet.ts.net
```

```sh
docker compose --project-directory . \
  -f docker/compose.production.yaml -f docker/compose.tailscale.yaml \
  up -d
docker compose --project-directory . \
  -f docker/compose.production.yaml -f docker/compose.tailscale.yaml \
  exec tailscale tailscale serve status
```

The app is then `https://car-log.your-tailnet.ts.net` from any device on the
tailnet. The first HTTPS request can take a few seconds while the certificate
is issued. Host ports stay published for local health checks; use the
`*.ts.net` origin in the browser — it is also the required https
`BETTER_AUTH_URL`.

The sidecar uses userspace networking (works on Docker Desktop / macOS) and
persists identity in the `tailscale-state` volume. Serve config lives in
`docker/tailscale/serve.json` (`${TS_CERT_DOMAIN}` is substituted at runtime).
Mount that path as a **directory**, not a single file.

Same overlay works with `docker/compose.dev.yaml` for PR previews. Give that
stack its own hostname (`dev-car-log` in `.env.dev.example`) and auth key so it
cannot collide with production.

## Reverse proxy and TLS

Terminate HTTPS at your proxy (Caddy, nginx, Traefik, etc.) and proxy to
`http://127.0.0.1:${CAR_LOG_PORT}`.

1. Set `CAR_LOG_ORIGIN` to the **exact** external HTTPS origin (scheme + host,
   no trailing path). It must match `BETTER_AUTH_URL`.
2. Set HSTS on the proxy only after HTTPS works end-to-end.
3. Photo uploads are multipart bodies up to ~220 MB; keep the proxy body limit
   at or above `CAR_LOG_BODY_SIZE_LIMIT` (`220M`).

## Environment reference

### Application

| Variable               |              Default | Purpose                                          |
| ---------------------- | -------------------: | ------------------------------------------------ |
| `BETTER_AUTH_SECRET`   |                    — | Session signing secret (required in production)  |
| `BETTER_AUTH_URL`      | dev server localhost | Exact public origin; must be https in production |
| `DATABASE_URL`         |        `./sqlite.db` | SQLite file path (`/data/car-log.db` in Compose) |
| `GOOGLE_CLIENT_ID`     |             disabled | Optional Google social login                     |
| `GOOGLE_CLIENT_SECRET` |             disabled | Optional Google social login                     |
| `BODY_SIZE_LIMIT`      |               `220M` | adapter-node request body limit (photo uploads)  |

### Docker Compose helpers

| Variable                  |                 Default | Purpose                                                       |
| ------------------------- | ----------------------: | ------------------------------------------------------------- |
| `CAR_LOG_PORT`            |                  `3000` | Host port published by Compose                                |
| `CAR_LOG_IMAGE`           |         required (prod) | Pinned image tag or digest                                    |
| `CAR_LOG_ORIGIN`          | `http://localhost:3000` | Exact public origin used by SvelteKit                         |
| `CAR_LOG_BODY_SIZE_LIMIT` |                  `220M` | Node adapter request limit; keep above upload limits          |
| `CAR_LOG_DATABASE_URL`    |      `/data/car-log.db` | SQLite file inside the container                              |
| `TS_HOSTNAME`             |               `car-log` | Tailnet machine name (`https://<name>.<tailnet>.ts.net`)      |
| `TS_AUTHKEY`              |                       — | Auth key or OAuth secret; required with the Tailscale overlay |
| `TS_EXTRA_ARGS`           |                       — | Extra `tailscale up` flags (OAuth tag advertisement)          |

Inside Compose, `HOST` and `PORT` are fixed to `0.0.0.0` and `3000`. Direct
`docker run` may override them.

## Health checks

| Endpoint            | Auth    | Purpose                                                  |
| ------------------- | ------- | -------------------------------------------------------- |
| `GET /health/ready` | none    | Process readiness (used by Docker healthcheck)           |
| Any page            | session | Normal app routes redirect to login when unauthenticated |

## Backups

Back up two things while the app is stopped (or accept the small risk of
copying live):

1. The SQLite database volume (`car-log-data:/data/car-log.db`)
2. The uploads volume (`car-log-uploads`) — photo files are referenced by rows
   in the database; one without the other is data loss

Simplest cron-friendly approach:

```sh
docker run --rm -v car-log_car-log-data:/data -v "$PWD/backups":/backup \
  alpine tar czf /backup/car-log-db-$(date +%F).tgz -C /data .
docker run --rm -v car-log_car-log-uploads:/uploads -v "$PWD/backups":/backup \
  alpine tar czf /backup/car-log-uploads-$(date +%F).tgz -C /uploads .
```

Restore: stop the app, replace both volumes' contents from a matching backup
pair, start the app, then check `/health/ready` and log in.

## Images and CI

[`.github/workflows/ci-cd.yaml`](../.github/workflows/ci-cd.yaml):

- Every PR: typecheck + lint + Vitest + production build, then an `amd64`
  image build published as **`dev-<n>`** / **`dev-sha-<commit>`** (never `latest`)
- Push/merge to `master`: multi-arch (`amd64`/`arm64`) publish with **`latest`**,
  **`master`**, and **`sha-<commit>`**, plus SBOM and provenance
- Tags `v*`: semantic version tags (e.g. `v1.2.3` → `1.2.3`, `1.2`)

`latest` is only moved by successful publishes from `master`. Pull request
images use a `dev-` prefix so they cannot overwrite production tags.

Registry auth uses the repository-scoped `GITHUB_TOKEN`; no custom registry
password is required for GitHub Actions.

## Security notes for operators

See [security.md](security.md). Short version: the database holds personal car
and repair records — protect TLS, the auth secret, and your backups carefully.
