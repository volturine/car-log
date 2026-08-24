# Security policy

Car Log is a multi-tenant car maintenance tracker: customers manage their own
cars and repairs, shops manage estimates and work for assigned repairs, and all
authorization is derived server-side from the authenticated session.

## Supported versions

Security fixes are applied to the latest release on `master` and to the most
recent tagged semantic version when practical. Older tags may not receive
backports.

| Version               | Supported        |
| --------------------- | ---------------- |
| Latest `master`       | Yes              |
| Latest tagged release | Yes              |
| Older tags            | Best effort only |

## What Car Log protects

- **Role isolation** — customers see only their own cars and repairs; shop users
  see only repairs assigned to their shop; mechanics never gain owner powers.
- **Server-side authorization** — ownership and shop membership are derived from
  the session via server predicates; client-provided IDs are never trusted.
- **Explicit privilege transitions** — becoming a shop owner or joining a shop
  happens only through explicit, auditable endpoints (invites).
- **Session security** — better-auth sessions with secure cookies, rotation, and
  production-only HTTPS origins.

## What Car Log does not claim

- A compromised device or stolen session cookie can act as that user until the
  session expires or is revoked.
- Shop owners are trusted within their shop: they can see all repair data for
  cars assigned to their shop.
- Self-host operators control the whole stack and can access the SQLite
  database and uploaded photos directly.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Prefer one of:

1. **GitHub Security Advisories** — open a private report on
   [volturine/car-log](https://github.com/volturine/car-log/security/advisories/new)
2. **Email** — if advisories are unavailable, contact the maintainer through
   the GitHub profile listed on the repository

Include as much of the following as you can:

- Description of the issue and impact
- Steps to reproduce or a minimal proof of concept
- Affected version / commit SHA
- Whether the issue is already public

We aim to acknowledge reports within **7 days** and to provide a status update
within **14 days**. Coordinated disclosure is preferred; please give us a
reasonable window before public discussion when the issue is not already known.

## Scope highlights

In scope examples:

- Cross-tenant data access (customer → another customer's car/repair, shop →
  another shop's repairs)
- Privilege escalation (customer → shop owner or mechanic without an invite)
- Authentication bypass or session fixation on better-auth endpoints
- Path traversal or arbitrary file write/read via photo upload/download paths
- Injection or XSS that exposes other users' data
- Secrets or personal owner data leaking into logs or error responses

Out of scope examples (unless they lead to a practical exploit):

- Denial of service without a realistic amplification path
- Issues that require a fully compromised client device or physical access
- Misconfiguration of a third-party reverse proxy outside our documented guidance
- Dependency vulnerabilities already fixed on `master` or with no reachable path

## Safe harbor

We will not pursue legal action against good-faith security research conducted
within this policy, that does not violate privacy of others, destroy data, or
disrupt production services without prior coordination.
