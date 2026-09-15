import "dotenv/config";

import { prisma } from "../../lib/prisma";
import { mercadoLivreRequest } from "../../lib/mercadolivre/client";

type ItemsSearchResponse = {
  seller_id?: string | number;
  results?: string[];
  paging?: {
    total?: number;
    offset?: number;
    limit?: number;
  };
};

async function main() {
  console.log("=== TESTE /users/{id}/items/search ===");

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

  const response =
    await mercadoLivreRequest<ItemsSearchResponse>(
      `/users/${credential.externalUserId}/items/search?limit=10`
    );

  console.log("Endpoint autorizado.");
  console.log(
    "Total:",
    response.paging?.total ?? 0
  );
  console.log(
    "IDs retornados:",
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