import "dotenv/config";

import { prisma } from "../../lib/prisma";

import {
  searchMercadoLivreCatalogProducts,
} from "../../lib/mercadolivre/products";

import {
  rankMercadoLivreProducts,
} from "../../lib/mercadolivre/matching";

const POKEMON_NAMES = [
  "Charizard",
  "Pikachu",
  "Mew",
  "Umbreon",
  "Gengar",
];

const CARDS_PER_POKEMON = 2;
const SEARCH_LIMIT = 50;

type BatchResult = {
  card: string;
  number: string;
  set: string;
  bestProduct: string;
  productId: string;
  score: number;
  autoMatch: boolean;
};

async function main() {
  console.log("=== TESTE BATCH MATCHING ===");
  console.log("");

  const results: BatchResult[] = [];

  for (const pokemonName of POKEMON_NAMES) {
    console.log(
      `Buscando cartas de ${pokemonName} no banco...`
    );

    const cards = await prisma.card.findMany({
      where: {
        name: {
          contains: pokemonName,
          mode: "insensitive",
        },
      },
      include: {
        set: true,
      },
      orderBy: {
        releaseDate: "desc",
      },
      take: CARDS_PER_POKEMON,
    });

    for (const card of cards) {
      const query =
        `${card.name} ${card.number} ${card.set.name}`;

      console.log("");
      console.log("--------------------------------");
      console.log(
        `Testando: ${card.name} ${card.number}`
      );
      console.log(`Set: ${card.set.name}`);
      console.log(`Query: ${query}`);

      try {
        const search =
          await searchMercadoLivreCatalogProducts({
            query,
            limit: SEARCH_LIMIT,
          });

        const ranking = rankMercadoLivreProducts(
          {
            name: card.name,
            number: card.number,
            setName: card.set.name,
          },
          search.products
        );

        const best = ranking[0];

        if (!best) {
          console.log("Nenhum candidato encontrado.");

          results.push({
            card: card.name,
            number: card.number,
            set: card.set.name,
            bestProduct: "NENHUM",
            productId: "-",
            score: 0,
            autoMatch: false,
          });

          continue;
        }

        console.log(
          `Melhor candidato: ${best.product.name}`
        );

        console.log(`Score: ${best.score}/100`);

        console.log(
          "Auto-match:",
          best.eligibleForAutoMatch ? "SIM" : "NÃO"
        );

        results.push({
          card: card.name,
          number: card.number,
          set: card.set.name,

          bestProduct:
            best.product.name ?? "não informado",

          productId:
            best.product.catalog_product_id ??
            best.product.id,

          score: best.score,

          autoMatch: best.eligibleForAutoMatch,
        });
      } catch (error) {
        console.error(
          "Falha ao processar esta carta:",
          error
        );

        results.push({
          card: card.name,
          number: card.number,
          set: card.set.name,
          bestProduct: "ERRO",
          productId: "-",
          score: 0,
          autoMatch: false,
        });
      }
    }
  }

  console.log("");
  console.log("");
  console.log("====================================");
  console.log("=== RESUMO DO TESTE EM LOTE ===");
  console.log("====================================");

  console.table(
    results.map((result) => ({
      Carta: result.card,
      Número: result.number,
      Set: result.set,
      Score: result.score,
      Auto: result.autoMatch ? "SIM" : "NÃO",
      "Melhor candidato": result.bestProduct,
    }))
  );

  const total = results.length;

  const autoMatched = results.filter(
    (result) => result.autoMatch
  ).length;

  const highConfidence = results.filter(
    (result) =>
      !result.autoMatch &&
      result.score >= 60
  ).length;

  const lowConfidence = results.filter(
    (result) => result.score < 60
  ).length;

  console.log("");
  console.log("=== MÉTRICAS ===");
  console.log("Cartas testadas:", total);
  console.log("Auto-match:", autoMatched);
  console.log(
    "Candidatos 60–79:",
    highConfidence
  );
  console.log(
    "Baixa confiança (<60):",
    lowConfidence
  );

  if (total > 0) {
    console.log(
      "Cobertura auto-match:",
      `${((autoMatched / total) * 100).toFixed(1)}%`
    );
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error("Teste batch falhou:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });