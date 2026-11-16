DROP INDEX "Equipment_code_key";
CREATE UNIQUE INDEX "Equipment_active_code_key" ON "Equipment"("code") WHERE "deletedAt" IS NULL;
