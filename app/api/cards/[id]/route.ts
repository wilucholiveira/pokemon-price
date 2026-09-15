import { NextRequest, NextResponse } from "next/server";

import { prisma } from "../../../../lib/prisma";


type TcgDexSetBrief = {
  id: string;
  cardCount?: {
    official?: number;
    total?: number;
  };
};

let tcgDexSetsCache:
  | {
      expiresAt: number;
      sets: TcgDexSetBrief[];
    }
  | null = null;

async function getTcgDexSetInfo(
  externalSetId: string
): Promise<TcgDexSetBrief | null> {
  try {
    const now = Date.now();

    if (
      !tcgDexSetsCache ||
      tcgDexSetsCache.expiresAt <= now
    ) {
      const response = await fetch(
        "https://api.tcgdex.net/v2/en/sets",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      tcgDexSetsCache = {
        expiresAt: now + 60 * 60 * 1000,
        sets: Array.isArray(data) ? data : [],
      };
    }

    return (
      tcgDexSetsCache.sets.find(
        (set) => set.id === externalSetId
      ) ?? null
    );
  } catch {
    return null;
  }
}

function buildCollectorInfo(
  cardNumber: string,
  printedNumber: string | null | undefined,
  officialSetCount: number | null
) {
  const numerator =
    printedNumber?.trim() ||
    cardNumber.trim();

  if (
    officialSetCount == null ||
    !/^\d+$/.test(numerator)
  ) {
    return {
      displayNumber: numerator,
      isSpecial: false,
    };
  }

  const denominator = String(
    officialSetCount
  ).padStart(numerator.length, "0");

  return {
    displayNumber: `${numerator}/${denominator}`,
    isSpecial:
      Number(numerator) > officialSetCount,
  };
}

function decimalToNumber(
  value: { toString(): string } | null | undefined
) {
  if (value == null) {
    return null;
  }

  return Number(value.toString());
}

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } = await context.params;

    const card = await prisma.card.findUnique({
      where: {
        id,
      },

      include: {
        set: {
          include: {
            translations: true,
          },
        },

        translations: true,

        products: {
          where: {
            active: true,
          },

          include: {
            offers: {
              where: {
                available: true,
              },

              include: {
                store: true,
              },

              orderBy: [
                {
                  totalPriceBrl: "asc",
                },
                {
                  totalPrice: "asc",
                },
              ],
            },
          },

          orderBy: [
            {
              language: "asc",
            },
            {
              condition: "asc",
            },
          ],
        },
      },
    });

    if (!card) {
      return NextResponse.json(
        {
          success: false,
          error: "Carta não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    const remoteSet = card.set.externalId
      ? await getTcgDexSetInfo(card.set.externalId)
      : null;

    const officialSetCount =
      remoteSet?.cardCount?.official ?? null;

    const totalSetCount =
      remoteSet?.cardCount?.total ?? null;

    const collectorInfo = buildCollectorInfo(
      card.number,
      card.printedNumber,
      officialSetCount
    );

    const ptBrTranslation =
      card.translations.find(
        (translation) =>
          translation.language === "PT_BR"
      );

    const ptBrSetTranslation =
      card.set.translations.find(
        (translation) =>
          translation.language === "PT_BR"
      );

    const products = card.products.map(
      (product) => {
        const offers = product.offers.map(
          (offer) => ({
            id: offer.id,

            store: {
              id: offer.store.id,
              name: offer.store.name,
              slug: offer.store.slug,
              type: offer.store.type,
              country: offer.store.country,
              marketRegion:
                offer.store.marketRegion,
            },

            externalId: offer.externalId,
            title: offer.externalTitle,
            sellerName: offer.sellerName,

            price:
              decimalToNumber(offer.price),

            shippingPrice:
              decimalToNumber(
                offer.shippingPrice
              ),

            totalPrice:
              decimalToNumber(
                offer.totalPrice
              ),

            currency: offer.currency,

            priceBrl:
              decimalToNumber(
                offer.priceBrl
              ),

            shippingPriceBrl:
              decimalToNumber(
                offer.shippingPriceBrl
              ),

            totalPriceBrl:
              decimalToNumber(
                offer.totalPriceBrl
              ),

            itemLocationCountry:
              offer.itemLocationCountry,

            shipsToBrazil:
              offer.shipsToBrazil,

            stockQuantity:
              offer.stockQuantity,

            matchConfidence:
              decimalToNumber(
                offer.matchConfidence
              ),

            url: offer.url,

            firstSeenAt:
              offer.firstSeenAt,

            lastSeenAt:
              offer.lastSeenAt,
          })
        );

        const bestOffer =
          offers.find(
            (offer) =>
              offer.totalPriceBrl != null
          ) ??
          offers[0] ??
          null;

        return {
          id: product.id,
          name: product.name,
          slug: product.slug,
          productType:
            product.productType,

          language: product.language,
          condition: product.condition,

          grading: {
            isGraded: product.isGraded,
            company:
              product.gradingCompany,
            grade: product.grade,
          },

          offerCount: offers.length,
          bestOffer,
          offers,
        };
      }
    );

    const allOffers = products.flatMap(
      (product) => product.offers
    );

    const bestOfferBrl =
      allOffers
        .filter(
          (offer) =>
            offer.totalPriceBrl != null
        )
        .sort(
          (a, b) =>
            (a.totalPriceBrl ?? Infinity) -
            (b.totalPriceBrl ?? Infinity)
        )[0] ?? null;

    return NextResponse.json({
      success: true,

      card: {
        id: card.id,
        externalId: card.externalId,

        name:
          ptBrTranslation?.name ??
          card.name,

        originalName: card.name,

        number: card.number,
        printedNumber:
          card.printedNumber,

        displayNumber:
          collectorInfo.displayNumber,

        officialSetCount,
        totalSetCount,

        isSpecial:
          collectorInfo.isSpecial,

        rarity:
          ptBrTranslation?.rarity ??
          card.rarity,

        supertype: card.supertype,
        hp: card.hp,
        artist: card.artist,

        imageSmall:
          ptBrTranslation?.imageSmall ??
          card.imageSmall,

        imageLarge:
          ptBrTranslation?.imageLarge ??
          card.imageLarge,

        releaseDate:
          card.releaseDate,

        set: {
          id: card.set.id,
          externalId:
            card.set.externalId,

          name:
            ptBrSetTranslation?.name ??
            card.set.name,

          originalName:
            card.set.name,

          code: card.set.code,
          series: card.set.series,

          releaseDate:
            card.set.releaseDate,

          logoUrl: card.set.logoUrl,
          symbolUrl:
            card.set.symbolUrl,
        },

        translations:
          card.translations.map(
            (translation) => ({
              language:
                translation.language,
              name:
                translation.name,
              rarity:
                translation.rarity,
              imageSmall:
                translation.imageSmall,
              imageLarge:
                translation.imageLarge,
            })
          ),

        pricing: {
          productCount:
            products.length,

          offerCount:
            allOffers.length,

          bestOfferBrl,

          hasOffers:
            allOffers.length > 0,
        },

        products,
      },
    });
  } catch (error) {
    console.error(
      "Erro em /api/cards/[id]:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Erro interno ao buscar carta.",
      },
      {
        status: 500,
      }
    );
  }
}
