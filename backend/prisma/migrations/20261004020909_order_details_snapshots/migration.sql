-- AlterTable
ALTER TABLE "OrderPayment" ADD COLUMN     "cardBrand" TEXT,
ADD COLUMN     "cardLastFourDigits" CHAR(4);
