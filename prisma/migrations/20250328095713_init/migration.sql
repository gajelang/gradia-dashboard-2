-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isRecurringExpense" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastProcessedDate" TIMESTAMP(3),
ADD COLUMN     "nextBillingDate" TIMESTAMP(3),
ADD COLUMN     "recurringFrequency" TEXT;

-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "autoRenew" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastBillingDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Expense_isRecurringExpense_isActive_idx" ON "Expense"("isRecurringExpense", "isActive");

-- CreateIndex
CREATE INDEX "Expense_nextBillingDate_idx" ON "Expense"("nextBillingDate");

-- CreateIndex
CREATE INDEX "Inventory_nextBillingDate_idx" ON "Inventory"("nextBillingDate");

-- CreateIndex
CREATE INDEX "Inventory_type_isRecurring_idx" ON "Inventory"("type", "isRecurring");
