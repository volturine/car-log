# Architecture

Car Log is a **multi-tenant car maintenance tracker** built as a single
SvelteKit app: a role-based UI plus a JSON API backed by SQLite. Customers log
cars and repairs; shops manage estimates, appointments, work, and payments.

## High-level layout

```text
┌──────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│  ┌──────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ UI (Svelte 5)│  │ Stores      │  │ Photos              │  │
│  │ routes +     │◄─┤ cars/repairs│─►│ upload (multipart)  │  │
│  │ components   │  │ shop/ui     │  │                     │  │
│  └──────────────┘  └──────┬──────┘  └─────────────────────┘  │
└───────────────────────────┼──────────────────────────────────┘
                            │ JSON + session cookie
┌───────────────────────────▼──────────────────────────────────┐
│  Node (SvelteKit adapter-node)                               │
│  ┌──────────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │ /api/*           │  │ predicates    │  │ better-auth   │  │
│  │ cars / repairs / │──┤ (ownership +  │──┤ sessions      │  │
│  │ photos / shops   │  │  role checks) │  │ (SQLite)      │  │
│  └────────────────┬─┘  └───────────────┘  └───────────────┘  │
│                   ▼                                          │
│  Drizzle ORM → SQLite (users, cars, repairs, payments, …)    │
│  Photo files on disk under uploads/                          │
└──────────────────────────────────────────────────────────────┘
```

## Design principles

1. **Server-side authorization** — every API route derives ownership and shop
   membership from the session via `src/lib/server/predicates.ts`. Client
   -provided IDs are never trusted.
2. **Explicit workflow** — repairs move through a fixed status machine
   (`src/lib/server/repair-workflow.ts`); each transition is allowed only for
   the right role in the right state.
3. **Single node simplicity** — one app process, one SQLite file
   (better-sqlite3), photo files on disk; no required Redis/Postgres/object
   store.
4. **Typed errors** — server code uses neverthrow (`Result`) end to end;
   routes translate results into consistent JSON responses.

## Roles

| Role         | Capabilities                                                                   |
| ------------ | ------------------------------------------------------------------------------ |
| `customer`   | Own cars, own repairs, approve/reject estimates, track non-shop repairs        |
| `shop_owner` | Shop profile, invites, all repairs assigned to the shop, estimates and payment |
| `mechanic`   | Shop repairs within the workflow (no member management, no owner powers)       |
| `admin`      | Cross-tenant read for support scenarios                                        |

Privilege transitions are explicit endpoints only:
`POST /api/users/become-shop-owner` and shop invites
(`POST /api/shops/[id]/members/invite`).

## Server modules

| Area            | Location                                        | Responsibility                                    |
| --------------- | ----------------------------------------------- | ------------------------------------------------- |
| Auth            | `src/lib/server/auth.ts`, `$lib/auth-client.ts` | better-auth config, lazy init, session helpers    |
| DB              | `src/lib/server/db/`                            | better-sqlite3 + Drizzle, schema, table bootstrap |
| Predicates      | `src/lib/server/predicates.ts`                  | Ownership/shop-membership authorization checks    |
| Repair workflow | `src/lib/server/repair-workflow.ts`             | Status machine, estimate approve/reject, payment  |
| Payments        | `src/lib/server/payments.ts`                    | Payment recording, totals                         |
| Storage         | `src/lib/server/storage.ts`                     | Photo validation, path-safe writes under uploads/ |
| Notifications   | `src/lib/server/notifications.ts`               | In-app notification records                       |
| Validation      | `src/lib/server/validation.ts`                  | zod schemas for API inputs                        |
| Result helpers  | `src/lib/server/result.ts`                      | neverthrow → JSON response translation            |

## Routes

- `src/routes/auth/` — login, register
- `src/routes/app/` — dashboard, cars (+ detail), shop setup/settings,
  analytics, calendar
- `src/routes/api/` — `auth/[...all]`, `cars`, `repairs`
  (`approve`/`reject`/`payment` sub-actions), `photos`, `shops`
  (`members`/`invite`), `users` (`become-shop-owner`), `notifications`

## Data model

Core tables (see `src/lib/server/db/schema.ts`): `users`, `sessions`,
`accounts`, `verifications`, `shops`, `shop_members`, `cars`, `repairs`,
`repair_parts`, `payments`, `photos`, `notifications`.

Key relationships:

- A car belongs to one customer (`user_id`).
- A repair belongs to a car and its customer; optionally to a shop and an
  assigned mechanic.
- Payments are recorded against completed/paid repairs by shop users.
- Photos belong to a repair and are stored as files with metadata rows.

## Deployment shapes

| Mode               | How                              | Notes                                                  |
| ------------------ | -------------------------------- | ------------------------------------------------------ |
| Dev                | `npm run dev`                    | Vite + HMR; SQLite at `./sqlite.db` by default         |
| Local prod build   | `npm run build && npm start`     | Node adapter; same env vars as Docker                  |
| Dev Compose        | `docker/compose.yaml`            | Build local image                                      |
| PR preview Compose | `docker/compose.dev.yaml`        | Pull GHCR `dev-*` image on port 3100, isolated volumes |
| Prod Compose       | `docker/compose.production.yaml` | Pull GHCR image, require auth secret + image pin       |
| Tailscale overlay  | `docker/compose.tailscale.yaml`  | Sidecar Serve HTTPS on `*.ts.net` (tailnet only)       |

## Related docs

- [security.md](security.md) — threat model and authorization model
- [self-hosting.md](self-hosting.md) — operator runbook
- [development.md](development.md) — contributor workflow
