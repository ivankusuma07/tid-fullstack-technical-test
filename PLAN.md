# PLAN — Work Order System (Fullstack Technical Test v1.0)

NestJS + React + PostgreSQL, run with `docker compose up --build`.

Goal: **finish a clean, working end-to-end flow** before adding polish. Every phase below ends in something runnable.

---

## 1. Requirements summary

**Roles & permissions**

| Role     | Actions                                                                 |
|----------|-------------------------------------------------------------------------|
| ADMIN    | Create WO, Submit WO, Update WO (lanjutan), Complete WO (end date)      |
| SPV      | Assign Mechanic, Approve Sparepart Request, **Reject Sparepart Request*** |
| MECHANIC | **Request Sparepart (with note)***, Mark WO as Working (only the assigned mechanic) |

\* Extensions beyond the brief's role list (documented in the README):
- The brief does not say who creates the sparepart request. The **assigned mechanic** makes the "Need sparepart?" decision, because they inspect the vehicle and the Admin doesn't know the technical details. The request requires a **note** explaining why the parts are needed.
- The SPV can **reject** a request (with a required note) based on the mechanic's explanation. The ERD's `approval_note` column already suggests the SPV is reviewing a justification.

**Required workflow**
1. Admin creates WO → 2. Admin submits → 3. SPV assigns mechanic → 4. Admin updates (lanjutan) →
5. Need sparepart? No → continue / Yes → create Sparepart Request → 6. SPV approves →
7. Mechanic marks Working → 8. Admin inputs end date → Completed.

**Must-have (pass criteria):** runs via Docker Compose, workflow works end to end, FE↔BE connected, readable/structured code, accurate README.

---

## 2. Status model (state machine)

```
DRAFT ──submit──▶ SUBMITTED ──assign──▶ ASSIGNED ──update──▶ UPDATED ◀────────────┐
                                                               │                  │ reject (SPV, note)
                         ┌──── request-sparepart (Mechanic) ───┤                  │
                         ▼                                     │ (no sparepart)   │
               WAITING_SPAREPART ──approve (SPV)──▶ READY_TO_WORK                 │
                         │                             │       │                  │
                         └─────────────────────────────┼───────┼──────────────────┘
                                                       └─start─┴──▶ WORKING ──complete──▶ COMPLETED
```
After a rejection the WO goes back to `UPDATED`. The mechanic can then send a revised request or start without spareparts.

| Action             | Endpoint                                   | Role     | From status                  | To status          | Side effects |
|--------------------|--------------------------------------------|----------|------------------------------|--------------------|--------------|
| create             | `POST /api/work-orders`                    | ADMIN    | —                            | DRAFT              | `created_by` = actor; `fleet_number` normalized; `breakdown_time` ≤ now |
| edit draft         | `PATCH /api/work-orders/:id`               | ADMIN    | DRAFT                        | DRAFT (no change)  | edits title/description before submit; rejected with 409 in any other status |
| delete draft       | `DELETE /api/work-orders/:id`              | ADMIN    | DRAFT                        | — (row removed)    | hard delete, returns 204; rejected with 409 in any other status. Safe because a draft has no mechanic, no sparepart requests and no other user has acted on it |
| submit             | `POST /api/work-orders/:id/submit`         | ADMIN    | DRAFT                        | SUBMITTED          | — |
| assign             | `POST /api/work-orders/:id/assign`         | SPV      | SUBMITTED (also ASSIGNED = reassign) | ASSIGNED   | `assigned_mechanic_id`; target user must have role MECHANIC |
| update (lanjutan)  | `POST /api/work-orders/:id/update`         | ADMIN    | ASSIGNED                     | UPDATED            | title/description edits |
| request-sparepart  | `POST /api/work-orders/:id/request-sparepart` | MECHANIC (assigned) | UPDATED           | WAITING_SPAREPART  | creates request (PENDING) with required `request_note` + items in **one transaction**; at most one PENDING request per WO |
| approve            | `POST /api/sparepart-requests/:id/approve` | SPV      | request PENDING, WO WAITING_SPAREPART | READY_TO_WORK | request → APPROVED; `approved_by`, optional `approval_note`; **one transaction** |
| reject             | `POST /api/sparepart-requests/:id/reject`  | SPV      | request PENDING, WO WAITING_SPAREPART | UPDATED       | request → REJECTED; `approved_by` (= reviewer), **required** `approval_note`; **one transaction** |
| start              | `POST /api/work-orders/:id/start`          | MECHANIC | UPDATED or READY_TO_WORK     | WORKING            | `start_date = now()`; actor must be the assigned mechanic |
| complete           | `POST /api/work-orders/:id/complete`       | ADMIN    | WORKING                      | COMPLETED          | `end_date` from body (ISO 8601 with offset); must be ≥ `start_date` and not in the future |

