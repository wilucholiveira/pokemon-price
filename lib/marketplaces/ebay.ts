import type {
  MarketplaceOffer,
  MarketplaceSearchResult,
} from "./types";

export type EbayItemSummary = {
  itemId?: string;
  title?: string;

  price?: {
    value?: string;
    currency?: string;
  };

  image?: {
    imageUrl?: string;
  };

  itemWebUrl?: string;

  condition?: string;
  conditionId?: string;

  seller?: {
    username?: string;
  };

  itemLocation?: {
    country?: string;
  };

  buyingOptions?: string[];
};

export function normalizeEbayOffer(
  item: EbayItemSummary
): MarketplaceOffer | null {
  const price = Number(item.price?.value);
  
  const currency =
  item.price?.currency?.toUpperCase() ?? "USD";

  if (
    !item.itemId ||
    !item.itemWebUrl ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    return null;
  }

  return {
    id: `ebay-${item.itemId}`,

    marketplace: "ebay",
    marketplaceName: "eBay",

    seller:
      item.seller?.username ?? null,

    sellerCountry:
      item.itemLocation?.country ?? null,

    price,
    currency,

priceBRL:
  currency === "BRL"
    ? price
    : null,

exchangeRate:
  currency === "BRL"
    ? 1
    : null,

exchangeRateUpdatedAt:
  currency === "BRL"
    ? new Date().toISOString()
    : null,

    condition:
      item.condition ?? null,

    // A Browse API normalmente não fornece
    // o idioma da carta como campo confiável.
    language: null,

    // A quantidade disponível não é necessária
    // para nosso comparador neste momento.
    quantity: null,

    url: item.itemWebUrl,

    graded: isLikelyGraded(item.title),

    title:
      item.title ?? null,

    imageUrl:
      item.image?.imageUrl ?? null,
  };
}

export function normalizeEbayOffers(
  items: EbayItemSummary[]
): MarketplaceOffer[] {
  return items
    .map(normalizeEbayOffer)
    .filter(
      (offer): offer is MarketplaceOffer =>
        offer !== null
    );
}

export function createEbayMarketplaceResult(
  items: EbayItemSummary[]
): MarketplaceSearchResult {
  const offers = normalizeEbayOffers(items);

  return {
    marketplace: "ebay",
    marketplaceName: "eBay",

    status: "active",
    error: null,

    offers,

    total: offers.length,

    fetchedAt: new Date().toISOString(),
  };
}

function isLikelyGraded(
  title?: string
): boolean {
  if (!title) {
    return false;
  }

  const normalized = title.toLowerCase();

  return [
    "psa ",
    "bgs ",
    "cgc ",
    "sgc ",
    "ace graded",
    "graded ",
  ].some((term) =>
    normalized.includes(term)
  );
}