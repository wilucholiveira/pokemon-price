export type EbayCardMatchInput = {
  cardName: string;
  setName: string;
  cardNumber: string;
};

export type EbayListingForMatch = {
  title: string;
};

export type EbayMatchResult = {
  accepted: boolean;
  score: number;
  reasons: string[];
};

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCollectorNumber(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/^0+(?=\d)/, "");
}

function getCollectorNumerator(value: string): string {
  const normalized = normalizeCollectorNumber(value);

  return normalized.split("/")[0] ?? normalized;
}

function containsCollectorNumber(
  title: string,
  cardNumber: string
): boolean {
  const normalizedTitle = normalizeText(title);
  const fullNumber = normalizeCollectorNumber(cardNumber);
  const numerator = getCollectorNumerator(cardNumber);

  if (fullNumber.includes("/")) {
    if (normalizedTitle.includes(fullNumber)) {
      return true;
    }
  }

  const numberPattern = new RegExp(
    `(^|[^0-9])0*${escapeRegExp(numerator)}([^0-9]|$)`,
    "i"
  );

  return numberPattern.test(normalizedTitle);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsImportantWords(
  title: string,
  value: string
): boolean {
  const normalizedTitle = normalizeText(title);

  const words = normalizeText(value)
    .split(" ")
    .filter((word) => word.length >= 2);

  if (words.length === 0) {
    return false;
  }

  return words.every((word) =>
    normalizedTitle.includes(word)
  );
}

const BLOCKED_TERMS = [
  "proxy",
  "custom",
  "replica",
  "reprint",
  "digital",
  "online code",
  "code card",
  "orica",
  "fan made",
  "fanmade",
  "metal card",
  "gold card",
  "sticker",
  "oversized",
  "jumbo",
];

const LOT_TERMS = [
  "lot of",
  "card lot",
  "bundle",
  "collection",
  "bulk",
];

export function buildEbayCardQuery(
  input: EbayCardMatchInput
): string {
  return [
    "Pokemon",
    input.cardName,
    input.cardNumber,
    input.setName,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function evaluateEbayListingMatch(
  listing: EbayListingForMatch,
  input: EbayCardMatchInput
): EbayMatchResult {
  const title = normalizeText(listing.title);

  let score = 0;
  const reasons: string[] = [];

  const blockedTerm = BLOCKED_TERMS.find((term) =>
    title.includes(normalizeText(term))
  );

  if (blockedTerm) {
    return {
      accepted: false,
      score: 0,
      reasons: [`blocked:${blockedTerm}`],
    };
  }

  const lotTerm = LOT_TERMS.find((term) =>
    title.includes(normalizeText(term))
  );

  if (lotTerm) {
    return {
      accepted: false,
      score: 0,
      reasons: [`lot:${lotTerm}`],
    };
  }

  if (containsImportantWords(title, input.cardName)) {
    score += 45;
    reasons.push("card-name");
  } else {
    reasons.push("missing-card-name");
  }

  if (containsCollectorNumber(title, input.cardNumber)) {
    score += 40;
    reasons.push("collector-number");
  } else {
    reasons.push("missing-collector-number");
  }

  if (containsImportantWords(title, input.setName)) {
    score += 15;
    reasons.push("set-name");
  } else {
    reasons.push("missing-set-name");
  }

  /*
   * Nome + número são obrigatórios.
   *
   * O nome da coleção aumenta a confiança, mas não é
   * obrigatório porque muitos vendedores do eBay não
   * colocam o nome completo do set no título.
   */
  const hasCardName =
    reasons.includes("card-name");

  const hasCollectorNumber =
    reasons.includes("collector-number");

  const accepted =
    hasCardName &&
    hasCollectorNumber &&
    score >= 85;

  return {
    accepted,
    score,
    reasons,
  };
}