-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'PARTIAL', 'DELIVERED');

-- CreateEnum
CREATE TYPE "EmployeePosition" AS ENUM ('COMPANY_PLANNER', 'BOD', 'ADMIN', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER', 'LINE_LEADER', 'LINE_DEPUTY', 'MECHANIC', 'CUTTING_LEADER', 'FINISHING_LEADER', 'QC_LEADER', 'ACCOUNTANT');

-- CreateEnum
CREATE TYPE "FactorySection" AS ENUM ('CUTTING', 'QC');

-- CreateEnum
CREATE TYPE "FactoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MachineStatus" AS ENUM ('RUNNING', 'IDLE', 'MAINTENANCE', 'BROKEN', 'STOPPED');

-- CreateEnum
CREATE TYPE "MachineType" AS ENUM ('SEWING', 'PROGRAMMABLE', 'SEAM_SEALING', 'CUTTING', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('PERIODIC', 'REPAIR');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PermissionAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE');

-- CreateEnum
CREATE TYPE "ProductionStage" AS ENUM ('CUTTING', 'SEWING', 'QC', 'PACKING');

-- CreateEnum
CREATE TYPE "RepairProposalStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'DONE');

-- CreateEnum
CREATE TYPE "RepairProposalType" AS ENUM ('REPAIR', 'REPLACEMENT');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'SENDER_CONFIRMED', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Color" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hex" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Color_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "taxCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyPlan" (
    "id" SERIAL NOT NULL,
    "styleId" INTEGER NOT NULL,
    "poId" INTEGER NOT NULL,
    "factoryId" INTEGER NOT NULL,
    "plannedQuantity" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "expectedFinishDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "contactInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyOutput" (
    "id" SERIAL NOT NULL,
    "lineId" INTEGER NOT NULL,
    "styleId" INTEGER NOT NULL,
    "colorId" INTEGER,
    "sizeId" INTEGER,
    "stage" "ProductionStage" NOT NULL,
    "outputDate" DATE NOT NULL,
    "quantity" INTEGER NOT NULL,
    "enteredBy" INTEGER NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyOutput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyOutputLog" (
    "id" SERIAL NOT NULL,
    "dailyOutputId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "enteredBy" INTEGER NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyOutputLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryItem" (
    "id" SERIAL NOT NULL,
    "deliveryPlanId" INTEGER NOT NULL,
    "colorId" INTEGER NOT NULL,
    "sizeId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "DeliveryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryPlan" (
    "id" SERIAL NOT NULL,
    "poId" INTEGER NOT NULL,
    "plannedDate" DATE NOT NULL,
    "plannedQuantity" INTEGER NOT NULL,
    "actualDate" DATE,
    "actualQuantity" INTEGER,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DeliveryPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "position" "EmployeePosition" NOT NULL,
    "factoryId" INTEGER,
    "lineId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Factory" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "status" "FactoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "cuttingWorkerCount" INTEGER NOT NULL DEFAULT 0,
    "finishingWorkerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Factory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactoryPlan" (
    "id" SERIAL NOT NULL,
    "companyPlanId" INTEGER NOT NULL,
    "lineId" INTEGER NOT NULL,
    "plannedQuantity" INTEGER NOT NULL,
    "expectedFinishDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FactoryPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactorySectionOutput" (
    "id" SERIAL NOT NULL,
    "factoryId" INTEGER NOT NULL,
    "section" "FactorySection" NOT NULL,
    "styleId" INTEGER NOT NULL,
    "colorId" INTEGER,
    "sizeId" INTEGER,
    "outputDate" DATE NOT NULL,
    "quantity" INTEGER NOT NULL,
    "enteredBy" INTEGER NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FactorySectionOutput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactorySectionOutputLog" (
    "id" SERIAL NOT NULL,
    "factorySectionOutputId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "enteredBy" INTEGER NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FactorySectionOutputLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinishingOutput" (
    "id" SERIAL NOT NULL,
    "factoryId" INTEGER NOT NULL,
    "poId" INTEGER NOT NULL,
    "outputDate" DATE NOT NULL,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
    "packedQuantity" INTEGER NOT NULL DEFAULT 0,
    "enteredBy" INTEGER NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinishingOutput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinishingOutputLog" (
    "id" SERIAL NOT NULL,
    "finishingOutputId" INTEGER NOT NULL,
    "receivedQuantity" INTEGER NOT NULL,
    "packedQuantity" INTEGER NOT NULL,
    "enteredBy" INTEGER NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinishingOutputLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Machine" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MachineType" NOT NULL,
    "factoryId" INTEGER NOT NULL,
    "lineId" INTEGER,
    "status" "MachineStatus" NOT NULL DEFAULT 'IDLE',
    "brand" TEXT,
    "brandId" INTEGER,
    "categoryId" INTEGER,
    "model" TEXT,
    "serialNo" TEXT,
    "manufactureYear" INTEGER,
    "purchaseDate" DATE,
    "warrantyExpiry" DATE,
    "note" TEXT,
    "liquidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineBrand" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MachineBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineCategory" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MachineCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineImage" (
    "id" SERIAL NOT NULL,
    "machineId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MachineImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineLiquidation" (
    "id" SERIAL NOT NULL,
    "machineId" INTEGER NOT NULL,
    "liquidationDate" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "decisionNo" TEXT,
    "salvageValue" DECIMAL(15,2),
    "approvedBy" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MachineLiquidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineMaintenance" (
    "id" SERIAL NOT NULL,
    "machineId" INTEGER NOT NULL,
    "maintenanceDate" DATE NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "description" TEXT,
    "performedBy" TEXT,
    "cost" DECIMAL(15,2),
    "nextDueDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MachineMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineTransfer" (
    "id" SERIAL NOT NULL,
    "machineId" INTEGER NOT NULL,
    "transferOrderNo" TEXT NOT NULL,
    "transferDate" DATE NOT NULL,
    "reason" TEXT,
    "fromFactoryId" INTEGER NOT NULL,
    "toFactoryId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "senderConfirmedAt" TIMESTAMP(3),
    "receiverId" INTEGER NOT NULL,
    "receiverConfirmedAt" TIMESTAMP(3),
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MachineTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" INTEGER NOT NULL,
    "orderDate" DATE NOT NULL,
    "deliveryDate" DATE,
    "status" "OrderStatus" NOT NULL DEFAULT 'OPEN',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "resource" TEXT NOT NULL,
    "action" "PermissionAction" NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoItem" (
    "id" SERIAL NOT NULL,
    "poId" INTEGER NOT NULL,
    "colorId" INTEGER NOT NULL,
    "sizeId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "PoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionLine" (
    "id" SERIAL NOT NULL,
    "factoryId" INTEGER NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "workerCount" INTEGER NOT NULL DEFAULT 10,
    "status" "FactoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProductionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" SERIAL NOT NULL,
    "poNumber" TEXT NOT NULL,
    "styleId" INTEGER NOT NULL,
    "orderId" INTEGER,
    "totalQuantity" INTEGER NOT NULL,
    "deliveryDate" DATE NOT NULL,
    "unitPrice" DECIMAL(12,2),
    "subsidyPrice" DECIMAL(12,2),
    "status" "POStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairProposal" (
    "id" SERIAL NOT NULL,
    "proposalNo" TEXT NOT NULL,
    "machineId" INTEGER NOT NULL,
    "factoryId" INTEGER NOT NULL,
    "type" "RepairProposalType" NOT NULL DEFAULT 'REPAIR',
    "status" "RepairProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "estimatedCost" DECIMAL(15,2),
    "requestedBy" INTEGER NOT NULL,
    "approvedBy" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairProposalAttachment" (
    "id" SERIAL NOT NULL,
    "proposalId" INTEGER NOT NULL,
    "type" "AttachmentType" NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairProposalAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairProposalItem" (
    "id" SERIAL NOT NULL,
    "proposalId" INTEGER NOT NULL,
    "sparePartId" INTEGER,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT,
    "note" TEXT,

    CONSTRAINT "RepairProposalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "SalaryPeriod" (
    "id" SERIAL NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "uploadedBy" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SalaryPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalarySlip" (
    "id" SERIAL NOT NULL,
    "periodId" INTEGER NOT NULL,
    "employeeId" INTEGER,
    "employeeCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "department" TEXT,
    "bankAccount" TEXT,
    "email" TEXT,
    "workDays" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "otSundayNight" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "otNormalHours" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalWorkHours" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "convertedWorkDays" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "workCoefficient" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "salaryRate" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "otNormalPay" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "performanceCoefficient" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "salarySupport" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "fuelAllowance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "attendanceBonus" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "incentiveBonus" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "holidayPay" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paidPersonalLeave" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "leaveSupport" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "leaveDays" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "leavePay" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "trainingDays" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "menstrualHours" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "womenSpecialPay" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalSalary" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "unemploymentInsurance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "socialInsurance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "otherDeduction" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "advanceDeduction" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "personalIncomeTax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netSalary" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "emailSentAt" TIMESTAMP(3),
    "emailError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalarySlip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Size" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Size_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SparePart" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "categoryId" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SparePart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Style" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customerId" INTEGER NOT NULL,
    "season" TEXT,
    "image" TEXT,
    "description" TEXT,
    "sam" DECIMAL(10,4),
    "trackByColorSize" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Style_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StyleColor" (
    "id" SERIAL NOT NULL,
    "styleId" INTEGER NOT NULL,
    "colorId" INTEGER NOT NULL,

    CONSTRAINT "StyleColor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StyleLine" (
    "lineId" INTEGER NOT NULL,
    "styleId" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2),

    CONSTRAINT "StyleLine_pkey" PRIMARY KEY ("lineId","styleId")
);

-- CreateTable
CREATE TABLE "StyleSize" (
    "id" SERIAL NOT NULL,
    "styleId" INTEGER NOT NULL,
    "sizeId" INTEGER NOT NULL,

    CONSTRAINT "StyleSize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppSetting_key_key" ON "AppSetting"("key" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Color_code_key" ON "Color"("code" ASC);

-- CreateIndex
CREATE INDEX "Color_deletedAt_idx" ON "Color"("deletedAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Company_taxCode_key" ON "Company"("taxCode" ASC);

-- CreateIndex
CREATE INDEX "CompanyPlan_expectedFinishDate_idx" ON "CompanyPlan"("expectedFinishDate" ASC);

-- CreateIndex
CREATE INDEX "CompanyPlan_factoryId_idx" ON "CompanyPlan"("factoryId" ASC);

-- CreateIndex
CREATE INDEX "CompanyPlan_poId_idx" ON "CompanyPlan"("poId" ASC);

-- CreateIndex
CREATE INDEX "CompanyPlan_startDate_idx" ON "CompanyPlan"("startDate" ASC);

-- CreateIndex
CREATE INDEX "CompanyPlan_styleId_idx" ON "CompanyPlan"("styleId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code" ASC);

-- CreateIndex
CREATE INDEX "Customer_deletedAt_idx" ON "Customer"("deletedAt" ASC);

-- CreateIndex
CREATE INDEX "DailyOutput_isLocked_idx" ON "DailyOutput"("isLocked" ASC);

-- CreateIndex
CREATE INDEX "DailyOutput_lineId_idx" ON "DailyOutput"("lineId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "DailyOutput_lineId_styleId_colorId_sizeId_stage_outputDate_key" ON "DailyOutput"("lineId" ASC, "styleId" ASC, "colorId" ASC, "sizeId" ASC, "stage" ASC, "outputDate" ASC);

-- CreateIndex
CREATE INDEX "DailyOutput_outputDate_idx" ON "DailyOutput"("outputDate" ASC);

-- CreateIndex
CREATE INDEX "DailyOutput_stage_idx" ON "DailyOutput"("stage" ASC);

-- CreateIndex
CREATE INDEX "DailyOutput_styleId_idx" ON "DailyOutput"("styleId" ASC);

-- CreateIndex
CREATE INDEX "DailyOutputLog_dailyOutputId_idx" ON "DailyOutputLog"("dailyOutputId" ASC);

-- CreateIndex
CREATE INDEX "DailyOutputLog_enteredAt_idx" ON "DailyOutputLog"("enteredAt" ASC);

-- CreateIndex
CREATE INDEX "DeliveryItem_colorId_idx" ON "DeliveryItem"("colorId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryItem_deliveryPlanId_colorId_sizeId_key" ON "DeliveryItem"("deliveryPlanId" ASC, "colorId" ASC, "sizeId" ASC);

-- CreateIndex
CREATE INDEX "DeliveryItem_deliveryPlanId_idx" ON "DeliveryItem"("deliveryPlanId" ASC);

-- CreateIndex
CREATE INDEX "DeliveryItem_sizeId_idx" ON "DeliveryItem"("sizeId" ASC);

-- CreateIndex
CREATE INDEX "DeliveryPlan_deletedAt_idx" ON "DeliveryPlan"("deletedAt" ASC);

-- CreateIndex
CREATE INDEX "DeliveryPlan_plannedDate_idx" ON "DeliveryPlan"("plannedDate" ASC);

-- CreateIndex
CREATE INDEX "DeliveryPlan_poId_idx" ON "DeliveryPlan"("poId" ASC);

-- CreateIndex
CREATE INDEX "DeliveryPlan_status_idx" ON "DeliveryPlan"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_code_key" ON "Employee"("code" ASC);

-- CreateIndex
CREATE INDEX "Employee_deletedAt_idx" ON "Employee"("deletedAt" ASC);

-- CreateIndex
CREATE INDEX "Employee_factoryId_idx" ON "Employee"("factoryId" ASC);

-- CreateIndex
CREATE INDEX "Employee_lineId_idx" ON "Employee"("lineId" ASC);

-- CreateIndex
CREATE INDEX "Employee_position_idx" ON "Employee"("position" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Factory_code_key" ON "Factory"("code" ASC);

-- CreateIndex
CREATE INDEX "Factory_companyId_idx" ON "Factory"("companyId" ASC);

-- CreateIndex
CREATE INDEX "Factory_deletedAt_idx" ON "Factory"("deletedAt" ASC);

-- CreateIndex
CREATE INDEX "Factory_status_idx" ON "Factory"("status" ASC);

-- CreateIndex
CREATE INDEX "FactoryPlan_companyPlanId_idx" ON "FactoryPlan"("companyPlanId" ASC);

-- CreateIndex
CREATE INDEX "FactoryPlan_expectedFinishDate_idx" ON "FactoryPlan"("expectedFinishDate" ASC);

-- CreateIndex
CREATE INDEX "FactoryPlan_lineId_idx" ON "FactoryPlan"("lineId" ASC);

-- CreateIndex
CREATE INDEX "FactorySectionOutput_factoryId_idx" ON "FactorySectionOutput"("factoryId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "FactorySectionOutput_factoryId_section_styleId_colorId_size_key" ON "FactorySectionOutput"("factoryId" ASC, "section" ASC, "styleId" ASC, "colorId" ASC, "sizeId" ASC, "outputDate" ASC);

-- CreateIndex
CREATE INDEX "FactorySectionOutput_outputDate_idx" ON "FactorySectionOutput"("outputDate" ASC);

-- CreateIndex
CREATE INDEX "FactorySectionOutput_section_idx" ON "FactorySectionOutput"("section" ASC);

-- CreateIndex
CREATE INDEX "FactorySectionOutput_styleId_idx" ON "FactorySectionOutput"("styleId" ASC);

-- CreateIndex
CREATE INDEX "FactorySectionOutputLog_enteredAt_idx" ON "FactorySectionOutputLog"("enteredAt" ASC);

-- CreateIndex
CREATE INDEX "FactorySectionOutputLog_factorySectionOutputId_idx" ON "FactorySectionOutputLog"("factorySectionOutputId" ASC);

-- CreateIndex
CREATE INDEX "FinishingOutput_factoryId_idx" ON "FinishingOutput"("factoryId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "FinishingOutput_factoryId_poId_outputDate_key" ON "FinishingOutput"("factoryId" ASC, "poId" ASC, "outputDate" ASC);

-- CreateIndex
CREATE INDEX "FinishingOutput_outputDate_idx" ON "FinishingOutput"("outputDate" ASC);

-- CreateIndex
CREATE INDEX "FinishingOutput_poId_idx" ON "FinishingOutput"("poId" ASC);

-- CreateIndex
CREATE INDEX "FinishingOutputLog_enteredAt_idx" ON "FinishingOutputLog"("enteredAt" ASC);

-- CreateIndex
CREATE INDEX "FinishingOutputLog_finishingOutputId_idx" ON "FinishingOutputLog"("finishingOutputId" ASC);

-- CreateIndex
CREATE INDEX "Machine_brandId_idx" ON "Machine"("brandId" ASC);

-- CreateIndex
CREATE INDEX "Machine_categoryId_idx" ON "Machine"("categoryId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Machine_code_key" ON "Machine"("code" ASC);

-- CreateIndex
CREATE INDEX "Machine_deletedAt_idx" ON "Machine"("deletedAt" ASC);

-- CreateIndex
CREATE INDEX "Machine_factoryId_idx" ON "Machine"("factoryId" ASC);

-- CreateIndex
CREATE INDEX "Machine_lineId_idx" ON "Machine"("lineId" ASC);

-- CreateIndex
CREATE INDEX "Machine_liquidatedAt_idx" ON "Machine"("liquidatedAt" ASC);

-- CreateIndex
CREATE INDEX "Machine_status_idx" ON "Machine"("status" ASC);

-- CreateIndex
CREATE INDEX "Machine_type_idx" ON "Machine"("type" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MachineBrand_code_key" ON "MachineBrand"("code" ASC);

-- CreateIndex
CREATE INDEX "MachineBrand_deletedAt_idx" ON "MachineBrand"("deletedAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MachineCategory_code_key" ON "MachineCategory"("code" ASC);

-- CreateIndex
CREATE INDEX "MachineCategory_deletedAt_idx" ON "MachineCategory"("deletedAt" ASC);

-- CreateIndex
CREATE INDEX "MachineImage_machineId_idx" ON "MachineImage"("machineId" ASC);

-- CreateIndex
CREATE INDEX "MachineLiquidation_machineId_idx" ON "MachineLiquidation"("machineId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MachineLiquidation_machineId_key" ON "MachineLiquidation"("machineId" ASC);

-- CreateIndex
CREATE INDEX "MachineMaintenance_machineId_idx" ON "MachineMaintenance"("machineId" ASC);

-- CreateIndex
CREATE INDEX "MachineMaintenance_maintenanceDate_idx" ON "MachineMaintenance"("maintenanceDate" ASC);

-- CreateIndex
CREATE INDEX "MachineMaintenance_nextDueDate_idx" ON "MachineMaintenance"("nextDueDate" ASC);

-- CreateIndex
CREATE INDEX "MachineTransfer_fromFactoryId_idx" ON "MachineTransfer"("fromFactoryId" ASC);

-- CreateIndex
CREATE INDEX "MachineTransfer_machineId_idx" ON "MachineTransfer"("machineId" ASC);

-- CreateIndex
CREATE INDEX "MachineTransfer_status_idx" ON "MachineTransfer"("status" ASC);

-- CreateIndex
CREATE INDEX "MachineTransfer_toFactoryId_idx" ON "MachineTransfer"("toFactoryId" ASC);

-- CreateIndex
CREATE INDEX "MachineTransfer_transferDate_idx" ON "MachineTransfer"("transferDate" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MachineTransfer_transferOrderNo_key" ON "MachineTransfer"("transferOrderNo" ASC);

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId" ASC);

-- CreateIndex
CREATE INDEX "Order_deletedAt_idx" ON "Order"("deletedAt" ASC);

-- CreateIndex
CREATE INDEX "Order_orderDate_idx" ON "Order"("orderDate" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber" ASC);

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Permission_resource_action_key" ON "Permission"("resource" ASC, "action" ASC);

-- CreateIndex
CREATE INDEX "Permission_resource_idx" ON "Permission"("resource" ASC);

-- CreateIndex
CREATE INDEX "PoItem_colorId_idx" ON "PoItem"("colorId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PoItem_poId_colorId_sizeId_key" ON "PoItem"("poId" ASC, "colorId" ASC, "sizeId" ASC);

-- CreateIndex
CREATE INDEX "PoItem_poId_idx" ON "PoItem"("poId" ASC);

-- CreateIndex
CREATE INDEX "PoItem_sizeId_idx" ON "PoItem"("sizeId" ASC);

-- CreateIndex
CREATE INDEX "ProductionLine_deletedAt_idx" ON "ProductionLine"("deletedAt" ASC);

-- CreateIndex
CREATE INDEX "ProductionLine_factoryId_idx" ON "ProductionLine"("factoryId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionLine_factoryId_lineNumber_key" ON "ProductionLine"("factoryId" ASC, "lineNumber" ASC);

-- CreateIndex
CREATE INDEX "ProductionLine_status_idx" ON "ProductionLine"("status" ASC);

-- CreateIndex
CREATE INDEX "PurchaseOrder_deletedAt_idx" ON "PurchaseOrder"("deletedAt" ASC);

-- CreateIndex
CREATE INDEX "PurchaseOrder_deliveryDate_idx" ON "PurchaseOrder"("deliveryDate" ASC);

-- CreateIndex
CREATE INDEX "PurchaseOrder_orderId_idx" ON "PurchaseOrder"("orderId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber" ASC);

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status" ASC);

-- CreateIndex
CREATE INDEX "PurchaseOrder_styleId_idx" ON "PurchaseOrder"("styleId" ASC);

-- CreateIndex
CREATE INDEX "RepairProposal_factoryId_idx" ON "RepairProposal"("factoryId" ASC);

-- CreateIndex
CREATE INDEX "RepairProposal_machineId_idx" ON "RepairProposal"("machineId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "RepairProposal_proposalNo_key" ON "RepairProposal"("proposalNo" ASC);

-- CreateIndex
CREATE INDEX "RepairProposal_status_idx" ON "RepairProposal"("status" ASC);

-- CreateIndex
CREATE INDEX "RepairProposalAttachment_proposalId_idx" ON "RepairProposalAttachment"("proposalId" ASC);

-- CreateIndex
CREATE INDEX "RepairProposalItem_proposalId_idx" ON "RepairProposalItem"("proposalId" ASC);

-- CreateIndex
CREATE INDEX "RepairProposalItem_sparePartId_idx" ON "RepairProposalItem"("sparePartId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name" ASC);

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId" ASC);

-- CreateIndex
CREATE INDEX "SalaryPeriod_deletedAt_idx" ON "SalaryPeriod"("deletedAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "SalaryPeriod_month_year_key" ON "SalaryPeriod"("month" ASC, "year" ASC);

-- CreateIndex
CREATE INDEX "SalarySlip_employeeId_idx" ON "SalarySlip"("employeeId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "SalarySlip_periodId_employeeCode_key" ON "SalarySlip"("periodId" ASC, "employeeCode" ASC);

-- CreateIndex
CREATE INDEX "SalarySlip_periodId_idx" ON "SalarySlip"("periodId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Size_code_key" ON "Size"("code" ASC);

-- CreateIndex
CREATE INDEX "Size_deletedAt_idx" ON "Size"("deletedAt" ASC);

-- CreateIndex
CREATE INDEX "Size_sortOrder_idx" ON "Size"("sortOrder" ASC);

-- CreateIndex
CREATE INDEX "SparePart_categoryId_idx" ON "SparePart"("categoryId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "SparePart_code_key" ON "SparePart"("code" ASC);

-- CreateIndex
CREATE INDEX "SparePart_deletedAt_idx" ON "SparePart"("deletedAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Style_code_key" ON "Style"("code" ASC);

-- CreateIndex
CREATE INDEX "Style_customerId_idx" ON "Style"("customerId" ASC);

-- CreateIndex
CREATE INDEX "Style_deletedAt_idx" ON "Style"("deletedAt" ASC);

-- CreateIndex
CREATE INDEX "StyleColor_colorId_idx" ON "StyleColor"("colorId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "StyleColor_styleId_colorId_key" ON "StyleColor"("styleId" ASC, "colorId" ASC);

-- CreateIndex
CREATE INDEX "StyleColor_styleId_idx" ON "StyleColor"("styleId" ASC);

-- CreateIndex
CREATE INDEX "StyleLine_styleId_idx" ON "StyleLine"("styleId" ASC);

-- CreateIndex
CREATE INDEX "StyleSize_sizeId_idx" ON "StyleSize"("sizeId" ASC);

-- CreateIndex
CREATE INDEX "StyleSize_styleId_idx" ON "StyleSize"("styleId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "StyleSize_styleId_sizeId_key" ON "StyleSize"("styleId" ASC, "sizeId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId" ASC);

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username" ASC);

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId" ASC);

-- AddForeignKey
ALTER TABLE "CompanyPlan" ADD CONSTRAINT "CompanyPlan_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyPlan" ADD CONSTRAINT "CompanyPlan_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyPlan" ADD CONSTRAINT "CompanyPlan_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyOutput" ADD CONSTRAINT "DailyOutput_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyOutput" ADD CONSTRAINT "DailyOutput_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ProductionLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyOutput" ADD CONSTRAINT "DailyOutput_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "Size"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyOutput" ADD CONSTRAINT "DailyOutput_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyOutputLog" ADD CONSTRAINT "DailyOutputLog_dailyOutputId_fkey" FOREIGN KEY ("dailyOutputId") REFERENCES "DailyOutput"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryItem" ADD CONSTRAINT "DeliveryItem_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryItem" ADD CONSTRAINT "DeliveryItem_deliveryPlanId_fkey" FOREIGN KEY ("deliveryPlanId") REFERENCES "DeliveryPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryItem" ADD CONSTRAINT "DeliveryItem_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "Size"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryPlan" ADD CONSTRAINT "DeliveryPlan_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ProductionLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factory" ADD CONSTRAINT "Factory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactoryPlan" ADD CONSTRAINT "FactoryPlan_companyPlanId_fkey" FOREIGN KEY ("companyPlanId") REFERENCES "CompanyPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactoryPlan" ADD CONSTRAINT "FactoryPlan_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ProductionLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactorySectionOutput" ADD CONSTRAINT "FactorySectionOutput_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactorySectionOutput" ADD CONSTRAINT "FactorySectionOutput_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactorySectionOutput" ADD CONSTRAINT "FactorySectionOutput_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "Size"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactorySectionOutput" ADD CONSTRAINT "FactorySectionOutput_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactorySectionOutputLog" ADD CONSTRAINT "FactorySectionOutputLog_factorySectionOutputId_fkey" FOREIGN KEY ("factorySectionOutputId") REFERENCES "FactorySectionOutput"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishingOutput" ADD CONSTRAINT "FinishingOutput_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishingOutput" ADD CONSTRAINT "FinishingOutput_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishingOutputLog" ADD CONSTRAINT "FinishingOutputLog_finishingOutputId_fkey" FOREIGN KEY ("finishingOutputId") REFERENCES "FinishingOutput"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "MachineBrand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MachineCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ProductionLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineImage" ADD CONSTRAINT "MachineImage_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineLiquidation" ADD CONSTRAINT "MachineLiquidation_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineMaintenance" ADD CONSTRAINT "MachineMaintenance_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineTransfer" ADD CONSTRAINT "MachineTransfer_fromFactoryId_fkey" FOREIGN KEY ("fromFactoryId") REFERENCES "Factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineTransfer" ADD CONSTRAINT "MachineTransfer_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineTransfer" ADD CONSTRAINT "MachineTransfer_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineTransfer" ADD CONSTRAINT "MachineTransfer_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineTransfer" ADD CONSTRAINT "MachineTransfer_toFactoryId_fkey" FOREIGN KEY ("toFactoryId") REFERENCES "Factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoItem" ADD CONSTRAINT "PoItem_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoItem" ADD CONSTRAINT "PoItem_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoItem" ADD CONSTRAINT "PoItem_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "Size"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLine" ADD CONSTRAINT "ProductionLine_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairProposal" ADD CONSTRAINT "RepairProposal_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairProposal" ADD CONSTRAINT "RepairProposal_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairProposalAttachment" ADD CONSTRAINT "RepairProposalAttachment_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "RepairProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairProposalItem" ADD CONSTRAINT "RepairProposalItem_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "RepairProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairProposalItem" ADD CONSTRAINT "RepairProposalItem_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryPeriod" ADD CONSTRAINT "SalaryPeriod_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalarySlip" ADD CONSTRAINT "SalarySlip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalarySlip" ADD CONSTRAINT "SalarySlip_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "SalaryPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePart" ADD CONSTRAINT "SparePart_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MachineCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Style" ADD CONSTRAINT "Style_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StyleColor" ADD CONSTRAINT "StyleColor_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StyleColor" ADD CONSTRAINT "StyleColor_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StyleLine" ADD CONSTRAINT "StyleLine_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ProductionLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StyleLine" ADD CONSTRAINT "StyleLine_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StyleSize" ADD CONSTRAINT "StyleSize_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "Size"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StyleSize" ADD CONSTRAINT "StyleSize_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

