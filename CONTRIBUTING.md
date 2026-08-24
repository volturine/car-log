# Contributing to Car Log

Thanks for your interest in improving Car Log. This guide covers how to develop
locally, what we expect in pull requests, and where design docs live.

By participating, you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to help

- Fix bugs and improve reliability
- Improve documentation and self-hosting guides
- Add tests around the repair workflow and authorization edge cases
- Polish accessibility and mobile UX
- Report security issues privately (see [SECURITY.md](SECURITY.md))

Please open an issue before large architectural changes so we can align on
scope. The role model is a hard requirement: customers must never see other
customers' data, and shops must never see repairs outside their shop.

## Development setup

### Requirements

- **Node.js 24** (see [`.nvmrc`](.nvmrc) and `engines` in `package.json`)
- npm (comes with Node)

### Install and run

```sh
git clone https://github.com/volturine/car-log.git
cd car-log
npm ci
npm run dev
```

Open `http://localhost:5173/` (or the configured port).

### Validate before you push

```sh
just verify
```

This runs:

1. `svelte-check` (TypeScript / Svelte diagnostics)
2. Prettier check + ESLint
3. Vitest unit tests

Useful partial commands:

| Command           | Purpose                           |
| ----------------- | --------------------------------- |
| `npm run check`   | Type / Svelte diagnostics         |
| `npm run lint`    | Prettier check + ESLint           |
| `npm run format`  | Write Prettier formatting         |
| `npm test`        | Vitest suite                      |
| `npm run build`   | Production build                  |
| `npm start`       | Run the built Node adapter app    |
| `npm run e2e`     | Playwright end-to-end smoke tests |
| `npm run db:push` | Push the Drizzle schema to SQLite |

### Docker (optional)

Build and run the development Compose template:

```sh
docker compose --project-directory . -f docker/compose.yaml up -d --build
```

Production-style deployment is documented in
[docs/self-hosting.md](docs/self-hosting.md).

## Project map

| Path                     | Role                                           |
| ------------------------ | ---------------------------------------------- |
| `src/routes/auth/`       | Login and registration pages                   |
| `src/routes/app/`        | Customer dashboard, cars, shop, analytics      |
| `src/routes/api/`        | JSON API (cars, repairs, photos, shops, users) |
| `src/lib/server/`        | Auth, DB, predicates, workflow, storage        |
| `src/lib/components/ui/` | shadcn-svelte UI primitives                    |
| `src/lib/constants.ts`   | Roles, statuses, limits                        |
| `drizzle/`               | SQL migrations                                 |
| `docs/`                  | Architecture, security, self-hosting           |
| `docker/`                | Docker Compose templates and image             |

Deeper orientation: [docs/architecture.md](docs/architecture.md) and
[docs/development.md](docs/development.md).

## Coding guidelines

- Prefer small, focused changes with tests for non-trivial logic.
- Enforce the role model server-side: derive authorization from the session,
  never from client-provided IDs.
- Do not log secrets, tokens, passwords, or personal owner data.
- Match existing TypeScript / Svelte 5 style in nearby files; see
  [STYLE_GUIDE.md](STYLE_GUIDE.md) and [AGENTS.md](AGENTS.md).
- Format with Prettier (`npm run format`). Editors should format on save.
- Avoid drive-by refactors unrelated to the change.
- Do not commit `.env*`, credentials, or real user data.

## Pull requests

1. Fork and branch from `master` (or open a PR from a branch in this repo if you
   have write access).
2. Keep the PR focused; split unrelated work.
3. Ensure `just verify` passes locally.
4. Fill out the pull request template: what changed, why, and how you tested it.
5. Link related issues when applicable.

CI (`.github/workflows/ci-cd.yaml`) runs the full validation suite and an
`amd64` image build on every pull request (published as `dev-*` / `dev-sha-*`,
never `latest`).

### Commit messages

Prefer concise, imperative messages, optionally with a conventional prefix:

- `fix: ...`
- `feat: ...`
- `docs: ...`
- `test: ...`
- `chore: ...`

## Security reviews

Changes that touch any of the following need extra care and tests:

- Authorization predicates (`src/lib/server/predicates.ts`) and every API route's
  ownership checks
- Repair status transitions (`src/lib/server/repair-workflow.ts`) and payment
  recording
- Photo upload validation and storage paths (`src/lib/server/storage.ts`)
- Invite flows and privilege transitions (`become-shop-owner`, shop members)
- Session handling and better-auth configuration (`src/lib/server/auth.ts`,
  `src/hooks.server.ts`)

Report vulnerabilities privately per [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions are licensed under the
project's [MIT License](LICENSE).
