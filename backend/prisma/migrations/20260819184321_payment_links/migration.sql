-- CreateEnum
CREATE TYPE "PaymentLinkStatus" AS ENUM ('ACTIVE', 'CREATING', 'PENDING', 'PAID', 'EXPIRED', 'REFUNDED', 'DISPUTED', 'LOST');

-- CreateTable
CREATE TABLE "PaymentLink" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "createdById" INTEGER NOT NULL,
    "amountInCents" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "status" "PaymentLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "provider" TEXT NOT NULL DEFAULT 'ABACATEPAY',
    "providerProductId" TEXT NOT NULL,
    "providerCheckoutId" TEXT,
    "checkoutUrl" TEXT,
    "paidAmountInCents" INTEGER,
    "providerMethod" TEXT,
    "providerProductResponse" JSONB,
    "providerCheckoutResponse" JSONB,
    "refundPublicId" TEXT,
    "refundReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "disputedAt" TIMESTAMP(3),
    "lostAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLink_uuid_key" ON "PaymentLink"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLink_providerProductId_key" ON "PaymentLink"("providerProductId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLink_providerCheckoutId_key" ON "PaymentLink"("providerCheckoutId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLink_refundPublicId_key" ON "PaymentLink"("refundPublicId");

-- CreateIndex
CREATE INDEX "PaymentLink_createdById_idx" ON "PaymentLink"("createdById");

-- CreateIndex
CREATE INDEX "PaymentLink_status_idx" ON "PaymentLink"("status");

-- CreateIndex
CREATE INDEX "PaymentLink_expiresAt_idx" ON "PaymentLink"("expiresAt");

-- CreateIndex
CREATE INDEX "PaymentLink_createdAt_idx" ON "PaymentLink"("createdAt");

-- AddForeignKey
ALTER TABLE "PaymentLink" ADD CONSTRAINT "PaymentLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
