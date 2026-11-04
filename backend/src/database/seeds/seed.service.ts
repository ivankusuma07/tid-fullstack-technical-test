import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Role } from '../../modules/users/domain/role.enum';
import { SEED_USERS } from './seed-data';

/**
 * Runs on every boot, after migrations (TypeORM runs them when the DataSource initializes).
 * Idempotent: users have fixed ids + ON CONFLICT, and the sample WO is only added to an empty table.
 * Set SEED=false to skip.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.SEED === 'false') return;

    for (const u of SEED_USERS) {
      await this.dataSource.query(
        `INSERT INTO users (id, name, role) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
        [u.id, u.name, u.role],
      );
    }

    const [{ count }] = await this.dataSource.query(`SELECT count(*)::int AS count FROM work_orders`);
    if (count === 0) {
      const admin = SEED_USERS.find((u) => u.role === Role.ADMIN)!;
      await this.dataSource.query(
        `INSERT INTO work_orders (wo_number, title, description, fleet_number, breakdown_time, status, created_by)
         VALUES (
           'WO-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('work_order_number_seq')::text, 4, '0'),
           $1, $2, $3, now() - interval '2 hours', 'DRAFT', $4
         )`,
        ['Engine overheating', 'Coolant temperature warning on the haul road.', 'DT-0035', admin.id],
      );
    }
    this.logger.log('Seed data ensured');
  }
}
