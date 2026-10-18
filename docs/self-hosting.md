# Self-hosting

Car Log runs in two shapes. The production deployment is the Cloudflare
Worker described first; the Node container is for self-hosting on your own
machine. Both serve the same code: `svelte.config.js` picks the adapter and
the `$platform` driver (D1 + R2, or SQLite + local disk) from `DEPLOY_TARGET`.

## Cloudflare Workers

`wrangler.jsonc` is the source of truth. The top level is production
(`car-log` at `https://car-log.kripso-world.com`); `env.dev` is the shared
development deployment (`car-log-dev` at `https://car-log-dev.kripso-world.com`).
Each has its own D1 database (`car-log`, `car-log-dev`) and R2 bucket
(`car-log-photos`, `car-log-photos-dev`). Both hostnames are Worker custom
domains, so Wrangler manages their DNS records and certificates.

Schema changes ship as SQL files in `cf/migrations/`, applied with
`wrangler d1 migrations apply` before every deploy. Keep them in step with
`src/lib/server/db/schema.ts` and the Node bootstrap in
`src/lib/server/db/bootstrap.ts`.

Secrets live on the Worker, never in `wrangler.jsonc`:

| Secret                                      | Purpose                             |
| ------------------------------------------- | ----------------------------------- |
| `BETTER_AUTH_SECRET`                        | Session signing; 32+ random bytes   |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional Google login, both or none |

`BETTER_AUTH_URL` is a plain var per environment in `wrangler.jsonc`.

Deployments run from GitHub Actions (see
[development.md](development.md#cloudflare-deployments)); to deploy by hand
with a logged-in Wrangler:

```sh
npm run cf:deploy                        # production: migrate D1, deploy
BETTER_AUTH_SECRET=… npm run cf:deploy:dev   # dev: reset, migrate, deploy, re-add secrets
npx wrangler secret put BETTER_AUTH_SECRET --env ''   # once, for production
```

The GitHub Actions token needs Workers Scripts, D1, R2 and Workers Routes
edit access plus DNS edit on the zone (custom domains create records).

Requests are rate limited per Worker isolate only (`hooks.server.ts` keeps an
in-memory map), so add zone-level rate limiting rules in the Cloudflare
dashboard for anything stricter.

### Backups

```sh
npx wrangler d1 export CAR_LOG_DB --remote --env '' --output car-log-$(date +%F).sql
npx wrangler r2 object get car-log-photos/<key> --file <local>   # per object
```

D1 also keeps point-in-time history (Time Travel) for 30 days. Photos are
referenced by database rows, so restore a database and bucket from the same
moment.

## Node container

Run Car Log as a single Node service with SQLite and on-disk photo storage.
Compose files in `docker/` and `.env.example` / `.env.dev.example` are the
source of truth for configuration.

### Production

```sh
cp .env.example .env   # set BETTER_AUTH_SECRET, CAR_LOG_ORIGIN (https), CAR_LOG_IMAGE
docker compose --project-directory . -f docker/compose.production.yaml pull
docker compose --project-directory . -f docker/compose.production.yaml up -d
```

The app listens on container port 3000. Persist both volumes: the SQLite
database and the uploads directory — photos are referenced by database rows,
so one without the other is data loss.

### Other shapes

- `docker/compose.yaml` — build locally
- `docker/compose.dev.yaml` — PR preview images (`dev-<n>` tags, port 3100)
- `docker/compose.tailscale.yaml` — optional tailnet-only HTTPS sidecar

## Health

`GET /health/ready` — no auth; answers 200 once the database responds. Used
by the Docker healthcheck and by CI to verify each Cloudflare deployment.

### Backups

Back up both volumes (database + uploads). Cron-friendly:

```sh
docker run --rm -v car-log_car-log-data:/data -v "$PWD/backups":/backup \
  alpine tar czf /backup/car-log-db-$(date +%F).tgz -C /data .
docker run --rm -v car-log_car-log-uploads:/uploads -v "$PWD/backups":/backup \
  alpine tar czf /backup/car-log-uploads-$(date +%F).tgz -C /uploads .
```

Restore: stop the app, replace both volumes from a matching pair, start,
check `/health/ready`.

## Security

See [security.md](security.md). The database holds personal data — protect
TLS, the auth secret, and your backups.
