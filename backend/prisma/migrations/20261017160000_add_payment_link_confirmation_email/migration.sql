-- AlterEnum
ALTER TYPE "EmailJobType" ADD VALUE 'PAYMENT_LINK_CONFIRMED';

-- AlterTable
ALTER TABLE "PaymentLink" ADD COLUMN     "customerEmail" TEXT;
