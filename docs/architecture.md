# Architecture & Design Decisions

## Overview

Two deployables: a React SPA (`client/`) and an Express JSON API (`server/`), talking to a single PostgreSQL database. The client never touches the database directly — all access goes through the API, which enforces auth and role-based access control on every route.

```
[ React SPA ] --HTTPS/JSON--> [ Express API ] --SQL--> [ PostgreSQL ]
     |                              |
  JWT access token            verifies token,
  in memory                   enforces RBAC,
  refresh in httpOnly cookie  writes audit log
```

## Data model

Five tables: `users`, `prospects`, `evaluations`, `stat_entries`, `audit_log`. See `server/src/db/migrations/001_init.sql` for the full schema.

### Key decisions

**UUID primary keys, not serial integers.** Sequential integer IDs leak information (how many records exist, creation order) and make resource enumeration trivial. UUIDs avoid both and are friendlier if the system ever scales beyond one database.

**Soft delete via `is_archived`, not `DELETE`.** Recruiting history is valuable and the audit trail must stay intact. Archiving hides a prospect from active views without destroying the record or its evaluations.

**Audit logging in a middleware/service layer, not database triggers.** Keeping it in application code makes the "who did this" (the authenticated actor) explicit and easy to test. Each mutating operation records actor, entity, action, and old→new values.

**Computed metrics are calculated, not stored.** Efficiency scores and rating trends are derived in the service layer at read time. This keeps data normalized, avoids stale denormalized values, and gives a clean, dependency-free function to unit test.

**Role-based access control.** Three roles — `head_coach`, `assistant`, `viewer`. Enforced by middleware that runs after authentication. The audit log is readable only by `head_coach`.

## Auth flow

1. Login returns a short-lived JWT **access token** (sent in the JSON body, held in memory by the client) and a long-lived **refresh token** (set as an httpOnly, secure cookie so JS can't read it — mitigates XSS token theft).
2. The client sends the access token as a `Bearer` header on each request.
3. When the access token expires, the client calls `/auth/refresh`, which reads the cookie and issues a new access token.
4. Passwords are hashed with bcrypt; plaintext is never stored or logged.

## Testing strategy

- **Server:** unit tests on service-layer logic (especially the efficiency calculation and audit diffing) and integration tests on API routes using Supertest against a test database.
- **Client:** component tests on the prospect form and the pipeline board with Vitest + Testing Library.

The point isn't 100% coverage — it's demonstrating that the security-relevant and business-logic-relevant paths are tested.
