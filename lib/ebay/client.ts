type EbayTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

const EBAY_SCOPE = "https://api.ebay.com/oauth/api_scope";

function getEnvironment() {
  return process.env.EBAY_ENVIRONMENT === "production"
    ? "production"
    : "sandbox";
}

export function getEbayApiBaseUrl() {
  return getEnvironment() === "production"
    ? "https://api.ebay.com"
    : "https://api.sandbox.ebay.com";
}

export async function getEbayAccessToken(): Promise<string> {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "EBAY_CLIENT_ID ou EBAY_CLIENT_SECRET não configurado."
    );
  }

  const credentials = Buffer.from(
    `${clientId}:${clientSecret}`
  ).toString("base64");

  const response = await fetch(
    `${getEbayApiBaseUrl()}/identity/v1/oauth2/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: EBAY_SCOPE,
      }),
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("eBay OAuth error:", data);

    throw new Error(
      data?.error_description ??
        data?.error ??
        "Não foi possível autenticar no eBay."
    );
  }

  return (data as EbayTokenResponse).access_token;
}