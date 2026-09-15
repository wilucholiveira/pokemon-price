import {
  getEbayAccessToken,
  getEbayApiBaseUrl,
} from "./client";

import {
  buildEbayCardQuery,
  evaluateEbayListingMatch,
  type EbayCardMatchInput,
} from "./matching";

import {
  normalizeEbayOffers,
  type EbayItemSummary,
} from "../marketplaces";

import type {
  MarketplaceOffer,
} from "../marketplaces";

export type EbayCardSearchResult = {
  query: string;

  totalReceived: number;
  totalMatched: number;
  totalRejected: number;

  offers: MarketplaceOffer[];
};

type EbayBrowseResponse = {
  total?: number;
  itemSummaries?: EbayItemSummary[];
};

export async function searchEbayCardOffers(
  input: EbayCardMatchInput,
  limit = 50
): Promise<EbayCardSearchResult> {
  const token = await getEbayAccessToken();

  const query = buildEbayCardQuery(input);

  const safeLimit = Math.min(
    Math.max(Math.floor(limit), 1),
    200
  );

  const url = new URL(
    `${getEbayApiBaseUrl()}/buy/browse/v1/item_summary/search`
  );

  url.searchParams.set("q", query);
  url.searchParams.set(
    "limit",
    String(safeLimit)
  );

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
    },

    cache: "no-store",
  });

  const data =
    (await response.json()) as EbayBrowseResponse;

  if (!response.ok) {
    throw new Error(
      `eBay Browse API HTTP ${response.status}: ${JSON.stringify(
        data
      )}`
    );
  }

  const items = Array.isArray(
    data.itemSummaries
  )
    ? data.itemSummaries
    : [];

  const matchedItems = items.filter(
    (item) => {
      if (!item.title) {
        return false;
      }

      return evaluateEbayListingMatch(
        {
          title: item.title,
        },
        input
      ).accepted;
    }
  );

  const offers =
    normalizeEbayOffers(matchedItems).sort(
      (a, b) => {
        if (a.currency !== b.currency) {
          return a.currency.localeCompare(
            b.currency
          );
        }

        return a.price - b.price;
      }
    );

  return {
    query,

    totalReceived: items.length,
    totalMatched: offers.length,
    totalRejected:
      items.length - matchedItems.length,

    offers,
  };
}