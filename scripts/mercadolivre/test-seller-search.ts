import "dotenv/config";

import { prisma } from "../../lib/prisma";
import { mercadoLivreRequest } from "../../lib/mercadolivre/client";

type SearchResponse = {
  seller_id?: number;
  results?: unknown[];
  paging?: {
    total?: number;
    offset?: number;
    limit?: number;
  };
};

async function main() {
  console.log("=== TESTE SEARCH POR SELLER ===");

  const credential =
    await prisma.marketplaceCredential.findUnique({
      where: {
        provider: "mercadolivre",
      },
    });

  if (!credential?.externalUserId) {
    throw new Error(
      "externalUserId do Mercado Livre não encontrado."
    );
  }

  const params = new URLSearchParams({
    seller_id: credential.externalUserId,
    limit: "10",
  });

  const response =
    await mercadoLivreRequest<SearchResponse>(
      `/sites/MLB/search?${params.toString()}`
    );

  console.log("Busca autorizada com sucesso.");
  console.log(
    "Total encontrado:",
    response.paging?.total ?? 0
  );
  console.log(
    "Resultados retornados:",
    response.results?.length ?? 0
  );
}

main()
  .catch((error) => {
    console.error("Teste falhou:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });