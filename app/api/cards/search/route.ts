import { NextRequest, NextResponse } from "next/server";

import { prisma } from "../../../../lib/prisma";

type TcgDexSetBrief = {
  id: string;
  name: string;
  cardCount?: {
    total?: number;
    official?: number;
  };
};

let tcgDexSetCache:
  | {
      expiresAt: number;
      byId: Map<string, TcgDexSetBrief>;
    }
  | undefined;

function parsePositiveInt(
  value: string | null,
  fallback: number
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

function parseCardSearch(rawQuery: string) {
  const query = rawQuery.trim();

  // Ex.: 050/064 ou 199/165
  const codeOnly = query.match(
    /^(\d+[a-z]?)\s*\/\s*(\d+)$/i
  );

  if (codeOnly) {
    return {
      name: "",
      number: codeOnly[1],
      officialSetCount: Number(codeOnly[2]),
    };
  }

  // Ex.: Eevee 050, Charizard ex 199/165
  const nameAndCode = query.match(
    /^(.*?)\s+(\d+[a-z]?)(?:\s*\/\s*(\d+))?$/i
  );

  if (nameAndCode) {
    return {
      name: nameAndCode[1].trim(),
      number: nameAndCode[2],
      officialSetCount: nameAndCode[3]
        ? Number(nameAndCode[3])
        : null,
    };
  }

  return {
    name: query,
    number: "",
    officialSetCount: null,
  };
}

function numericPart(value: string | null | undefined) {
  const match = String(value ?? "").match(/\d+/);

  if (!match) {
    return null;
  }

  return Number(match[0]);
}

async function getTcgDexSets() {
  const now = Date.now();

  if (
    tcgDexSetCache &&
    tcgDexSetCache.expiresAt > now
  ) {
    return tcgDexSetCache.byId;
  }

  const response = await fetch(
    "https://api.tcgdex.net/v2/en/sets",
    {
      next: {
        revalidate: 60 * 60,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `TCGdex respondeu HTTP ${response.status}.`
    );
  }

  const sets = (await response.json()) as TcgDexSetBrief[];

  const byId = new Map(
    sets.map((set) => [set.id, set])
  );

  tcgDexSetCache = {
    expiresAt: now + 60 * 60 * 1000,
    byId,
  };

  return byId;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const q = searchParams.get("q")?.trim() ?? "";
    const setQuery =
      searchParams.get("set")?.trim() ?? "";

    const rarityQuery =
      searchParams.get("rarity")?.trim() ?? "";

    const specialParam =
      searchParams.get("special")?.trim().toLowerCase() ?? "";

    const specialFilter =
      specialParam === "true"
        ? true
        : specialParam === "false"
          ? false
          : null;

    const page = parsePositiveInt(
      searchParams.get("page"),
      1
    );

    const limit = Math.min(
      parsePositiveInt(
        searchParams.get("limit"),
        20
      ),
      50
    );

    const parsedSearch = q
      ? parseCardSearch(q)
      : {
          name: "",
          number: "",
          officialSetCount: null,
        };

    const andFilters: object[] = [];

    if (q) {
      if (parsedSearch.number) {
        const numberFilter = {
          OR: [
            {
              number: {
                contains: parsedSearch.number,
                mode: "insensitive" as const,
              },
            },
            {
              printedNumber: {
                contains: parsedSearch.number,
                mode: "insensitive" as const,
              },
            },
          ],
        };

        if (parsedSearch.name) {
          andFilters.push({
            AND: [
              numberFilter,
              {
                OR: [
                  {
                    name: {
                      contains: parsedSearch.name,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    translations: {
                      some: {
                        name: {
                          contains: parsedSearch.name,
                          mode: "insensitive" as const,
                        },
                      },
                    },
                  },
                ],
              },
            ],
          });
        } else {
          andFilters.push(numberFilter);
        }
      } else {
        andFilters.push({
          OR: [
            {
              name: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
            {
              number: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
            {
              printedNumber: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
            {
              rarity: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
            {
              translations: {
                some: {
                  name: {
                    contains: q,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
            {
              translations: {
                some: {
                  rarity: {
                    contains: q,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
          ],
        });
      }
    }

    if (setQuery) {
      andFilters.push({
        OR: [
          // Código local da coleção, ex.: MEW, OBF, PAL, PGO.
          {
            set: {
              code: {
                equals: setQuery,
                mode: "insensitive" as const,
              },
            },
          },
          // ID externo da TCGdex, útil quando o código recebido
          // corresponde diretamente ao identificador da coleção.
          {
            set: {
              externalId: {
                equals: setQuery,
                mode: "insensitive" as const,
              },
            },
          },
          // Mantém compatibilidade com buscas pelo nome da coleção.
          {
            set: {
              name: {
                contains: setQuery,
                mode: "insensitive" as const,
              },
            },
          },
          {
            set: {
              translations: {
                some: {
                  name: {
                    contains: setQuery,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
          },
        ],
      });
    }

    if (rarityQuery) {
      andFilters.push({
        OR: [
          {
            rarity: {
              contains: rarityQuery,
              mode: "insensitive" as const,
            },
          },
          {
            translations: {
              some: {
                rarity: {
                  contains: rarityQuery,
                  mode: "insensitive" as const,
                },
              },
            },
          },
        ],
      });
    }

    const where =
      andFilters.length === 0
        ? {}
        : andFilters.length === 1
          ? andFilters[0]
          : {
              AND: andFilters,
            };

    // Se a busca contém denominador (ex.: 050/064), buscamos
    // os candidatos por número e depois validamos o tamanho
    // oficial da coleção usando o cardCount.official da TCGdex.
    const needsOfficialSetFilter =
      parsedSearch.officialSetCount != null;

    // "special" depende de cardCount.official da coleção,
    // então também precisa ser filtrado depois de carregar a TCGdex.
    const needsPostFilter =
      needsOfficialSetFilter ||
      specialFilter != null;

    const cards = await prisma.card.findMany({
      where,

      include: {
        set: {
          include: {
            translations: true,
          },
        },
        translations: true,
      },

      orderBy: [
        {
          name: "asc",
        },
        {
          number: "asc",
        },
      ],

      ...(needsPostFilter
        ? {}
        : {
            skip: (page - 1) * limit,
            take: limit,
          }),
    });

    let tcgDexSets:
      | Map<string, TcgDexSetBrief>
      | null = null;

    if (
      needsPostFilter ||
      cards.length > 0
    ) {
      try {
        tcgDexSets = await getTcgDexSets();
      } catch (error) {
        console.warn(
          "Não foi possível carregar cardCount da TCGdex:",
          error
        );
      }
    }

    let filteredCards = cards;

    if (needsOfficialSetFilter) {
      filteredCards = filteredCards.filter((card) => {
        const remoteSet = card.set.externalId
          ? tcgDexSets?.get(card.set.externalId)
          : undefined;

        return (
          remoteSet?.cardCount?.official ===
          parsedSearch.officialSetCount
        );
      });
    }

    if (specialFilter != null) {
      filteredCards = filteredCards.filter((card) => {
        const remoteSet = card.set.externalId
          ? tcgDexSets?.get(card.set.externalId)
          : undefined;

        const officialSetCount =
          remoteSet?.cardCount?.official ?? null;

        const cardNumericNumber = numericPart(
          card.printedNumber ?? card.number
        );

        const isSpecial =
          cardNumericNumber != null &&
          officialSetCount != null &&
          cardNumericNumber > officialSetCount;

        return isSpecial === specialFilter;
      });
    }

    const total = needsPostFilter
      ? filteredCards.length
      : await prisma.card.count({
          where,
        });

    const paginatedCards =
      needsPostFilter
        ? filteredCards.slice(
            (page - 1) * limit,
            page * limit
          )
        : filteredCards;

    const results = paginatedCards.map((card) => {
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

      const remoteSet = card.set.externalId
        ? tcgDexSets?.get(card.set.externalId)
        : undefined;

      const officialSetCount =
        remoteSet?.cardCount?.official ?? null;

      const totalSetCount =
        remoteSet?.cardCount?.total ?? null;

      const cardNumericNumber =
        numericPart(
          card.printedNumber ?? card.number
        );

      const isSpecial =
        cardNumericNumber != null &&
        officialSetCount != null &&
        cardNumericNumber > officialSetCount;

      const displayNumber =
        officialSetCount != null
          ? `${card.printedNumber ?? card.number}/${String(
              officialSetCount
            ).padStart(
              String(
                card.printedNumber ?? card.number
              ).length,
              "0"
            )}`
          : card.printedNumber ?? card.number;

      return {
        id: card.id,

        name:
          ptBrTranslation?.name ??
          card.name,

        originalName: card.name,

        number: card.number,
        printedNumber: card.printedNumber,
        displayNumber,

        officialSetCount,
        totalSetCount,
        isSpecial,

        rarity:
          ptBrTranslation?.rarity ??
          card.rarity,

        image:
          ptBrTranslation?.imageSmall ??
          card.imageSmall,

        imageLarge:
          ptBrTranslation?.imageLarge ??
          card.imageLarge,

        set: {
          id: card.set.id,
          externalId: card.set.externalId,
          code: card.set.code,
          name:
            ptBrSetTranslation?.name ??
            card.set.name,
          originalName: card.set.name,
        },
      };
    });

    const totalPages = Math.ceil(
      total / limit
    );

    return NextResponse.json({
      success: true,

      filters: {
        q: q || null,
        set: setQuery || null,
        rarity: rarityQuery || null,
        special: specialFilter,
        parsedNumber:
          parsedSearch.number || null,
        officialSetCount:
          parsedSearch.officialSetCount,
      },

      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage:
          page < totalPages,
        hasPreviousPage:
          page > 1,
      },

      results,
    });
  } catch (error) {
    console.error(
      "Erro em /api/cards/search:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Erro interno ao buscar cartas.",
      },
      {
        status: 500,
      }
    );
  }
}
