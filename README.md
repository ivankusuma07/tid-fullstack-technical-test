# Work Order System

A simplified maintenance **Work Order** system for three roles (**Admin**, **SPV**, **Mechanic**), built for the Fullstack Technical Test v1.0.

A work order goes from creation to completion through a fixed workflow. Each step belongs to one role. The backend enforces every rule, and the frontend only shows the actions the backend says the current user can take.

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
| Backend   | NestJS 11, TypeScript (strict), TypeORM 0.3 + `pg`, class-validator, Swagger, Jest |
| Frontend  | React 18, Vite 6, TypeScript, React Router 6, TanStack Query 5, Tailwind CSS 4 |
| Database  | PostgreSQL 16 |
| Runtime   | Docker Compose: `db`, `backend` (Node 24), `frontend` (nginx serving the build and proxying `/api`) |

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

On startup the backend runs the database migrations and seeds the users below plus one sample draft work order. Seeding is idempotent, so restarting doesn't duplicate data.

To reset everything to a clean database:

```bash
docker compose down -v && docker compose up --build
```

Ports and DB credentials can be overridden through a `.env` file (see `.env.example`).

### Seeded users

| Name | Role | Id (`X-User-Id`) |
|------|------|------------------|
| Andi (Admin) | ADMIN | `11111111-1111-4111-8111-111111111111` |
| Siti (SPV) | SPV | `22222222-2222-4222-8222-222222222222` |
| Budi (Mechanic) | MECHANIC | `33333333-3333-4333-8333-333333333333` |
| Rudi (Mechanic) | MECHANIC | `44444444-4444-4444-8444-444444444444` |

There are two mechanics so assignment is a real choice and you can check that only the *assigned* mechanic can act.

### Running without Docker (optional)

```bash
docker compose up -d db                     # or any Postgres 16 on localhost:5432 (user/pass/db: workorder)
cd backend && npm install && npm run start:dev    # http://localhost:4000
cd frontend && npm install && npm run dev         # http://localhost:5173 (proxies /api to :4000)
cd backend && npm test                            # unit tests
```

---

## Walking through the workflow

Use the **Acting as** selector in the header to switch roles. The **Admin / SPV / Mechanic** buttons pick the role, and the dropdown picks the user (useful for the two mechanics). Action buttons appear on the list rows and on the detail page.

1. **Admin**: *Add New Work Order* (fleet number, title, description, breakdown time). It starts as **Draft**, which can still be edited or deleted. Click **Submit**.
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

Things worth trying: switch to *Rudi*, who sees nothing to do on Budi's work order. As a mechanic, toggle **Assigned to me / All**. Try the API directly with a wrong role and see the 403/409 messages.

---

## Project structure

```
.
├── docker-compose.yml        db + backend + frontend, healthchecks, zero-config defaults
├── backend/                  NestJS API
│   └── src/
│       ├── main.ts           /api prefix, validation pipe, error filter, Swagger
│       ├── app.module.ts     modules + global ActorGuard / RolesGuard
│       ├── config/           TypeORM options (shared by app and CLI)
│       ├── database/         migrations/ (initial schema), seeds/ (users + sample WO)
│       ├── common/           domain errors, error→HTTP filter, guards, decorators, clock
│       ├── testing/          in-memory repositories for unit tests
│       └── modules/
│           ├── users/               domain · application · infrastructure · presentation
│           ├── work-orders/
│           │   ├── domain/          WorkOrder model, status enum, work-order.policy.ts, repository interface
│           │   ├── application/     WorkOrdersService (use cases)
│           │   ├── infrastructure/  ORM entity, mapper, TypeORM repository
│           │   └── presentation/    controller + request DTOs
│           └── sparepart-requests/  same layers + UnitOfWork (transactions)
└── frontend/                 React app
    ├── nginx.conf            serves the SPA, proxies /api → backend
    └── src/
        ├── api/              fetch client (adds X-User-Id), endpoints, types
        ├── context/          ActorContext (selected user), ToastContext
        ├── hooks/            TanStack Query hooks: queries + one mutation per workflow step
        ├── lib/datetime.ts   the only place dates are converted or formatted
        ├── components/       Layout, ActorSelector, StatusBadge, Modal, Pagination, UI primitives
        └── features/work-orders/
            ├── WorkOrderListPage.tsx, WorkOrderDetailPage.tsx
            ├── ActionBar.tsx        renders buttons from availableActions
            └── *Modal.tsx           one modal per action
```

### Backend layering

Each backend module is split into four layers:

- **Presentation** (controllers, DTOs): validates HTTP input, calls one use case, returns the result. No business logic.
- **Application** (services): the use cases (`create`, `submit`, `assign`, `update`, `start`, `complete`, `requestSparepart`, `approve`, `reject`, …). They depend on repository **interfaces** injected by token, never on TypeORM.
- **Domain**: plain models, enums, repository interfaces and **`work-order.policy.ts`**, the single transition table (action → allowed role, allowed source statuses, target status, "assigned mechanic only").
- **Infrastructure**: TypeORM entities, mappers (ORM ↔ domain), repository implementations, and the `UnitOfWork` that runs multi-table writes in one transaction.

