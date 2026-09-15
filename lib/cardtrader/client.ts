import "dotenv/config";

const BASE_URL = "https://api.cardtrader.com/api/v2";
const POKEMON_GAME_ID = 5;
const POKEMON_SINGLES_CATEGORY_ID = 73;

export type CardTraderOffer = {
  id: number;
  blueprintId: number;
  cardName: string;
  expansion: {
    id: number | null;
    code: string | null;
    name: string | null;
  };
  price: number;
  currency: string;
  condition: string | null;
  language: string | null;
  seller: string | null;
  sellerCountry: string | null;
  quantity: number;
  url: string;
  graded: boolean;
  onVacation: boolean;
};

export type CardTraderSearchInput = {
  cardName: string;
  setName: string;
  setCode?: string | null;
  cardNumber?: string | null;
  language?: string | null;
  limit?: number;
};

export type CardTraderSearchResult = {
  matchedExpansion: {
    id: number;
    code: string | null;
    name: string;
  };
  matchedBlueprint: {
    id: number;
    name: string;
  };
  offers: CardTraderOffer[];
};

function getToken() {
  const token = process.env.CARDTRADER_API_TOKEN;

  if (!token) {
    throw new Error("CARDTRADER_API_TOKEN não encontrado no ambiente.");
  }

  return token;
}

async function cardTraderGet(path: string) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`CardTrader HTTP ${response.status}: ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

function normalizeArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.array)) return data.array;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeCardNumber(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/^0+/, "");
}

function readBlueprintCollectorNumber(blueprint: any): string | null {
  const direct =
    blueprint?.collector_number ??
    blueprint?.number ??
    blueprint?.card_number;

  if (direct != null) {
    return String(direct);
  }

  const possibleObjects = [
    blueprint?.fixed_properties,
    blueprint?.properties_hash,
    blueprint?.properties,
  ];

  for (const obj of possibleObjects) {
    if (!obj || typeof obj !== "object") continue;

    const value =
      obj.collector_number ??
      obj.number ??
      obj.card_number;

    if (value != null) {
      return String(value);
    }
  }

  return null;
}

function readPokemonLanguage(properties: any): string | null {
  if (!properties || typeof properties !== "object") {
    return null;
  }

  return (
    properties.pokemon_language ??
    properties.language ??
    null
  );
}

function readCondition(properties: any): string | null {
  if (!properties || typeof properties !== "object") {
    return null;
  }

  return properties.condition ?? null;
}

async function findExpansion(
  setName: string,
  setCode?: string | null
) {
  const raw = await cardTraderGet("/expansions");

  const expansions = normalizeArray(raw).filter(
    (expansion: any) =>
      Number(expansion?.game_id) === POKEMON_GAME_ID
  );

  const wantedName = normalizeText(setName);
  const wantedCode = normalizeText(setCode);

  // 1. Código exato, quando o catálogo possuir código.
  if (wantedCode) {
    const byCode = expansions.find((expansion: any) => {
      const code = normalizeText(expansion?.code);
      return code && code === wantedCode;
    });

    if (byCode) return byCode;
  }

  // 2. Nome exato.
  const exact = expansions.find((expansion: any) => {
    const name = normalizeText(
      expansion?.name ?? expansion?.name_en
    );

    return name === wantedName;
  });

  if (exact) return exact;

  // 3. Nome parcial somente quando houver um único candidato.
  const partialMatches = expansions.filter((expansion: any) => {
    const name = normalizeText(
      expansion?.name ?? expansion?.name_en
    );

    if (!name || !wantedName) return false;

    return (
      name.includes(wantedName) ||
      wantedName.includes(name)
    );
  });

  if (partialMatches.length === 1) {
    return partialMatches[0];
  }

  throw new Error(
    `Expansão "${setName}" não encontrada com segurança na CardTrader.`
  );
}
async function findBlueprint(
  expansionId: number,
  cardName: string,
  cardNumber?: string | null
) {
  const raw = await cardTraderGet(
    `/blueprints/export?expansion_id=${expansionId}`
  );

  const blueprints = normalizeArray(raw).filter(
    (blueprint: any) =>
      Number(blueprint?.category_id) ===
      POKEMON_SINGLES_CATEGORY_ID
  );

  const wantedName = normalizeText(cardName);
  const wantedNumber = cardNumber
    ? normalizeCardNumber(cardNumber)
    : "";

  // Matching de nome: primeiro exato; parcial só serve para formar candidatos.
  const exactNameCandidates = blueprints.filter(
    (blueprint: any) =>
      normalizeText(blueprint?.name) === wantedName
  );

  const candidates =
    exactNameCandidates.length > 0
      ? exactNameCandidates
      : blueprints.filter((blueprint: any) => {
          const name = normalizeText(blueprint?.name);

          if (!name || !wantedName) return false;

          return (
            name.includes(wantedName) ||
            wantedName.includes(name)
          );
        });

  if (candidates.length === 0) {
    throw new Error(
      `Carta "${cardName}" não encontrada nessa expansão na CardTrader.`
    );
  }

  // Para uma impressão específica, o número passa a ser obrigatório.
  // Nunca fazemos fallback silencioso para candidates[0].
  if (wantedNumber) {
    const numberedCandidates = candidates
      .map((blueprint: any) => ({
        blueprint,
        number: readBlueprintCollectorNumber(blueprint),
      }))
      .filter(
        (
          item
        ): item is { blueprint: any; number: string } =>
          item.number != null
      );

    const exactNumberMatches = numberedCandidates.filter(
      (item) =>
        normalizeCardNumber(item.number) === wantedNumber
    );

    if (exactNumberMatches.length === 1) {
      return exactNumberMatches[0].blueprint;
    }

    if (exactNumberMatches.length > 1) {
      const exactNameAndNumber = exactNumberMatches.filter(
        (item) =>
          normalizeText(item.blueprint?.name) === wantedName
      );

      if (exactNameAndNumber.length === 1) {
        return exactNameAndNumber[0].blueprint;
      }

      throw new Error(
        `A CardTrader retornou mais de uma impressão para "${cardName}" #${cardNumber}. Matching recusado por segurança.`
      );
    }

    throw new Error(
      `Impressão exata "${cardName}" #${cardNumber} não encontrada nessa expansão na CardTrader. Nenhuma oferta foi exibida para evitar preços de outra impressão.`
    );
  }

  // Sem número, só aceitamos quando o nome identifica um único blueprint.
  if (exactNameCandidates.length === 1) {
    return exactNameCandidates[0];
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  throw new Error(
    `Existem múltiplas impressões de "${cardName}" nessa expansão. Informe o número da carta para comparar preços com segurança.`
  );
}

