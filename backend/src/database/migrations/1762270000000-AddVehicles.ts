import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Moves the fleet number from a free-text column on work_orders into a vehicles master table.
 * Existing work orders keep their vehicle: one vehicle row is created per distinct fleet number.
 */
export class AddVehicles1762270000000 implements MigrationInterface {
  name = 'AddVehicles1762270000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE vehicles (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        fleet_number  varchar(20)  NOT NULL UNIQUE,
        name          varchar(100) NOT NULL,
        created_at    timestamptz  NOT NULL DEFAULT now(),
        updated_at    timestamptz  NOT NULL DEFAULT now()
      )`);

    await q.query(`
      INSERT INTO vehicles (fleet_number, name)
      SELECT DISTINCT upper(trim(fleet_number)), 'Unit ' || upper(trim(fleet_number)) FROM work_orders`);

    await q.query(`ALTER TABLE work_orders ADD COLUMN vehicle_id uuid REFERENCES vehicles(id) ON DELETE RESTRICT`);
    await q.query(`
      UPDATE work_orders wo SET vehicle_id = v.id
      FROM vehicles v WHERE v.fleet_number = upper(trim(wo.fleet_number))`);
    await q.query(`ALTER TABLE work_orders ALTER COLUMN vehicle_id SET NOT NULL`);
    await q.query(`CREATE INDEX idx_work_orders_vehicle ON work_orders (vehicle_id)`);

    await q.query(`DROP INDEX idx_work_orders_fleet_number`);
    await q.query(`ALTER TABLE work_orders DROP COLUMN fleet_number`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE work_orders ADD COLUMN fleet_number varchar(20)`);
    await q.query(`UPDATE work_orders wo SET fleet_number = v.fleet_number FROM vehicles v WHERE v.id = wo.vehicle_id`);
    await q.query(`ALTER TABLE work_orders ALTER COLUMN fleet_number SET NOT NULL`);
    await q.query(`CREATE INDEX idx_work_orders_fleet_number ON work_orders (fleet_number)`);
    await q.query(`ALTER TABLE work_orders DROP COLUMN vehicle_id`);
    await q.query(`DROP TABLE vehicles`);
  }
}
