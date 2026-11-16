-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('Abandoned', 'AtCheckout', 'Recovered', 'Converted');

-- CreateEnum
CREATE TYPE "PurchaseIntent" AS ENUM ('High', 'Medium', 'Low');

-- CreateEnum
CREATE TYPE "RecoveryStatus" AS ENUM ('Pending', 'MessageGenerated', 'AwaitingApproval', 'Approved', 'Recovered');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('Email', 'WhatsApp');

-- CreateEnum
CREATE TYPE "MessageTone" AS ENUM ('WarmReminder', 'GentleIncentive', 'VIPConcierge');

-- CreateEnum
CREATE TYPE "CartItemCategory" AS ENUM ('Serums', 'Moisturizers', 'Cleansers', 'SunCare', 'Treatments');

-- CreateEnum
CREATE TYPE "InteractionChannel" AS ENUM ('WebStore', 'Email', 'WhatsApp', 'SystemReview');

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "skinProfile" TEXT NOT NULL,
    "purchaseStatus" "PurchaseStatus" NOT NULL,
    "intent" "PurchaseIntent" NOT NULL,
    "lastActivityAt" TIMESTAMP(3) NOT NULL,
    "sessionsLast7Days" INTEGER NOT NULL DEFAULT 0,
    "productViewsLast7Days" INTEGER NOT NULL DEFAULT 0,
    "previousOrders" INTEGER NOT NULL DEFAULT 0,
    "lifetimeValueInr" INTEGER NOT NULL DEFAULT 0,
    "checkoutStepReached" TEXT NOT NULL,
    "abandonedHoursAgo" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "abandonedAt" TIMESTAMP(3) NOT NULL,
    "abandonedHoursAgo" DOUBLE PRECISION NOT NULL,
    "recoveryStatus" "RecoveryStatus" NOT NULL DEFAULT 'Pending',
    "channel" "MessageChannel" NOT NULL DEFAULT 'Email',
    "tone" "MessageTone" NOT NULL DEFAULT 'WarmReminder',
    "generatedSubject" TEXT,
    "generatedMessage" TEXT,
    "lastActionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "CartItemCategory" NOT NULL,
    "variant" TEXT NOT NULL,
    "unitPriceInr" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerInteraction" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "channel" "InteractionChannel" NOT NULL,
    "summary" TEXT NOT NULL,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "event" TEXT NOT NULL,
    "detail" TEXT NOT NULL,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryMessage" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "tone" "MessageTone" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "approvedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecoveryMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_purchaseStatus_intent_idx" ON "Customer"("purchaseStatus", "intent");

-- CreateIndex
CREATE INDEX "Cart_customerId_idx" ON "Cart"("customerId");

-- CreateIndex
CREATE INDEX "Cart_recoveryStatus_abandonedAt_idx" ON "Cart"("recoveryStatus", "abandonedAt");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");

-- CreateIndex
CREATE INDEX "CustomerInteraction_customerId_timestamp_idx" ON "CustomerInteraction"("customerId", "timestamp");

-- CreateIndex
CREATE INDEX "ActivityEvent_customerId_timestamp_idx" ON "ActivityEvent"("customerId", "timestamp");

-- CreateIndex
CREATE INDEX "RecoveryMessage_cartId_createdAt_idx" ON "RecoveryMessage"("cartId", "createdAt");

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInteraction" ADD CONSTRAINT "CustomerInteraction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryMessage" ADD CONSTRAINT "RecoveryMessage_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
