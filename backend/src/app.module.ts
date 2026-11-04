import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './modules/health/health.controller';
import { SparepartRequestsModule } from './modules/sparepart-requests/sparepart-requests.module';
import { UsersModule } from './modules/users/users.module';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, UsersModule, WorkOrdersModule, SparepartRequestsModule],
  controllers: [HealthController],
})
export class AppModule {}
