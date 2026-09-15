import "dotenv/config";

import { prisma } from "../../lib/prisma";

const POCKET_SET_NAMES = [
  "Genetic Apex",
  "Mythical Island",
  "Space-Time Smackdown",
  "Triumphant Light",
  "Shining Revelry",
  "Celestial Guardians",
  "Extradimensional Crisis",
  "Eevee Grove",
  "Wisdom of Sea and Sky",
  "Secluded Springs",
  "Promos-A",
];

async function main() {
  console.log("=== REMOÇÃO POKÉMON TCG POCKET ===");
  console.log("");

  const sets = await prisma.set.findMany({
    where: {
      name: {
        in: POCKET_SET_NAMES,
        mode: "insensitive",
      },
    },
    include: {
      cards: {
        select: {
          id: true,
        },
      },
    },
  });

  const setIds = sets.map((set) => set.id);

  const cardIds = sets.flatMap((set) =>
    set.cards.map((card) => card.id)
  );

  console.log("Sets encontrados:", setIds.length);
  console.log("Cartas encontradas:", cardIds.length);

  if (setIds.length === 0) {
    console.log("");
    console.log("Nenhum set Pocket encontrado.");
    return;
  }

  // Verificação de segurança antes de excluir.
  const products = await prisma.product.count({
    where: {
      cardId: {
        in: cardIds,
      },
    },
  });

  console.log(
    "Products relacionados:",
    products
  );

  if (products > 0) {
    console.log("");
    console.log(
      "ABORTADO: existem Products relacionados às cartas Pocket."
    );

    console.log(
      "Nenhum registro foi removido."
    );

    return;
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const cardTranslations =
        await tx.cardTranslation.deleteMany({
          where: {
            cardId: {
              in: cardIds,
            },
          },
        });

      const cards =
        await tx.card.deleteMany({
          where: {
            id: {
              in: cardIds,
            },
          },
        });

      const setTranslations =
        await tx.setTranslation.deleteMany({
          where: {
            setId: {
              in: setIds,
            },
          },
        });

      const deletedSets =
        await tx.set.deleteMany({
          where: {
            id: {
              in: setIds,
            },
          },
        });

      return {
        cardTranslations:
          cardTranslations.count,

        cards:
          cards.count,

        setTranslations:
          setTranslations.count,

        sets:
          deletedSets.count,
      };
    }
  );

  console.log("");
  console.log("=============================");
  console.log("REMOÇÃO CONCLUÍDA");
  console.log("=============================");

  console.log(
    "Card translations:",
    result.cardTranslations
  );

  console.log(
    "Cards:",
    result.cards
  );

  console.log(
    "Set translations:",
    result.setTranslations
  );

  console.log(
    "Sets:",
    result.sets
  );
}

main()
  .catch((error) => {
    console.error("");
    console.error("Falha na remoção:");
    console.error(error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });