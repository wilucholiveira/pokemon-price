export type MarketplaceId =
  | "cardtrader"
  | "ebay";

export type MarketplaceOffer = {
  /**
   * Identificador único da oferta dentro do marketplace.
   */
  id: string;

  /**
   * Marketplace de origem.
   */
  marketplace: MarketplaceId;

  /**
   * Nome amigável exibido no frontend.
   */
  marketplaceName: string;

  /**
   * Vendedor da oferta.
   */
  seller: string | null;

  /**
   * País do vendedor, quando disponível.
   */
  sellerCountry: string | null;

  /**
   * Preço da oferta na moeda original.
   */
  price: number;

  /**
   * Código ISO da moeda.
   * Exemplos: BRL, USD, EUR.
   */
  currency: string;

  /**
 * Preço convertido para BRL para permitir
 * comparação entre marketplaces.
 *
 * null = conversão ainda não realizada.
 */
priceBRL: number | null;

/**
 * Taxa utilizada na conversão para BRL.
 *
 * Exemplo:
 * USD → BRL = 5.25
 */
exchangeRate: number | null;

/**
 * Momento em que a taxa de câmbio utilizada
 * foi obtida.
 */
exchangeRateUpdatedAt: string | null;
  
  /**
   * Condição informada pelo marketplace.
   * Exemplos: NM, EX, GD, LP.
   */
  condition: string | null;

  /**
   * Idioma da carta.
   */
  language: string | null;

  /**
   * Quantidade disponível.
   */
  quantity: number | null;

  /**
   * Link direto para a oferta ou página correspondente.
   */
  url: string;

  /**
   * Indica se a carta é graduada.
   */
  graded: boolean;

  /**
   * Título original da oferta.
   *
   * Será especialmente útil para o eBay.
   */
  title: string | null;

  /**
   * Imagem fornecida pelo marketplace.
   *
   * Também será útil para validar anúncios do eBay.
   */
  imageUrl: string | null;
};

export type MarketplaceStatus =
  | "active"
  | "disabled"
  | "error";

export type MarketplaceSearchResult = {
  marketplace: MarketplaceId;
  marketplaceName: string;

  status: MarketplaceStatus;
  error: string | null;

  offers: MarketplaceOffer[];
  total: number;

  fetchedAt: string;
};