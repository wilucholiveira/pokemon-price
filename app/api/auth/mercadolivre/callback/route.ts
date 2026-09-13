import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  const savedState = request.cookies.get("ml_oauth_state")?.value;

  if (error) {
    return NextResponse.json(
      {
        success: false,
        error,
      },
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

  const tokenData = await tokenResponse.json();

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

  /*
   * IMPORTANTE:
   * Não retornamos access_token nem refresh_token ao navegador.
   * Na próxima etapa eles serão armazenados com segurança no servidor.
   */

  const response = NextResponse.json({
    success: true,
    message: "Mercado Livre conectado com sucesso.",
    userId: tokenData.user_id,
    expiresIn: tokenData.expires_in,
  });

  response.cookies.delete("ml_oauth_state");

  return response;
}