import type {
  MarketplaceId,
  MarketplaceOffer,
  MarketplaceSearchResult,
  MarketplaceStatus,
} from "./types";

export type {
  MarketplaceId,
  MarketplaceOffer,
  MarketplaceSearchResult,
  MarketplaceStatus,
} from "./types";

export {
  normalizeCardTraderOffer,
  normalizeCardTraderOffers,
  createCardTraderMarketplaceResult,
} from "./cardtrader";

export {
  normalizeEbayOffer,
  normalizeEbayOffers,
  createEbayMarketplaceResult,
} from "./ebay";

export type {
  EbayItemSummary,
} from "./ebay";

/**
 * Informações dos marketplaces suportados
 * pelo Pokémon Price.
 */
export const MARKETPLACES = {
  cardtrader: {
    id: "cardtrader",
    name: "CardTrader",
    enabled: true,
  },

  ebay: {
    id: "ebay",
    name: "eBay",

    // A estrutura já está preparada.
    // Ativaremos após aprovação da Browse API.
    enabled: false,
  },
} satisfies Record<
  MarketplaceId,
  {
    id: MarketplaceId;
    name: string;
    enabled: boolean;
  }
>;

/**
 * Retorna apenas marketplaces atualmente ativos.
 */
export function getEnabledMarketplaces() {
  return Object.values(MARKETPLACES).filter(
    (marketplace) => marketplace.enabled
  );
}

/**
 * Junta resultados de vários marketplaces
 * em uma única lista de ofertas.
 */
export function mergeMarketplaceOffers(
  results: MarketplaceSearchResult[]
): MarketplaceOffer[] {
  return results
    .flatMap((result) => result.offers)
    .sort((a, b) => {
      const priceA = a.priceBRL;
      const priceB = b.priceBRL;

      // Ofertas sem conversão ficam no final.
      if (priceA === null && priceB === null) {
        return 0;
      }

      if (priceA === null) {
        return 1;
      }

      if (priceB === null) {
        return -1;
      }

      return priceA - priceB;
    });
}

/**
 * Retorna o menor preço entre as ofertas.
 *
 * IMPORTANTE:
 * Só compara diretamente ofertas na mesma moeda.
 * Conversão cambial será tratada separadamente.
 */
/**
 * Retorna a oferta com menor preço convertido para BRL.
 */
export function getLowestMarketplaceOffer(
  offers: MarketplaceOffer[]
): MarketplaceOffer | null {
  const validOffers = offers.filter(
    (offer) =>
      offer.priceBRL !== null &&
      Number.isFinite(offer.priceBRL)
  );

  if (validOffers.length === 0) {
    return null;
  }

  return validOffers.reduce(
    (lowest, current) =>
      (current.priceBRL ?? Infinity) <
      (lowest.priceBRL ?? Infinity)
        ? current
        : lowest
  );
}