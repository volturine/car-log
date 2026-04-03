# Car Log

Car Log is a SvelteKit app for tracking vehicles, repairs, shops, photos, and notifications.
`/` is public. Everything under `/app` is protected by Better Auth.

## Auth

- Email/password sign-in and registration are enabled by default
- Google sign-in is optional and only appears when both `GOOGLE_CLIENT_ID` and
  `GOOGLE_CLIENT_SECRET` are set
- Registration is email/password only; Google sign-in is available from the login page

## Route Structure

- `/` public landing page
- `/auth/login` public sign-in page
- `/auth/register` public registration page
- `/app` protected app shell
  - `/app/cars`
  - `/app/cars/[id]`
  - `/app/calendar`
  - `/app/analytics`
  - `/app/shop`
- `/api/auth/[...all]` Better Auth handler
- `/api/*` authenticated APIs for cars, repairs, shops, photos, and notifications

## Setup

1. Install dependencies:

```bash
bun install
```

2. Copy the env template:

```bash
cp .env.example .env
```

3. Set the required auth env vars in `.env`:

```env
BETTER_AUTH_SECRET=your-super-secret-key-change-this-in-production-min-32-chars
BETTER_AUTH_URL=http://localhost:3000
```

4. Optional: enable Google sign-in:
   - Create a Google Cloud OAuth client for a **Web application**
   - Add this local redirect URI in Google Cloud:
     `http://localhost:3000/api/auth/callback/google`
   - Add your production redirect URI too if you deploy:
     `https://your-domain.com/api/auth/callback/google`
   - Set both of these in `.env`:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

5. Start the app (database file and tables are bootstrapped automatically on first run):

```bash
bun run dev
```

Then open `http://localhost:3000`.

## Test Environment

- `.env.test` uses an isolated port (`4173`) and isolated SQLite database (`./sqlite.test.db`)
- E2E uses that environment so it does not boot against the default dev DB or port

```bash
bun run e2e:install
bun run e2e
```

## App Structure

```text
src/routes/
  +page.svelte          public landing page
  auth/                 public auth pages
  app/                  protected app pages
  api/                  Better Auth + app APIs
src/lib/server/         auth, db, validation, storage
drizzle/                Drizzle output
uploads/                local photo storage
sqlite.db               local SQLite database
```

## Useful Commands

```bash
bun run dev
bun run build
bun run start
bun run db:push
bun run lint
bun run check
bun run e2e
```

`bun run db:push` is still available when you explicitly want Drizzle to reconcile schema changes.

## Production

This app uses `@sveltejs/adapter-node` for production builds.

It needs a persistent server because it writes to local SQLite and stores uploads on the local
filesystem, which is not compatible with serverless or edge runtimes.

Build and run it with Bun:

```bash
bun run build
bun run start
```

The production server runs the adapter-node output from `build/index.js`, and `HOST`/`PORT` can
be set with the standard adapter-node environment variables.

## Caveats

- Google sign-in stays disabled unless both Google env vars are set
- `BETTER_AUTH_URL` must match the domain used in Google OAuth redirects
- Local photos are stored on disk in `uploads/`
