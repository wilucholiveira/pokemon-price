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
  "Deluxe Pack ex",
  "Promos-A",
];

async function main() {
  console.log(
    "=== AUDITORIA POKÉMON TCG POCKET ==="
  );

  const sets = await prisma.set.findMany({
    where: {
      name: {
        in: POCKET_SET_NAMES,
        mode: "insensitive",
      },
    },

    include: {
      _count: {
        select: {
          cards: true,
        },
      },
    },

    orderBy: {
      name: "asc",
    },
  });

  console.log("");
  console.log(
    "Sets Pocket identificados:",
    sets.length
  );

  let totalCards = 0;

  for (const set of sets) {
    totalCards += set._count.cards;

    console.log("");
    console.log("Set:", set.name);
    console.log("ID:", set.id);
    console.log(
      "Cartas:",
      set._count.cards
    );
  }

  console.log("");
  console.log("=============================");
  console.log(
    "Total de cartas Pocket:",
    totalCards
  );
  console.log("=============================");

  console.log("");
  console.log(
    "Nenhum registro foi alterado."
  );
}

main()
  .catch((error) => {
    console.error("");
    console.error(
      "Falha na auditoria:"
    );
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });