import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Links sparepart timeline entries (request / approve / reject) to their sparepart request, so the
 * timeline can show which parts were requested and how many.
 */
export class LinkActivitiesToSparepartRequests1762280000000 implements MigrationInterface {
  name = 'LinkActivitiesToSparepartRequests1762280000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE work_order_activities
        ADD COLUMN sparepart_request_id uuid NULL REFERENCES sparepart_requests(id) ON DELETE SET NULL`);

    // Backfill existing entries. Each was written in the same transaction as its request, so the
    // request on the same work order with the closest timestamp is the right one: created_at for a
    // request entry, updated_at (the review) for an approve / reject entry.
    await q.query(`
      UPDATE work_order_activities a
         SET sparepart_request_id = (
           SELECT r.id
             FROM sparepart_requests r
            WHERE r.work_order_id = a.work_order_id
              AND (a.action = 'REQUEST_SPAREPART'
                   OR (a.action = 'APPROVE_SPAREPART' AND r.status = 'APPROVED')
                   OR (a.action = 'REJECT_SPAREPART' AND r.status = 'REJECTED'))
            ORDER BY abs(extract(epoch FROM
                       (CASE WHEN a.action = 'REQUEST_SPAREPART' THEN r.created_at ELSE r.updated_at END) - a.created_at))
            LIMIT 1)
       WHERE a.action IN ('REQUEST_SPAREPART', 'APPROVE_SPAREPART', 'REJECT_SPAREPART')`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE work_order_activities DROP COLUMN sparepart_request_id`);
  }
}
