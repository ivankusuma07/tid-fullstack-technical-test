import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildTypeOrmOptions } from '../config/typeorm.config';
import { SeedService } from './seeds/seed.service';

@Module({
  imports: [TypeOrmModule.forRootAsync({ useFactory: () => buildTypeOrmOptions() })],
  providers: [SeedService],
})
export class DatabaseModule {}
