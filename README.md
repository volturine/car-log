# Car Log

Multi-tenant car maintenance tracker: customers log cars and repairs, shops manage estimates, appointments, and payments.

> **Under heavy construction.** Everything here can change without notice.

## Stack

SvelteKit 5 + TypeScript · Tailwind CSS 4 · better-auth · Drizzle ORM + SQLite · Node 24

Runs as a single Node service (SQLite file + on-disk photos) or on Cloudflare
Workers (D1 + R2). Production is the Cloudflare deployment at
`https://car-log.kripso-world.com`; see [docs/self-hosting.md](docs/self-hosting.md).

## Quickstart

```bash
npm ci
cp .env.example .env   # set BETTER_AUTH_SECRET at minimum
npm run db:push
npm run dev
```

## Verify

```bash
just verify            # check + lint + tests
```

## Deploy

- Push to `master` deploys production. Label the sole pull request `deploy-dev`
  to deploy it to `https://car-log-dev.kripso-world.com`.
- `npm run cf:dev` runs the Workers build locally against local D1 and R2.

Details: [docs/development.md](docs/development.md#cloudflare-deployments).

## More

- [docs/](docs/) — architecture, development, self-hosting, security
- [AGENTS.md](AGENTS.md) — conventions and commands for contributors
