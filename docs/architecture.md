# Architecture

Car Log is a single SvelteKit app: role-based UI plus a JSON API backed by
SQLite. Customers log cars and repairs; shops manage estimates,
appointments, work, and payments.

> Under heavy construction — treat the code as the source of truth. This doc
> covers only the ideas that are unlikely to change.

## Invariants

1. **Server-side authorization** — every API route derives ownership and shop
   membership from the session. Client-provided IDs are never trusted.
2. **Explicit workflow** — repairs move through a fixed status machine;
   each transition requires the right role in the right state.
3. **Single node simplicity** — one app process, one SQLite file, photo files
   on disk; no Redis/Postgres/object store required.
4. **Typed errors** — server code uses neverthrow (`Result`) end to end.

## Roles

- `customer` — own cars and repairs, approve/reject estimates
- `shop_owner` — shop profile, invites, all shop repairs, payments
- `mechanic` — shop repairs within the workflow, no member management
- `admin` — cross-tenant read for support scenarios

Privilege transitions happen only via explicit endpoints (become-shop-owner,
invites).

## Where to look

- Schema: `src/lib/server/db/schema.ts`
- Authorization predicates: `src/lib/server/predicates.ts`
- Repair workflow: `src/lib/server/repair-workflow.ts`
- Routes: `src/routes/api/`

## Related

- [security.md](security.md) — authorization model
- [self-hosting.md](self-hosting.md) — deployment
- [development.md](development.md) — contributor workflow
