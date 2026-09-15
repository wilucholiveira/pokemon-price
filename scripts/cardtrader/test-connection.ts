import "dotenv/config";

async function main() {
  const token =
    process.env.CARDTRADER_API_TOKEN;

  if (!token) {
    throw new Error(
      "CARDTRADER_API_TOKEN não encontrado no .env."
    );
  }

  const response = await fetch(
    "https://api.cardtrader.com/api/v2/info",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `CardTrader retornou HTTP ${response.status}: ${body}`
    );
  }

  console.log(
    "=== CARDTRADER CONECTADO ==="
  );

  console.log(
    JSON.parse(body)
  );
}

main().catch((error) => {
  console.error("");
  console.error(
    "Falha na conexão com CardTrader:"
  );

  console.error(error);

  process.exit(1);
});