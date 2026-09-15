import "dotenv/config";

import { mercadoLivreRequest } from "../../lib/mercadolivre/client";

const PRODUCT_ID = "MLB57437580";

async function main() {
  console.log("=== TESTE PRODUCT DETAIL ===");
  console.log("Product ID:", PRODUCT_ID);

  const product =
    await mercadoLivreRequest<Record<string, unknown>>(
      `/products/${PRODUCT_ID}`
    );

  console.log("");
  console.log("=== CHAVES ===");
  console.log(Object.keys(product));

  console.log("");
  console.log("=== DADOS PRINCIPAIS ===");
  console.log("ID:", (product as any).id);
  console.log("Nome:", (product as any).name);
  console.log("Status:", (product as any).status);
  console.log("Domínio:", (product as any).domain_id);
  console.log("Parent ID:", (product as any).parent_id);
  console.log("Children IDs:", (product as any).children_ids);

  console.log("");
  console.log("=== SETTINGS ===");
  console.log(
    JSON.stringify((product as any).settings, null, 2)
  );
}

main()
  .catch((error) => {
    console.error("");
    console.error("Teste product detail falhou:");
    console.error(error);
    process.exit(1);
  });