async function getMarketplaceOffers(
  blueprintId: number,
  language?: string | null
) {
  const params = new URLSearchParams({
    blueprint_id: String(blueprintId),
  });

  if (language) {
    params.set("language", language);
  }

  const raw = await cardTraderGet(
    `/marketplace/products?${params.toString()}`
  );

  return Array.isArray(raw?.[String(blueprintId)])
    ? raw[String(blueprintId)]
    : [];
}

export async function getCardTraderOffers(
  input: CardTraderSearchInput
): Promise<CardTraderSearchResult> {
  // O endpoint do marketplace retorna as ofertas disponíveis do blueprint.
  // O limite aqui controla apenas quantas ofertas entregamos ao frontend.
  // Mantemos uma margem ampla para que filtros de condição/idioma não
  // fiquem restritos às primeiras ofertas mais baratas.
  const limit = Math.min(
    Math.max(input.limit ?? 250, 1),
    250
  );

  const expansion = await findExpansion(input.setName, input.setCode);

  const blueprint = await findBlueprint(
    Number(expansion.id),
    input.cardName,
    input.cardNumber
  );

  const rawOffers = await getMarketplaceOffers(
    Number(blueprint.id),
    input.language
  );

  const offers: CardTraderOffer[] = rawOffers
    .map((offer: any) => {
      const cents = Number(
        offer?.price?.cents ??
        offer?.price_cents ??
        0
      );

      return {
        id: Number(offer.id),
        blueprintId: Number(offer.blueprint_id),
        cardName:
          offer?.name_en ??
          blueprint?.name ??
          input.cardName,

        expansion: {
          id:
            offer?.expansion?.id != null
              ? Number(offer.expansion.id)
              : Number(expansion.id),

          code:
            offer?.expansion?.code ??
            expansion?.code ??
            null,

          name:
            offer?.expansion?.name_en ??
            expansion?.name ??
            expansion?.name_en ??
            null,
        },

        price: cents / 100,

        currency:
          offer?.price?.currency ??
          offer?.price_currency ??
          "BRL",

        condition:
          readCondition(offer?.properties_hash),

        language:
          readPokemonLanguage(offer?.properties_hash),

        seller:
          offer?.user?.username ?? null,

        sellerCountry:
          offer?.user?.country_code ?? null,

        quantity: Number(offer?.quantity ?? 0),

        url: `https://www.cardtrader.com/en/cards/${Number(blueprint.id)}`,

        graded: Boolean(offer?.graded),

        onVacation: Boolean(offer?.on_vacation),
      };
    })
    .filter(
      (offer: CardTraderOffer) =>
        offer.quantity > 0 &&
        !offer.onVacation &&
        Number.isFinite(offer.price)
    )
    .sort(
      (a: CardTraderOffer, b: CardTraderOffer) =>
        a.price - b.price
    )
    .slice(0, limit);

  return {
    matchedExpansion: {
      id: Number(expansion.id),
      code: expansion?.code ?? null,
      name:
        expansion?.name ??
        expansion?.name_en ??
        input.setName,
    },

    matchedBlueprint: {
      id: Number(blueprint.id),
      name: blueprint?.name ?? input.cardName,
    },

    offers,
  };
}