**Why repository interfaces?** Services can be unit-tested with in-memory repositories (`src/testing/`) without a database. Persistence details (row locks, joins, the WO-number sequence) also stay in one place.

**One source of truth for the rules.** Every use case calls `assertCan(action, workOrder, actor)` from the policy. The same policy computes **`availableActions`**, which the API returns on every work order. The frontend's `ActionBar` just renders those buttons, so the UI and API can't disagree about who can do what.

**Transactions.** Request sparepart (request + items + WO status), approve and reject each run in a single transaction with `SELECT … FOR UPDATE` on the rows involved. A partial unique index also guarantees at most one *pending* request per work order.

### Tests

```bash
cd backend && npm test
```

- `work-order.policy.spec.ts`: every allowed transition, plus wrong-role (403), wrong-mechanic (403) and wrong-status (409) cases, and `availableActions` per role.
- `work-orders.service.spec.ts`: the three workflow paths end to end with in-memory repositories, plus draft edit/delete, list scoping per role, search, end-date rules and sparepart validation.

---

## API summary

All endpoints are under `/api`. Every endpoint except `GET /health` and `GET /users` requires the `X-User-Id` header. Work-order responses include `availableActions` for the calling user.

| Method | Path | Role | Effect |
|--------|------|------|--------|
| GET | `/work-orders?status=&scope=all\|mine&search=&page=&limit=` | any | Paginated list (search: title / WO number / fleet number) |
| GET | `/work-orders/:id` | any | Detail with mechanic and sparepart request history |
| POST | `/work-orders` | ADMIN | Create → `DRAFT`. Body: `{ title, description?, fleetNumber, breakdownTime }` |
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
| GET | `/users?role=` | public | Users for the selector / assign dropdown |
| GET | `/health` | public | Docker healthcheck |

Errors use one body shape, `{ statusCode, error, message }`: **400** invalid input or business rule (e.g. end date before start), **401** missing/unknown `X-User-Id`, **403** wrong role or not the assigned mechanic, **404** not found, **409** action not allowed in the current status (e.g. `Cannot start: status is WAITING_SPAREPART`).

Example:

```bash
curl -X POST http://localhost:4000/api/work-orders \
  -H 'X-User-Id: 11111111-1111-4111-8111-111111111111' -H 'Content-Type: application/json' \
  -d '{"title":"Engine overheating","fleetNumber":"DT-0035","breakdownTime":"2026-11-04T05:00:00Z"}'
```

---

## Data model

Follows the ERD in the brief (UUID primary keys, every timestamp is `timestamptz`):

- **users**: `id, name, role (ADMIN|SPV|MECHANIC), created_at, updated_at`
- **work_orders**: `id, wo_number*, title, description, fleet_number*, breakdown_time*, status, created_by → users, assigned_mechanic_id → users, start_date, end_date, created_at, updated_at`
- **sparepart_requests**: `id, work_order_id → work_orders, status (PENDING|APPROVED|REJECTED*), request_note*, requested_by → users, approved_by → users, approval_note, created_at, updated_at`
- **sparepart_items**: `id, sparepart_request_id → sparepart_requests, name, qty (> 0), created_at, updated_at`

\* Columns or values added on top of the brief's minimum (see the assumptions below).

---

## Assumptions

1. **No authentication** (the brief makes it optional). The user is picked in the UI and sent as the `X-User-Id` header. The backend still loads that user and enforces roles on every request. Replacing `ActorGuard` with a JWT guard would be the only change needed for real auth.
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
12. **Visibility:** Admin and SPV see all work orders. Mechanics default to the ones assigned to them and can switch to "All" as a read-only view. Drafts are never shown to mechanics.
13. **Dates and timezones:** everything is stored as `timestamptz` (UTC) and exchanged as ISO 8601 **with an offset** (values without one are rejected as ambiguous). Date inputs use the browser's local time, and every date is shown in the viewer's timezone.
14. **From the mockup:** each WO stores the vehicle's **fleet number** (free text, trimmed and upper-cased) and a **breakdown time** (when the vehicle broke down, ≤ now). It also has a readable **WO number** (`WO-YYYYMMDD-0001`, from a Postgres sequence). A `vehicles` master table would be the next step for fleet numbers.
15. The mockup's **Picker** column (warehouse staff picking parts) is out of scope: it needs a fourth role and an inventory flow the brief doesn't include.

---

## What I'd do next / trade-offs

- **JWT auth**: a login that picks a seeded user, then swap the guard. Controllers and services stay the same.
- **Activity timeline** (`work_order_activities`): who did what and when, shown on the detail page.
- **Vehicles master table** instead of a free-text fleet number.
- **E2E test** (supertest) running the full flow against the compose database, plus CI (lint + test).
- Status is stored as `varchar` + a TS enum rather than a PG enum, which keeps migrations simple. The policy lives in code rather than the DB, which keeps it unit-testable in one file.
