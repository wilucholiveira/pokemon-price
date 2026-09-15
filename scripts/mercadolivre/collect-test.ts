import "dotenv/config";

import { prisma } from "../../lib/prisma";
import { mercadoLivreRequest } from "../../lib/mercadolivre/client";

type MercadoLivreSearchResult = {
  id: string;
  title: string;
  price?: number;
  currency_id?: string;
  permalink?: string;
  available_quantity?: number;
};

type MercadoLivreSearchResponse = {
  results: MercadoLivreSearchResult[];
  paging?: {
    total?: number;
    offset?: number;
    limit?: number;
  };
};

const STORE_SLUG = "mercado-livre";
const SEARCH_QUERY = "pokemon tcg";
const LIMIT = 10;

async function main() {
  console.log("=== COLLECTOR MERCADO LIVRE ===");
  console.log(`Busca: ${SEARCH_QUERY}`);
  console.log(`Limite: ${LIMIT}`);

  const store = await prisma.store.findUnique({
    where: {
      slug: STORE_SLUG,
    },
  });

  if (!store) {
    throw new Error(
      "Store Mercado Livre não encontrada. Execute setup-store.ts primeiro."
    );
  }

  const collectorRun = await prisma.collectorRun.create({
    data: {
      storeId: store.id,
      status: "RUNNING",
    },
  });

  console.log("CollectorRun iniciado:", collectorRun.id);

  try {
    const params = new URLSearchParams({
      q: SEARCH_QUERY,
      limit: String(LIMIT),
    });

    console.log("Consultando Mercado Livre...");

    const response =
      await mercadoLivreRequest<MercadoLivreSearchResponse>(
        `/sites/MLB/search?${params.toString()}`
      );

    const results = response.results ?? [];

    console.log(`Resultados recebidos: ${results.length}`);

    let created = 0;
    let failed = 0;

    for (const item of results) {
      try {
        await prisma.rawOffer.create({
          data: {
            storeId: store.id,
            externalId: item.id,

            payload: JSON.parse(
              JSON.stringify(item)
            ),

            processingStatus: "PENDING",
          },
        });

        created++;

        console.log(
          `[SALVO] ${item.id} | ${item.title}`
        );
      } catch (error) {
        failed++;

        console.error(
          `[ERRO] Não foi possível salvar ${item.id}`
        );

        console.error(error);
      }
    }

    await prisma.collectorRun.update({
      where: {
        id: collectorRun.id,
      },

      data: {
        status:
          failed === 0
            ? "SUCCESS"
            : created > 0
              ? "PARTIAL_SUCCESS"
              : "FAILED",

        finishedAt: new Date(),

        itemsFound: results.length,
        itemsCreated: created,
        itemsFailed: failed,
      },
    });

    console.log("");
    console.log("=== COLETA CONCLUÍDA ===");
    console.log(`Encontrados: ${results.length}`);
    console.log(`Salvos: ${created}`);
    console.log(`Falhas: ${failed}`);
  } catch (error) {
    await prisma.collectorRun.update({
      where: {
        id: collectorRun.id,
      },

      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage:
          error instanceof Error
            ? error.message
            : "Erro desconhecido",
      },
    });

    throw error;
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error("Collector falhou:");
    console.error(error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });