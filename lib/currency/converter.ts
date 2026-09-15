import type {
  MarketplaceOffer,
} from "../marketplaces";

export type ExchangeRates = {
  base: "BRL";
  rates: Record<string, number>;
  updatedAt: string;
};

/**
 * Converte uma oferta para BRL sem alterar
 * o preço/moeda original do marketplace.
 */
export function convertOfferToBRL(
  offer: MarketplaceOffer,
  exchangeRates: ExchangeRates
): MarketplaceOffer {
  const currency =
    offer.currency.toUpperCase();

  // A oferta já está em reais.
  if (currency === "BRL") {
    return {
      ...offer,
      priceBRL: offer.price,
      exchangeRate: 1,
      exchangeRateUpdatedAt:
        exchangeRates.updatedAt,
    };
  }

  const rate =
    exchangeRates.rates[currency];

  // Não conhecemos essa moeda.
  if (
    !Number.isFinite(rate) ||
    rate <= 0
  ) {
    return {
      ...offer,
      priceBRL: null,
      exchangeRate: null,
      exchangeRateUpdatedAt: null,
    };
  }

  return {
    ...offer,

    priceBRL:
      Math.round(
        offer.price * rate * 100
      ) / 100,

    exchangeRate: rate,

    exchangeRateUpdatedAt:
      exchangeRates.updatedAt,
  };
}

/**
 * Converte várias ofertas e coloca primeiro
 * aquelas cujo preço em BRL é conhecido.
 */
export function convertOffersToBRL(
  offers: MarketplaceOffer[],
  exchangeRates: ExchangeRates
): MarketplaceOffer[] {
  return offers
    .map((offer) =>
      convertOfferToBRL(
        offer,
        exchangeRates
      )
    )
    .sort((a, b) => {
      if (
        a.priceBRL === null &&
        b.priceBRL === null
      ) {
        return 0;
      }

      if (a.priceBRL === null) {
        return 1;
      }

      if (b.priceBRL === null) {
        return -1;
      }

      return a.priceBRL - b.priceBRL;
    });
}