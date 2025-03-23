-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "paymentProofLink" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "paymentProofLink" TEXT;
