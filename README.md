# TaskFlow - Elysia

## 1. Overview

TaskFlow is a backend implementation of a task management system. It supports:

- user registration and login with JWT authentication
- project creation, update, listing, and deletion
- task creation, listing, update, and deletion
- project access based on ownership or assigned tasks
- PostgreSQL migrations with up and down support per migration and bootstrap seed data

### Why TypeScript and Elysia

The assignment prefers Go, but I chose TypeScript with Elysia for this submission because it was the fastest path to a correct, well-scoped API in the time available

- Go would have added a lot of explicit handling for this size of service, and the route handlers would have become much more verbose for the same business logic
- Elysia reduced framework noise and let me spend more time on validation, authorization, and data flow instead of plumbing
- I already have real production experience with Node.js and TypeScript, while Elysia was new to me and still let me move quickly because the mental model was familiar
- Learning Go from scratch and becoming comfortable enough to build a non-trivial REST API in 3 days would have required more time

That is a choice about delivery speed and developer effectiveness for this assignment, not a statement against Go. Go is a very strong choice for large-scale backend distributed systems and microservice architechture along with gRPC

### Tech Stack

- Bun 1.3
- TypeScript
- Elysia
- Drizzle ORM
- PostgreSQL
- Pino for structured logging
- Docker Compose

## 2. Architecture Decisions

### Monorepo Layout

The repository is split into small workspace packages instead of a single large app directory:

- `apps/server` contains the HTTP API
- `packages/db` contains schema, migrations, and seed logic
- `packages/env` centralizes environment parsing
- `packages/config` holds shared TypeScript config

This keeps runtime concerns, schema concerns, and environment concerns separate without introducing extra abstraction layers. For this assignment, that felt like the smallest structure that still keeps responsibilities obvious.

### Logging and Shutdown

- request completion is logged with Pino
- the server handles `SIGTERM` and stops the Elysia server cleanly

### What I Intentionally Left Out

- Frontend UI: this repository is backend-only
- Integration tests: not completed in this submission

The main tradeoff is speed versus completeness. I prioritized delivering a working backend with migrations, auth, authorization, Docker startup, and seed data over stretching into a partial frontend.

## 3. Running Locally

The project is intended to be started with Docker. Assume Docker is installed and running.

```bash
git clone https://github.com/RutamBhagat/taskflow-rutam-bhagat
cd taskflow-rutam-bhagat
cp .env.example .env
docker compose up --build
```

### Services

- API: `http://localhost:4000`
- Postgres: `localhost:5432`
- OpenAPI docs: `http://localhost:4000/openapi`

### What Happens on Startup

The API container uses a multi-stage Docker build and, on startup, it:

1. builds the server bundle
2. waits for PostgreSQL
3. runs all database migrations
4. runs the seed script
5. starts the API server

No manual migration step is required for the normal Docker flow.

Notes:

- `docker-compose.yml` reads the root `.env`
- the runtime container get its internal database connection from `POSTGRES_*` variables
- `DATABASE_URL` is still useful for server

## 4. Migrations and Seed Data

Migrations live in `packages/db/src/migrations`.

Available commands from the repo root:

```bash
bun run db:migrate:up
bun run db:migrate:down
bun run db:migrate:status
bun run db:migrate:fresh
bun run db:seed
```

The seed script creates the minimum required review data:

- 1 user
- 1 project
- 3 tasks with `todo`, `in_progress`, and `done` statuses

### Seed Credentials

```text
Email: test@example.com
Password: password123
```

## 5. API Summary

For request examples, import ![API Reference](https://github.com/RutamBhagat/taskflow-rutam-bhagat/blob/main/taskflow.postman_collection.json).

## 6. Notable Issues Resolved During Implementation

### Assignment Model Drift: `tasks.creator_id`

The assignment requires `DELETE /tasks/:id` to allow deletion by either:

- the project owner
- the task creator

The assignment task schema did not store a task creator, meaning the authorization rule could not be implemented correctly

#### Solution

- added `tasks.creator_id` in the schema

## 7. Known Gaps

- This submission does not include the frontend portion of the assignment
- There is no automated integration test suite yet

## 8. What I Would Do Next

1. Add integration tests covering auth, project access control, and task deletion authorization.
3. Add a small frontend client for the full-stack version of the assignment.
