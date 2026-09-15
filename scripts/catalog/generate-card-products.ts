import "dotenv/config";

import { prisma } from "../../lib/prisma";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  console.log("");
  console.log("==============================================");
  console.log("GERAÇÃO DE PRODUCTS — CARTAS AVULSAS");
  console.log("==============================================");

  const cards = await prisma.card.findMany({
    include: {
      set: true,
      translations: true,
    },

    orderBy: {
      id: "asc",
    },
  });

  console.log("");
  console.log("Cartas encontradas:", cards.length);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const card of cards) {
    /*
     * O catálogo canônico em inglês já representa
     * uma variante física possível.
     *
     * Traduções adicionais representam idiomas
     * disponíveis no nosso catálogo.
     */
    const languages = new Set<string>();

    languages.add("EN");

    for (const translation of card.translations) {
      languages.add(translation.language);
    }

    for (const language of languages) {
      if (
        language !== "EN" &&
        language !== "PT_BR" &&
        language !== "JP"
      ) {
        skipped++;
        continue;
      }

      const translation =
        card.translations.find(
          (item) =>
            item.language === language
        );

      const cardName =
        translation?.name ??
        card.name;

      const productName =
        `${cardName} ${card.number} - ` +
        `${card.set.name} - ${language}`;

      /*
       * externalId torna o slug estável mesmo se
       * nome/set forem alterados futuramente.
       */
      const slug =
        slugify(
          `${card.externalId}-${language}-unknown-ungraded`
        );

      const existing =
        await prisma.product.findUnique({
          where: {
            slug,
          },

          select: {
            id: true,
          },
        });

      await prisma.product.upsert({
        where: {
          slug,
        },

        update: {
          cardId: card.id,
          name: productName,

          productType:
            "SINGLE_CARD",

          language:
            language as
              | "EN"
              | "PT_BR"
              | "JP",

          condition:
            "UNKNOWN",

          isGraded: false,
          gradingCompany: null,
          grade: null,

          active: true,
        },

        create: {
          cardId: card.id,

          name: productName,
          slug,

          productType:
            "SINGLE_CARD",

          language:
            language as
              | "EN"
              | "PT_BR"
              | "JP",

          condition:
            "UNKNOWN",

          isGraded: false,
          gradingCompany: null,
          grade: null,

          active: true,
        },
      });

      if (existing) {
        updated++;
      } else {
        created++;
      }
    }
  }

  const totalProducts =
    await prisma.product.count();

  console.log("");
  console.log("==============================================");
  console.log("GERAÇÃO CONCLUÍDA");
  console.log("==============================================");

  console.log("Products criados:", created);
  console.log("Products atualizados:", updated);
  console.log(
    "Idiomas ignorados:",
    skipped
  );

  console.log(
    "Total de Products no banco:",
    totalProducts
  );

  console.log("==============================================");
}

main()
  .catch((error) => {
    console.error("");
    console.error(
      "ERRO AO GERAR PRODUCTS"
    );

    console.error(error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });