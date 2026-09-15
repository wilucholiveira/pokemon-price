import type { CardTraderOffer } from "../cardtrader/client";
import type {
  MarketplaceOffer,
  MarketplaceSearchResult,
} from "./types";

/**
 * Converte uma oferta nativa da CardTrader
 * para o formato universal do Pokémon Price.
 */
export function normalizeCardTraderOffer(
  offer: CardTraderOffer
): MarketplaceOffer {
  return {
    id: `cardtrader-${offer.id}`,

    marketplace: "cardtrader",
    marketplaceName: "CardTrader",

    seller: offer.seller,
    sellerCountry: offer.sellerCountry,

    price: offer.price,
currency: offer.currency,

priceBRL:
  offer.currency.toUpperCase() === "BRL"
    ? offer.price
    : null,

exchangeRate:
  offer.currency.toUpperCase() === "BRL"
    ? 1
    : null,

exchangeRateUpdatedAt:
  offer.currency.toUpperCase() === "BRL"
    ? new Date().toISOString()
    : null,

    condition: offer.condition,
    language: offer.language,

    quantity: offer.quantity,

    url: offer.url,

    graded: offer.graded,

    // A CardTrader não fornece esses dados
    // no formato que estamos utilizando atualmente.
    title: null,
    imageUrl: null,
  };
}

/**
 * Converte várias ofertas CardTrader.
 */
export function normalizeCardTraderOffers(
  offers: CardTraderOffer[]
): MarketplaceOffer[] {
  return offers.map(normalizeCardTraderOffer);
}

/**
 * Cria o resultado padronizado de marketplace.
 */
export function createCardTraderMarketplaceResult(
  offers: CardTraderOffer[]
): MarketplaceSearchResult {
  const normalizedOffers =
    normalizeCardTraderOffers(offers);

  return {
    marketplace: "cardtrader",
    marketplaceName: "CardTrader",

    status: "active",
    error: null,

    offers: normalizedOffers,

    total: normalizedOffers.length,

    fetchedAt: new Date().toISOString(),
  };
}