# Security

How Car Log protects multi-tenant data, and what it does not claim. For
reporting issues see [SECURITY.md](../SECURITY.md).

## Threat model

Car Log serves two tenant types from one deployment: customers (car owners) and
shops (owners + mechanics). The primary risk is **cross-tenant data access** —
one customer reading another's cars/repairs, or a shop seeing repairs outside
its assignment.

## Authorization model

1. **Session-derived identity.** Every request is authenticated by the
   better-auth session cookie; `locals.user` is populated in
   `src/hooks.server.ts`. No route trusts client-supplied user IDs.
2. **Server-side predicates.** All ownership and shop-membership checks live in
   `src/lib/server/predicates.ts` and are reused across routes. A car belongs
   to exactly one customer; a repair is visible to its customer, its assigned
   shop's users, and admins.
3. **Explicit privilege transitions.** Becoming a shop owner or joining a shop
   happens only via dedicated endpoints (`become-shop-owner`, invites). There
   is no path that silently widens a role.
4. **Role-scoped workflow.** Status transitions are gated per role in
   `src/lib/server/repair-workflow.ts`; payments can only be recorded against
   completed/paid repairs by shop users.

## Photo handling

- Uploads validate MIME type, size, extension length, and count
  (`FILE_UPLOAD` in `$lib/constants.ts`, enforced with zod).
- Stored paths are derived server-side under `uploads/`; filenames are never
  concatenated from client input without sanitization.
- Access to photo files follows repair ownership predicates.

## Secrets and logging

- Required production env: `BETTER_AUTH_SECRET` (≥ 32 chars), https
  `BETTER_AUTH_URL` — validated at first auth use.
- Never log secrets, tokens, passwords, or personal owner data (names, phones,
  VINs). Route logs use IDs, not personal fields.
- `.env*` files are gitignored; only `*.example` templates are committed.

## Transport

- Production requires an https origin for auth cookies.
- Typical deployments terminate TLS at Tailscale Serve (tailnet-only) or a
  reverse proxy — see [self-hosting.md](self-hosting.md).

## Review checklist for sensitive changes

When touching any of these, add tests and request careful review:

- `src/lib/server/predicates.ts` or any route's ownership checks
- `repair-workflow.ts` transitions or payment recording
- `storage.ts` upload/download paths
- invite flows / `become-shop-owner`
- session/auth configuration or hooks

## Known limitations

- A stolen session cookie acts as that user until expiry or revocation.
- Shop owners are trusted within their shop: they see all repair data for cars
  assigned to their shop, including customer contact details.
- Self-host operators control the whole stack (SQLite file, uploads directory).
