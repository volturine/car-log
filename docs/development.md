# Development

> Under heavy construction. Commands live in `package.json` and the
> `Justfile`; this doc only covers what isn't obvious from those.

## Prerequisites

- Node.js 26 (`.nvmrc`)
- npm

## Common tasks

```bash
npm run dev        # dev server (Node, SQLite file, uploads/ on disk)
just verify        # check + lint + tests (full gate)
npm run db:push    # push Drizzle schema to SQLite
npm run cf:dev     # Workers build served by Wrangler with local D1 and R2
```

`npm run cf:dev` reads secrets from `.dev.vars` (copy `.dev.vars.example`).
It serves the production bundle, so rebuild to pick up changes.

## Testing

- Unit tests are co-located (`src/lib/**/*.test.ts`)
- API/route integration tests in `src/tests/`
- E2E smoke in `e2e/`

Prioritize tests for authorization predicates, workflow transitions,
payments, and upload validation.

`npm run test:scripts` runs the Python tests for `scripts/`.

## Runtime drivers

Server code never touches better-sqlite3, D1, the filesystem or R2 directly.
It imports `db` from `$lib/server/db` and the helpers in
`$lib/server/storage`, which delegate to `$platform`: an alias that
`svelte.config.js` points at `src/lib/server/platform/node.ts` by default and
at `platform/cloudflare.ts` when `DEPLOY_TARGET=cloudflare`. Only the chosen
driver is bundled.

D1 has no interactive transactions, so multi-statement writes go through
`writeBatch([...])` from `$lib/server/api-utils`, which is atomic on both
runtimes. Build the statements first, then hand them over; never read inside
a batch.

Adding a column means three edits: `schema.ts`, the Node bootstrap in
`db/bootstrap.ts`, and a new numbered file in `cf/migrations/`.

## Cloudflare deployments

The sole open pull request labeled `deploy-dev` deploys to
`https://car-log-dev.kripso-world.com` after validation succeeds. Move the
label to switch the shared development environment to another pull request;
the deploy fails if more than one open pull request carries it. Each
development deploy deletes the Worker and wipes D1, then recreates both from
the pull request, so migrations from another branch cannot block it. R2
objects are left in place. Deleting the Worker also drops its secrets, so CI
and `npm run cf:deploy:dev` put `BETTER_AUTH_SECRET` (and the optional Google
pair) back after deploying.

Pushes to `master` deploy production to `https://car-log.kripso-world.com`
through the `production` GitHub environment, which requires a review.

Secrets come from GitHub: `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`
at repository level, `BETTER_AUTH_SECRET` and the optional `GOOGLE_CLIENT_ID`
/ `GOOGLE_CLIENT_SECRET` in the `development` and `production` environments.
Operational details: [self-hosting.md](self-hosting.md#cloudflare-workers).

## Related

- [CONTRIBUTING.md](../CONTRIBUTING.md)
- [architecture.md](architecture.md)
