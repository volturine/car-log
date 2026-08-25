# Development

> Under heavy construction. Commands live in `package.json` and the
> `Justfile`; this doc only covers what isn't obvious from those.

## Prerequisites

- Node.js 24 (`.nvmrc`)
- npm

## Common tasks

```bash
npm run dev        # dev server
just verify        # check + lint + tests (full gate)
npm run db:push    # push Drizzle schema to SQLite
```

## Testing

- Unit tests are co-located (`src/lib/**/*.test.ts`)
- API/route integration tests in `src/tests/`
- E2E smoke in `e2e/`

Prioritize tests for authorization predicates, workflow transitions,
payments, and upload validation.

## Related

- [CONTRIBUTING.md](../CONTRIBUTING.md)
- [architecture.md](architecture.md)
