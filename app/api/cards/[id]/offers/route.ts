import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  prisma,
} from "../../../../../lib/prisma";

import {
  searchMarketplaceOffers,
} from "../../../../../lib/marketplaces/aggregator";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const card =
      await prisma.card.findUnique({
        where: { id },

        include: {
          set: {
            include: {
              translations: true,
            },
          },

          translations: true,
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

    const preferredCardTranslation =
      card.translations.find(
        (translation) =>
          translation.language === "PT_BR"
      );

    const preferredSetTranslation =
      card.set.translations.find(
        (translation) =>
          translation.language === "PT_BR"
      );

    const searchParams =
      request.nextUrl.searchParams;

    const language =
      searchParams
        .get("language")
        ?.trim() || null;

    const requestedLimit = Number(
      searchParams.get("limit") ?? "100"
    );

    const limit =
      Number.isFinite(requestedLimit) &&
      requestedLimit > 0
        ? Math.min(
            Math.floor(requestedLimit),
            200
          )
        : 100;

    /*
     * AGREGADOR MULTILOJA
     *
     * A rota não precisa mais conhecer
     * os detalhes de cada marketplace.
     */
    const marketplaces =
      await searchMarketplaceOffers({
        cardName: card.name,

        setName: card.set.name,
        setCode: card.set.code,

        cardNumber: card.number,

        rarity: card.rarity,
        language,

        limit,
      });

    /*
     * Compatibilidade temporária.
     *
     * O frontend antigo ainda pode consultar
     * sources.cardTrader.
     *
     * Pegamos os dados já normalizados do
     * resultado do agregador.
     */
    const cardTraderResult =
      marketplaces.results.find(
        (result) =>
          result.marketplace ===
          "cardtrader"
      );

    return NextResponse.json({
      success: true,

      card: {
        id: card.id,

        externalId:
          card.externalId,

        name:
          preferredCardTranslation?.name ??
          card.name,

        originalName:
          card.name,

        number:
          card.number,

        rarity:
          preferredCardTranslation?.rarity ??
          card.rarity,

        image:
          preferredCardTranslation
            ?.imageSmall ??
          card.imageSmall,

        imageLarge:
          preferredCardTranslation
            ?.imageLarge ??
          card.imageLarge,

        set: {
          id:
            card.set.id,

          code:
            card.set.code,

          name:
            preferredSetTranslation?.name ??
            card.set.name,

          originalName:
            card.set.name,
        },
      },

      /*
       * NOVO FORMATO PRINCIPAL
       */
      marketplaces: {
        results:
          marketplaces.results,

        offerCount:
          marketplaces.offerCount,

        offers:
          marketplaces.offers,

        fetchedAt:
          marketplaces.fetchedAt,
      },

      /*
       * FORMATO LEGADO
       *
       * Mantido temporariamente para evitar
       * regressões na página atual.
       */
      sources: {
        cardTrader: {
          success:
            Boolean(cardTraderResult),

          matchedExpansion:
            null,

          matchedBlueprint:
            null,

          offerCount:
            cardTraderResult?.total ??
            0,

          bestOffer:
            cardTraderResult
              ?.offers[0] ??
            null,

          offers:
            cardTraderResult
              ?.offers ??
            [],
        },
      },
    });
  } catch (error) {
    console.error(
      "Erro ao buscar ofertas da carta:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Erro ao buscar ofertas.",
      },
      {
        status: 500,
      }
    );
  }
}