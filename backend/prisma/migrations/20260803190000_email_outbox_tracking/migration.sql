CREATE TYPE "EmailJobType" AS ENUM ('WELCOME', 'ORDER_CREATED', 'PAYMENT_CONFIRMED', 'ORDER_SHIPPED', 'ORDER_DELIVERED');
CREATE TYPE "EmailJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'RETRY_SCHEDULED', 'SENT', 'FAILED');
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('STARTED', 'ACCEPTED', 'FAILED');

CREATE TABLE "EmailJob" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "type" "EmailJobType" NOT NULL,
    "recipient" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "deduplicationKey" TEXT NOT NULL,
    "status" "EmailJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "providerMessageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmailJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailDeliveryLog" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "emailJobId" INTEGER NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'RESEND',
    "emailType" "EmailJobType" NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'STARTED',
    "providerMessageId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmailDeliveryLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OrderShipment"
    ADD COLUMN "superfreteStatus" TEXT,
    ADD COLUMN "postedAt" TIMESTAMP(3),
    ADD COLUMN "deliveredAt" TIMESTAMP(3),
    ADD COLUMN "trackingLastCheckedAt" TIMESTAMP(3),
    ADD COLUMN "trackingNextCheckAt" TIMESTAMP(3),
    ADD COLUMN "trackingAttempts" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "trackingLastError" TEXT,
    ADD COLUMN "trackingLockedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "EmailJob_uuid_key" ON "EmailJob"("uuid");
CREATE UNIQUE INDEX "EmailJob_deduplicationKey_key" ON "EmailJob"("deduplicationKey");
CREATE INDEX "EmailJob_status_nextAttemptAt_idx" ON "EmailJob"("status", "nextAttemptAt");
CREATE INDEX "EmailJob_recipient_idx" ON "EmailJob"("recipient");
CREATE INDEX "EmailJob_type_idx" ON "EmailJob"("type");
CREATE UNIQUE INDEX "EmailDeliveryLog_uuid_key" ON "EmailDeliveryLog"("uuid");
CREATE UNIQUE INDEX "EmailDeliveryLog_emailJobId_attemptNumber_key" ON "EmailDeliveryLog"("emailJobId", "attemptNumber");
CREATE INDEX "EmailDeliveryLog_status_idx" ON "EmailDeliveryLog"("status");
CREATE INDEX "EmailDeliveryLog_recipient_idx" ON "EmailDeliveryLog"("recipient");
CREATE INDEX "EmailDeliveryLog_emailType_idx" ON "EmailDeliveryLog"("emailType");
CREATE INDEX "OrderShipment_status_trackingNextCheckAt_idx" ON "OrderShipment"("status", "trackingNextCheckAt");

ALTER TABLE "EmailDeliveryLog" ADD CONSTRAINT "EmailDeliveryLog_emailJobId_fkey"
    FOREIGN KEY ("emailJobId") REFERENCES "EmailJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
