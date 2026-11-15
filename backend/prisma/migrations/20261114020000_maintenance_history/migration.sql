ALTER TABLE "Equipment" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE TABLE "Maintenance" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "hourMeter" INTEGER NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Maintenance_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Maintenance_hourMeter_nonnegative" CHECK ("hourMeter" >= 0)
);

CREATE INDEX "Maintenance_equipmentId_performedAt_idx" ON "Maintenance"("equipmentId", "performedAt");
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
