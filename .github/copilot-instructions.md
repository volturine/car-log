---
applyTo: '**/*.svelte, **/*.ts'
---

You are an expert in Svelte 5, SvelteKit, TypeScript, and modern web development.

## Stack

- **Runtime:** Bun
- **Framework:** SvelteKit with Svelte 5 (runes)
- **Auth:** better-auth (email + password)
- **Database:** SQLite via Drizzle ORM
- **UI:** shadcn-svelte (Tailwind CSS v4 + bits-ui)
- **Notifications:** svelte-sonner
- **Validation:** Zod v4
- **Error handling:** neverthrow
- **Reactive utilities:** runed (debounce, throttle)
- **Testing:** Vitest
- **PWA:** vite-plugin-pwa

## Key Principles

- Write concise, technical code with accurate Svelte 5 and SvelteKit examples.
- Leverage SvelteKit's server-side rendering (SSR) capabilities.
- Prioritize performance optimization and minimal JavaScript.
- Organize files using SvelteKit's file-based routing system.
- Follow `STYLE_GUIDE.md` for all code style decisions.

## Code Style

- Prefer `const` over `let` — avoid reassigning variables.
- Avoid `else` — use early returns.
- Single word names where possible.
- No unnecessary destructuring — use `obj.a` instead of `const { a } = obj`.
- Avoid `try/catch` — handle errors at boundaries.
- No `any` type — use proper types or infer from function signatures.

## TypeScript

- Use TypeScript for all code; prefer interfaces over types.
- Avoid enums; use `as const` objects instead.
- Avoid `as any` — infer types from function signatures.
- Avoid `as SomeType` casts — prefer type guards.
- Use `satisfies` for object literals conforming to a type.
- Enable strict mode.

## Svelte Runes

- `$state`: Declare reactive state
- `$derived`: Compute derived values (never use `$effect` for this)
- `$effect`: Side effects only (DOM, subscriptions, timers, network)
- `$props`: Declare component props
- `$bindable`: Two-way bindable props
- If `$effect` is used, include a one-line comment explaining why `$derived` is insufficient.

## Naming

- Component files: `PascalCase.svelte`
- TypeScript files: `kebab-case.ts`
- Store files: `*.svelte.ts`

## UI and Styling

- Use Tailwind CSS v4 for styling via `cn()` utility from `$lib/utils`.
- Use shadcn-svelte components from `$lib/components/ui/`.
- Use `background`/`foreground` convention for colors (shadcn tokens).
- Use Lucide icons via `@lucide/svelte`.

## Project Structure

```
src/
  lib/
    auth-client.ts      # better-auth client
    components/
      ui/               # shadcn-svelte primitives
      cars/             # car-related components
      repairs/          # repair-related components
      shops/            # shop-related components
      analytics/        # analytics components
      calendar/         # calendar components
      notifications/    # notification components
    hooks/              # svelte state stores (*.svelte.ts)
    server/
      auth.ts           # better-auth config
      db/               # drizzle schema + client
      api-utils.ts      # API response helpers
      validation.ts     # env + input validation
      result.ts         # neverthrow helpers
    constants.ts        # app-wide constants
    types.ts            # shared interfaces
    utils.ts            # cn(), formatDate(), formatCurrency()
    utils/              # reactive.svelte.ts (runed wrappers)
  routes/
    auth/               # login + register pages
    api/                # API endpoints (cars, repairs, shops, photos, notifications)
    app.css             # tailwind + shadcn theme tokens
```

## Auth

- Server: `$lib/server/auth.ts` configures better-auth with Drizzle adapter.
- Client: `$lib/auth-client.ts` exports `signIn`, `signUp`, `signOut`, `useSession`.
- Session/user available via `locals.session` and `locals.user` in load functions.
- Protected routes redirect to `/auth/login` when `!locals.user`.

## Routing

- Use `resolve()` from `$app/paths` for navigation targets.
- Use `goto(resolve('/path'))` for programmatic navigation.
- Use `href={resolve('/path')}` for anchor links.

## Data Fetching

- Use SvelteKit `load` functions for server-side data fetching.
- Create API routes in `src/routes/api/`.
- Use hooks in `hooks.server.ts` for global middleware.

## Error Handling

- Use `neverthrow` (`Result`, `ok`, `err`) for server-side error flow.
- Auth pages catch network errors at the boundary (`.catch()`).
- Toast errors to the user via `svelte-sonner`.

## Commands

- `bun run dev` — start dev server
- `bun run build` — production build
- `bun run check` — typecheck
- `bun run lint` — prettier + eslint
- `bun run format` — auto-format
- `bun run test` — run tests
