-- CreateEnum
CREATE TYPE "TestimonialType" AS ENUM ('TEXT', 'VIDEO');

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "type" "TestimonialType" NOT NULL,
    "text" TEXT,
    "videoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Testimonial_uuid_key" ON "Testimonial"("uuid");

-- CreateIndex
CREATE INDEX "Testimonial_uuid_idx" ON "Testimonial"("uuid");

-- CreateIndex
CREATE INDEX "Testimonial_type_idx" ON "Testimonial"("type");

-- CreateIndex
CREATE INDEX "Testimonial_isActive_idx" ON "Testimonial"("isActive");
