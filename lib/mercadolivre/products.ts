import { mercadoLivreRequest } from "./client";

const DEFAULT_SITE_ID = "MLB";
const DEFAULT_DOMAIN_ID = "MLB-TRADING_CARD_GAMES";

export type MercadoLivreCatalogProduct = {
  id: string;
  catalog_product_id?: string;
  status?: string;
  domain_id?: string;
  name?: string;

  parent_id?: string | null;
  children_ids?: string[];

  settings?: {
    content?: string;
    listing_strategy?: string;
    exclusive?: boolean;
  };

  attributes?: Array<{
    id?: string;
    name?: string;
    value_id?: string | null;
    value_name?: string | null;
    values?: Array<{
      id?: string | null;
      name?: string | null;
    }>;
  }>;
};

type MercadoLivreProductSearchResponse = {
  keywords?: string;
  query_type?: string;

  paging?: {
    total?: number;
    offset?: number;
    limit?: number;
  };

  results?: MercadoLivreCatalogProduct[];
};

export type SearchCatalogProductsOptions = {
  query: string;

  siteId?: string;
  domainId?: string;

  limit?: number;
  offset?: number;
};

/**
 * Busca produtos no catálogo do Mercado Livre.
 *
 * Por padrão, restringimos ao domínio de Trading Card Games
 * para reduzir falsos positivos como brinquedos e pelúcias.
 */
export async function searchMercadoLivreCatalogProducts(
  options: SearchCatalogProductsOptions
) {
  const {
    query,
    siteId = DEFAULT_SITE_ID,
    domainId = DEFAULT_DOMAIN_ID,
    limit = 20,
    offset = 0,
  } = options;

  if (!query.trim()) {
    throw new Error("A consulta do Mercado Livre não pode ser vazia.");
  }

  const params = new URLSearchParams({
    status: "active",
    site_id: siteId,
    q: query.trim(),
    domain_id: domainId,
    limit: String(limit),
    offset: String(offset),
  });

  const response =
    await mercadoLivreRequest<MercadoLivreProductSearchResponse>(
      `/products/search?${params.toString()}`
    );

  return {
    query,
    siteId,
    domainId,

    total: response.paging?.total ?? 0,
    offset: response.paging?.offset ?? offset,
    limit: response.paging?.limit ?? limit,

    products: response.results ?? [],
  };
}

/**
 * Busca o detalhe de um produto específico do catálogo.
 */
export async function getMercadoLivreCatalogProduct(
  productId: string
): Promise<MercadoLivreCatalogProduct> {
  if (!productId.trim()) {
    throw new Error("productId do Mercado Livre não pode ser vazio.");
  }

  return mercadoLivreRequest<MercadoLivreCatalogProduct>(
    `/products/${encodeURIComponent(productId)}`
  );
}