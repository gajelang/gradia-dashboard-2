/*
  Warnings:

  - Made the column `createdAt` on table `Expense` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `Expense` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdAt` on table `Transaction` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `Transaction` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Expense" ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;
