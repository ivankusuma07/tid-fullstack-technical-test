import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../src/app.setup';
import { SEED_USERS, SEED_VEHICLES } from '../src/database/seeds/seed-data';

/**
 * Full workflow over HTTP against a real Postgres: migrations, seed, guards, validation,
 * transactions and row locks all run for real.
 *
 * Needs a Postgres reachable with the DB_* env vars (defaults match docker-compose:
 * `docker compose up -d db`). It uses its own database, recreated on every run.
 */

const E2E_DB = process.env.E2E_DB_NAME ?? 'workorder_e2e';
const db = {
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USER ?? 'workorder',
  password: process.env.DB_PASSWORD ?? 'workorder',
};

const id = (name: string) => SEED_USERS.find((u) => u.name.startsWith(name))!.id;
const VEHICLE = SEED_VEHICLES[0].id;

async function recreateDatabase() {
  const admin = new Client({ ...db, database: process.env.DB_ADMIN_DB ?? 'postgres' });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${E2E_DB} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${E2E_DB}`);
  await admin.end();
}

describe('Work order workflow (e2e)', () => {
  let app: INestApplication<App>;
  const tokens: Record<string, string> = {};

  /** Authenticated request as one of the seeded users. */
  const as = (user: 'Andi' | 'Siti' | 'Budi' | 'Rudi') => {
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${tokens[user]}`);
    const http = request(app.getHttpServer());
    return {
      get: (url: string) => auth(http.get(`/api${url}`)),
      post: (url: string, body?: object) => auth(http.post(`/api${url}`)).send(body ?? {}),
      patch: (url: string, body: object) => auth(http.patch(`/api${url}`)).send(body),
      delete: (url: string) => auth(http.delete(`/api${url}`)),
    };
  };

  const createWorkOrder = async (title: string) => {
    const res = await as('Andi')
      .post('/work-orders', {
        title,
        vehicleId: VEHICLE,
        breakdownTime: new Date(Date.now() - 3_600_000).toISOString(),
      })
      .expect(201);
    return res.body.id as string;
  };

  /** Create -> submit -> assign Budi -> update: the mechanic's decision point. */
  const toUpdated = async (title: string) => {
    const woId = await createWorkOrder(title);
    await as('Andi').post(`/work-orders/${woId}/submit`).expect(200);
    await as('Siti').post(`/work-orders/${woId}/assign`, { mechanicId: id('Budi') }).expect(200);
    const res = await as('Andi').post(`/work-orders/${woId}/update`, { description: 'Follow-up' }).expect(200);
    expect(res.body.status).toBe('UPDATED');
    return woId;
  };

  beforeAll(async () => {
    await recreateDatabase();
    Object.assign(process.env, { ...process.env, DB_NAME: E2E_DB, JWT_SECRET: 'e2e-secret' });

    // Imported after the env is set, so the module config reads the e2e database.
    const { AppModule } = await import('../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();

    for (const name of ['Andi', 'Siti', 'Budi', 'Rudi'] as const) {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ userId: id(name) })
        .expect(200);
      tokens[name] = res.body.accessToken;
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  it('path 1: no sparepart needed', async () => {
    const woId = await toUpdated('Flat tyre');

    const working = await as('Budi').post(`/work-orders/${woId}/start`).expect(200);
    expect(working.body.status).toBe('WORKING');
    expect(working.body.startDate).toBeTruthy();

    const done = await as('Andi')
      .post(`/work-orders/${woId}/complete`, { endDate: new Date().toISOString() })
      .expect(200);
    expect(done.body.status).toBe('COMPLETED');
    expect(done.body.availableActions).toEqual([]);
    expect(done.body.activities.map((a: { action: string }) => a.action)).toEqual([
      'CREATE',
      'SUBMIT',
      'ASSIGN',
      'UPDATE',
      'START',
      'COMPLETE',
    ]);
  });

  it('path 2: sparepart requested and approved', async () => {
    const woId = await toUpdated('Radiator leak');

    const waiting = await as('Budi')
      .post(`/work-orders/${woId}/request-sparepart`, {
        note: 'Hose cracked',
        items: [
          { name: 'Radiator hose', qty: 1 },
          { name: 'Coolant', qty: 4 },
        ],
      })
      .expect(201);
    expect(waiting.body.status).toBe('WAITING_SPAREPART');
    const [req] = waiting.body.sparepartRequests;
    expect(req.items).toHaveLength(2);
    // The timeline entry points at the request, so the UI can list its parts and quantities.
    const requested = waiting.body.activities.find((a: { action: string }) => a.action === 'REQUEST_SPAREPART');
    expect(requested.sparepartRequestId).toBe(req.id);

    // The SPV sees approve/reject; the mechanic can no longer start.
    const spvView = await as('Siti').get(`/work-orders/${woId}`).expect(200);
    expect(spvView.body.availableActions).toEqual(['APPROVE_SPAREPART', 'REJECT_SPAREPART']);
    await as('Budi').post(`/work-orders/${woId}/start`).expect(409);

    const ready = await as('Siti').post(`/sparepart-requests/${req.id}/approve`, { note: 'OK' }).expect(200);
    expect(ready.body.status).toBe('READY_TO_WORK');
    expect(ready.body.sparepartRequests[0]).toMatchObject({ status: 'APPROVED', approvalNote: 'OK' });

    await as('Budi').post(`/work-orders/${woId}/start`).expect(200);
  });

  it('path 3: rejected, revised, then approved', async () => {
    const woId = await toUpdated('Engine noise');

    const first = await as('Budi')
      .post(`/work-orders/${woId}/request-sparepart`, { note: 'Replace engine', items: [{ name: 'Engine', qty: 1 }] })
      .expect(201);
    await as('Siti')
      .post(`/sparepart-requests/${first.body.sparepartRequests[0].id}/reject`, {})
      .expect(400); // note is required
    const rejected = await as('Siti')
      .post(`/sparepart-requests/${first.body.sparepartRequests[0].id}/reject`, { note: 'Check the belt first' })
      .expect(200);
    expect(rejected.body.status).toBe('UPDATED');

    const second = await as('Budi')
      .post(`/work-orders/${woId}/request-sparepart`, { note: 'Belt only', items: [{ name: 'Fan belt', qty: 1 }] })
      .expect(201);
    const approved = await as('Siti')
      .post(`/sparepart-requests/${second.body.sparepartRequests[0].id}/approve`)
      .expect(200);
    expect(approved.body.sparepartRequests.map((r: { status: string }) => r.status)).toEqual(['APPROVED', 'REJECTED']);
  });

  it('rejects wrong roles, wrong mechanic, wrong status and bad tokens', async () => {
    const http = request(app.getHttpServer());
    await http.get('/api/work-orders').expect(401);
    await http.get('/api/work-orders').set('Authorization', 'Bearer not-a-token').expect(401);

    await as('Siti')
      .post('/work-orders', { title: 'x', vehicleId: VEHICLE, breakdownTime: new Date().toISOString() })
      .expect(403);

    const woId = await toUpdated('Brake noise');
    const wrongMechanic = await as('Rudi').post(`/work-orders/${woId}/start`).expect(403);
    expect(wrongMechanic.body.message).toBe('Only the assigned mechanic can start this work order');

    const wrongStatus = await as('Andi').post(`/work-orders/${woId}/submit`).expect(409);
    expect(wrongStatus.body).toEqual({ statusCode: 409, error: 'Conflict', message: 'Cannot submit: status is UPDATED' });

    await as('Andi').patch(`/work-orders/${woId}`, { title: 'x' }).expect(409);
    await as('Andi').delete(`/work-orders/${woId}`).expect(409);
  });

  it('a draft can be edited and deleted, and is hidden from mechanics', async () => {
    const woId = await createWorkOrder('Draft only');
    await as('Budi').get(`/work-orders/${woId}`).expect(404);

    const edited = await as('Andi').patch(`/work-orders/${woId}`, { title: 'Edited draft' }).expect(200);
    expect(edited.body.title).toBe('Edited draft');

    await as('Andi').delete(`/work-orders/${woId}`).expect(204);
    await as('Andi').get(`/work-orders/${woId}`).expect(404);
  });

  it('row locks: two concurrent approvals of the same request, only one wins', async () => {
    const woId = await toUpdated('Concurrent approve');
    const res = await as('Budi')
      .post(`/work-orders/${woId}/request-sparepart`, { note: 'n', items: [{ name: 'Filter', qty: 1 }] })
      .expect(201);
    const reqId = res.body.sparepartRequests[0].id;

    const results = await Promise.all([
      as('Siti').post(`/sparepart-requests/${reqId}/approve`),
      as('Siti').post(`/sparepart-requests/${reqId}/approve`),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);

    const wo = await as('Andi').get(`/work-orders/${woId}`).expect(200);
    expect(wo.body.activities.filter((a: { action: string }) => a.action === 'APPROVE_SPAREPART')).toHaveLength(1);
  });

  it('lists: mechanics only see their own work orders, search matches fleet number', async () => {
    const mine = await as('Budi').get('/work-orders').expect(200);
    expect(mine.body.total).toBeGreaterThan(0);
    expect(mine.body.items.every((w: { assignedMechanic: { id: string } }) => w.assignedMechanic.id === id('Budi'))).toBe(true);

    const rudi = await as('Rudi').get('/work-orders').expect(200);
    expect(rudi.body.total).toBe(0);
    await as('Rudi').get(`/work-orders/${mine.body.items[0].id}`).expect(404);
    // The old "show all" escape hatch is gone.
    await as('Budi').get('/work-orders?scope=all').expect(400);

    const found = await as('Andi').get(`/work-orders?search=${SEED_VEHICLES[0].fleetNumber.toLowerCase()}`).expect(200);
    expect(found.body.total).toBeGreaterThan(0);
    expect(found.body.items.every((w: { vehicle: { id: string } }) => w.vehicle.id === VEHICLE)).toBe(true);
  });
});
