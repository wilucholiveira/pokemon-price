-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('SINGLE_CARD', 'BOOSTER', 'BOOSTER_BOX', 'ELITE_TRAINER_BOX', 'TIN', 'BLISTER', 'BUNDLE', 'COLLECTION_BOX', 'ACCESSORY', 'OTHER');

-- CreateEnum
CREATE TYPE "CardLanguage" AS ENUM ('PT_BR', 'EN', 'ES', 'JP', 'OTHER');

-- CreateEnum
CREATE TYPE "CardCondition" AS ENUM ('NEW', 'NEAR_MINT', 'LIGHTLY_PLAYED', 'MODERATELY_PLAYED', 'HEAVILY_PLAYED', 'DAMAGED', 'SEALED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "StoreType" AS ENUM ('MARKETPLACE', 'SPECIALIZED_STORE', 'RETAILER', 'OTHER');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('AUTO_MATCHED', 'REVIEW_REQUIRED', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CollectorRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "RawOfferStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED', 'IGNORED');

-- CreateTable
CREATE TABLE "sets" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "series" TEXT,
    "releaseDate" TIMESTAMP(3),
    "logoUrl" TEXT,
    "symbolUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "setId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "printedNumber" TEXT,
    "rarity" TEXT,
    "supertype" TEXT,
    "hp" TEXT,
    "artist" TEXT,
    "imageSmall" TEXT,
    "imageLarge" TEXT,
    "releaseDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "cardId" TEXT,
    "productType" "ProductType" NOT NULL,
    "language" "CardLanguage" NOT NULL DEFAULT 'OTHER',
    "condition" "CardCondition" NOT NULL DEFAULT 'UNKNOWN',
    "isGraded" BOOLEAN NOT NULL DEFAULT false,
    "gradingCompany" TEXT,
    "grade" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "StoreType" NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'BR',
    "baseUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalTitle" TEXT NOT NULL,
    "sellerName" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "shippingPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "url" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "stockQuantity" INTEGER,
    "matchConfidence" DECIMAL(5,4),
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "offerId" TEXT,
    "productId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "shippingPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_offers" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "externalId" TEXT,
    "payload" JSONB NOT NULL,
    "processingStatus" "RawOfferStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_matches" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalTitle" TEXT NOT NULL,
    "candidateProductId" TEXT,
    "confidenceScore" DECIMAL(5,4),
    "matchMethod" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collector_runs" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "status" "CollectorRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "itemsFound" INTEGER NOT NULL DEFAULT 0,
    "itemsCreated" INTEGER NOT NULL DEFAULT 0,
    "itemsUpdated" INTEGER NOT NULL DEFAULT 0,
    "itemsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collector_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sets_externalId_key" ON "sets"("externalId");

-- CreateIndex
CREATE INDEX "sets_name_idx" ON "sets"("name");

-- CreateIndex
CREATE INDEX "sets_code_idx" ON "sets"("code");

-- CreateIndex
CREATE UNIQUE INDEX "cards_externalId_key" ON "cards"("externalId");

-- CreateIndex
CREATE INDEX "cards_name_idx" ON "cards"("name");

-- CreateIndex
CREATE INDEX "cards_number_idx" ON "cards"("number");

-- CreateIndex
CREATE INDEX "cards_setId_idx" ON "cards"("setId");

-- CreateIndex
CREATE UNIQUE INDEX "cards_setId_number_key" ON "cards"("setId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_cardId_idx" ON "products"("cardId");

-- CreateIndex
CREATE INDEX "products_productType_idx" ON "products"("productType");

-- CreateIndex
CREATE INDEX "products_active_idx" ON "products"("active");

-- CreateIndex
CREATE UNIQUE INDEX "stores_slug_key" ON "stores"("slug");

-- CreateIndex
CREATE INDEX "stores_active_idx" ON "stores"("active");

-- CreateIndex
CREATE INDEX "offers_productId_idx" ON "offers"("productId");

-- CreateIndex
CREATE INDEX "offers_storeId_idx" ON "offers"("storeId");

-- CreateIndex
CREATE INDEX "offers_available_idx" ON "offers"("available");

-- CreateIndex
CREATE INDEX "offers_totalPrice_idx" ON "offers"("totalPrice");

-- CreateIndex
CREATE INDEX "offers_productId_totalPrice_idx" ON "offers"("productId", "totalPrice");

-- CreateIndex
CREATE UNIQUE INDEX "offers_storeId_externalId_key" ON "offers"("storeId", "externalId");

-- CreateIndex
CREATE INDEX "price_history_offerId_idx" ON "price_history"("offerId");

-- CreateIndex
CREATE INDEX "price_history_productId_idx" ON "price_history"("productId");

-- CreateIndex
CREATE INDEX "price_history_storeId_idx" ON "price_history"("storeId");

-- CreateIndex
CREATE INDEX "price_history_capturedAt_idx" ON "price_history"("capturedAt");

-- CreateIndex
CREATE INDEX "price_history_productId_capturedAt_idx" ON "price_history"("productId", "capturedAt");

-- CreateIndex
CREATE INDEX "raw_offers_storeId_idx" ON "raw_offers"("storeId");

-- CreateIndex
CREATE INDEX "raw_offers_processingStatus_idx" ON "raw_offers"("processingStatus");

-- CreateIndex
CREATE INDEX "raw_offers_collectedAt_idx" ON "raw_offers"("collectedAt");

-- CreateIndex
CREATE INDEX "product_matches_candidateProductId_idx" ON "product_matches"("candidateProductId");

-- CreateIndex
CREATE INDEX "product_matches_status_idx" ON "product_matches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "product_matches_storeId_externalId_key" ON "product_matches"("storeId", "externalId");

-- CreateIndex
CREATE INDEX "collector_runs_storeId_idx" ON "collector_runs"("storeId");

-- CreateIndex
CREATE INDEX "collector_runs_status_idx" ON "collector_runs"("status");

-- CreateIndex
CREATE INDEX "collector_runs_startedAt_idx" ON "collector_runs"("startedAt");

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_setId_fkey" FOREIGN KEY ("setId") REFERENCES "sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_offers" ADD CONSTRAINT "raw_offers_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_matches" ADD CONSTRAINT "product_matches_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_matches" ADD CONSTRAINT "product_matches_candidateProductId_fkey" FOREIGN KEY ("candidateProductId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collector_runs" ADD CONSTRAINT "collector_runs_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