Editing a draft (`PATCH`) is kept separate from the lanjutan update (`POST /:id/update`): fixing a draft changes no status, while lanjutan is a workflow step (`ASSIGNED → UPDATED`).

Decision point = the `UPDATED` status, and the **mechanic** makes the decision there: "Request Sparepart" (Yes) or "Start Working" (No).

**Single source of truth:** one domain file (`work-order.policy.ts`) holds this transition table. It is used to:
- guard every use case (throw `InvalidTransitionError` / `ForbiddenActionError`), and
- compute `availableActions` for an actor, which the API returns on every WO so the frontend **never duplicates the rules** and just renders the buttons it gets.

---

## 3. Data model (follows the ERD in the brief, UUID PKs)

**users**: `id uuid PK`, `name varchar`, `role varchar (ADMIN|SPV|MECHANIC)`, `created_at`, `updated_at`

**work_orders**: `id uuid PK`, `title varchar`, `description text NULL`, `status varchar`, `created_by uuid FK→users`, `assigned_mechanic_id uuid NULL FK→users`, `start_date timestamptz NULL`, `end_date timestamptz NULL`, `created_at`, `updated_at`
- Index on `status`. Status kept as varchar plus a TS enum (simpler migrations than a PG enum).
- Small extra: `wo_number varchar UNIQUE` (e.g. `WO-20261104-0001`), which matches the mockup's "WO Number" column.
- **Added from the mockup:**
  - `fleet_number varchar(20) NOT NULL`: the vehicle this WO is for (e.g. `DT-0035`). It's trimmed and uppercased before saving, so `dt-0035 ` becomes `DT-0035`. Indexed for filtering. One vehicle can appear on many WOs over time.
  - `breakdown_time timestamptz NOT NULL`: when the vehicle broke down or was reported, entered by the Admin. It's a different moment from `start_date` (when the mechanic starts work). It must be ≤ now.
  - Both are set on create and editable only while `DRAFT`.
  - A `vehicles` master table (`work_orders.vehicle_id` FK) would be more correct, but it's deferred to Phase 6 to keep the scope small.

