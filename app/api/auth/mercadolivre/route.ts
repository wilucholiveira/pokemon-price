import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  const clientId = process.env.MERCADOLIVRE_CLIENT_ID;
  const redirectUri = process.env.MERCADOLIVRE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      {
        success: false,
        error: "Configuração OAuth do Mercado Livre incompleta.",
      },
      { status: 500 }
    );
  }

  const state = crypto.randomBytes(32).toString("hex");

  const authorizationUrl = new URL(
    "https://auth.mercadolivre.com.br/authorization"
  );

  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizationUrl);

  response.cookies.set("ml_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  return response;
}