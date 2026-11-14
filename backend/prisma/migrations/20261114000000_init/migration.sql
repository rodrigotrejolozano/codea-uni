CREATE TYPE "EquipmentType" AS ENUM ('TRUCK', 'EXCAVATOR', 'DRILL');

CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "EquipmentType" NOT NULL,
    "hourMeter" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Equipment_hourMeter_nonnegative" CHECK ("hourMeter" >= 0)
);

CREATE UNIQUE INDEX "Equipment_code_key" ON "Equipment"("code");
