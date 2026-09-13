import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

type MercadoLivreTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: number;
};

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  const savedState = request.cookies.get("ml_oauth_state")?.value;

  if (error) {
    return NextResponse.json(
      { success: false, error },
      { status: 400 }
    );
  }

  if (!state || !savedState || state !== savedState) {
    return NextResponse.json(
      {
        success: false,
        error: "State OAuth inválido.",
      },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json(
      {
        success: false,
        error: "Authorization Code não recebido.",
      },
      { status: 400 }
    );
  }

  const clientId = process.env.MERCADOLIVRE_CLIENT_ID;
  const clientSecret = process.env.MERCADOLIVRE_CLIENT_SECRET;
  const redirectUri = process.env.MERCADOLIVRE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      {
        success: false,
        error: "Configuração OAuth incompleta.",
      },
      { status: 500 }
    );
  }

  try {
    const tokenResponse = await fetch(
      "https://api.mercadolibre.com/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
        cache: "no-store",
      }
    );

    const tokenData =
      (await tokenResponse.json()) as MercadoLivreTokenResponse;

    if (!tokenResponse.ok) {
      console.error("Erro OAuth Mercado Livre:", tokenData);

      return NextResponse.json(
        {
          success: false,
          error: "Falha ao obter token do Mercado Livre.",
        },
        { status: tokenResponse.status }
      );
    }

    if (
      !tokenData.access_token ||
      !tokenData.refresh_token ||
      !tokenData.expires_in ||
      !tokenData.user_id
    ) {
      throw new Error(
        "Resposta OAuth do Mercado Livre não contém todos os campos esperados."
      );
    }

    const accessTokenEncrypted = encrypt(tokenData.access_token);
    const refreshTokenEncrypted = encrypt(tokenData.refresh_token);

    const accessTokenExpiresAt = new Date(
      Date.now() + tokenData.expires_in * 1000
    );

    await prisma.marketplaceCredential.upsert({
      where: {
        provider: "mercadolivre",
      },
      update: {
        externalUserId: String(tokenData.user_id),
        accessTokenEncrypted,
        refreshTokenEncrypted,
        accessTokenExpiresAt,
        lastRefreshedAt: new Date(),
      },
      create: {
        provider: "mercadolivre",
        externalUserId: String(tokenData.user_id),
        accessTokenEncrypted,
        refreshTokenEncrypted,
        accessTokenExpiresAt,
        lastRefreshedAt: new Date(),
      },
    });

    const response = NextResponse.json({
      success: true,
      message: "Mercado Livre conectado e credenciais armazenadas com segurança.",
      userId: tokenData.user_id,
      expiresIn: tokenData.expires_in,
    });

    response.cookies.delete("ml_oauth_state");

    return response;
  } catch (error) {
    console.error("Erro ao concluir OAuth do Mercado Livre:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao concluir integração com Mercado Livre.",
      },
      { status: 500 }
    );
  }
}