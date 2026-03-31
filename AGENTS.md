Project guidelines:

- use bun for the package manager
- when installing new packages, use `bun add` instead of manually editing the package.json file
- use modern svelte 5 and sveltekit patterns — runes only, no legacy `$:` syntax
- avoid `as any` at all costs, try to infer types from functions as much as possible
- use tailwindcss v4 for styling via the `cn()` utility from `$lib/utils`
- use shadcn-svelte components from `$lib/components/ui/` for all UI primitives
- every svelte component must have `lang="ts"` on the script tag
- use `resolve()` from `$app/paths` for all navigation hrefs and goto targets
- use better-auth for authentication — client in `$lib/auth-client.ts`, server in `$lib/server/auth.ts`
- use drizzle ORM for all database access — schema in `$lib/server/db/schema.ts`
- use neverthrow (`Result`, `ok`, `err`) for typed error handling on the server
- use zod for input validation
- use svelte-sonner for toast notifications
- constants belong in `$lib/constants.ts`, shared types in `$lib/types.ts`
- store files use the `*.svelte.ts` naming convention
- follow `STYLE_GUIDE.md` for all code style decisions
- run `bun run lint` to check for linting errors, `bun run format` to auto-format, and `bun run check` to typecheck after making changes
