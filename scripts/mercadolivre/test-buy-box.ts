import "dotenv/config";

import { mercadoLivreRequest } from "../../lib/mercadolivre/client";

const PRODUCT_ID = "MLB57437580";

async function main() {
  console.log("=== TESTE BUY BOX ===");
  console.log("Product ID:", PRODUCT_ID);

  const product =
    await mercadoLivreRequest<Record<string, unknown>>(
      `/products/${PRODUCT_ID}`
    );

  const buyBoxWinner = (product as any).buy_box_winner;

  console.log("");
  console.log("=== BUY BOX WINNER ===");

  if (!buyBoxWinner) {
    console.log("Nenhum buy_box_winner retornado.");
    return;
  }

  console.log(JSON.stringify(buyBoxWinner, null, 2));
}

main()
  .catch((error) => {
    console.error("");
    console.error("Teste buy box falhou:");
    console.error(error);
    process.exit(1);
  });