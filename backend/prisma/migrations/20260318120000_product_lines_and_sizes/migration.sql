-- CreateEnum
CREATE TYPE "ProductSize" AS ENUM ('GRAMS_70', 'GRAMS_100');

-- CreateTable
CREATE TABLE "ProductLine" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "pricePerGramInCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductLine_uuid_key" ON "ProductLine"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "ProductLine_name_key" ON "ProductLine"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductLine_slug_key" ON "ProductLine"("slug");

-- CreateIndex
CREATE INDEX "ProductLine_slug_idx" ON "ProductLine"("slug");

-- CreateIndex
CREATE INDEX "ProductLine_uuid_idx" ON "ProductLine"("uuid");

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "lineId" INTEGER;

-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN "productSize" "ProductSize" NOT NULL DEFAULT 'GRAMS_70';

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "productSize" "ProductSize" NOT NULL DEFAULT 'GRAMS_70';

-- Seed temporary product lines from legacy product price.
-- Assumption: the legacy product price was closest to the 100g option,
-- so we derive a per-gram price by dividing by 100.
INSERT INTO "ProductLine" ("uuid", "name", "slug", "pricePerGramInCents", "createdAt", "updatedAt")
SELECT
    ('00000000-0000-0000-0000-' || LPAD("id"::text, 12, '0'))::uuid,
    CONCAT('Migracao ', "name", ' #', "id"),
    CONCAT("slug", '-migracao-', "id"),
    GREATEST(1, ROUND("priceInCents" / 100.0)),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Product";

UPDATE "Product" AS p
SET "lineId" = pl."id"
FROM "ProductLine" AS pl
WHERE pl."slug" = CONCAT(p."slug", '-migracao-', p."id");

ALTER TABLE "Product" ALTER COLUMN "lineId" SET NOT NULL;
ALTER TABLE "Product" DROP COLUMN "priceInCents";

-- DropIndex
DROP INDEX "CartItem_cartId_productId_key";

-- CreateIndex
CREATE INDEX "Product_lineId_idx" ON "Product"("lineId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_productId_productSize_key" ON "CartItem"("cartId", "productId", "productSize");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ProductLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
