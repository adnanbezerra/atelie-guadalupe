-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('SHIPMENT', 'LOCAL_PICKUP');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryType" "DeliveryType" NOT NULL DEFAULT 'SHIPMENT',
ADD COLUMN     "pickupLocationSnapshot" JSONB;