**sparepart_requests**: `id uuid PK`, `work_order_id uuid FK→work_orders`, `status varchar (PENDING|APPROVED|REJECTED)`, `request_note text NOT NULL` *(added: the mechanic's reason)*, `requested_by uuid FK→users` (the mechanic), `approved_by uuid NULL FK→users` (the SPV who reviewed it, for approve **or** reject; ERD name kept), `approval_note text NULL` (required when rejecting), `created_at`, `updated_at`
- A WO can have several requests over time (history of rejected → revised ones), which matches the ERD's one-to-many relation (`work_orders 0..1 — * sparepart_requests`). Only one request can be `PENDING` at a time. Enforced in the service, plus a partial unique index `ON (work_order_id) WHERE status = 'PENDING'`.

**sparepart_items**: `id uuid PK`, `sparepart_request_id uuid FK→sparepart_requests ON DELETE CASCADE`, `name varchar`, `qty int CHECK (qty > 0)`, `created_at`, `updated_at`

**Optional polish:** `work_order_activities` (`id`, `work_order_id`, `actor_id`, `action`, `from_status`, `to_status`, `note`, `created_at`) to show a timeline on the detail page. Do this only after the core flow works.

**Dates & timezones**
- **Every** timestamp column (`breakdown_time`, `start_date`, `end_date`, `created_at`, `updated_at`) is `timestamptz`, so Postgres stores the exact moment in UTC. The DB and backend containers run with `TZ=UTC`.
- The API only exchanges **ISO 8601** strings (`2026-11-04T13:00:00.000Z`). DTOs validate with `@IsISO8601()`.
- The frontend never sends or shows raw strings. See 5.4.

**Seed data** (runs on backend start, idempotent): 1 Admin, 1 SPV, 2 Mechanics (so assignment is a real choice), and optionally 1 sample WO.

---

## 4. Backend (NestJS) design

### 4.1 Tech choices
- NestJS 10 + TypeScript (strict)
- **TypeORM** + `pg`, migrations committed (`migrationsRun: true` on boot, `synchronize: false`)
- `class-validator` / `class-transformer` for DTOs, global `ValidationPipe({ whitelist: true, transform: true })`
- `@nestjs/config` for env
- `@nestjs/swagger` at `/api/docs` (cheap polish, also makes reviewing easier)
- Jest for unit tests

### 4.2 Identifying the actor (no auth)
- Frontend sends `X-User-Id: <uuid>` (chosen through the role/user selector).
- `ActorGuard` loads the user, attaches `req.actor = { id, role }`, and returns 401 if the header is missing or unknown.
- `@Roles('ADMIN')` decorator + `RolesGuard` give the coarse role check. Fine-grained checks (status, "is assigned mechanic") stay in the domain policy.
- **Bonus (Phase 6):** replace the header with JWT (`POST /api/auth/login` picking a seeded user, `@nestjs/jwt`). Only the guard changes, which shows the layering works.

### 4.3 Layering (light clean architecture)
```
backend/src/
├── main.ts                       # global prefix /api, pipes, filters, swagger, CORS
├── app.module.ts
├── config/                       # typeorm datasource, env validation
├── database/
│   ├── migrations/
│   └── seeds/seed.ts
├── common/
│   ├── guards/actor.guard.ts, roles.guard.ts
│   ├── decorators/actor.decorator.ts, roles.decorator.ts
│   ├── filters/domain-exception.filter.ts   # DomainError → HTTP status
│   └── errors/domain.errors.ts              # NotFound, InvalidTransition, Forbidden, Validation
└── modules/
    ├── users/
    │   ├── domain/        user.ts, role.enum.ts, user.repository.ts (interface + token)
    │   ├── application/   users.service.ts
    │   ├── infrastructure/user.orm-entity.ts, typeorm-user.repository.ts
    │   └── presentation/  users.controller.ts
    ├── work-orders/
    │   ├── domain/
    │   │   ├── work-order.ts              # domain model
    │   │   ├── work-order-status.enum.ts
    │   │   ├── work-order.policy.ts       # transition table + canPerform + availableActions
    │   │   └── work-order.repository.ts   # interface + WORK_ORDER_REPOSITORY token
    │   ├── application/
    │   │   ├── work-orders.service.ts     # create/editDraft/deleteDraft/submit/assign/update/start/complete/list/get
    │   │   └── dto/ (inputs)
    │   ├── infrastructure/
    │   │   ├── work-order.orm-entity.ts
    │   │   ├── work-order.mapper.ts       # ORM ↔ domain
    │   │   └── typeorm-work-order.repository.ts
    │   └── presentation/
    │       ├── work-orders.controller.ts  # thin: parse → call service → map response
    │       └── dto/ (request/response classes with validation + swagger)
    └── sparepart-requests/
        ├── domain/ sparepart-request.ts, sparepart-item.ts, sparepart-request.repository.ts
        ├── application/ sparepart-requests.service.ts   # requestSparepart, approve, reject
        ├── infrastructure/ orm entities, typeorm repository
        └── presentation/ sparepart-requests.controller.ts
```
Rules:
- Controllers contain **no business logic**. Services depend on repository **interfaces** (injected by token), never on TypeORM directly.
- Multi-table writes (request + items, approve + WO status) go through a small `UnitOfWork` / `DataSource.transaction` wrapper in the infrastructure layer, exposed to services as an interface.

### 4.4 Endpoints
Required (from the brief):
- `GET  /api/work-orders` (query: `status?`, `scope?=all|mine`, `page?`, `limit?`, `search?` matching title / WO number / fleet number); returns list + `availableActions` per row (visibility rules in 4.6)
- `POST /api/work-orders` — `{ title, description?, fleetNumber, breakdownTime }` (`breakdownTime` is an ISO 8601 string)
- `POST /api/work-orders/:id/submit`
- `POST /api/work-orders/:id/assign` — `{ mechanicId }`
- `POST /api/work-orders/:id/update` — `{ title?, description? }`
- `POST /api/work-orders/:id/request-sparepart` — `{ note, items: [{ name, qty }] }` (note required, min 1 item; assigned mechanic only)
- `POST /api/sparepart-requests/:id/approve` — `{ note? }`
- `POST /api/work-orders/:id/start`
- `POST /api/work-orders/:id/complete` — `{ endDate }` (ISO 8601 string)

Added (extensions):
- `PATCH /api/work-orders/:id` — `{ title?, description?, fleetNumber?, breakdownTime? }` (Admin, DRAFT only)
- `DELETE /api/work-orders/:id` — no body, `204 No Content` (Admin, DRAFT only)
- `POST /api/sparepart-requests/:id/reject` — `{ note }` (required)

Added because the frontend needs them:
- `GET /api/work-orders/:id`: detail with creator, mechanic, sparepart requests + items, `availableActions`
- `GET /api/users?role=MECHANIC`: for the selector and assign dropdown
- `GET /api/health`: for the Docker healthcheck

Error mapping: NotFound → 404, InvalidTransition → 409, Forbidden (wrong role / not the assigned mechanic) → 403, validation → 400. Consistent body: `{ statusCode, error, message }`.

### 4.5 Tests (keep focused)
- `work-order.policy.spec.ts`: every allowed transition, plus representative forbidden ones (wrong role, wrong status, wrong mechanic, editing or deleting a non-draft).
- `work-orders.service.spec.ts` also covers list scoping (mechanic `mine` vs `all`) and `end_date` validation.
- `work-orders.service.spec.ts`: happy path with **in-memory repositories**, which also shows why the repository interfaces exist.
- Optional: one e2e test (supertest) that runs the full flow against the compose DB.

### 4.6 List visibility per role
| Role     | Default scope | Can switch to |
|----------|---------------|---------------|
| ADMIN    | all           | — |
| SPV      | all           | — |
| MECHANIC | `mine` (WOs where `assigned_mechanic_id = actor.id`) | `all` (read-only view; actions still come from `availableActions`, so nothing new becomes possible) |

- The default is chosen in the **service** from the actor's role when `scope` is omitted, not in the controller and not only in the frontend.
- `scope=mine` for Admin/SPV is ignored (they always see all).
- Mechanics can't see `DRAFT` work orders, even in `all` scope: a draft isn't submitted yet, so it isn't their business.

---

## 5. Frontend (React) design

### 5.1 Tech choices
- React 18 + Vite + TypeScript
- React Router (2 routes), **TanStack Query** (server state + invalidation after each action)
- Plain fetch wrapper (`api/client.ts`) that injects `X-User-Id`
- Styling: Tailwind (or plain CSS modules). Simple, loosely following the mockup: table, status badges, "+ Add New Request" button.

### 5.2 Structure
```
frontend/src/
├── main.tsx, App.tsx, router.tsx
├── api/          client.ts, workOrders.ts, users.ts, types.ts
├── context/      ActorContext.tsx       # selected user (persisted in localStorage)
├── components/   Layout.tsx, ActorSelector.tsx, StatusBadge.tsx, ActionBar.tsx, Modal.tsx
├── features/work-orders/
│   ├── WorkOrderListPage.tsx
│   ├── WorkOrderDetailPage.tsx
│   ├── WorkOrderFormModal.tsx       # Admin: create, and edit while DRAFT (title, description, fleet number, breakdown time)
│   ├── DeleteWorkOrderDialog.tsx    # Admin: confirm delete while DRAFT
│   ├── AssignMechanicModal.tsx
│   ├── UpdateWorkOrderModal.tsx     # Admin lanjutan (title/description)
│   ├── RequestSparepartModal.tsx    # Mechanic: required note + item rows
│   ├── ReviewSparepartModal.tsx     # SPV: shows mechanic note + items; Approve / Reject (note)
│   └── CompleteWorkOrderModal.tsx   # end date input (datetime-local)
├── hooks/        useWorkOrders.ts, useWorkOrderActions.ts
└── lib/          datetime.ts            # toIso(localValue), formatDateTime(iso)
```

### 5.3 Pages & behaviour
- **Header:** Actor selector. Pick a role (Admin/SPV/Mechanic), then a user with that role (needed so two mechanics can be told apart). Changing it refetches queries.
- **Work Order List:** table, similar to the mockup's column order (No, Fleet Number, WO Number, Title, Breakdown Time, Start Date, End Date, Status badge, Mechanic, Actions). The search box matches title, WO number and fleet number. Status filter + simple pagination. "Create Work Order" shown only when `role === ADMIN`.
  - When the actor is a mechanic, an **"Assigned to me / All"** toggle appears, defaulting to "Assigned to me" (maps to `scope=mine|all`). Admin and SPV get no toggle.
  - Empty state for a mechanic with nothing assigned: "No work orders assigned to you yet."
- **Edit draft (Admin):** an "Edit" button appears only while the WO is `DRAFT`, which comes for free from `availableActions`. It opens the same form as Create, pre-filled.
- **Delete draft (Admin):** a "Delete" button, also only while `DRAFT` (from `availableActions`). It opens a confirm dialog built with the app's own Modal, not `window.confirm`: "Delete WO-… ? This can't be undone." After deleting from the detail page, go back to the list and show a success toast.
- **Work Order Detail:** info card, assigned mechanic, sparepart requests with items + approval state, optional activity timeline. **ActionBar renders buttons straight from `availableActions`** returned by the API.
- **Update (lanjutan) modal (Admin):** edits title/description, then the WO waits on the mechanic.
- **Mechanic at `UPDATED`:** two buttons, "Request Sparepart" (note + items) or "Start Working" (no parts needed).
- **SPV review modal:** reads the mechanic's note and items, then Approve (optional note) or Reject (required note). Rejected requests stay visible on the detail page with the SPV's note, so the mechanic can see why and send a revised request.
- Toasts for success/error. API error messages are shown as returned (e.g. 409 "Cannot start: status is WAITING_SPAREPART").

### 5.4 Dates & timezones (frontend)
- **Breakdown time input:** `WorkOrderFormModal` uses `<input type="datetime-local">` with `max` = now, converted the same way as the end date below.
- **End date input:** `CompleteWorkOrderModal` uses `<input type="datetime-local">`, defaulting to "now". Its value has no timezone (`2026-11-04T20:00`), so `toIso()` reads it as browser-local time and sends `new Date(value).toISOString()` (UTC). The input's `min` is set to `start_date` and `max` to now, matching the backend rules.
- **Display:** every date goes through one `formatDateTime(iso)` helper (`Intl.DateTimeFormat` in the browser's timezone, e.g. `04-11-2026 20:00`, similar to the mockup's format). No ad-hoc `toString()` anywhere.
- A user in WIB enters 20:00 → stored as 13:00 UTC → shown as 20:00 in WIB, and 22:00 to a viewer in KST.

---

## 6. Docker / runtime

```
docker-compose.yml
├── db        postgres:16-alpine, volume pgdata, healthcheck pg_isready, port 5432
├── backend   build ./backend (multi-stage: build → node:20-alpine runtime)
│             depends_on db (service_healthy); runs migrations + seed on start; port 4000
└── frontend  build ./frontend (multi-stage: vite build → nginx:alpine); port 3000→80
              nginx proxies /api → http://backend:4000 (same-origin, no CORS, no build-time API URL)
```
- `.env.example` at root (DB creds, ports). Compose has sane defaults, so it runs with **zero setup**.
- URLs: app http://localhost:3000, API http://localhost:4000/api, Swagger http://localhost:4000/api/docs.
- `.dockerignore` in both apps (node_modules, dist).
- Check on a **clean machine flow**: `docker compose down -v && docker compose up --build`, then run the whole workflow by hand.

---

## 7. Repository layout

```
work-order-system/
├── backend/          (NestJS)
├── frontend/         (React + Vite)
├── docker-compose.yml
├── .env.example
├── README.md
└── docs/
    └── workflow.md   (state diagram + action matrix, optional)
```

---

## 8. Implementation phases & checklist

### Git workflow
- **Commit once per phase at least** (and smaller commits inside a phase are fine). Never one big commit at the end, because reviewers read the history to see how you work.
- Use Conventional Commit style with a clear scope, for example:
  - Phase 0: `chore: scaffold NestJS backend, React frontend and docker compose`
  - Phase 1: `feat(db): add entities, initial migration and seed users`
  - Phase 2: `feat(work-orders): add status policy, repositories and use cases`, then `test(work-orders): cover policy transitions and service happy path`
  - Phase 3: `feat(api): add controllers, DTO validation, actor/roles guards and swagger`
  - Phase 4: `feat(web): add work order list, detail and role-based actions`
  - Phase 5: `chore(docker): multi-stage builds, nginx api proxy, healthchecks`, then `docs: add README with setup, structure and assumptions`
  - Phase 6: `feat(auth): ...`, `feat(activity): ...` and so on, one per bonus item
- Each phase's commit must leave `docker compose up --build` working (or at least building), so any commit can be checked out and run.
- Work on `main` (a solo test doesn't need a PR flow). Tag the final commit `v1.0` before submitting.

**Phase 0 — Scaffold (≈0.5h)**
- [ ] Monorepo folders, `nest new backend`, `npm create vite frontend -- --template react-ts`
- [ ] docker-compose with db + backend + frontend skeletons; `docker compose up --build` serves "hello" pages
- [ ] Root `.gitignore`, then commit (Phase 0)

**Phase 1 — Data layer (≈1h)**
- [ ] TypeORM config, ORM entities for 4 tables (all timestamps `timestamptz`), initial migration
- [ ] Seed script (users, optional sample WO with a fleet number and breakdown time), wired into backend start
- [ ] `GET /api/health`, `GET /api/users`
- [ ] Commit (Phase 1)

**Phase 2 — Domain + use cases (≈2h)**
- [ ] Status enum + `work-order.policy.ts` (transition table, `assertCan`, `availableActions`)
- [ ] Repository interfaces + TypeORM implementations + mappers
- [ ] `WorkOrdersService`: create, editDraft, deleteDraft, submit, assign, update, start, complete, list (role-based scope), getById
- [ ] `SparepartRequestsService`: requestSparepart (tx, mechanic + note), approve (tx), reject (tx, note required)
- [ ] Domain errors + exception filter
- [ ] Unit tests for the policy + service happy path + list scoping + end date rules
- [ ] Commit (Phase 2)

**Phase 3 — HTTP layer (≈1h)**
- [ ] ActorGuard, Roles decorator/guard, `@Actor()` param decorator
- [ ] Controllers + validated DTOs for all endpoints; Swagger
- [ ] Manual run of the full flow via Swagger/curl (three paths: no sparepart, approved, rejected → revised → approved)
- [ ] Commit (Phase 3)

**Phase 4 — Frontend (≈3h)**
- [ ] API client + types, ActorContext + selector
- [ ] `lib/datetime.ts` (`toIso`, `formatDateTime`), used for every date
- [ ] List page (table, badges, status filter, mechanic "Assigned to me / All" toggle, create modal)
- [ ] Detail page + ActionBar driven by `availableActions`
- [ ] Edit draft / Delete draft / Assign / Update / Request Sparepart / Approve–Reject / Start / Complete interactions
- [ ] Error + success toasts, loading/empty states
- [ ] Commit (Phase 4)

**Phase 5 — Docker hardening + README (≈1h)**
- [ ] Multi-stage Dockerfiles, nginx `/api` proxy, healthchecks
- [ ] Clean run from `down -v`; walk through all three workflow paths in the UI
- [ ] README (outline below)
- [ ] Commit (Phase 5), tag `v1.0`

**Phase 6 — Bonus / polish (only if time remains)**
- [ ] JWT auth (login by picking a seeded user; guard swap only)
- [ ] `vehicles` master table: replace `work_orders.fleet_number` with a `vehicle_id` FK, seed vehicles, pick from a dropdown
- [ ] Activity timeline (`work_order_activities`)
- [ ] WO number generator, search, pagination polish
- [ ] One e2e test for the full flow
- [ ] GitHub Actions: lint + test

---

## 9. Assumptions (to copy into the README)

1. No auth by default. The actor is chosen in the UI and sent as the `X-User-Id` header; the backend still enforces roles. (JWT is a bonus.)
2. The **assigned mechanic** decides whether spareparts are needed, because they inspect the vehicle; the Admin doesn't know the technical details. The brief lists no owner for this step. Each request needs a **note** explaining why the parts are needed (new `request_note` column).
3. **Extension:** the SPV can **reject** a request with a required note (`REJECTED` status added to the brief's PENDING/APPROVED). The ERD's `approval_note` holds the SPV's note for both outcomes, and `approved_by` holds the reviewer.
4. Approval moves the WO to `READY_TO_WORK`. Rejection moves it back to `UPDATED`, where the mechanic can send a revised request or start without parts. A WO keeps its request history but has at most one **pending** request at a time.
5. "Update (lanjutan)" is the Admin's follow-up after assignment (title/description). After it, the WO waits for the mechanic's sparepart decision.
6. Only the **assigned** mechanic can start the WO. `start_date` is set by the server when it starts.
7. `end_date` is entered by the Admin and must be ≥ `start_date`.
8. SPV may reassign the mechanic while status is still `ASSIGNED` (before the update step).
9. Users are seeded. There is no user-management UI.
10. Status values were simplified into 8 states, as the brief allows.
11. The Admin can edit (`PATCH`) or delete (`DELETE`) a work order while it is `DRAFT`. Deleting is a hard delete, which is safe because no one else has acted on a draft yet. After submission, changes only happen through workflow steps and work orders can't be deleted. A full cancel flow (`CANCELLED` status) is out of scope.
12. Admin and SPV see all work orders. Mechanics default to the ones assigned to them and can switch to "All" as a read-only view; drafts are never shown to mechanics.
13. All timestamps are stored as `timestamptz` (UTC) and exchanged as ISO 8601. The end date is entered in the browser's local time, and every date is shown in the viewer's browser timezone.
14. **Added from the mockup:** each WO stores the vehicle's `fleet_number` (free text, normalized to uppercase) and a `breakdown_time` (when the vehicle broke down, ≤ now). Breakdown time is per WO because each breakdown is one WO. Fleet number really belongs to a vehicle; it's kept as a column for now, with a `vehicles` master table as the next step.
15. The mockup's **Picker** column (warehouse staff who pick spareparts from inventory, after approval) is out of scope: it needs a fourth role and an inventory flow that the brief doesn't include.

---

## 10. README outline

1. Overview (1 paragraph + state diagram)
2. Tech stack
3. How to run: `docker compose up --build`, URLs, seeded users, reset with `docker compose down -v`
4. How to walk through the workflow (step-by-step with which role to select)
5. Project structure (backend layers, frontend folders) + why repository interfaces exist
6. API summary (table) + Swagger link
7. Assumptions (section 9)
8. What I'd do next / trade-offs

---

## 11. Definition of done

- [ ] `docker compose up --build` on a clean clone works with no manual steps
- [ ] All three paths complete end to end **in the UI**: no sparepart, approved, rejected → revised → approved
- [ ] The brief's minimum flow still works exactly as written (extensions don't block it)
- [ ] Wrong role / wrong status attempts are rejected by the API with clear messages (including editing or deleting a non-draft)
- [ ] A mechanic lands on "Assigned to me"; Admin/SPV see everything
- [ ] The end date entered in local time shows back as the same local time after reload
- [ ] Git history has one commit (or more) per phase, ending in tag `v1.0`
- [ ] Controllers are thin, services depend on repository interfaces, the policy is unit-tested
- [ ] README matches what actually happens when you run it
