import TCGdex from "@tcgdex/sdk";
import { prisma } from "../../lib/prisma";

const tcgdex = new TCGdex("en");

async function main() {
  console.log("🔎 Buscando set de teste na TCGdex...");

  // Twilight Masquerade
  const remoteSet = await tcgdex.set.get("sv06");

  if (!remoteSet) {
    throw new Error("Set sv06 não encontrado na TCGdex");
  }

  console.log(`📦 Set encontrado: ${remoteSet.name}`);

  // =========================================================
  // SET
  // =========================================================

  const set = await prisma.set.upsert({
    where: {
      externalId: remoteSet.id,
    },

    update: {
      name: remoteSet.name,
      code: remoteSet.id,
      logoUrl: remoteSet.logo ?? null,
      symbolUrl: remoteSet.symbol ?? null,
    },

    create: {
      externalId: remoteSet.id,
      name: remoteSet.name,
      code: remoteSet.id,
      logoUrl: remoteSet.logo ?? null,
      symbolUrl: remoteSet.symbol ?? null,
    },
  });

  // =========================================================
  // TRADUÇÃO DO SET
  // =========================================================

  await prisma.setTranslation.upsert({
    where: {
      setId_language: {
        setId: set.id,
        language: "EN",
      },
    },

    update: {
      name: remoteSet.name,
    },

    create: {
      setId: set.id,
      language: "EN",
      name: remoteSet.name,
    },
  });

  console.log(`✅ Set salvo no banco: ${set.name}`);
  console.log("🔎 Buscando cartas do set...");

  let imported = 0;
  let failed = 0;

  // =========================================================
  // CARDS
  // =========================================================

  for (const remoteCard of remoteSet.cards ?? []) {
    try {
      const fullCard = await tcgdex.card.get(remoteCard.id);

      if (!fullCard) {
        console.warn(`⚠️ Carta não encontrada: ${remoteCard.id}`);
        failed++;
        continue;
      }

      const imageSmall = fullCard.image
        ? `${fullCard.image}/low.webp`
        : null;

      const imageLarge = fullCard.image
        ? `${fullCard.image}/high.webp`
        : null;

      // =====================================================
      // CARTA CANÔNICA
      // =====================================================

      const card = await prisma.card.upsert({
        where: {
          externalId: fullCard.id,
        },

        update: {
          setId: set.id,
          name: fullCard.name,
          number: fullCard.localId,
          rarity: fullCard.rarity ?? null,
          hp: fullCard.hp?.toString() ?? null,
          artist: fullCard.illustrator ?? null,
          imageSmall,
          imageLarge,
        },

        create: {
          externalId: fullCard.id,
          setId: set.id,
          name: fullCard.name,
          number: fullCard.localId,
          rarity: fullCard.rarity ?? null,
          hp: fullCard.hp?.toString() ?? null,
          artist: fullCard.illustrator ?? null,
          imageSmall,
          imageLarge,
        },
      });

      // =====================================================
      // TRADUÇÃO EN
      // =====================================================

      await prisma.cardTranslation.upsert({
        where: {
          cardId_language: {
            cardId: card.id,
            language: "EN",
          },
        },

        update: {
          name: fullCard.name,
          rarity: fullCard.rarity ?? null,
          imageSmall,
          imageLarge,
        },

        create: {
          cardId: card.id,
          language: "EN",
          name: fullCard.name,
          rarity: fullCard.rarity ?? null,
          imageSmall,
          imageLarge,
        },
      });

      imported++;

      console.log(
        `✓ ${fullCard.localId} - ${fullCard.name}`
      );
    } catch (error) {
      failed++;

      console.error(
        `❌ Erro ao importar ${remoteCard.id}:`,
        error
      );
    }
  }

  // =========================================================
  // RESULTADO
  // =========================================================

  console.log("");
  console.log("====================================");
  console.log("🎉 IMPORTAÇÃO CONCLUÍDA");
  console.log("====================================");
  console.log(`📦 Set: ${remoteSet.name}`);
  console.log(`🃏 Cartas importadas: ${imported}`);
  console.log(`❌ Falhas: ${failed}`);
  console.log("====================================");
}

main()
  .catch((error) => {
    console.error("");
    console.error("❌ Erro no catalog sync:");
    console.error(error);

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });