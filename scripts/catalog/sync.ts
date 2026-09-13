import TCGdex from "@tcgdex/sdk";
import { prisma } from "../../lib/prisma";

type LanguageConfig = {
  api: "en" | "pt-br" | "ja";
  db: "EN" | "PT_BR" | "JP";
  canonical: boolean;
};

const languages: LanguageConfig[] = [
  { api: "en", db: "EN", canonical: true },
  { api: "pt-br", db: "PT_BR", canonical: false },
  { api: "ja", db: "JP", canonical: false },
];

const REQUEST_DELAY_MS = 20;
const MAX_RETRIES = 3;

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry<T>(
  operation: () => Promise<T>,
  label: string
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      console.warn(
        `⚠️ ${label} falhou (${attempt}/${MAX_RETRIES})`
      );

      if (attempt < MAX_RETRIES) {
        await sleep(1000 * attempt);
      }
    }
  }

  throw lastError;
}

function getImages(image?: string | null) {
  if (!image) {
    return {
      imageSmall: null,
      imageLarge: null,
    };
  }

  return {
    imageSmall: `${image}/low.webp`,
    imageLarge: `${image}/high.webp`,
  };
}

// ==========================================================
// INGLÊS = CATÁLOGO CANÔNICO
// ==========================================================

async function syncCanonicalEnglish() {
  const tcgdex = new TCGdex("en");

  console.log("");
  console.log("==============================================");
  console.log("🇬🇧 CATÁLOGO CANÔNICO: EN");
  console.log("==============================================");

  const remoteSets = await withRetry(
    () => tcgdex.set.list(),
    "Listagem de sets EN"
  );

  console.log(`📦 Sets encontrados: ${remoteSets.length}`);

  let setsProcessed = 0;
  let cardsProcessed = 0;
  let failures = 0;

  for (let setIndex = 0; setIndex < remoteSets.length; setIndex++) {
    const remoteSetResume = remoteSets[setIndex];

    console.log("");
    console.log(
      `📦 [${setIndex + 1}/${remoteSets.length}] ${remoteSetResume.id}`
    );

    try {
      const remoteSet = await withRetry(
        () => tcgdex.set.get(remoteSetResume.id),
        `Set EN ${remoteSetResume.id}`
      );

      if (!remoteSet) {
        console.warn("  ⚠️ Set não encontrado.");
        failures++;
        continue;
      }

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

      setsProcessed++;

      const cards = remoteSet.cards ?? [];

      console.log(
        `   ${remoteSet.name} — ${cards.length} cartas`
      );

      for (let cardIndex = 0; cardIndex < cards.length; cardIndex++) {
        const remoteCardResume = cards[cardIndex];

        try {
          const fullCard = await withRetry(
            () => tcgdex.card.get(remoteCardResume.id),
            `Carta EN ${remoteCardResume.id}`
          );

          if (!fullCard) {
            failures++;
            continue;
          }

          const { imageSmall, imageLarge } =
            getImages(fullCard.image);

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

          cardsProcessed++;

          if (
            (cardIndex + 1) % 25 === 0 ||
            cardIndex === cards.length - 1
          ) {
            console.log(
              `   🃏 ${cardIndex + 1}/${cards.length}`
            );
          }
        } catch (error) {
          failures++;

          console.error(
            `   ❌ ${remoteCardResume.id}`,
            error
          );
        }

        await sleep(REQUEST_DELAY_MS);
      }
    } catch (error) {
      failures++;

      console.error(
        `❌ Erro no set ${remoteSetResume.id}`,
        error
      );
    }
  }

  return {
    setsProcessed,
    cardsProcessed,
    failures,
  };
}

// ==========================================================
// TRADUÇÕES
// ==========================================================

