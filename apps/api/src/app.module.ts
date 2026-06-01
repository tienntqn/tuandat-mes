import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './modules/prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { FactoryModule } from './modules/factory/factory.module'
import { MachineModule } from './modules/machine/machine.module'
import { PlanModule } from './modules/plan/plan.module'
import { OutputModule } from './modules/output/output.module'
import { ReportModule } from './modules/report/report.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    FactoryModule,
    MachineModule,
    PlanModule,
    OutputModule,
    ReportModule,
  ],
})
export class AppModule {}
