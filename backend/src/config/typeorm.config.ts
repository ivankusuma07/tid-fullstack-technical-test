import { DataSourceOptions } from 'typeorm';
import { join } from 'path';

/**
 * Single source for DB connection options, shared by the Nest app and the TypeORM CLI.
 * synchronize is always off: the schema only changes through committed migrations.
 */
export function buildTypeOrmOptions(env: NodeJS.ProcessEnv = process.env): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST ?? 'localhost',
    port: Number(env.DB_PORT ?? 5432),
    username: env.DB_USER ?? 'workorder',
    password: env.DB_PASSWORD ?? 'workorder',
    database: env.DB_NAME ?? 'workorder',
    entities: [join(__dirname, '..', 'modules', '**', '*.orm-entity.{ts,js}')],
    migrations: [join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
    synchronize: false,
    migrationsRun: true,
    logging: ['error', 'warn', 'migration'],
  };
}
