-- AlterEnum
ALTER TYPE "EmailJobStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
ALTER TYPE "EmailJobType" ADD VALUE 'PASSWORD_RESET';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "authVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PasswordResetChallenge" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "userId" INTEGER NOT NULL,
    "emailJobId" INTEGER,
    "codeDigest" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetChallenge_uuid_key" ON "PasswordResetChallenge"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetChallenge_userId_key" ON "PasswordResetChallenge"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetChallenge_emailJobId_key" ON "PasswordResetChallenge"("emailJobId");

-- CreateIndex
CREATE INDEX "PasswordResetChallenge_expiresAt_idx" ON "PasswordResetChallenge"("expiresAt");

-- AddForeignKey
ALTER TABLE "PasswordResetChallenge" ADD CONSTRAINT "PasswordResetChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetChallenge" ADD CONSTRAINT "PasswordResetChallenge_emailJobId_fkey" FOREIGN KEY ("emailJobId") REFERENCES "EmailJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
