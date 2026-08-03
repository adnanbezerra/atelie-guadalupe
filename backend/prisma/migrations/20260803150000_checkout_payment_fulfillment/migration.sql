CREATE TYPE "PaymentStatus" AS ENUM ('CREATING', 'PENDING', 'PAID', 'REFUND_PENDING', 'REFUNDED', 'DISPUTED', 'LOST');
CREATE TYPE "FulfillmentJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'RETRY_SCHEDULED', 'COMPLETED');

ALTER TABLE "Order" ADD COLUMN "paymentIdempotencyKey" UUID;
UPDATE "Order" SET "paymentIdempotencyKey" = gen_random_uuid() WHERE "paymentIdempotencyKey" IS NULL;
ALTER TABLE "Order" ALTER COLUMN "paymentIdempotencyKey" SET NOT NULL;
CREATE UNIQUE INDEX "Order_paymentIdempotencyKey_key" ON "Order"("paymentIdempotencyKey");

CREATE TABLE "OrderPayment" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "orderId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'ABACATEPAY',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATING',
    "idempotencyKey" UUID NOT NULL,
    "providerCheckoutId" TEXT,
    "checkoutUrl" TEXT,
    "expectedAmountInCents" INTEGER NOT NULL,
    "paidAmountInCents" INTEGER,
    "providerMethod" TEXT,
    "providerResponse" JSONB,
    "refundPublicId" TEXT,
    "refundReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "disputedAt" TIMESTAMP(3),
    "lostAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrderPayment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrderPayment_uuid_key" ON "OrderPayment"("uuid");
CREATE UNIQUE INDEX "OrderPayment_orderId_key" ON "OrderPayment"("orderId");
CREATE UNIQUE INDEX "OrderPayment_idempotencyKey_key" ON "OrderPayment"("idempotencyKey");
CREATE UNIQUE INDEX "OrderPayment_providerCheckoutId_key" ON "OrderPayment"("providerCheckoutId");
CREATE UNIQUE INDEX "OrderPayment_refundPublicId_key" ON "OrderPayment"("refundPublicId");
CREATE INDEX "OrderPayment_status_idx" ON "OrderPayment"("status");
CREATE INDEX "OrderPayment_providerCheckoutId_idx" ON "OrderPayment"("providerCheckoutId");

CREATE TABLE "PaymentCatalogProduct" (
    "id" SERIAL NOT NULL,
    "externalId" TEXT NOT NULL,
    "providerProductId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceInCents" INTEGER NOT NULL,
    "providerResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentCatalogProduct_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaymentCatalogProduct_externalId_key" ON "PaymentCatalogProduct"("externalId");
CREATE UNIQUE INDEX "PaymentCatalogProduct_providerProductId_key" ON "PaymentCatalogProduct"("providerProductId");

CREATE TABLE "PaymentWebhookEvent" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'ABACATEPAY',
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaymentWebhookEvent_eventId_key" ON "PaymentWebhookEvent"("eventId");
CREATE INDEX "PaymentWebhookEvent_eventType_idx" ON "PaymentWebhookEvent"("eventType");
CREATE INDEX "PaymentWebhookEvent_processedAt_idx" ON "PaymentWebhookEvent"("processedAt");

CREATE TABLE "FulfillmentJob" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "orderId" INTEGER NOT NULL,
    "status" "FulfillmentJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "lockedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FulfillmentJob_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FulfillmentJob_uuid_key" ON "FulfillmentJob"("uuid");
CREATE UNIQUE INDEX "FulfillmentJob_orderId_key" ON "FulfillmentJob"("orderId");
CREATE INDEX "FulfillmentJob_status_nextAttemptAt_idx" ON "FulfillmentJob"("status", "nextAttemptAt");

ALTER TABLE "OrderPayment" ADD CONSTRAINT "OrderPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FulfillmentJob" ADD CONSTRAINT "FulfillmentJob_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
