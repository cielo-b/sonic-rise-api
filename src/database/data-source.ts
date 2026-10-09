/**
 * Standalone TypeORM DataSource used by the TypeORM CLI for generating and
 * running migrations outside of the NestJS DI container.
 *
 * Usage:
 *   npm run migration:generate -- src/database/migrations/MigrationName
 *   npm run migration:run
 *   npm run migration:revert
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from './entities';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: ['error', 'warn'],
  entities: ALL_ENTITIES,
  migrations: ['src/database/migrations/*.ts'],
});
