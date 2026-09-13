/*
  Warnings:

  - The `currency` column on the `offers` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('BRL', 'USD', 'EUR', 'JPY', 'GBP', 'OTHER');

-- CreateEnum
CREATE TYPE "MarketRegion" AS ENUM ('BRAZIL', 'NORTH_AMERICA', 'EUROPE', 'JAPAN', 'ASIA', 'OTHER');

-- AlterTable
ALTER TABLE "offers" ADD COLUMN     "exchangeRate" DECIMAL(18,8),
ADD COLUMN     "exchangeRateAt" TIMESTAMP(3),
ADD COLUMN     "itemLocationCountry" TEXT,
ADD COLUMN     "priceBrl" DECIMAL(12,2),
ADD COLUMN     "shippingPriceBrl" DECIMAL(12,2),
ADD COLUMN     "shipsToBrazil" BOOLEAN,
ADD COLUMN     "totalPriceBrl" DECIMAL(12,2),
DROP COLUMN "currency",
ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'BRL';

-- AlterTable
ALTER TABLE "price_history" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'BRL',
ADD COLUMN     "exchangeRate" DECIMAL(18,8),
ADD COLUMN     "exchangeRateAt" TIMESTAMP(3),
ADD COLUMN     "priceBrl" DECIMAL(12,2),
ADD COLUMN     "shippingPriceBrl" DECIMAL(12,2),
ADD COLUMN     "totalPriceBrl" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "marketRegion" "MarketRegion" NOT NULL DEFAULT 'BRAZIL';

-- CreateIndex
CREATE INDEX "offers_currency_idx" ON "offers"("currency");

-- CreateIndex
CREATE INDEX "offers_itemLocationCountry_idx" ON "offers"("itemLocationCountry");

-- CreateIndex
CREATE INDEX "offers_shipsToBrazil_idx" ON "offers"("shipsToBrazil");

-- CreateIndex
CREATE INDEX "offers_productId_totalPriceBrl_idx" ON "offers"("productId", "totalPriceBrl");

-- CreateIndex
CREATE INDEX "price_history_currency_idx" ON "price_history"("currency");

-- CreateIndex
CREATE INDEX "price_history_productId_capturedAt_totalPriceBrl_idx" ON "price_history"("productId", "capturedAt", "totalPriceBrl");
