import "dotenv/config";

import { mercadoLivreRequest } from "../../lib/mercadolivre/client";

type MercadoLivreUser = {
  id: number;
  nickname?: string;
  country_id?: string;
  site_id?: string;
};

async function main() {
  console.log("Testando cliente Mercado Livre...");

  const user = await mercadoLivreRequest<MercadoLivreUser>(
    "/users/me"
  );

  console.log("Conexão realizada com sucesso.");
  console.log("User ID:", user.id);
  console.log("Nickname:", user.nickname ?? "não informado");
  console.log("Country:", user.country_id ?? "não informado");
  console.log("Site:", user.site_id ?? "não informado");
}

main()
  .catch((error) => {
    console.error("Falha no teste do Mercado Livre:");
    console.error(error);
    process.exit(1);
  });