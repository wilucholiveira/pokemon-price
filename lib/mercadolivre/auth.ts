import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";

type MercadoLivreRefreshResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id?: number;
};

const PROVIDER = "mercadolivre";

/**
 * Retorna um access token válido do Mercado Livre.
 *
 * - Se o token atual ainda estiver válido, descriptografa e retorna.
 * - Se estiver expirado ou perto de expirar, executa refresh.
 * - Salva imediatamente o novo access_token e refresh_token criptografados.
 */
export async function getMercadoLivreAccessToken(): Promise<string> {
  const credential = await prisma.marketplaceCredential.findUnique({
    where: {
      provider: PROVIDER,
    },
  });

  if (!credential) {
    throw new Error(
      "Credencial do Mercado Livre não encontrada. Faça a autorização OAuth primeiro."
    );
  }

  /*
   * Margem de segurança:
   * consideramos o token "expirado" 5 minutos antes do horário real.
   *
   * Isso evita iniciar uma coleta com um token prestes a vencer.
   */
  const refreshThreshold = new Date(Date.now() + 5 * 60 * 1000);

  if (credential.accessTokenExpiresAt > refreshThreshold) {
    return decrypt(credential.accessTokenEncrypted);
  }

  return refreshMercadoLivreAccessToken();
}

/**
 * Renova a credencial OAuth do Mercado Livre.
 *
 * IMPORTANTE:
 * o refresh_token é rotativo.
 * Sempre persistimos o novo refresh_token retornado pela API.
 */
async function refreshMercadoLivreAccessToken(): Promise<string> {
  const credential = await prisma.marketplaceCredential.findUnique({
    where: {
      provider: PROVIDER,
    },
  });

  if (!credential) {
    throw new Error("Credencial do Mercado Livre não encontrada.");
  }

  const clientId = process.env.MERCADOLIVRE_CLIENT_ID;
  const clientSecret = process.env.MERCADOLIVRE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "MERCADOLIVRE_CLIENT_ID ou MERCADOLIVRE_CLIENT_SECRET não configurados."
    );
  }

  const refreshToken = decrypt(credential.refreshTokenEncrypted);

  const response = await fetch(
    "https://api.mercadolibre.com/oauth/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
      cache: "no-store",
    }
  );

  const data =
    (await response.json()) as MercadoLivreRefreshResponse;

  if (!response.ok) {
    console.error(
      "Erro ao renovar token do Mercado Livre:",
      data
    );

    throw new Error(
      `Falha ao renovar token do Mercado Livre. HTTP ${response.status}`
    );
  }

  if (
    !data.access_token ||
    !data.refresh_token ||
    !data.expires_in
  ) {
    throw new Error(
      "Resposta de refresh do Mercado Livre incompleta."
    );
  }

  const accessTokenEncrypted = encrypt(data.access_token);
  const refreshTokenEncrypted = encrypt(data.refresh_token);

  const accessTokenExpiresAt = new Date(
    Date.now() + data.expires_in * 1000
  );

  await prisma.marketplaceCredential.update({
    where: {
      provider: PROVIDER,
    },
    data: {
      accessTokenEncrypted,
      refreshTokenEncrypted,
      accessTokenExpiresAt,
      lastRefreshedAt: new Date(),
      ...(data.user_id
        ? { externalUserId: String(data.user_id) }
        : {}),
    },
  });

  return data.access_token;
}