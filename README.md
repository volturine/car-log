# Car Log

Multi-tenant car maintenance tracker: customers log cars and repairs, shops manage estimates, appointments, and payments.

> **Under heavy construction.** Everything here can change without notice.

## Stack

SvelteKit 5 + TypeScript · Tailwind CSS 4 · better-auth · Drizzle ORM + SQLite · Node 24

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

## More

- [docs/](docs/) — architecture, development, self-hosting, security
- [AGENTS.md](AGENTS.md) — conventions and commands for contributors