async function syncTranslations(
  config: LanguageConfig
) {
  const tcgdex = new TCGdex(config.api);

  console.log("");
  console.log("==============================================");
  console.log(`🌍 TRADUÇÕES: ${config.api}`);
  console.log("==============================================");

  const remoteSets = await withRetry(
    () => tcgdex.set.list(),
    `Listagem de sets ${config.api}`
  );

  console.log(`📦 Sets encontrados: ${remoteSets.length}`);

  let setsProcessed = 0;
  let cardsProcessed = 0;
  let skipped = 0;
  let failures = 0;

  for (let setIndex = 0; setIndex < remoteSets.length; setIndex++) {
    const remoteSetResume = remoteSets[setIndex];

    console.log("");
    console.log(
      `📦 [${setIndex + 1}/${remoteSets.length}] ${remoteSetResume.id}`
    );

    try {
      // O set precisa existir no catálogo EN.
      const canonicalSet = await prisma.set.findUnique({
        where: {
          externalId: remoteSetResume.id,
        },
      });

      if (!canonicalSet) {
        skipped++;

        console.log(
          "   ↷ Sem correspondente canônico EN. Ignorado."
        );

        continue;
      }

      const remoteSet = await withRetry(
        () => tcgdex.set.get(remoteSetResume.id),
        `Set ${config.api} ${remoteSetResume.id}`
      );

      if (!remoteSet) {
        failures++;
        continue;
      }

      await prisma.setTranslation.upsert({
        where: {
          setId_language: {
            setId: canonicalSet.id,
            language: config.db,
          },
        },

        update: {
          name: remoteSet.name,
        },

        create: {
          setId: canonicalSet.id,
          language: config.db,
          name: remoteSet.name,
        },
      });

      setsProcessed++;

      const cards = remoteSet.cards ?? [];

      console.log(
        `   ${remoteSet.name} — ${cards.length} cartas`
      );

      for (let cardIndex = 0; cardIndex < cards.length; cardIndex++) {
        const remoteCardResume = cards[cardIndex];

        try {
          // REGRA DE SEGURANÇA:
          // só adicionamos tradução se o ID já existir
          // no catálogo canônico inglês.
          const canonicalCard = await prisma.card.findUnique({
            where: {
              externalId: remoteCardResume.id,
            },
          });

          if (!canonicalCard) {
            skipped++;
            continue;
          }

          const fullCard = await withRetry(
            () => tcgdex.card.get(remoteCardResume.id),
            `Carta ${config.api} ${remoteCardResume.id}`
          );

          if (!fullCard) {
            failures++;
            continue;
          }

          const { imageSmall, imageLarge } =
            getImages(fullCard.image);

          await prisma.cardTranslation.upsert({
            where: {
              cardId_language: {
                cardId: canonicalCard.id,
                language: config.db,
              },
            },

            update: {
              name: fullCard.name,
              rarity: fullCard.rarity ?? null,
              imageSmall,
              imageLarge,
            },

            create: {
              cardId: canonicalCard.id,
              language: config.db,
              name: fullCard.name,
              rarity: fullCard.rarity ?? null,
              imageSmall,
              imageLarge,
            },
          });

          cardsProcessed++;

          if (
            (cardIndex + 1) % 25 === 0 ||
            cardIndex === cards.length - 1
          ) {
            console.log(
              `   🃏 ${cardIndex + 1}/${cards.length}`
            );
          }
        } catch (error) {
          failures++;

          console.error(
            `   ❌ ${remoteCardResume.id}`,
            error
          );
        }

        await sleep(REQUEST_DELAY_MS);
      }
    } catch (error) {
      failures++;

      console.error(
        `❌ Erro no set ${remoteSetResume.id}`,
        error
      );
    }
  }

  return {
    setsProcessed,
    cardsProcessed,
    skipped,
    failures,
  };
}

// ==========================================================
// MAIN
// ==========================================================

async function main() {
  const startedAt = Date.now();

  console.log("");
  console.log("==============================================");
  console.log("🚀 POKÉMON TCG — CATALOG SYNC");
  console.log("==============================================");

  // 1. Inglês sempre primeiro.
  const english = await syncCanonicalEnglish();

  let totalSets = english.setsProcessed;
  let totalCards = english.cardsProcessed;
  let totalFailures = english.failures;
  let totalSkipped = 0;

  // 2. Demais idiomas somente como traduções.
  for (const language of languages) {
    if (language.canonical) {
      continue;
    }

    const result = await syncTranslations(language);

    totalSets += result.setsProcessed;
    totalCards += result.cardsProcessed;
    totalFailures += result.failures;
    totalSkipped += result.skipped;
  }

  const elapsedSeconds = Math.round(
    (Date.now() - startedAt) / 1000
  );

  console.log("");
  console.log("==============================================");
  console.log("🎉 SINCRONIZAÇÃO CONCLUÍDA");
  console.log("==============================================");
  console.log(`📦 Sets processados: ${totalSets}`);
  console.log(`🃏 Cartas/traduções: ${totalCards}`);
  console.log(`↷ Ignorados com segurança: ${totalSkipped}`);
  console.log(`❌ Falhas: ${totalFailures}`);
  console.log(`⏱️ Tempo: ${elapsedSeconds}s`);
  console.log("==============================================");
}

main()
  .catch((error) => {
    console.error("");
    console.error("❌ ERRO FATAL NO CATALOG SYNC");
    console.error(error);

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });