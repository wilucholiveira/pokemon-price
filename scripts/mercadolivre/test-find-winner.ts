import "dotenv/config";

import {
  searchMercadoLivreCatalogProducts,
  getMercadoLivreCatalogProduct,
} from "../../lib/mercadolivre/products";

import {
  mercadoLivreRequest,
} from "../../lib/mercadolivre/client";

type BuyBoxWinner = {
  item_id?: string;
  category_id?: string;
  seller_id?: number;
  price?: number;
  currency_id?: string;
  available_quantity?: number;

  shipping?: {
    free_shipping?: boolean;
    logistic_type?: string;
    mode?: string;
  };
};

type ProductDetail = {
  id?: string;
  name?: string;
  buy_box_winner?: BuyBoxWinner | null;
};

type MercadoLivreItem = {
  id?: string;
  title?: string;
  seller_id?: number;
  price?: number;
  currency_id?: string;
  available_quantity?: number;
  catalog_product_id?: string;
  permalink?: string;
};

async function main() {
  console.log("=== BUSCA DE PRODUTO COM WINNER ===");

  const search =
    await searchMercadoLivreCatalogProducts({
      query: "pokemon tcg",
      limit: 30,
    });

  console.log(
    "Produtos candidatos:",
    search.products.length
  );

  for (const product of search.products) {
    const productId =
      product.catalog_product_id ??
      product.id;

    console.log("");
    console.log(
      "Verificando:",
      product.name ?? productId
    );

    const detail =
      await getMercadoLivreCatalogProduct(
        productId
      ) as ProductDetail;

    const winner = detail.buy_box_winner;

    if (!winner?.item_id) {
      console.log("Sem buy_box_winner.");
      continue;
    }

    console.log("");
    console.log("==============================");
    console.log("WINNER ENCONTRADO");
    console.log("==============================");

    console.log("Produto:", detail.name);
    console.log("Product ID:", productId);
    console.log("Item ID:", winner.item_id);
    console.log("Preço winner:", winner.price);
    console.log("Moeda:", winner.currency_id);
    console.log(
      "Quantidade:",
      winner.available_quantity ?? "-"
    );

    console.log("");
    console.log("Consultando item completo...");

    const item =
      await mercadoLivreRequest<MercadoLivreItem>(
        `/items/${winner.item_id}`
      );

    console.log("");
    console.log("=== ITEM ===");
    console.log("ID:", item.id);
    console.log("Título:", item.title);
    console.log("Seller:", item.seller_id);
    console.log("Preço:", item.price);
    console.log("Moeda:", item.currency_id);
    console.log(
      "Estoque:",
      item.available_quantity
    );
    console.log(
      "Catalog Product:",
      item.catalog_product_id
    );
    console.log("URL:", item.permalink);

    return;
  }

  console.log("");
  console.log(
    "Nenhum buy_box_winner encontrado nos produtos testados."
  );
}

main()
  .catch((error) => {
    console.error("");
    console.error("Teste falhou:");
    console.error(error);
    process.exit(1);
  });