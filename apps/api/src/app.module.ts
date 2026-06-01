import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD, APP_FILTER } from '@nestjs/core'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { PrismaModule } from './modules/prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { FactoryModule } from './modules/factory/factory.module'
import { MachineModule } from './modules/machine/machine.module'
import { PlanModule } from './modules/plan/plan.module'
import { OutputModule } from './modules/output/output.module'
import { ReportModule } from './modules/report/report.module'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { RolesGuard } from './common/guards/roles.guard'
import { PermissionsGuard } from './common/guards/permissions.guard'
import { AllExceptionsFilter } from './common/filters/http-exception.filter'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 200 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    FactoryModule,
    MachineModule,
    PlanModule,
    OutputModule,
    ReportModule,
  ],
  providers: [
    // Áp dụng JwtAuthGuard toàn cục — @Public() để bypass
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
