import "dotenv/config";

import { mercadoLivreRequest } from "../../lib/mercadolivre/client";

type MercadoLivreProduct = {
  id: string;
  status?: string;
  domain_id?: string;
  name?: string;

  settings?: {
    listing_strategy?: string;
  };
};

type MercadoLivreProductSearchResponse = {
  keywords?: string;

  paging?: {
    total?: number;
    offset?: number;
    limit?: number;
  };

  results?: MercadoLivreProduct[];
};

const QUERY = "charizard ex 199/165";
const DOMAIN_ID = "MLB-TRADING_CARD_GAMES";

async function main() {
  console.log("=== TESTE PRODUCT SEARCH ===");
  console.log(`Busca: ${QUERY}`);

  const params = new URLSearchParams({
    status: "active",
    site_id: "MLB",
    q: QUERY,
    domain_id: DOMAIN_ID,
    limit: "10",
  });

  const response =
    await mercadoLivreRequest<MercadoLivreProductSearchResponse>(
      `/products/search?${params.toString()}`
    );
  const results = response.results ?? [];

  console.log("");
  console.log("Busca:", QUERY);
  console.log("Domínio:", DOMAIN_ID);
  console.log("Total encontrado:", response.paging?.total ?? 0);
  console.log("Resultados retornados:", results.length);

  for (const product of results) {
    console.log("");
    console.log("--------------------------------");
    console.log("ID:", product.id);
    console.log("Nome:", product.name ?? "não informado");
    console.log("Domínio:", product.domain_id ?? "não informado");
    console.log(
      "Catalog Product ID:",
      (product as any).catalog_product_id ?? "não informado"
    );
  }


}

main()
  .catch((error) => {
    console.error("");
    console.error("Teste product search falhou:");
    console.error(error);

    process.exit(1);
  });