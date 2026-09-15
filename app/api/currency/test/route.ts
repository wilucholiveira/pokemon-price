import { NextResponse } from "next/server";

import {
  getExchangeRatesToBRL,
} from "@/lib/currency/rates";

export async function GET() {
  try {
    const rates =
      await getExchangeRatesToBRL();

    return NextResponse.json({
      success: true,

      message:
        "Serviço de câmbio funcionando.",

      base: rates.base,

      rates: rates.rates,

      updatedAt: rates.updatedAt,

      examples: {
        USD_100: {
          original: "US$ 100.00",
          convertedBRL:
            100 * rates.rates.USD,
        },

        EUR_100: {
          original: "€ 100.00",
          convertedBRL:
            100 * rates.rates.EUR,
        },
      },
    });
  } catch (error) {
    console.error(
      "Currency test error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro desconhecido.",
      },
      {
        status: 500,
      }
    );
  }
}