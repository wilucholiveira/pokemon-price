import "dotenv/config";

const BASE_URL = "https://api.cardtrader.com/api/v2";

async function cardTraderGet(path: string) {
  const token = process.env.CARDTRADER_API_TOKEN;

  if (!token) {
    throw new Error("CARDTRADER_API_TOKEN não encontrado.");
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return JSON.parse(text);
}

async function main() {
  console.log("=== CARDTRADER → CHARIZARD ===");

  const EXPANSION_ID = 1472; // Base Set
  const SINGLES_CATEGORY_ID = 73;

  console.log("");
  console.log("Buscando blueprints da Base Set...");

  const blueprintsRaw = await cardTraderGet(
    `/blueprints/export?expansion_id=${EXPANSION_ID}`
  );

  const blueprints = Array.isArray(blueprintsRaw)
    ? blueprintsRaw
    : blueprintsRaw?.array ?? [];

  console.log("Blueprints encontrados:", blueprints.length);

  const charizards = blueprints.filter((bp: any) => {
    const name = String(bp?.name ?? "").toLowerCase();

    return (
      name.includes("charizard") &&
      Number(bp.category_id) === SINGLES_CATEGORY_ID
    );
  });

  if (charizards.length === 0) {
    console.log("");
    console.log("Nenhum Charizard encontrado.");
    return;
  }

  console.log("");
  console.log("Charizards encontrados:");

  charizards.forEach((bp: any) => {
    console.log(
      `ID ${bp.id} | ${bp.name} | categoria ${bp.category_id}`
    );
  });

  const blueprint = charizards[0];

  console.log("");
  console.log("Usando Blueprint:");
  console.log("ID:", blueprint.id);
  console.log("Nome:", blueprint.name);

  console.log("");
  console.log("Buscando ofertas...");

  const marketplaceRaw = await cardTraderGet(
    `/marketplace/products?blueprint_id=${blueprint.id}`
  );

  const offers =
    marketplaceRaw?.[String(blueprint.id)] ?? [];

  console.log("");
  console.log("Ofertas encontradas:", offers.length);

  if (offers.length === 0) {
    console.log("Nenhuma oferta disponível.");
    return;
  }

  console.log("");
  console.log("=== OFERTAS ===");

  offers.slice(0, 10).forEach((offer: any, index: number) => {
    const priceCents =
      offer.price?.cents ??
      offer.price_cents ??
      0;

    const currency =
      offer.price?.currency ??
      offer.price_currency ??
      "?";

    const price =
      Number(priceCents) / 100;

    const condition =
      offer.properties_hash?.condition ??
      "Não informado";

    const language =
      offer.properties_hash?.pokemon_language ??
      offer.properties_hash?.language ??
      "Não informado";

    const seller =
      offer.user?.username ??
      "Não informado";

    const country =
      offer.user?.country_code ??
      "?";

    console.log("");
    console.log(`#${index + 1}`);
    console.log(
      `Preço: ${currency} ${price.toFixed(2)}`
    );
    console.log(`Condição: ${condition}`);
    console.log(`Idioma: ${language}`);
    console.log(`Vendedor: ${seller}`);
    console.log(`País: ${country}`);
    console.log(
      `Quantidade: ${offer.quantity ?? "?"}`
    );
  });
}

main().catch((error) => {
  console.error("");
  console.error("Erro CardTrader:");
  console.error(error);
  process.exit(1);
});