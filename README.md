# Work Order System

A simplified maintenance **Work Order** system for three roles (**Admin**, **SPV**, **Mechanic**), built for the Fullstack Technical Test v1.0.

A work order goes from creation to completion through a fixed workflow. Each step belongs to one role. The backend enforces every rule, and the frontend only shows the actions the backend says the current user can take. Every step is recorded in an activity timeline, and requests are authenticated with JWT bearer tokens.

[![CI](https://github.com/ivankusuma07/tid-fullstack-technical-test/actions/workflows/ci.yml/badge.svg)](https://github.com/ivankusuma07/tid-fullstack-technical-test/actions/workflows/ci.yml)

```
DRAFT ──submit──▶ SUBMITTED ──assign──▶ ASSIGNED ──update──▶ UPDATED ◀─────────────────┐
  (Admin)             (SPV)       (SPV may reassign)  (Admin)      │                       │ reject (SPV, note)
                                                                   │                       │
                        ┌──── request sparepart (Mechanic) ────────┤                       │
                        ▼                                          │ no sparepart needed   │
              WAITING_SPAREPART ──approve (SPV)──▶ READY_TO_WORK   │                       │
                        │                               │          │                       │
                        └───────────────────────────────┼──────────┼───────────────────────┘
                                                        └─ start (Mechanic) ─▶ WORKING ──complete (Admin, end date)──▶ COMPLETED
```

---

## Tech stack

| Layer     | Tech |
|-----------|------|
| Backend   | NestJS 11, TypeScript (strict), TypeORM 0.3 + `pg`, `@nestjs/jwt`, class-validator, Swagger, Jest + supertest |
| Frontend  | React 18, Vite 6, TypeScript, React Router 6, TanStack Query 5, Tailwind CSS 4 |
| Database  | PostgreSQL 16 |
| Runtime   | Docker Compose: `db`, `backend` (Node 24), `frontend` (nginx serving the build and proxying `/api`) |
| Tooling   | ESLint (typescript-eslint, react-hooks), GitHub Actions CI |

---

## How to run

Requirements: Docker with Docker Compose v2. No `.env` file or other setup is needed.

```bash
docker compose up --build
```

| What | URL |
|------|-----|
| App | http://localhost:3000 |
| API | http://localhost:4000/api |
| Swagger docs | http://localhost:4000/api/docs |

On startup the backend runs the database migrations and seeds the users and vehicles below, plus one sample draft work order. Seeding is idempotent, so restarting doesn't duplicate data.

To reset everything to a clean database:

```bash
docker compose down -v && docker compose up --build
```

Ports, DB credentials and `JWT_SECRET` can be overridden through a `.env` file (see `.env.example`). Set a real `JWT_SECRET` anywhere outside local development.

### Seeded users

| Name | Role | Id (for `POST /api/auth/login`) |
|------|------|------------------|
| Andi (Admin) | ADMIN | `11111111-1111-4111-8111-111111111111` |
| Siti (SPV) | SPV | `22222222-2222-4222-8222-222222222222` |
| Budi (Mechanic) | MECHANIC | `33333333-3333-4333-8333-333333333333` |
| Rudi (Mechanic) | MECHANIC | `44444444-4444-4444-8444-444444444444` |

There are two mechanics so assignment is a real choice and you can check that only the *assigned* mechanic can act.

Seeded vehicles: `DT-0011`, `DT-0022`, `DT-0033`, `DT-0035`, `DT-0039` (dump trucks), `EX-0101` (excavator) and `WL-0201` (wheel loader). `GET /api/vehicles` lists them with their ids.

### Running without Docker (optional)

```bash
docker compose up -d db                     # or any Postgres 16 on localhost:5432 (user/pass/db: workorder)
cd backend && npm install && npm run start:dev    # http://localhost:4000
cd frontend && npm install && npm run dev         # http://localhost:5173 (proxies /api to :4000)
cd backend && npm test                            # unit tests (no DB needed)
cd backend && npm run test:e2e                    # e2e tests (needs the db container; uses its own workorder_e2e database)
cd backend && npm run lint && npm run typecheck   # same checks as CI
```

---

## Walking through the workflow

Use the **Acting as** selector in the header to switch roles. The **Admin / SPV / Mechanic** buttons pick the role, and the dropdown picks the user (useful for the two mechanics). Each switch logs in as that user and gets a fresh token. Action buttons appear on the list rows and on the detail page, and the detail page shows the **Activity** timeline of every step.

1. **Admin**: *Add New Work Order* (pick the vehicle, then title, description, breakdown time). It starts as **Draft**, which can still be edited or deleted. Click **Submit**.
2. **SPV**: **Assign Mechanic**, pick *Budi*.
3. **Admin**: **Update (Lanjutan)** to add follow-up notes. The work order is now **Updated** and waits for the mechanic.
4. **Mechanic (Budi)**: the decision point *"Need sparepart?"*
   - **No**: click **Start Working** (go to step 6).
   - **Yes**: click **Request Sparepart**, write why the parts are needed and add the items. Status becomes **Waiting Sparepart**.
5. **SPV**: **Review Sparepart** shows the mechanic's note and items.
   - **Approve** (optional note): status becomes **Ready to Work**.
   - **Reject** (note required): status goes back to **Updated**. The rejected request and the SPV's reason stay visible, and the mechanic can send a revised request or start without parts.
6. **Mechanic (Budi)**: **Start Working**. The start date is set by the server.
7. **Admin**: **Complete**, enter the end date. Status becomes **Completed**.

Things worth trying: switch to *Rudi*, who doesn't see Budi's work orders at all (mechanics only see the ones assigned to them). Try the API directly with a wrong role and see the 403/409 messages.

---

## Project structure

```
.
├── .github/workflows/ci.yml  lint, typecheck, unit + e2e tests, compose smoke test
├── docker-compose.yml        db + backend + frontend, healthchecks, zero-config defaults
├── backend/                  NestJS API
│   └── src/
│       ├── main.ts           bootstrap + Swagger
│       ├── app.setup.ts      /api prefix, validation pipe, error filter (shared with e2e tests)
│       ├── app.module.ts     modules + global ActorGuard (JWT) / RolesGuard
│       ├── config/           TypeORM options (shared by app and CLI)
│       ├── database/         migrations/ (schema, activities, vehicles), seeds/ (users, vehicles, sample WO)
│       ├── common/           domain errors, error→HTTP filter, guards, decorators, clock
│       ├── testing/          in-memory repositories for unit tests
│       └── modules/
│           ├── auth/                login (issues JWT), token verification
│           ├── users/               domain · application · infrastructure · presentation
│           ├── vehicles/            fleet master data (GET /vehicles)
│           ├── work-orders/
│           │   ├── domain/          WorkOrder + activity models, status enum, work-order.policy.ts, repository interfaces
│           │   ├── application/     WorkOrdersService (use cases), UnitOfWork interface
│           │   ├── infrastructure/  ORM entities, mapper, TypeORM repositories, TypeORM UnitOfWork
│           │   └── presentation/    controller + request DTOs
│           └── sparepart-requests/  same layers
│   └── test/                 workflow.e2e-spec.ts (full flow over HTTP against real Postgres)
└── frontend/                 React app
    ├── nginx.conf            serves the SPA, proxies /api → backend
    └── src/
        ├── api/              fetch client (adds the Bearer token, re-logs in on 401), endpoints, types
        ├── context/          ActorContext (session: logged-in user + token), ToastContext
        ├── hooks/            TanStack Query hooks: queries + one mutation per workflow step
        ├── lib/datetime.ts   the only place dates are converted or formatted
        ├── components/       Layout, ActorSelector, StatusBadge, Modal, Pagination, UI primitives
        └── features/work-orders/
            ├── WorkOrderListPage.tsx, WorkOrderDetailPage.tsx
            ├── ActionBar.tsx        renders buttons from availableActions
            ├── ActivityTimeline.tsx who did what, when
            └── *Modal.tsx           one modal per action
```

### Backend layering

Each backend module is split into four layers:

- **Presentation** (controllers, DTOs): validates HTTP input, calls one use case, returns the result. No business logic.
- **Application** (services): the use cases (`create`, `submit`, `assign`, `update`, `start`, `complete`, `requestSparepart`, `approve`, `reject`, …). They depend on repository **interfaces** injected by token, never on TypeORM.
- **Domain**: plain models, enums, repository interfaces and **`work-order.policy.ts`**, the single transition table (action → allowed role, allowed source statuses, target status, "assigned mechanic only").
- **Infrastructure**: TypeORM entities, mappers (ORM ↔ domain), repository implementations, and the `UnitOfWork` that runs each command's writes in one transaction.

**Why repository interfaces?** Services can be unit-tested with in-memory repositories (`src/testing/`) without a database. Persistence details (row locks, joins, the WO-number sequence) also stay in one place.

**One source of truth for the rules.** Every use case calls `assertCan(action, workOrder, actor)` from the policy. The same policy computes **`availableActions`**, which the API returns on every work order. The frontend's `ActionBar` just renders those buttons, so the UI and API can't disagree about who can do what.

**Transactions.** Every command runs in a single transaction with `SELECT … FOR UPDATE` on the rows involved: the state change and its timeline entry commit together, or neither does. Request sparepart also writes the request and its items. A partial unique index also guarantees at most one *pending* request per work order. The e2e suite fires two approvals of the same request at once and checks that exactly one succeeds.

**Authentication.** `POST /api/auth/login { userId }` returns a signed JWT (8h by default). `ActorGuard` verifies the token on every request and reloads the user, so a deleted user or changed role takes effect immediately. Controllers and services only ever see an `Actor`; when auth replaced the original `X-User-Id` header, only the guard changed.

### Tests

```bash
cd backend && npm test          # unit
cd backend && npm run test:e2e  # e2e (docker compose up -d db first)
```

- `work-order.policy.spec.ts`: every allowed transition, plus wrong-role (403), wrong-mechanic (403) and wrong-status (409) cases, and `availableActions` per role.
- `work-orders.service.spec.ts`: the three workflow paths end to end with in-memory repositories, plus draft edit/delete, list scoping per role, search, end-date rules, sparepart validation and the activity timeline.
- `auth.service.spec.ts`: token round trip, forged / expired tokens, deleted users.
- `test/workflow.e2e-spec.ts`: the real app over HTTP against Postgres. Covers the three paths, every error code, draft rules, list scoping and concurrent approvals.

CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests and e2e tests (with a Postgres service), builds the frontend, then brings the whole stack up with `docker compose up --build --wait` and calls the API through nginx.

---

## API summary

All endpoints are under `/api`. Every endpoint except `POST /auth/login`, `GET /users` and `GET /health` requires `Authorization: Bearer <accessToken>`. Work-order responses include `availableActions` for the calling user, and the detail also includes `activities` (the timeline).

| Method | Path | Role | Effect |
|--------|------|------|--------|
| POST | `/auth/login` | public | Body: `{ userId }` → `{ accessToken, tokenType, expiresIn, user }` |
| GET | `/auth/me` | any | The token's user |
| GET | `/work-orders?status=&search=&page=&limit=` | any | Paginated list (search: title / WO number / fleet number). Mechanics only get their own |
| GET | `/work-orders/:id` | any | Detail with vehicle, mechanic, sparepart request history and activity timeline |
| POST | `/work-orders` | ADMIN | Create → `DRAFT`. Body: `{ title, description?, vehicleId, breakdownTime }` |
| PATCH | `/work-orders/:id` | ADMIN | Edit while `DRAFT` |
| DELETE | `/work-orders/:id` | ADMIN | Delete while `DRAFT` (204) |
| POST | `/work-orders/:id/submit` | ADMIN | `DRAFT → SUBMITTED` |
| POST | `/work-orders/:id/assign` | SPV | `SUBMITTED/ASSIGNED → ASSIGNED`. Body: `{ mechanicId }` |
| POST | `/work-orders/:id/update` | ADMIN | `ASSIGNED → UPDATED`. Body: `{ title?, description? }` |
| POST | `/work-orders/:id/request-sparepart` | MECHANIC (assigned) | `UPDATED → WAITING_SPAREPART`. Body: `{ note, items: [{ name, qty }] }` |
| POST | `/sparepart-requests/:id/approve` | SPV | Request `APPROVED`, WO `→ READY_TO_WORK`. Body: `{ note? }` |
| POST | `/sparepart-requests/:id/reject` | SPV | Request `REJECTED`, WO `→ UPDATED`. Body: `{ note }` (required) |
| POST | `/work-orders/:id/start` | MECHANIC (assigned) | `UPDATED/READY_TO_WORK → WORKING`, sets `startDate` |
| POST | `/work-orders/:id/complete` | ADMIN | `WORKING → COMPLETED`. Body: `{ endDate }` |
| GET | `/vehicles` | any | Fleet master data for the vehicle picker |
| GET | `/users?role=` | public | Users for the selector / assign dropdown |
| GET | `/health` | public | Docker healthcheck |

Errors use one body shape, `{ statusCode, error, message }`: **400** invalid input or business rule (e.g. end date before start), **401** missing, invalid or expired token, **403** wrong role or not the assigned mechanic, **404** not found, **409** action not allowed in the current status (e.g. `Cannot start: status is WAITING_SPAREPART`).

Example:

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"userId":"11111111-1111-4111-8111-111111111111"}' | jq -r .accessToken)

curl -X POST http://localhost:4000/api/work-orders \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Engine overheating","vehicleId":"a0000000-0000-4000-8000-000000000035","breakdownTime":"2026-11-04T05:00:00Z"}'
```

---

## Data model

Follows the ERD in the brief (UUID primary keys, every timestamp is `timestamptz`):

- **users**: `id, name, role (ADMIN|SPV|MECHANIC), created_at, updated_at`
- **vehicles***: `id, fleet_number (unique), name, created_at, updated_at`
- **work_orders**: `id, wo_number*, title, description, vehicle_id* → vehicles, breakdown_time*, status, created_by → users, assigned_mechanic_id → users, start_date, end_date, created_at, updated_at`
- **sparepart_requests**: `id, work_order_id → work_orders, status (PENDING|APPROVED|REJECTED*), request_note*, requested_by → users, approved_by → users, approval_note, created_at, updated_at`
- **sparepart_items**: `id, sparepart_request_id → sparepart_requests, name, qty (> 0), created_at, updated_at`
- **work_order_activities***: `id, work_order_id → work_orders, actor_id → users, action, from_status, to_status, note, created_at`

\* Columns or values added on top of the brief's minimum (see the assumptions below).

---

## Assumptions

1. **Authentication (bonus) without credentials.** The brief has no passwords or user management, so "logging in" means picking a seeded user: `POST /auth/login { userId }` issues a signed JWT, and every other endpoint requires it. The token is what the API trusts, and roles are re-checked from the DB on each request. A password or SSO check would go inside `AuthService.login` with nothing else changing. The SPA keeps the token in `localStorage`, which is fine for a demo; production would use an httpOnly cookie.
2. **The assigned mechanic decides whether spareparts are needed**, since they inspect the vehicle and the brief doesn't say who makes the request. Each request needs a **note** explaining why (new `request_note` column).
3. **Extension: the SPV can reject** a request with a required note (`REJECTED` status added to PENDING/APPROVED). The ERD's `approval_note` holds the SPV's note for both outcomes, and `approved_by` holds the reviewer.
4. Approval moves the WO to `READY_TO_WORK`. Rejection moves it back to `UPDATED`, where the mechanic can send a revised request or start without parts. A WO keeps its full request history but has at most **one pending** request.
5. **"Update (lanjutan)"** is the Admin's follow-up after assignment (title/description). After it, the WO waits for the mechanic's sparepart decision.
6. Only the **assigned** mechanic can request spareparts or start the work. `start_date` is set by the server when work starts.
7. `end_date` is entered by the Admin. It must be ≥ `start_date` and not in the future (a 1-minute allowance covers clock drift between browser and server).
8. The SPV can **reassign** the mechanic while the status is still `ASSIGNED` (before the Admin's update).
9. Users are seeded. There is no user-management UI.
10. Statuses were simplified to 8 states, which the brief allows.
11. The Admin can **edit or delete a work order while it is `DRAFT`**. Delete is a hard delete, which is safe because nobody else has acted on a draft. After submission, changes only happen through workflow steps. A cancel flow (`CANCELLED`) is out of scope.
12. **Visibility:** Admin and SPV see all work orders. A mechanic only sees the work orders assigned to them, in the list and on the detail page. Any other id returns 404, so they can't probe which work orders exist. If the SPV reassigns a work order, it moves to the new mechanic's list.
13. **Dates and timezones:** everything is stored as `timestamptz` (UTC) and exchanged as ISO 8601 **with an offset** (values without one are rejected as ambiguous). Date inputs use the browser's local time, and every date is shown in the viewer's timezone.
14. **From the mockup:** each WO references a **vehicle** (fleet number from the `vehicles` master table, picked from a dropdown) and has a **breakdown time** (when the vehicle broke down, ≤ now) and a readable **WO number** (`WO-YYYYMMDD-0001`, from a Postgres sequence). Vehicles are seeded; there is no vehicle-management UI.
15. **Activity timeline:** every workflow step is logged with actor, status change and note (e.g. the assigned mechanic or the SPV's reason). Deleting a draft deletes its timeline too.
16. The mockup's **Picker** column (warehouse staff picking parts) is out of scope: it needs a fourth role and an inventory flow the brief doesn't include.

---

## What I'd do next / trade-offs

- **Real credentials**: passwords (hashed) or SSO in `AuthService.login`, refresh tokens, and an httpOnly cookie instead of `localStorage`.
- **Master-data UIs** for users and vehicles (today both are seeded).
- **Cancel flow** (`CANCELLED`) for submitted work orders, and attachments/photos on sparepart requests.
- **Browser e2e** (Playwright) on top of the API e2e suite.
- Status is stored as `varchar` + a TS enum rather than a PG enum, which keeps migrations simple. The policy lives in code rather than the DB, which keeps it unit-testable in one file.
