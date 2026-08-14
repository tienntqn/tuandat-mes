-- CreateEnum
CREATE TYPE "HandoverType" AS ENUM ('RECEIVE', 'AFTER_REPAIR', 'AFTER_MAINTENANCE');

-- CreateEnum
CREATE TYPE "HandoverStatus" AS ENUM ('DRAFT', 'PENDING_RECEIVER', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('INSPECTION', 'CALIBRATION', 'QUALITY', 'OTHER');

-- CreateEnum
CREATE TYPE "BreakdownSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BreakdownStatus" AS ENUM ('REPORTED', 'ACKNOWLEDGED', 'IN_REPAIR', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('MAINTENANCE', 'REPAIR');

-- CreateEnum
CREATE TYPE "WorkPlanStatus" AS ENUM ('DRAFT', 'PENDING_FACTORY', 'PENDING_COMPANY', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'DONE', 'HANDED_OVER', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaintenanceRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'PLANNED', 'DONE', 'REJECTED');

-- CreateEnum
CREATE TYPE "PartRequestStatus" AS ENUM ('DRAFT', 'PENDING_FACTORY', 'PENDING_COMPANY', 'APPROVED', 'PURCHASED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT', 'ADJUST');

-- CreateEnum
CREATE TYPE "MachineDocumentType" AS ENUM ('MANUAL', 'INVOICE', 'CONTRACT', 'CERTIFICATE', 'DRAWING', 'IMAGE', 'OTHER');

-- CreateTable
CREATE TABLE "MachineHandover" (
    "id" SERIAL NOT NULL,
    "handoverNo" TEXT NOT NULL,
    "type" "HandoverType" NOT NULL,
    "machineId" INTEGER NOT NULL,
    "factoryId" INTEGER NOT NULL,
    "lineId" INTEGER,
    "workOrderId" INTEGER,
    "handoverDate" DATE NOT NULL,
    "fromParty" TEXT,
    "senderId" INTEGER,
    "receiverId" INTEGER,
    "condition" TEXT,
    "accessories" TEXT,
    "note" TEXT,
    "status" "HandoverStatus" NOT NULL DEFAULT 'DRAFT',
    "senderConfirmedAt" TIMESTAMP(3),
    "receiverConfirmedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MachineHandover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineCertificate" (
    "id" SERIAL NOT NULL,
    "machineId" INTEGER NOT NULL,
    "type" "CertificateType" NOT NULL DEFAULT 'INSPECTION',
    "certNo" TEXT,
    "name" TEXT NOT NULL,
    "issuedBy" TEXT,
    "issueDate" DATE,
    "expiryDate" DATE,
    "fileUrl" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MachineCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineDocument" (
    "id" SERIAL NOT NULL,
    "machineId" INTEGER NOT NULL,
    "type" "MachineDocumentType" NOT NULL DEFAULT 'OTHER',
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT,
    "note" TEXT,
    "uploadedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MachineDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceNorm" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" INTEGER,
    "machineId" INTEGER,
    "intervalDays" INTEGER NOT NULL,
    "estimatedHours" DECIMAL(6,2),
    "estimatedCost" DECIMAL(15,2),
    "checklist" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MaintenanceNorm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceNormItem" (
    "id" SERIAL NOT NULL,
    "normId" INTEGER NOT NULL,
    "sparePartId" INTEGER,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "note" TEXT,

    CONSTRAINT "MaintenanceNormItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreakdownReport" (
    "id" SERIAL NOT NULL,
    "reportNo" TEXT NOT NULL,
    "machineId" INTEGER NOT NULL,
    "factoryId" INTEGER NOT NULL,
    "lineId" INTEGER,
    "severity" "BreakdownSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "BreakdownStatus" NOT NULL DEFAULT 'REPORTED',
    "symptom" TEXT NOT NULL,
    "stoppedProduction" BOOLEAN NOT NULL DEFAULT false,
    "imageUrls" TEXT[],
    "reportedBy" INTEGER NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedBy" INTEGER,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BreakdownReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentReport" (
    "id" SERIAL NOT NULL,
    "incidentNo" TEXT NOT NULL,
    "machineId" INTEGER NOT NULL,
    "factoryId" INTEGER NOT NULL,
    "breakdownReportId" INTEGER,
    "incidentDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "cause" TEXT,
    "consequence" TEXT,
    "downtimeHours" DECIMAL(8,2),
    "damageValue" DECIMAL(15,2),
    "responsibleParty" TEXT,
    "preventiveAction" TEXT,
    "witnesses" TEXT,
    "imageUrls" TEXT[],
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRequest" (
    "id" SERIAL NOT NULL,
    "requestNo" TEXT NOT NULL,
    "machineId" INTEGER NOT NULL,
    "factoryId" INTEGER NOT NULL,
    "requestedBy" INTEGER NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "desiredDate" DATE,
    "reason" TEXT NOT NULL,
    "status" "MaintenanceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "handledBy" INTEGER,
    "handledAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkPlan" (
    "id" SERIAL NOT NULL,
    "planNo" TEXT NOT NULL,
    "type" "WorkType" NOT NULL,
    "factoryId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "periodFrom" DATE NOT NULL,
    "periodTo" DATE NOT NULL,
    "status" "WorkPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "totalEstimatedCost" DECIMAL(15,2),
    "note" TEXT,
    "createdBy" INTEGER NOT NULL,
    "factoryApprovedBy" INTEGER,
    "factoryApprovedAt" TIMESTAMP(3),
    "companyApprovedBy" INTEGER,
    "companyApprovedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkPlanItem" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "machineId" INTEGER NOT NULL,
    "normId" INTEGER,
    "plannedDate" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "estimatedCost" DECIMAL(15,2),
    "note" TEXT,

    CONSTRAINT "WorkPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" SERIAL NOT NULL,
    "orderNo" TEXT NOT NULL,
    "type" "WorkType" NOT NULL,
    "machineId" INTEGER NOT NULL,
    "factoryId" INTEGER NOT NULL,
    "breakdownReportId" INTEGER,
    "maintenanceRequestId" INTEGER,
    "planItemId" INTEGER,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "performedBy" INTEGER NOT NULL,
    "assistants" TEXT,
    "content" TEXT NOT NULL,
    "findings" TEXT,
    "result" TEXT,
    "downtimeHours" DECIMAL(8,2),
    "laborCost" DECIMAL(15,2),
    "partsCost" DECIMAL(15,2),
    "totalCost" DECIMAL(15,2),
    "nextDueDate" DATE,
    "note" TEXT,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderPart" (
    "id" SERIAL NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "sparePartId" INTEGER,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(15,2),
    "amount" DECIMAL(15,2),
    "fromStock" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,

    CONSTRAINT "WorkOrderPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartRequest" (
    "id" SERIAL NOT NULL,
    "requestNo" TEXT NOT NULL,
    "type" "WorkType" NOT NULL,
    "factoryId" INTEGER NOT NULL,
    "workPlanId" INTEGER,
    "workOrderId" INTEGER,
    "breakdownReportId" INTEGER,
    "title" TEXT NOT NULL,
    "reason" TEXT,
    "requestDate" DATE NOT NULL,
    "neededDate" DATE,
    "status" "PartRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(15,2),
    "requestedBy" INTEGER NOT NULL,
    "factoryApprovedBy" INTEGER,
    "factoryApprovedAt" TIMESTAMP(3),
    "companyApprovedBy" INTEGER,
    "companyApprovedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartRequestItem" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "sparePartId" INTEGER,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL,
    "stockQuantity" DECIMAL(12,2),
    "estimatedPrice" DECIMAL(15,2),
    "amount" DECIMAL(15,2),
    "receivedQuantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "note" TEXT,

    CONSTRAINT "PartRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SparePartStock" (
    "id" SERIAL NOT NULL,
    "sparePartId" INTEGER NOT NULL,
    "factoryId" INTEGER NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "minQuantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "location" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SparePartStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" SERIAL NOT NULL,
    "sparePartId" INTEGER NOT NULL,
    "factoryId" INTEGER NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unitPrice" DECIMAL(15,2),
    "amount" DECIMAL(15,2),
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "movementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workOrderId" INTEGER,
    "partRequestId" INTEGER,
    "supplier" TEXT,
    "documentNo" TEXT,
    "reason" TEXT,
    "performedBy" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineStatusLog" (
    "id" SERIAL NOT NULL,
    "machineId" INTEGER NOT NULL,
    "fromStatus" "MachineStatus",
    "toStatus" "MachineStatus" NOT NULL,
    "reason" TEXT,
    "refType" TEXT,
    "refId" INTEGER,
    "changedBy" INTEGER,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MachineStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MachineHandover_handoverNo_key" ON "MachineHandover"("handoverNo");

-- CreateIndex
CREATE UNIQUE INDEX "MachineHandover_workOrderId_key" ON "MachineHandover"("workOrderId");

-- CreateIndex
CREATE INDEX "MachineHandover_machineId_idx" ON "MachineHandover"("machineId");

-- CreateIndex
CREATE INDEX "MachineHandover_factoryId_idx" ON "MachineHandover"("factoryId");

-- CreateIndex
CREATE INDEX "MachineHandover_type_idx" ON "MachineHandover"("type");

-- CreateIndex
CREATE INDEX "MachineHandover_status_idx" ON "MachineHandover"("status");

-- CreateIndex
CREATE INDEX "MachineHandover_handoverDate_idx" ON "MachineHandover"("handoverDate");

-- CreateIndex
CREATE INDEX "MachineCertificate_machineId_idx" ON "MachineCertificate"("machineId");

-- CreateIndex
CREATE INDEX "MachineCertificate_expiryDate_idx" ON "MachineCertificate"("expiryDate");

-- CreateIndex
CREATE INDEX "MachineCertificate_deletedAt_idx" ON "MachineCertificate"("deletedAt");

-- CreateIndex
CREATE INDEX "MachineDocument_machineId_idx" ON "MachineDocument"("machineId");

-- CreateIndex
CREATE INDEX "MachineDocument_type_idx" ON "MachineDocument"("type");

-- CreateIndex
CREATE INDEX "MachineDocument_deletedAt_idx" ON "MachineDocument"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceNorm_code_key" ON "MaintenanceNorm"("code");

-- CreateIndex
CREATE INDEX "MaintenanceNorm_categoryId_idx" ON "MaintenanceNorm"("categoryId");

-- CreateIndex
CREATE INDEX "MaintenanceNorm_machineId_idx" ON "MaintenanceNorm"("machineId");

-- CreateIndex
CREATE INDEX "MaintenanceNorm_deletedAt_idx" ON "MaintenanceNorm"("deletedAt");

-- CreateIndex
CREATE INDEX "MaintenanceNormItem_normId_idx" ON "MaintenanceNormItem"("normId");

-- CreateIndex
CREATE INDEX "MaintenanceNormItem_sparePartId_idx" ON "MaintenanceNormItem"("sparePartId");

-- CreateIndex
CREATE UNIQUE INDEX "BreakdownReport_reportNo_key" ON "BreakdownReport"("reportNo");

-- CreateIndex
CREATE INDEX "BreakdownReport_machineId_idx" ON "BreakdownReport"("machineId");

-- CreateIndex
CREATE INDEX "BreakdownReport_factoryId_idx" ON "BreakdownReport"("factoryId");

-- CreateIndex
CREATE INDEX "BreakdownReport_status_idx" ON "BreakdownReport"("status");

-- CreateIndex
CREATE INDEX "BreakdownReport_reportedAt_idx" ON "BreakdownReport"("reportedAt");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentReport_incidentNo_key" ON "IncidentReport"("incidentNo");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentReport_breakdownReportId_key" ON "IncidentReport"("breakdownReportId");

-- CreateIndex
CREATE INDEX "IncidentReport_machineId_idx" ON "IncidentReport"("machineId");

-- CreateIndex
CREATE INDEX "IncidentReport_factoryId_idx" ON "IncidentReport"("factoryId");

-- CreateIndex
CREATE INDEX "IncidentReport_incidentDate_idx" ON "IncidentReport"("incidentDate");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceRequest_requestNo_key" ON "MaintenanceRequest"("requestNo");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_machineId_idx" ON "MaintenanceRequest"("machineId");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_factoryId_idx" ON "MaintenanceRequest"("factoryId");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_status_idx" ON "MaintenanceRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkPlan_planNo_key" ON "WorkPlan"("planNo");

-- CreateIndex
CREATE INDEX "WorkPlan_factoryId_idx" ON "WorkPlan"("factoryId");

-- CreateIndex
CREATE INDEX "WorkPlan_type_idx" ON "WorkPlan"("type");

-- CreateIndex
CREATE INDEX "WorkPlan_status_idx" ON "WorkPlan"("status");

-- CreateIndex
CREATE INDEX "WorkPlan_periodFrom_idx" ON "WorkPlan"("periodFrom");

-- CreateIndex
CREATE INDEX "WorkPlanItem_planId_idx" ON "WorkPlanItem"("planId");

-- CreateIndex
CREATE INDEX "WorkPlanItem_machineId_idx" ON "WorkPlanItem"("machineId");

-- CreateIndex
CREATE INDEX "WorkPlanItem_plannedDate_idx" ON "WorkPlanItem"("plannedDate");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_orderNo_key" ON "WorkOrder"("orderNo");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_planItemId_key" ON "WorkOrder"("planItemId");

-- CreateIndex
CREATE INDEX "WorkOrder_machineId_idx" ON "WorkOrder"("machineId");

-- CreateIndex
CREATE INDEX "WorkOrder_factoryId_idx" ON "WorkOrder"("factoryId");

-- CreateIndex
CREATE INDEX "WorkOrder_type_idx" ON "WorkOrder"("type");

-- CreateIndex
CREATE INDEX "WorkOrder_status_idx" ON "WorkOrder"("status");

-- CreateIndex
CREATE INDEX "WorkOrder_finishedAt_idx" ON "WorkOrder"("finishedAt");

-- CreateIndex
CREATE INDEX "WorkOrderPart_workOrderId_idx" ON "WorkOrderPart"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderPart_sparePartId_idx" ON "WorkOrderPart"("sparePartId");

-- CreateIndex
CREATE UNIQUE INDEX "PartRequest_requestNo_key" ON "PartRequest"("requestNo");

-- CreateIndex
CREATE INDEX "PartRequest_factoryId_idx" ON "PartRequest"("factoryId");

-- CreateIndex
CREATE INDEX "PartRequest_type_idx" ON "PartRequest"("type");

-- CreateIndex
CREATE INDEX "PartRequest_status_idx" ON "PartRequest"("status");

-- CreateIndex
CREATE INDEX "PartRequest_requestDate_idx" ON "PartRequest"("requestDate");

-- CreateIndex
CREATE INDEX "PartRequestItem_requestId_idx" ON "PartRequestItem"("requestId");

-- CreateIndex
CREATE INDEX "PartRequestItem_sparePartId_idx" ON "PartRequestItem"("sparePartId");

-- CreateIndex
CREATE INDEX "SparePartStock_factoryId_idx" ON "SparePartStock"("factoryId");

-- CreateIndex
CREATE UNIQUE INDEX "SparePartStock_sparePartId_factoryId_key" ON "SparePartStock"("sparePartId", "factoryId");

-- CreateIndex
CREATE INDEX "StockMovement_sparePartId_idx" ON "StockMovement"("sparePartId");

-- CreateIndex
CREATE INDEX "StockMovement_factoryId_idx" ON "StockMovement"("factoryId");

-- CreateIndex
CREATE INDEX "StockMovement_type_idx" ON "StockMovement"("type");

-- CreateIndex
CREATE INDEX "StockMovement_movementDate_idx" ON "StockMovement"("movementDate");

-- CreateIndex
CREATE INDEX "MachineStatusLog_machineId_idx" ON "MachineStatusLog"("machineId");

-- CreateIndex
CREATE INDEX "MachineStatusLog_changedAt_idx" ON "MachineStatusLog"("changedAt");

-- AddForeignKey
ALTER TABLE "MachineHandover" ADD CONSTRAINT "MachineHandover_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineHandover" ADD CONSTRAINT "MachineHandover_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineHandover" ADD CONSTRAINT "MachineHandover_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ProductionLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineHandover" ADD CONSTRAINT "MachineHandover_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineCertificate" ADD CONSTRAINT "MachineCertificate_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineDocument" ADD CONSTRAINT "MachineDocument_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceNorm" ADD CONSTRAINT "MaintenanceNorm_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MachineCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceNorm" ADD CONSTRAINT "MaintenanceNorm_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceNormItem" ADD CONSTRAINT "MaintenanceNormItem_normId_fkey" FOREIGN KEY ("normId") REFERENCES "MaintenanceNorm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceNormItem" ADD CONSTRAINT "MaintenanceNormItem_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakdownReport" ADD CONSTRAINT "BreakdownReport_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakdownReport" ADD CONSTRAINT "BreakdownReport_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakdownReport" ADD CONSTRAINT "BreakdownReport_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ProductionLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_breakdownReportId_fkey" FOREIGN KEY ("breakdownReportId") REFERENCES "BreakdownReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPlan" ADD CONSTRAINT "WorkPlan_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPlanItem" ADD CONSTRAINT "WorkPlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WorkPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPlanItem" ADD CONSTRAINT "WorkPlanItem_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_breakdownReportId_fkey" FOREIGN KEY ("breakdownReportId") REFERENCES "BreakdownReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_maintenanceRequestId_fkey" FOREIGN KEY ("maintenanceRequestId") REFERENCES "MaintenanceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_planItemId_fkey" FOREIGN KEY ("planItemId") REFERENCES "WorkPlanItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderPart" ADD CONSTRAINT "WorkOrderPart_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderPart" ADD CONSTRAINT "WorkOrderPart_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartRequest" ADD CONSTRAINT "PartRequest_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartRequest" ADD CONSTRAINT "PartRequest_workPlanId_fkey" FOREIGN KEY ("workPlanId") REFERENCES "WorkPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartRequest" ADD CONSTRAINT "PartRequest_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartRequest" ADD CONSTRAINT "PartRequest_breakdownReportId_fkey" FOREIGN KEY ("breakdownReportId") REFERENCES "BreakdownReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartRequestItem" ADD CONSTRAINT "PartRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PartRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartRequestItem" ADD CONSTRAINT "PartRequestItem_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePartStock" ADD CONSTRAINT "SparePartStock_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePartStock" ADD CONSTRAINT "SparePartStock_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_partRequestId_fkey" FOREIGN KEY ("partRequestId") REFERENCES "PartRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineStatusLog" ADD CONSTRAINT "MachineStatusLog_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

