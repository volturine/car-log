# Self-hosting

Run Car Log as a single Node service with SQLite and on-disk photo storage.
Compose files in `docker/` and `.env.example` / `.env.dev.example` are the
source of truth for configuration.

## Production

```sh
cp .env.example .env   # set BETTER_AUTH_SECRET, CAR_LOG_ORIGIN (https), CAR_LOG_IMAGE
docker compose --project-directory . -f docker/compose.production.yaml pull
docker compose --project-directory . -f docker/compose.production.yaml up -d
```

The app listens on container port 3000. Persist both volumes: the SQLite
database and the uploads directory — photos are referenced by database rows,
so one without the other is data loss.

## Other shapes

- `docker/compose.yaml` — build locally
- `docker/compose.dev.yaml` — PR preview images (`dev-<n>` tags, port 3100)
- `docker/compose.tailscale.yaml` — optional tailnet-only HTTPS sidecar

## Health

`GET /health/ready` — no auth; used by the Docker healthcheck.

## Backups

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
