import { NextResponse } from "next/server";

import {
  buildEbayCardQuery,
  evaluateEbayListingMatch,
} from "../../../../lib/ebay/matching";

import {
  normalizeEbayOffers,
  type EbayItemSummary,
} from "../../../../lib/marketplaces";

export const dynamic = "force-dynamic";

export async function GET() {
  const card = {
    cardName: "Charizard ex",
    setName: "Obsidian Flames",
    cardNumber: "223/197",
  };

  const simulatedItems: EbayItemSummary[] = [
    {
      itemId: "1001",
      title:
        "Pokemon Charizard ex 223/197 Obsidian Flames NM",
      price: {
        value: "79.99",
        currency: "USD",
      },
      condition: "Near Mint or Better",
      seller: {
        username: "seller_one",
      },
      itemLocation: {
        country: "US",
      },
      itemWebUrl:
        "https://www.ebay.com/itm/1001",
      image: {
        imageUrl:
          "https://example.com/charizard-1.jpg",
      },
    },

    {
      itemId: "1002",
      title:
        "Charizard ex 223/197 Pokemon Special Illustration Rare",
      price: {
        value: "84.50",
        currency: "USD",
      },
      condition: "Ungraded",
      seller: {
        username: "seller_two",
      },
      itemLocation: {
        country: "US",
      },
      itemWebUrl:
        "https://www.ebay.com/itm/1002",
    },

    {
      itemId: "1003",
      title:
        "Pokemon Charizard ex 125/197 Obsidian Flames",
      price: {
        value: "12.00",
        currency: "USD",
      },
      itemWebUrl:
        "https://www.ebay.com/itm/1003",
    },

    {
      itemId: "1004",
      title:
        "Pokemon Charizard ex 223/197 Proxy Card",
      price: {
        value: "5.99",
        currency: "USD",
      },
      itemWebUrl:
        "https://www.ebay.com/itm/1004",
    },

    {
      itemId: "1005",
      title:
        "Pokemon Charizard ex 223/197 PSA 10",
      price: {
        value: "299.99",
        currency: "USD",
      },
      condition: "Graded",
      seller: {
        username: "graded_cards",
      },
      itemLocation: {
        country: "US",
      },
      itemWebUrl:
        "https://www.ebay.com/itm/1005",
    },
  ];

  const evaluated = simulatedItems.map(
    (item) => ({
      item,
      match: evaluateEbayListingMatch(
        {
          title: item.title ?? "",
        },
        card
      ),
    })
  );

  const matchedItems = evaluated
    .filter(({ match }) => match.accepted)
    .map(({ item }) => item);

  const offers = normalizeEbayOffers(
    matchedItems
  ).sort((a, b) => a.price - b.price);

  return NextResponse.json({
    success: true,

    query: buildEbayCardQuery(card),

    summary: {
      received: simulatedItems.length,
      matched: matchedItems.length,
      rejected:
        simulatedItems.length -
        matchedItems.length,
      normalizedOffers: offers.length,
    },

    evaluation: evaluated.map(
      ({ item, match }) => ({
        title: item.title,
        accepted: match.accepted,
        score: match.score,
        reasons: match.reasons,
      })
    ),

    offers,
  });
}