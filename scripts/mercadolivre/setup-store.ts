import "dotenv/config";

import { prisma } from "../../lib/prisma";

async function main() {
  const store = await prisma.store.upsert({
    where: {
      slug: "mercado-livre",
    },

    update: {
      name: "Mercado Livre",
      type: "MARKETPLACE",
      country: "BR",
      marketRegion: "BRAZIL",
      baseUrl: "https://www.mercadolivre.com.br",
      active: true,
    },

    create: {
      name: "Mercado Livre",
      slug: "mercado-livre",
      type: "MARKETPLACE",
      country: "BR",
      marketRegion: "BRAZIL",
      baseUrl: "https://www.mercadolivre.com.br",
      active: true,
    },
  });

  console.log("Mercado Livre configurado.");
  console.log("Store ID:", store.id);
  console.log("Nome:", store.name);
  console.log("Slug:", store.slug);
  console.log("Ativo:", store.active);
}

main()
  .catch((error) => {
    console.error("Erro ao configurar Mercado Livre:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });