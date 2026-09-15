import "dotenv/config";

import {
  searchMercadoLivreCatalogProducts,
} from "../../lib/mercadolivre/products";

import {
  rankMercadoLivreProducts,
} from "../../lib/mercadolivre/matching";

const CARD = {
  name: "Charizard ex",
  number: "199/165",
};

async function main() {
  console.log("=== TESTE MATCHING MERCADO LIVRE ===");
  console.log("Carta:", CARD.name);
  console.log("Número:", CARD.number);

  const query = `${CARD.name} ${CARD.number}`;

  console.log("");
  console.log("Consultando Mercado Livre...");

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
    CARD,
    search.products
  );

  console.log("");
  console.log("=== TOP 10 MATCHES ===");

  for (const [index, match] of ranking
    .slice(0, 10)
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
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error("Teste de matching falhou:");
    console.error(error);
    process.exit(1);
  });