-- CreateTable
CREATE TABLE "set_translations" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "language" "CardLanguage" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "set_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_translations" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "language" "CardLanguage" NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" TEXT,
    "imageSmall" TEXT,
    "imageLarge" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "set_translations_language_idx" ON "set_translations"("language");

-- CreateIndex
CREATE UNIQUE INDEX "set_translations_setId_language_key" ON "set_translations"("setId", "language");

-- CreateIndex
CREATE INDEX "card_translations_language_idx" ON "card_translations"("language");

-- CreateIndex
CREATE INDEX "card_translations_name_idx" ON "card_translations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "card_translations_cardId_language_key" ON "card_translations"("cardId", "language");

-- AddForeignKey
ALTER TABLE "set_translations" ADD CONSTRAINT "set_translations_setId_fkey" FOREIGN KEY ("setId") REFERENCES "sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_translations" ADD CONSTRAINT "card_translations_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
