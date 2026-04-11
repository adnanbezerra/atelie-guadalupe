-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('ADMIN', 'SUBADMIN', 'USER');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'AWAITING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CartItemStatus" AS ENUM ('ACTIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "ProductSize" AS ENUM ('GRAMS_70', 'GRAMS_100');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('SELFCARE', 'ARTISANAL');

-- CreateEnum
CREATE TYPE "ShippingStatus" AS ENUM ('DRAFT', 'QUOTED', 'CONFIRMED', 'CHECKOUT_REQUESTED', 'LABEL_PURCHASED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" "RoleName" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "roleId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "userId" INTEGER NOT NULL,
    "label" TEXT,
    "recipient" TEXT NOT NULL,
    "document" TEXT,
    "zipCode" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "complement" TEXT,
    "neighborhood" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "reference" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "lineId" INTEGER NOT NULL,
    "category" "ProductCategory" NOT NULL DEFAULT 'ARTISANAL',
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "stock" INTEGER,
    "shippingWeightGrams" INTEGER,
    "description" TEXT,
    "shortDescription" TEXT NOT NULL,
    "longDescription" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "Cart" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "cartId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "productSize" "ProductSize" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceInCents" INTEGER NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "status" "CartItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "userId" INTEGER NOT NULL,
    "addressId" INTEGER,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "subtotalInCents" INTEGER NOT NULL,
    "shippingInCents" INTEGER NOT NULL DEFAULT 0,
    "discountInCents" INTEGER NOT NULL DEFAULT 0,
    "totalInCents" INTEGER NOT NULL,
    "notes" TEXT,
    "checkoutProvider" TEXT,
    "checkoutReference" TEXT,
    "placedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "orderId" INTEGER NOT NULL,
    "productId" INTEGER,
    "productSize" "ProductSize" NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "imageUrlSnapshot" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPriceInCents" INTEGER NOT NULL,
    "totalPriceInCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingBox" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "outerHeightCm" DECIMAL(6,2) NOT NULL,
    "outerWidthCm" DECIMAL(6,2) NOT NULL,
    "outerLengthCm" DECIMAL(6,2) NOT NULL,
    "emptyWeightGrams" INTEGER NOT NULL DEFAULT 0,
    "maxItems" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingBox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderShipment" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "orderId" INTEGER NOT NULL,
    "status" "ShippingStatus" NOT NULL DEFAULT 'DRAFT',
    "quoteFingerprint" TEXT,
    "selectedServiceCode" INTEGER,
    "selectedServiceName" TEXT,
    "shippingPriceInCents" INTEGER,
    "superfreteOrderId" TEXT,
    "superfreteProtocol" TEXT,
    "trackingCode" TEXT,
    "labelUrl" TEXT,
    "calculatorPayload" JSONB,
    "calculatorResponse" JSONB,
    "quotedServices" JSONB,
    "packagingSnapshot" JSONB,
    "cartPayload" JSONB,
    "cartResponse" JSONB,
    "checkoutResponse" JSONB,
    "cancellationResponse" JSONB,
    "quotedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "checkoutRequestedAt" TIMESTAMP(3),
    "purchasedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderShipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_uuid_key" ON "User"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_document_key" ON "User"("document");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE INDEX "User_uuid_idx" ON "User"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Address_uuid_key" ON "Address"("uuid");

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- CreateIndex
CREATE INDEX "Address_uuid_idx" ON "Address"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Product_uuid_key" ON "Product"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_lineId_idx" ON "Product"("lineId");

-- CreateIndex
CREATE INDEX "Product_slug_idx" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_uuid_idx" ON "Product"("uuid");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

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

-- CreateIndex
CREATE UNIQUE INDEX "Cart_uuid_key" ON "Cart"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");

-- CreateIndex
CREATE INDEX "Cart_uuid_idx" ON "Cart"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_uuid_key" ON "CartItem"("uuid");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");

-- CreateIndex
CREATE INDEX "CartItem_productId_idx" ON "CartItem"("productId");

-- CreateIndex
CREATE INDEX "CartItem_uuid_idx" ON "CartItem"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_productId_productSize_key" ON "CartItem"("cartId", "productId", "productSize");

-- CreateIndex
CREATE UNIQUE INDEX "Order_uuid_key" ON "Order"("uuid");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_addressId_idx" ON "Order"("addressId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_uuid_idx" ON "Order"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_uuid_key" ON "OrderItem"("uuid");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderItem_uuid_idx" ON "OrderItem"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingBox_uuid_key" ON "ShippingBox"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingBox_name_key" ON "ShippingBox"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingBox_slug_key" ON "ShippingBox"("slug");

-- CreateIndex
CREATE INDEX "ShippingBox_uuid_idx" ON "ShippingBox"("uuid");

-- CreateIndex
CREATE INDEX "ShippingBox_slug_idx" ON "ShippingBox"("slug");

-- CreateIndex
CREATE INDEX "ShippingBox_isActive_idx" ON "ShippingBox"("isActive");

-- CreateIndex
CREATE INDEX "ShippingBox_category_idx" ON "ShippingBox"("category");

-- CreateIndex
CREATE UNIQUE INDEX "OrderShipment_uuid_key" ON "OrderShipment"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "OrderShipment_orderId_key" ON "OrderShipment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderShipment_superfreteOrderId_key" ON "OrderShipment"("superfreteOrderId");

-- CreateIndex
CREATE INDEX "OrderShipment_uuid_idx" ON "OrderShipment"("uuid");

-- CreateIndex
CREATE INDEX "OrderShipment_status_idx" ON "OrderShipment"("status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ProductLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderShipment" ADD CONSTRAINT "OrderShipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
