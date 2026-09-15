import { getMercadoLivreAccessToken } from "./auth";

const MERCADO_LIVRE_API_URL = "https://api.mercadolibre.com";

type MercadoLivreRequestOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

/**
 * Cliente central da API do Mercado Livre.
 *
 * Responsabilidades:
 * - obter automaticamente um access token válido;
 * - adicionar Authorization;
 * - executar a chamada;
 * - tratar respostas HTTP inválidas;
 * - retornar a resposta já convertida de JSON.
 */
export async function mercadoLivreRequest<T>(
  path: string,
  options: MercadoLivreRequestOptions = {}
): Promise<T> {
  const accessToken = await getMercadoLivreAccessToken();

  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`;

  const response = await fetch(
    `${MERCADO_LIVRE_API_URL}${normalizedPath}`,
    {
      ...options,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...options.headers,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();

    console.error("Erro na API do Mercado Livre:", {
      status: response.status,
      path: normalizedPath,
      body: errorBody,
    });

    throw new Error(
      `Mercado Livre API retornou HTTP ${response.status}`
    );
  }

  return (await response.json()) as T;
}