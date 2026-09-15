import type { ExchangeRates } from "./converter";

type FrankfurterRate = {
  date: string;
  base: string;
  quote: string;
  rate: number;
};

const FRANKFURTER_API =
  "https://api.frankfurter.dev/v2";

export async function getExchangeRatesToBRL(): Promise<ExchangeRates> {
  /*
   * Pedimos diretamente:
   *
   * 1 USD → BRL
   * 1 EUR → BRL
   *
   * Isso deixa o formato compatível com nosso converter:
   * priceBRL = price * rate
   */

  const [usdResponse, eurResponse] =
    await Promise.all([
      fetch(`${FRANKFURTER_API}/rate/USD/BRL`, {
        next: {
          revalidate: 3600,
        },
      }),

      fetch(`${FRANKFURTER_API}/rate/EUR/BRL`, {
        next: {
          revalidate: 3600,
        },
      }),
    ]);

  if (!usdResponse.ok || !eurResponse.ok) {
    throw new Error(
      "Não foi possível obter as taxas de câmbio."
    );
  }

  const usd =
    (await usdResponse.json()) as FrankfurterRate;

  const eur =
    (await eurResponse.json()) as FrankfurterRate;

  if (
    !Number.isFinite(usd.rate) ||
    !Number.isFinite(eur.rate)
  ) {
    throw new Error(
      "O serviço de câmbio retornou taxas inválidas."
    );
  }

  return {
    base: "BRL",

    rates: {
      BRL: 1,
      USD: usd.rate,
      EUR: eur.rate,
    },

    updatedAt:
      usd.date >= eur.date
        ? usd.date
        : eur.date,
  };
}