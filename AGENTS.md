# Car Log

Multi-tenant car maintenance tracker: customers log cars and repairs, shops manage estimates, appointments, and payments through a role-based workflow.

**Stack:** Node.js 24 + SvelteKit 5 + TypeScript · Tailwind CSS 4 · better-auth · Drizzle ORM + SQLite · npm

## Commands

```bash
npm ci                      # install dependencies from the lockfile
npm run db:push             # push the Drizzle schema to SQLite
npm run dev                 # start the Vite/SvelteKit development server
npm run check               # Svelte and TypeScript diagnostics
npm run lint                # Prettier check + ESLint
npm run format              # Prettier write
npm test                    # Vitest unit tests
npm run build               # production build
just verify                 # check + lint + tests (full gate)
```

- Use npm for dependency changes (`npm install <pkg>`); do not hand-edit package.json or the lockfile.
- Prefer the existing npm scripts over ad-hoc scripts.

## Conventions

- Use modern Svelte 5 and SvelteKit patterns — runes only, no legacy `$:` syntax.
- Avoid `as any` at all costs; infer types from functions as much as possible.
- Every Svelte component must have `lang="ts"` on the script tag.
- Use Tailwind CSS 4 via the `cn()` utility from `$lib/utils`.
- Use shadcn-svelte components from `$lib/components/ui/` for all UI primitives.
- Use `resolve()` from `$app/paths` for all navigation hrefs and goto targets.
- Use better-auth for authentication — client in `$lib/auth-client.ts`, server in `$lib/server/auth.ts`.
- Use Drizzle ORM for all database access — schema in `$lib/server/db/schema.ts`.
- Use neverthrow (`Result`, `ok`, `err`) for typed error handling on the server.
- Use zod for input validation.
- Use svelte-sonner for toast notifications.
- Constants belong in `$lib/constants.ts`, shared types in `$lib/types.ts`.
- Store files use the `*.svelte.ts` naming convention.
- Follow `STYLE_GUIDE.md` for all code style decisions.

## Definition of done

Code/config: `just verify` before done or review. Markdown-only: skip unless asked.

- Fix failures and warnings immediately (pre-existing ones when you touch the area). Unfixable third-party stub warnings: inline comment why.
- Add backend tests for new/changed backend behavior.

## Car Log security and privacy

- Enforce the role model everywhere: customers see only their own data, shops only their assigned repairs, and privilege transitions (become-shop-owner, invites) stay explicit.
- Never trust client-provided ownership or shop IDs — derive authorization server-side from the session.
- Treat changes to authentication/sessions, repair status workflow and payment recording, photo upload validation and storage paths, invite flows, and API authorization predicates as security-sensitive.
- Never log secrets, tokens, passwords, or personal owner data.
- Do not commit `.env*`, credentials, or real user data.

## Principles

- Choose the simplest implementation that fully meets the current requirements. Avoid speculative abstractions, configuration, and indirection.
- Grow the system in layers. Start from the smallest version that works end to end, and add each new capability on top of a product that already works. Never trade a working product for unfinished complexity.
- Keep components modular and concerns clearly separated.
- Prefer established, well-maintained libraries when they reduce overall complexity or improve reliability. Do not reimplement common functionality without a clear reason.
- Lean on the dependencies already in the project before writing your own implementation or adding packages. Do not assume a library lacks a capability without checking its documentation and types.
- Make architectural decisions for the long term. Do not accept a stopgap that only works for now and is meant to be replaced later.

## Problem solving

- Start from the intended outcome, then trace the behavior across every relevant layer before changing code.
- Form a causal explanation and actively look for evidence that disproves it.
- Fix the cause where the responsibility belongs. Prefer clear ownership and isolation boundaries over patches at the point where symptoms appear.
- When one fix reveals another failure, investigate it independently instead of forcing it into the previous explanation.
- Before finishing, be able to explain the root cause, why the symptoms were misleading, what now prevents recurrence, and what evidence proves the fix.
