import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ActorGuard } from './common/guards/actor.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthController } from './modules/health/health.controller';
import { SparepartRequestsModule } from './modules/sparepart-requests/sparepart-requests.module';
import { UsersModule } from './modules/users/users.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    VehiclesModule,
    WorkOrdersModule,
    SparepartRequestsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: resolve the actor first, then check its role.
    { provide: APP_GUARD, useClass: ActorGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
