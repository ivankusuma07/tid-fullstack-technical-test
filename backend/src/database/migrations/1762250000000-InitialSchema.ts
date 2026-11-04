import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema, following the ERD in the brief (UUID PKs, timestamptz everywhere).
 * Additions: work_orders.wo_number / fleet_number / breakdown_time (from the mockup),
 * sparepart_requests.request_note (the mechanic's reason) and the REJECTED status.
 */
export class InitialSchema1762250000000 implements MigrationInterface {
  name = 'InitialSchema1762250000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE users (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name        varchar(100) NOT NULL,
        role        varchar(20)  NOT NULL CHECK (role IN ('ADMIN', 'SPV', 'MECHANIC')),
        created_at  timestamptz  NOT NULL DEFAULT now(),
        updated_at  timestamptz  NOT NULL DEFAULT now()
      )`);

    await q.query(`CREATE SEQUENCE work_order_number_seq`);

    await q.query(`
      CREATE TABLE work_orders (
        id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        wo_number             varchar(30)  NOT NULL UNIQUE,
        title                 varchar(200) NOT NULL,
        description           text,
        fleet_number          varchar(20)  NOT NULL,
        breakdown_time        timestamptz  NOT NULL,
        status                varchar(30)  NOT NULL,
        created_by            uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        assigned_mechanic_id  uuid REFERENCES users(id) ON DELETE RESTRICT,
        start_date            timestamptz,
        end_date              timestamptz,
        created_at            timestamptz NOT NULL DEFAULT now(),
        updated_at            timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_work_orders_end_after_start
          CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
      )`);
    await q.query(`CREATE INDEX idx_work_orders_status ON work_orders (status)`);
    await q.query(`CREATE INDEX idx_work_orders_fleet_number ON work_orders (fleet_number)`);
    await q.query(`CREATE INDEX idx_work_orders_assigned_mechanic ON work_orders (assigned_mechanic_id)`);

    await q.query(`
      CREATE TABLE sparepart_requests (
        id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        work_order_id  uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
        status         varchar(20) NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
        request_note   text NOT NULL,
        requested_by   uuid NOT NULL REFERENCES users(id),
        approved_by    uuid REFERENCES users(id),
        approval_note  text,
        created_at     timestamptz NOT NULL DEFAULT now(),
        updated_at     timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX idx_sparepart_requests_work_order ON sparepart_requests (work_order_id)`);
    // At most one PENDING request per work order; reviewed requests stay as history.
    await q.query(`
      CREATE UNIQUE INDEX uq_sparepart_requests_one_pending
        ON sparepart_requests (work_order_id) WHERE status = 'PENDING'`);

    await q.query(`
      CREATE TABLE sparepart_items (
        id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        sparepart_request_id  uuid NOT NULL REFERENCES sparepart_requests(id) ON DELETE CASCADE,
        name                  varchar(100) NOT NULL,
        qty                   int NOT NULL CHECK (qty > 0),
        created_at            timestamptz NOT NULL DEFAULT now(),
        updated_at            timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX idx_sparepart_items_request ON sparepart_items (sparepart_request_id)`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE sparepart_items`);
    await q.query(`DROP TABLE sparepart_requests`);
    await q.query(`DROP TABLE work_orders`);
    await q.query(`DROP SEQUENCE work_order_number_seq`);
    await q.query(`DROP TABLE users`);
  }
}
