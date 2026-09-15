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

function normalizeArray(data: any) {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray(data.array)) {
    return data.array;
  }

  if (data && Array.isArray(data.data)) {
    return data.data;
  }

  return [];
}

async function main() {
  console.log("=== CARDTRADER → POKÉMON ===");

  // -----------------------------
  // GAMES
  // -----------------------------

  const gamesRaw = await cardTraderGet("/games");
  const games = normalizeArray(gamesRaw);

  console.log("");
  console.log("Games recebidos:", games.length);

  const pokemon = games.find((game: any) => {
    const name = String(
      game?.display_name ?? game?.name ?? ""
    ).toLowerCase();

    return (
      name.includes("pokemon") ||
      name.includes("pokémon")
    );
  });

  if (!pokemon) {
    console.log("");
    console.log("Resposta recebida de /games:");
    console.dir(gamesRaw, { depth: 4 });

    throw new Error("Pokémon não encontrado.");
  }

  console.log("");
  console.log("Pokémon encontrado:");
  console.log("ID:", pokemon.id);
  console.log(
    "Nome:",
    pokemon.display_name ?? pokemon.name
  );

  // -----------------------------
  // CATEGORIES
  // -----------------------------

  const categoriesRaw = await cardTraderGet(
    `/categories?game_id=${pokemon.id}`
  );

  const categories = normalizeArray(categoriesRaw);

  console.log("");
  console.log("Categorias Pokémon:");

  categories.forEach((category: any) => {
    console.log(
      `${category.id} | ${category.name}`
    );
  });

  // -----------------------------
  // EXPANSIONS
  // -----------------------------

  const expansionsRaw =
    await cardTraderGet("/expansions");

  const expansions =
    normalizeArray(expansionsRaw);

  const pokemonExpansions =
    expansions.filter(
      (expansion: any) =>
        Number(expansion.game_id) ===
        Number(pokemon.id)
    );

  console.log("");
  console.log(
    "Expansões Pokémon:",
    pokemonExpansions.length
  );

  console.log("");
  console.log("Primeiras 20:");

  pokemonExpansions
    .slice(0, 20)
    .forEach((expansion: any) => {
      console.log(
        `${expansion.id} | ${expansion.code ?? "-"} | ${expansion.name}`
      );
    });
}

main().catch((error) => {
  console.error("");
  console.error("Erro CardTrader:");
  console.error(error);

  process.exit(1);
});