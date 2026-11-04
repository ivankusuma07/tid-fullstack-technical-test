import { MigrationInterface, QueryRunner } from 'typeorm';

/** Timeline of every workflow step per work order (who, what, status change, note). */
export class AddWorkOrderActivities1762260000000 implements MigrationInterface {
  name = 'AddWorkOrderActivities1762260000000';

  public async up(q: QueryRunner): Promise<void> {
    // clock_timestamp() (not now()) so several steps in one transaction still get ordered times.
    await q.query(`
      CREATE TABLE work_order_activities (
        id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        work_order_id  uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
        actor_id       uuid NOT NULL REFERENCES users(id),
        action         varchar(30) NOT NULL,
        from_status    varchar(30),
        to_status      varchar(30),
        note           text,
        created_at     timestamptz NOT NULL DEFAULT clock_timestamp()
      )`);
    await q.query(
      `CREATE INDEX idx_work_order_activities_work_order ON work_order_activities (work_order_id, created_at)`,
    );

    // Backfill a CREATE entry for work orders that already exist (e.g. the seeded sample).
    await q.query(`
      INSERT INTO work_order_activities (work_order_id, actor_id, action, from_status, to_status, created_at)
      SELECT id, created_by, 'CREATE', NULL, 'DRAFT', created_at FROM work_orders`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE work_order_activities`);
  }
}
