import type { MercadoLivreCatalogProduct } from "./products";

export type CardMatchInput = {
  name: string;
  number?: string | null;
  setName?: string | null;
};

export type MatchResult = {
  product: MercadoLivreCatalogProduct;
  score: number;
  reasons: string[];
  penalties: string[];
  hasExactNumber: boolean;
  hasConflictingNumber: boolean;
  eligibleForAutoMatch: boolean;
};

const NEGATIVE_TERMS = [
  "box",
  "deck",
  "baralho",
  "tin",
  "collection",
  "colecao",
  "coleção",
  "pacote",
  "kit",
  "bundle",
  "blister",
  "jumbo",
  "metal",
  "dourada",
  "proxy",
  "replica",
  "réplica",
  "pasta",
  "album",
  "álbum",
  "fichario",
  "fichário",
  "sleeve",
  "sleeves",
  "protetor",
  "protetores",
  "playmat",
  "alcove",
  "fichas",
];

const SINGLE_CARD_TERMS = [
  "carta avulsa",
  "single card",
  "single",
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}/]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCardNumber(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
}

function getImportantNameTokens(name: string): string[] {
  return normalize(name)
    .split(" ")
    .filter((token) => token.length >= 2);
}

function extractCardNumbers(title: string): string[] {
  const matches = title.match(/\b\d{1,4}\s*\/\s*\d{1,4}\b/g) ?? [];

  return matches.map((value) =>
    normalizeCardNumber(value)
  );
}

function hasMultipleCardsIndicator(title: string): boolean {
  // Exemplos: "5 cartas", "60 cards", "2 cards".
  return /\b\d+\s+(cartas|cards)\b/.test(title);
}

export function scoreMercadoLivreProduct(
  card: CardMatchInput,
  product: MercadoLivreCatalogProduct
): MatchResult {
  const title = normalize(product.name ?? "");
  const cardName = normalize(card.name);

  let score = 0;

  const reasons: string[] = [];
  const penalties: string[] = [];

  let hasExactNumber = false;
  let hasConflictingNumber = false;

  // 1. Número da carta — sinal mais forte do matching.
  if (card.number) {
    const expectedNumber = normalizeCardNumber(card.number);
    const numbersInTitle = extractCardNumbers(title);

    if (numbersInTitle.includes(expectedNumber)) {
      hasExactNumber = true;
      score += 55;
      reasons.push(`número exato ${card.number}`);
    } else if (numbersInTitle.length > 0) {
      hasConflictingNumber = true;
      score -= 35;
      penalties.push(
        `número conflitante: ${numbersInTitle.join(", ")}`
      );
    }
  }

  // 2. Nome da carta.
  if (cardName && title.includes(cardName)) {
    score += 25;
    reasons.push("nome completo");
  } else {
    const tokens = getImportantNameTokens(card.name);

    if (tokens.length > 0) {
      const matchedTokens = tokens.filter((token) =>
        title.includes(token)
      );

      const ratio = matchedTokens.length / tokens.length;
      const tokenScore = Math.round(ratio * 20);

      score += tokenScore;

      if (matchedTokens.length > 0) {
        reasons.push(
          `tokens do nome ${matchedTokens.length}/${tokens.length}`
        );
      }
    }
  }

  // 3. Coleção/set — ajuda a distinguir números repetidos entre expansões.
  if (card.setName) {
    const setName = normalize(card.setName);

    if (setName && title.includes(setName)) {
      score += 20;
      reasons.push(`coleção exata: ${card.setName}`);
    } else {
      const setTokens = getImportantNameTokens(card.setName);

      if (setTokens.length > 0) {
        const matchedSetTokens = setTokens.filter((token) =>
          title.includes(token)
        );

        if (matchedSetTokens.length === setTokens.length) {
          score += 15;
          reasons.push("tokens completos da coleção");
        } else if (matchedSetTokens.length > 0) {
          score += 5;
          reasons.push(
            `tokens da coleção ${matchedSetTokens.length}/${setTokens.length}`
          );
        }
      }
    }
  }

  // 4. Evidência forte de single.
  for (const term of SINGLE_CARD_TERMS) {
    if (title.includes(normalize(term))) {
      score += 15;
      reasons.push(`indicador de single: ${term}`);
      break;
    }
  }

  // "Carta" sozinha é um sinal fraco, pois também aparece em kits/baralhos.
  if (
    !SINGLE_CARD_TERMS.some((term) =>
      title.includes(normalize(term))
    ) &&
    /\bcarta\b/.test(title)
  ) {
    score += 5;
    reasons.push("indicador fraco de carta");
  }

  // 5. Quantidade explícita de múltiplas cartas.
  if (hasMultipleCardsIndicator(title)) {
    score -= 30;
    penalties.push("múltiplas cartas");
  }

  // 6. Termos incompatíveis com carta avulsa.
  for (const term of NEGATIVE_TERMS) {
    if (title.includes(normalize(term))) {
      score -= 25;
      penalties.push(`produto não-single: ${term}`);
    }
  }

  score = Math.max(0, Math.min(100, score));

  const eligibleForAutoMatch =
    Boolean(card.number) &&
    hasExactNumber &&
    !hasConflictingNumber &&
    score >= 80;

  return {
    product,
    score,
    reasons,
    penalties,
    hasExactNumber,
    hasConflictingNumber,
    eligibleForAutoMatch,
  };
}

export function rankMercadoLivreProducts(
  card: CardMatchInput,
  products: MercadoLivreCatalogProduct[]
): MatchResult[] {
  return products
    .map((product) =>
      scoreMercadoLivreProduct(card, product)
    )
    .sort((a, b) => b.score - a.score);
}
