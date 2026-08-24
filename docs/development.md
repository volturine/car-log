# Development

Contributor-oriented notes for working on Car Log. Also read
[CONTRIBUTING.md](../CONTRIBUTING.md).

## Prerequisites

- Node.js **24** (`.nvmrc`, `package.json` `engines`)
- npm
- Optional: Docker for Compose workflows

## Scripts

| Script                 | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `npm run dev`          | Vite dev server (SvelteKit)                      |
| `npm run build`        | Production build (`adapter-node` → `build/`)     |
| `npm start`            | Run the built server (`node build/index.js`)     |
| `npm run preview`      | Vite preview of the production build             |
| `npm run check`        | `svelte-check` with native TypeScript            |
| `npm run lint`         | Prettier check + ESLint                          |
| `npm run format`       | Prettier write                                   |
| `npm test`             | Vitest once (unit + API route tests)             |
| `npm run e2e`          | Playwright end-to-end smoke tests                |
| `npm run e2e:headed`   | Playwright with a visible browser                |
| `npm run db:push`      | Push the Drizzle schema to SQLite                |
| `npm run db:push:test` | Push the schema to the test database (.env.test) |
| `just verify`          | check + lint + tests (full gate)                 |

## Environment

- Dev defaults work without an `.env`; better-auth falls back to
  `http://localhost:<port>`.
- Production requires `BETTER_AUTH_SECRET` and an https `BETTER_AUTH_URL`
  (validated at first use; see `.env.example`).
- Test runs use `.env.test` via `node --env-file`.

## Testing layout

- Co-located unit tests: `src/lib/**/*.test.ts`
- API/route integration tests: `src/tests/` (route handlers exercised directly)
- E2E smoke: `e2e/smoke.spec.ts`

Prefer tests for:

- Authorization predicates and cross-tenant access attempts
- Repair status transition rules per role
- Payment recording invariants
- Photo upload validation and path handling

## CI

GitHub Actions workflow: `.github/workflows/ci-cd.yaml`.

- **validate** job: typecheck + lint + Vitest + production build (required PR check)
- **image** job: Docker build; PRs publish `dev-<n>` / `dev-sha-*` only, `master`
  publishes `latest` / `master` / `sha-*`, tags `v*` publish semver tags

Dependabot (`.github/dependabot.yml`) updates npm, Docker, and GitHub Actions
weekly.

## Debugging tips

- The database bootstraps its tables at startup (`src/lib/server/db/index.ts`);
  use `npm run db:push` when you change the Drizzle schema.
- Auth config is lazy: env validation errors surface at first request, not at
  import — that keeps builds working without runtime secrets.
- API responses are uniform JSON (`{ success, data | error }`) via
  `src/lib/server/result.ts`.

## Documentation

| Doc                                | Use when                            |
| ---------------------------------- | ----------------------------------- |
| [architecture.md](architecture.md) | Understanding modules and data flow |
| [security.md](security.md)         | Touching auth, roles, or uploads    |
| [self-hosting.md](self-hosting.md) | Changing env vars or Compose        |
