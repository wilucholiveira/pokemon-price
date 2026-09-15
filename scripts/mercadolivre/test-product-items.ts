import "dotenv/config";

import {
  searchMercadoLivreCatalogProducts,
} from "../../lib/mercadolivre/products";

import {
  mercadoLivreRequest,
} from "../../lib/mercadolivre/client";

type ProductItem = {
  item_id?: string;
  category_id?: string;
  seller_id?: number;

  price?: number;
  currency_id?: string;

  available_quantity?: number;
  sold_quantity?: number;

  shipping?: {
    free_shipping?: boolean;
    logistic_type?: string;
    mode?: string;
  };
};

type ProductItemsResponse = {
  paging?: {
    total?: number;
    offset?: number;
    limit?: number;
  };

  results?: ProductItem[];
};

async function main() {
  console.log(
    "=== TESTE PRODUTO → PUBLICAÇÕES ==="
  );

  const search =
    await searchMercadoLivreCatalogProducts({
      query: "charizard",
      limit: 10,
    });

  const product = search.products[0];

  if (!product) {
    throw new Error(
      "Nenhum produto de catálogo encontrado."
    );
  }

  const productId =
    product.catalog_product_id ??
    product.id;

  console.log("");
  console.log("Produto:", product.name);
  console.log("Product ID:", productId);

  console.log("");
  console.log(
    "Buscando publicações associadas..."
  );

  const response =
    await mercadoLivreRequest<ProductItemsResponse>(
      `/products/${productId}/items`
    );

  const items = response.results ?? [];

  console.log("");
  console.log(
    "Total de publicações:",
    response.paging?.total ?? items.length
  );

  console.log(
    "Publicações retornadas:",
    items.length
  );

  console.log("");
  console.log("=== PUBLICAÇÕES ===");

  for (const [index, item] of items
    .slice(0, 10)
    .entries()) {

    console.log("");
    console.log(`#${index + 1}`);

    console.log(
      "Item ID:",
      item.item_id ?? "-"
    );

    console.log(
      "Seller ID:",
      item.seller_id ?? "-"
    );

    console.log(
      "Preço:",
      item.price ?? "-"
    );

    console.log(
      "Moeda:",
      item.currency_id ?? "-"
    );

    console.log(
      "Quantidade disponível:",
      item.available_quantity ?? "-"
    );

    console.log(
      "Frete grátis:",
      item.shipping?.free_shipping
        ? "SIM"
        : "NÃO"
    );
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error(
      "Teste produto → publicações falhou:"
    );

    console.error(error);

    process.exit(1);
  });