import { NextRequest, NextResponse } from "next/server";
import { getEbayAccessToken } from "../../../../lib/ebay/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = await getEbayAccessToken();

    const query =
      request.nextUrl.searchParams.get("q")?.trim() ||
      "Pokemon Charizard";

    const baseUrl =
      process.env.EBAY_ENVIRONMENT === "production"
        ? "https://api.ebay.com"
        : "https://api.sandbox.ebay.com";

    const url = new URL(
      `${baseUrl}/buy/browse/v1/item_summary/search`
    );

    url.searchParams.set("q", query);
    url.searchParams.set("limit", "10");

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      },
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          status: response.status,
          error: data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      environment:
        process.env.EBAY_ENVIRONMENT === "production"
          ? "production"
          : "sandbox",
      query,
      total: data.total ?? 0,
      count: data.itemSummaries?.length ?? 0,
      items: data.itemSummaries ?? [],
    });
  } catch (error) {
    console.error("Erro na busca do eBay:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao buscar no eBay.",
      },
      { status: 500 }
    );
  }
}