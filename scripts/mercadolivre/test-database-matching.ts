import "dotenv/config";

import { prisma } from "../../lib/prisma";

import {
  searchMercadoLivreCatalogProducts,
} from "../../lib/mercadolivre/products";

import {
  rankMercadoLivreProducts,
} from "../../lib/mercadolivre/matching";

async function main() {
  console.log("=== MATCHING BANCO → MERCADO LIVRE ===");

  // Primeiro buscamos uma carta Charizard real do nosso catálogo.
  const card = await prisma.card.findFirst({
    where: {
      name: {
        contains: "Charizard",
        mode: "insensitive",
      },
    },
    include: {
      set: true,
    },
  });

  if (!card) {
    throw new Error(
      "Nenhuma carta Charizard encontrada no catálogo."
    );
  }

  console.log("");
  console.log("=== CARTA DO BANCO ===");
  console.log("ID:", card.id);
  console.log("Nome:", card.name);
  console.log("Número:", card.number);
  console.log("Set:", card.set.name);

  const query = `${card.name} ${card.number} ${card.set.name}`;

  console.log("");
  console.log("Query Mercado Livre:", query);

  const search =
    await searchMercadoLivreCatalogProducts({
      query,
      limit: 50,
    });

  console.log("Total encontrado:", search.total);
  console.log(
    "Candidatos analisados:",
    search.products.length
  );

  const ranking = rankMercadoLivreProducts(
    {
      name: card.name,
      number: card.number,
      setName: card.set.name,
    },
    search.products
  );

  console.log("");
  console.log("=== TOP 5 MATCHES ===");

  for (const [index, match] of ranking
    .slice(0, 5)
    .entries()) {
    console.log("");
    console.log(
      `#${index + 1} | SCORE: ${match.score}/100`
    );

    console.log(
      "Produto:",
      match.product.name ?? "não informado"
    );

    console.log(
      "Product ID:",
      match.product.catalog_product_id ??
        match.product.id
    );

    console.log(
      "Motivos:",
      match.reasons.length
        ? match.reasons.join(" | ")
        : "nenhum"
    );

    console.log(
      "Penalidades:",
      match.penalties.length
        ? match.penalties.join(" | ")
        : "nenhuma"
    );

    console.log(
      "Auto-match:",
      match.eligibleForAutoMatch ? "SIM" : "NÃO"
    );
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error("Teste falhou:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });