import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './typeorm.config';

// Used by the TypeORM CLI (npm run migration:*). The app itself uses TypeOrmModule.
export default new DataSource(buildTypeOrmOptions());
