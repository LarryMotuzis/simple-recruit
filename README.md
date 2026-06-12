# Simple Recruit

A recruiting pipeline and player-development tracker for basketball coaches. Coaches log prospects, record evaluations, move players through recruiting stages on a Kanban board, track stats, and review a full audit trail of every change.

Built as a full-stack application: **React (Vite)** frontend, **Node/Express** API, **PostgreSQL** database, **JWT** auth with role-based access control.

## Why this exists

Recruiting boards live in spreadsheets and group texts. This app centralizes prospect evaluation with three things spreadsheets don't give you: role-based access (who can see and change what), a visual pipeline, and an audit trail so changes are transparent and reversible.

## Stack

| Layer    | Tech                                  |
|----------|---------------------------------------|
| Frontend | React 18, Vite, React Router, Recharts |
| Backend  | Node, Express, pg                     |
| Database | PostgreSQL                            |
| Auth     | JWT (access + httpOnly refresh), bcrypt |
| Tests    | Vitest (client), Jest + Supertest (server) |

## Project layout

```
simple-recruit/
├── client/   # React + Vite frontend
├── server/   # Node + Express API
└── docs/     # architecture notes
```

## Getting started

### Prerequisites
- Node 18+
- PostgreSQL 14+ (or Docker)

### 1. Database
```bash
# with Docker:
docker run --name simple-recruit-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=simple_recruit -p 5432:5432 -d postgres:16

# apply the schema:
psql postgresql://postgres:postgres@localhost:5432/simple_recruit -f server/src/db/migrations/001_init.sql
```

### 2. Server
```bash
cd server
cp .env.example .env     # then edit values
npm install
npm run dev              # starts on http://localhost:4000
```

### 3. Client
```bash
cd client
npm install
npm run dev              # starts on http://localhost:5173
```

## Decisions & tradeoffs

See [`docs/architecture.md`](docs/architecture.md) for the data model and the reasoning behind key choices (UUID keys, soft deletes, service-layer audit logging, computed-not-stored metrics).

## Roadmap

v1 (current): auth + RBAC, prospect CRUD, evaluations, Kanban pipeline, stat tracking with one chart, audit log, tests.

Out of v1: recruit messaging, file/video uploads, multi-org support, scheduling.
