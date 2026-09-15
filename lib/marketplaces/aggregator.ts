import {
  getCardTraderOffers,
} from "../cardtrader/client";

import {
  searchEbayCardOffers,
} from "../ebay/search";

import {
  getExchangeRatesToBRL,
} from "../currency/rates";

import {
  convertOffersToBRL,
  type ExchangeRates,
} from "../currency/converter";

import {
  MARKETPLACES,
  createCardTraderMarketplaceResult,
  mergeMarketplaceOffers,
} from "./index";

import {
  withMarketplaceTimeout,
} from "./timeout";

import type {
  MarketplaceSearchResult,
} from "./types";

const MARKETPLACE_TIMEOUT_MS = 8000;

export type MarketplaceAggregatorInput = {
  cardName: string;

  setName: string;
  setCode: string | null;

  cardNumber: string;

  rarity?: string | null;
  language?: string | null;

  limit?: number;
};

export type MarketplaceAggregatorResult = {
  results: MarketplaceSearchResult[];

  offers: ReturnType<
    typeof mergeMarketplaceOffers
  >;

  offerCount: number;

  fetchedAt: string;
};

function getPublicMarketplaceError(
  marketplaceName: string
): string {
  return `${marketplaceName} temporariamente indisponível.`;
}

/**
 * Obtém as taxas de câmbio.
 *
 * Se o serviço externo estiver indisponível,
 * BRL continua funcionando normalmente.
 */
async function getSafeExchangeRates(): Promise<ExchangeRates> {
  try {
    return await getExchangeRatesToBRL();
  } catch (error) {
    console.error(
      "Erro ao obter taxas de câmbio:",
      error
    );

    return {
      base: "BRL",

      rates: {
        BRL: 1,
      },

      updatedAt:
        new Date().toISOString(),
    };
  }
}

/**
 * Busca ofertas nos marketplaces,
 * converte os preços para BRL e devolve
 * uma lista única ordenada.
 *
 * Cada marketplace possui timeout próprio.
 * Uma falha individual não derruba
 * todo o comparador.
 */
export async function searchMarketplaceOffers(
  input: MarketplaceAggregatorInput
): Promise<MarketplaceAggregatorResult> {
  const limit = Math.min(
    Math.max(
      Math.floor(input.limit ?? 100),
      1
    ),
    200
  );

  const exchangeRates =
    await getSafeExchangeRates();

  const results: MarketplaceSearchResult[] =
    [];

  /*
   * CARDTRADER
   */
  if (MARKETPLACES.cardtrader.enabled) {
    try {
      const cardTrader =
        await withMarketplaceTimeout(
          getCardTraderOffers({
            cardName:
              input.cardName,

            setName:
              input.setName,

            setCode:
              input.setCode,

            cardNumber:
              input.cardNumber,

            language:
              input.language ?? null,

            limit,
          }),

          "CardTrader",

          MARKETPLACE_TIMEOUT_MS
        );

      const normalized =
        createCardTraderMarketplaceResult(
          cardTrader.offers
        );

      const convertedOffers =
        convertOffersToBRL(
          normalized.offers,
          exchangeRates
        );

      results.push({
        ...normalized,

        status: "active",
        error: null,

        offers:
          convertedOffers,

        total:
          convertedOffers.length,
      });
    } catch (error) {
      console.error(
        "Erro ao buscar CardTrader:",
        error
      );

      results.push({
        marketplace:
          "cardtrader",

        marketplaceName:
          "CardTrader",

        status:
          "error",

        error:
          getPublicMarketplaceError(
            "CardTrader"
          ),

        offers: [],
        total: 0,

        fetchedAt:
          new Date().toISOString(),
      });
    }
  } else {
    results.push({
      marketplace:
        "cardtrader",

      marketplaceName:
        "CardTrader",

      status:
        "disabled",

      error:
        null,

      offers: [],
      total: 0,

      fetchedAt:
        new Date().toISOString(),
    });
  }

  /*
   * EBAY
   */
  if (MARKETPLACES.ebay.enabled) {
    try {
      const ebay =
        await withMarketplaceTimeout(
          searchEbayCardOffers(
            {
              cardName:
                input.cardName,

              cardNumber:
                input.cardNumber,

              setName:
                input.setName,
            },

            limit
          ),

          "eBay",

          MARKETPLACE_TIMEOUT_MS
        );

      const convertedOffers =
        convertOffersToBRL(
          ebay.offers,
          exchangeRates
        );

      results.push({
        marketplace:
          "ebay",

        marketplaceName:
          "eBay",

        status:
          "active",

        error:
          null,

        offers:
          convertedOffers,

        total:
          convertedOffers.length,

        fetchedAt:
          new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        "Erro ao buscar eBay:",
        error
      );

      results.push({
        marketplace:
          "ebay",

        marketplaceName:
          "eBay",

        status:
          "error",

        error:
          getPublicMarketplaceError(
            "eBay"
          ),

        offers: [],
        total: 0,

        fetchedAt:
          new Date().toISOString(),
      });
    }
  } else {
    results.push({
      marketplace:
        "ebay",

      marketplaceName:
        "eBay",

      status:
        "disabled",

      error:
        null,

      offers: [],
      total: 0,

      fetchedAt:
        new Date().toISOString(),
    });
  }

  const offers =
    mergeMarketplaceOffers(results);

  return {
    results,

    offers,

    offerCount:
      offers.length,

    fetchedAt:
      new Date().toISOString(),
  };
}