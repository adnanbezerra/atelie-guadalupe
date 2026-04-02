-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('SELFCARE', 'ARTISANAL');

-- AlterTable
ALTER TABLE "CartItem" ALTER COLUMN "productSize" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "productSize" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "category" "ProductCategory" NOT NULL DEFAULT 'ARTISANAL',
ALTER COLUMN "stock" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");
