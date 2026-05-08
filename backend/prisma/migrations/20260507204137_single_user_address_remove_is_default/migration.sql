/*
  Warnings:

  - You are about to drop the column `isDefault` on the `Address` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `Address` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Address_userId_idx";

-- AlterTable
ALTER TABLE "Address" DROP COLUMN "isDefault";

-- CreateIndex
CREATE UNIQUE INDEX "Address_userId_key" ON "Address"("userId");
