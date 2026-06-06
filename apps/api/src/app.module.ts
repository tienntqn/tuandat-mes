import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD, APP_FILTER } from '@nestjs/core'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { PrismaModule } from './modules/prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { CompanyModule } from './modules/company/company.module'
import { FactoryModule } from './modules/factory/factory.module'
import { ProductionLineModule } from './modules/production-line/production-line.module'
import { EmployeeModule } from './modules/employee/employee.module'
import { CustomerModule } from './modules/customer/customer.module'
import { ColorModule } from './modules/color/color.module'
import { SizeModule } from './modules/size/size.module'
import { StyleModule } from './modules/style/style.module'
import { PurchaseOrderModule } from './modules/purchase-order/purchase-order.module'
import { OrderModule } from './modules/order/order.module'
import { DeliveryPlanModule } from './modules/delivery-plan/delivery-plan.module'
import { MachineModule } from './modules/machine/machine.module'
import { PlanModule } from './modules/plan/plan.module'
import { OutputModule } from './modules/output/output.module'
import { ReportModule } from './modules/report/report.module'
import { PayrollModule } from './modules/payroll/payroll.module'
import { SettingsModule } from './modules/settings/settings.module'
import { UploadsModule } from './modules/uploads/uploads.module'
import { MachineBrandModule } from './modules/machine-brand/machine-brand.module'
import { MachineCategoryModule } from './modules/machine-category/machine-category.module'
import { SparePartModule } from './modules/spare-part/spare-part.module'
import { RepairProposalModule } from './modules/repair-proposal/repair-proposal.module'
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
    CompanyModule,
    FactoryModule,
    ProductionLineModule,
    EmployeeModule,
    CustomerModule,
    ColorModule,
    SizeModule,
    StyleModule,
    PurchaseOrderModule,
    OrderModule,
    DeliveryPlanModule,
    MachineModule,
    PlanModule,
    OutputModule,
    ReportModule,
    PayrollModule,
    SettingsModule,
    UploadsModule,
    MachineBrandModule,
    MachineCategoryModule,
    SparePartModule,
    RepairProposalModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
