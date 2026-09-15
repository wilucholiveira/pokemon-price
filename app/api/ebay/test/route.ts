import { NextResponse } from "next/server";
import { getEbayAccessToken } from "../../../../lib/ebay/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const token = await getEbayAccessToken();

    return NextResponse.json({
      success: true,
      environment:
        process.env.EBAY_ENVIRONMENT === "production"
          ? "production"
          : "sandbox",
      authenticated: Boolean(token),
    });
  } catch (error) {
    console.error("Erro no teste do eBay:", error);

    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao autenticar no eBay.",
      },
      { status: 500 }
    );
  }
}