"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type CardDetail = {
  id: string;
  name: string;
  originalName?: string;
  number: string;
  printedNumber?: string | null;
  displayNumber?: string | null;
  rarity?: string | null;
  hp?: string | number | null;
  artist?: string | null;
  image?: string | null;
  imageLarge?: string | null;
  set?: {
    id: string;
    name: string;
    originalName?: string;
    code?: string | null;
  };
};

type Offer = {
  id: string | number;
  marketplace?: "cardtrader" | "ebay";
  marketplaceName?: string;
  price: number;
  currency: string;
  priceBRL?: number | null;
  exchangeRate?: number | null;
  exchangeRateUpdatedAt?: string | null;
  condition?: string | null;
  language?: string | null;
  seller?: string | null;
  sellerCountry?: string | null;
  quantity?: number | null;
  url?: string | null;
  graded?: boolean;
  title?: string | null;
  imageUrl?: string | null;
};

type MarketplaceStatus = {
  marketplace: "cardtrader" | "ebay";
  marketplaceName: string;
  status: "active" | "disabled" | "error";
  error: string | null;
  total: number;
};

function conditionInfo(value?: string | null) {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (normalized === "near mint" || normalized === "nm") {
    return { label: "NM · Near Mint", tone: "nm" };
  }

  if (
    normalized === "slightly played" ||
    normalized === "excellent" ||
    normalized === "sp" ||
    normalized === "ex"
  ) {
    return {
      label:
        normalized === "excellent" || normalized === "ex"
          ? "EX · Excellent"
          : "SP · Slightly Played",
      tone: "sp",
    };
  }

  if (
    normalized === "moderately played" ||
    normalized === "good" ||
    normalized === "mp" ||
    normalized === "gd"
  ) {
    return {
      label:
        normalized === "good" || normalized === "gd"
          ? "GD · Good"
          : "MP · Moderately Played",
      tone: "mp",
    };
  }

  if (normalized === "played" || normalized === "pl") {
    return { label: "PL · Played", tone: "pl" };
  }

  if (normalized === "poor" || normalized === "po") {
    return { label: "PO · Poor", tone: "po" };
  }

  return {
    label: value ? String(value) : "Não informada",
    tone: "unknown",
  };
}

function languageLabel(value?: string | null) {
  const code = String(value ?? "").trim().toLowerCase();

  const labels: Record<string, string> = {
    en: "Inglês",
    it: "Italiano",
    pt: "Português",
    "pt-br": "Português",
    es: "Espanhol",
    fr: "Francês",
    de: "Alemão",
    ja: "Japonês",
    jp: "Japonês",
    ko: "Coreano",
    zh: "Chinês",
  };

  return labels[code] ?? (value || "—");
}

function offerPriceBRL(offer: Offer) {
  if (typeof offer.priceBRL === "number" && Number.isFinite(offer.priceBRL)) {
    return offer.priceBRL;
  }

  if (offer.currency?.toUpperCase() === "BRL") {
    return offer.price;
  }

  return null;
}

function countryInfo(value?: string | null) {
  const code = String(value ?? "").trim().toUpperCase();

  const countries: Record<string, { flag: string; label: string }> = {
    IT: { flag: "🇮🇹", label: "Itália" },
    DE: { flag: "🇩🇪", label: "Alemanha" },
    FR: { flag: "🇫🇷", label: "França" },
    ES: { flag: "🇪🇸", label: "Espanha" },
    PT: { flag: "🇵🇹", label: "Portugal" },
    GB: { flag: "🇬🇧", label: "Reino Unido" },
    UK: { flag: "🇬🇧", label: "Reino Unido" },
    US: { flag: "🇺🇸", label: "Estados Unidos" },
    BR: { flag: "🇧🇷", label: "Brasil" },
    BE: { flag: "🇧🇪", label: "Bélgica" },
    NL: { flag: "🇳🇱", label: "Países Baixos" },
    AT: { flag: "🇦🇹", label: "Áustria" },
    CH: { flag: "🇨🇭", label: "Suíça" },
    PL: { flag: "🇵🇱", label: "Polônia" },
    CZ: { flag: "🇨🇿", label: "Tchéquia" },
    GR: { flag: "🇬🇷", label: "Grécia" },
    FI: { flag: "🇫🇮", label: "Finlândia" },
    SE: { flag: "🇸🇪", label: "Suécia" },
    DK: { flag: "🇩🇰", label: "Dinamarca" },
    NO: { flag: "🇳🇴", label: "Noruega" },
    IE: { flag: "🇮🇪", label: "Irlanda" },
    JP: { flag: "🇯🇵", label: "Japão" },
    CA: { flag: "🇨🇦", label: "Canadá" },
  };

  return countries[code] ?? { flag: "🌐", label: value || "—" };
}

export default function CardPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [card, setCard] = useState<CardDetail | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [marketplaceStatuses, setMarketplaceStatuses] = useState<
  MarketplaceStatus[]
>([]);
  const [loadingCard, setLoadingCard] = useState(true);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [cardError, setCardError] = useState("");
  const [offerError, setOfferError] = useState("");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [sourceFilter, setSourceFilter] = useState<"all" | "cardtrader" | "ebay">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const offersPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [conditionFilter, languageFilter, sortOrder, sourceFilter]);

  useEffect(() => {
    if (!id) return;

    async function load() {
      setLoadingCard(true);
      setLoadingOffers(true);

      try {
        const response = await fetch(`/api/cards/${id}`, {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || data.success === false) {
          throw new Error(data.error ?? "Carta não encontrada.");
        }

        setCard(data.card ?? data);
      } catch (err) {
        setCardError(
          err instanceof Error
            ? err.message
            : "Erro ao carregar a carta."
        );
      } finally {
        setLoadingCard(false);
      }

      try {
        const response = await fetch(
          `/api/cards/${id}/offers?limit=100`,
          { cache: "no-store" }
        );

        const data = await response.json();

        if (!response.ok || data.success === false) {
          throw new Error(
            data.error ?? "Não foi possível buscar ofertas."
          );
        }

        const universalOffers = data?.marketplaces?.offers;

        const marketplaceResults = data?.marketplaces?.results;

        if (Array.isArray(marketplaceResults)) {
        setMarketplaceStatuses(
        marketplaceResults.map((result: MarketplaceStatus) => ({
        marketplace: result.marketplace,
        marketplaceName: result.marketplaceName,
        status: result.status,
        error: result.error ?? null,
        total: result.total ?? 0,
    }))
  );
}

        if (Array.isArray(universalOffers)) {
          setOffers(universalOffers);
        } else {
          // Compatibilidade com a resposta antiga enquanto a migração termina.
          const legacyOffers = data?.sources?.cardTrader?.offers ?? [];
          setOffers(
            legacyOffers.map((offer: Offer) => ({
              ...offer,
              marketplace: "cardtrader",
              marketplaceName: "CardTrader",
            }))
          );
        }
      } catch (err) {
        setOfferError(
          err instanceof Error
            ? err.message
            : "Não foi possível buscar ofertas."
        );
      } finally {
        setLoadingOffers(false);
      }
    }

    load();
  }, [id]);

  if (loadingCard) {
    return (
      <main className="page">
        <div className="shell loading">Carregando carta...</div>
        <style jsx>{baseCss}</style>
      </main>
    );
  }

  if (cardError || !card) {
    return (
      <main className="page">
        <div className="shell loading">
          <Link href="/" className="back">← Voltar</Link>
          <div className="errorBox">{cardError || "Carta não encontrada."}</div>
        </div>
        <style jsx>{baseCss}</style>
      </main>
    );
  }

  const image = card.imageLarge ?? card.image;
  const collectorNumber =
    card.displayNumber ?? card.printedNumber ?? card.number;

  const cardTraderOffers = offers.filter(
    (offer) => (offer.marketplace ?? "cardtrader") === "cardtrader"
  );
  const ebayOffers = offers.filter(
    (offer) => offer.marketplace === "ebay"
  );

  const cardTraderStatus = marketplaceStatuses.find(
  (marketplace) => marketplace.marketplace === "cardtrader"
  );

  const ebayStatus = marketplaceStatuses.find(
  (marketplace) => marketplace.marketplace === "ebay"
  );

  const sourceOffers = offers.filter((offer) => {
    if (sourceFilter === "all") return true;
    return (offer.marketplace ?? "cardtrader") === sourceFilter;
  });

  const availableLanguages = Array.from(
    new Set(
      sourceOffers
        .map((offer) => String(offer.language ?? "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => languageLabel(a).localeCompare(languageLabel(b), "pt-BR"));

  const filteredOffers = sourceOffers.filter((offer) => {
    const condition = conditionInfo(offer.condition);
    const matchesCondition =
      conditionFilter === "all" || condition.tone === conditionFilter;
    const matchesLanguage =
      languageFilter === "all" ||
      String(offer.language ?? "").trim() === languageFilter;

    return matchesCondition && matchesLanguage;
  });

  const displayedOffers = [...filteredOffers].sort((a, b) => {
    const aBRL = offerPriceBRL(a);
    const bBRL = offerPriceBRL(b);

    if (aBRL == null && bBRL == null) {
      return sortOrder === "asc" ? a.price - b.price : b.price - a.price;
    }

    if (aBRL == null) return 1;
    if (bBRL == null) return -1;

    return sortOrder === "asc" ? aBRL - bBRL : bBRL - aBRL;
  });

  const totalPages = Math.max(1, Math.ceil(displayedOffers.length / offersPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * offersPerPage;
  const paginatedOffers = displayedOffers.slice(
    pageStart,
    pageStart + offersPerPage
  );

  const comparablePricesBRL = filteredOffers
    .map((offer) => offerPriceBRL(offer))
    .filter((value): value is number => value != null);

  const minPrice =
    comparablePricesBRL.length > 0
      ? Math.min(...comparablePricesBRL)
      : null;

  const averagePrice =
    comparablePricesBRL.length > 0
      ? comparablePricesBRL.reduce((sum, value) => sum + value, 0) /
        comparablePricesBRL.length
      : null;

  const maxPrice =
    comparablePricesBRL.length > 0
      ? Math.max(...comparablePricesBRL)
      : null;

  const formatPrice = (value: number) =>
    value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <main className="page">
      <header className="topbar">
        <div className="shell nav">
          <Link href="/" className="brand">
            <span className="brandBall"><span /></span>
            <span>POKÉMON <b>PRICE</b></span>
          </Link>

          <nav className="navLinks">
            <Link href="/">Buscar</Link>
            <span>Cartas</span>
            <span className="muted">Comparador</span>
          </nav>

          <div className="statusPill">
            <span className="statusDot" />
            {cardTraderStatus?.status === "error"
                  ? "CardTrader indisponível"
                  : cardTraderStatus?.status === "disabled"
                    ? "CardTrader desativado"
                    : cardTraderStatus?.status === "active"
                      ? "CardTrader ativo"
                      : "CardTrader carregando"}
          </div>
        </div>
      </header>

      <div className="shell content">
        <Link href="/" className="back">← Voltar para a busca</Link>

        <section className="cardHero">
          <div className="leftColumn">
            <div className="imagePanel">
              {image ? (
                <img src={image} alt={card.name} className="cardImage" />
              ) : (
                <div className="noImage">Sem imagem</div>
              )}
            </div>
          </div>

          <div className="cardInfo">
            <div className="setBadge">{card.set?.name ?? "Pokémon TCG"}</div>

            <h1>{card.name}</h1>

            <div className="identity">
              <strong>#{collectorNumber}</strong>
              {card.rarity && <span className="rarityBadge">{card.rarity}</span>}
            </div>

            <div className="metaPanel">
              <div className="metaRow">
                <span>Coleção</span>
                <strong>{card.set?.name ?? "—"}</strong>
              </div>
              <div className="metaRow">
                <span>Número</span>
                <strong>#{collectorNumber}</strong>
              </div>
              <div className="metaRow">
                <span>Raridade</span>
                <strong>{card.rarity ?? "—"}</strong>
              </div>
              <div className="metaRow">
                <span>HP</span>
                <strong>{card.hp ?? "—"}</strong>
              </div>
              <div className="metaRow">
                <span>Artista</span>
                <strong>{card.artist ?? "—"}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="compareSection">
          <div className="sectionHeading">
            <div>
              <span className="kicker">MARKETPLACES</span>
              <h2>Comparar preços</h2>
              <p>Ofertas reais desta carta em diferentes marketplaces.</p>
            </div>

            {!loadingOffers && !offerError && (
              <div className="offerCount">{filteredOffers.length} de {sourceOffers.length} ofertas</div>
            )}
          </div>

          <div className="sourceTabs">
            <button
              type="button"
              className={`sourceTab ${sourceFilter === "all" ? "active" : ""}`}
              onClick={() => setSourceFilter("all")}
            >
              Todas
              {!loadingOffers && !offerError && <b>{offers.length}</b>}
            </button>

            <button
              type="button"
              className={`sourceTab ${sourceFilter === "cardtrader" ? "active" : ""}`}
              onClick={() => setSourceFilter("cardtrader")}
            >
              <span className="sourceMark">CT</span>
              CardTrader
              {!loadingOffers && !offerError && <b>{cardTraderOffers.length}</b>}
            </button>

            <button
              type="button"
              className={`sourceTab ${sourceFilter === "ebay" ? "active" : ""} ${ebayOffers.length === 0 ? "pending" : ""}`}
              onClick={() => setSourceFilter("ebay")}
            >
              <span className="sourceMark">eB</span>
              eBay
              {!loadingOffers && !offerError && (
                ebayStatus?.status === "active" && ebayOffers.length > 0 ? (
                  <b>{ebayOffers.length}</b>
                ) : (
                  <span className="pendingLabel">
                    {ebayStatus?.status === "error"
                      ? "Indisponível"
                      : ebayStatus?.status === "active"
                        ? `${ebayOffers.length} ofertas`
                        : "Aguardando ativação"}
                  </span>
                )
              )}
            </button>
          </div>

          {!loadingOffers && !offerError && sourceOffers.length > 0 && (
            <div className="offerFilters">
              <label className="filterField">
                <span>CONDIÇÃO</span>
                <select value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)}>
                  <option value="all">Todas as condições</option>
                  <option value="nm">NM · Near Mint</option>
                  <option value="sp">SP · Slightly Played / Excellent</option>
                  <option value="mp">MP · Moderately Played / Good</option>
                  <option value="pl">PL · Played</option>
                  <option value="po">PO · Poor</option>
                </select>
              </label>

              <label className="filterField">
                <span>IDIOMA</span>
                <select value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)}>
                  <option value="all">Todos os idiomas</option>
                  {availableLanguages.map((language) => (
                    <option value={language} key={language}>{languageLabel(language)}</option>
                  ))}
                </select>
              </label>

              <label className="filterField">
                <span>ORDENAR</span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                >
                  <option value="asc">Menor preço</option>
                  <option value="desc">Maior preço</option>
                </select>
              </label>

              <button
                type="button"
                className="clearFilters"
                onClick={() => {
                  setConditionFilter("all");
                  setLanguageFilter("all");
                  setSortOrder("asc");
                }}
              >
                Limpar filtros
              </button>
            </div>
          )}

          {loadingOffers && (
            <div className="neutralBox">Buscando ofertas...</div>
          )}

          {!loadingOffers && offerError && (
            <div className="neutralBox">
              <strong>Sem ofertas compatíveis por enquanto.</strong>
              <span>{offerError}</span>
            </div>
          )}

          {!loadingOffers && !offerError && sourceOffers.length === 0 && (
            <div className="neutralBox">
              {sourceFilter === "ebay" ? (
                <>
                  <strong>eBay aguardando ativação.</strong>
                  <span>
                    A integração já está preparada. As ofertas aparecerão aqui
                    assim que o acesso à Browse API em produção for liberado.
                  </span>
                </>
              ) : (
                "Nenhuma oferta encontrada."
              )}
            </div>
          )}

          {!loadingOffers && !offerError && sourceOffers.length > 0 && filteredOffers.length === 0 && (
            <div className="neutralBox">
              Nenhuma oferta corresponde aos filtros selecionados.
            </div>
          )}

          {!loadingOffers && !offerError && filteredOffers.length > 0 && (
            <>
              <div className="tableWrap">
                <div className="offerTable">
                  <div className="tableHeader">
                    <span>#</span>
                    <span>Loja</span>
                    <span>Vendedor</span>
                    <span>Condição</span>
                    <span>Idioma</span>
                    <span>País</span>
                    <span className="right">Preço</span>
                    <span />
                  </div>

                  {paginatedOffers.map((offer, index) => {
                    const condition = conditionInfo(offer.condition);
                    const country = countryInfo(offer.sellerCountry);

                    return (
                    <div
                      className={`offerRow ${offerPriceBRL(offer) === minPrice ? "bestOffer" : ""}`}
                      key={offer.id}
                    >
                      <span className="rank">{pageStart + index + 1}</span>

                      <span className={`marketplaceBadge marketplace-${offer.marketplace ?? "cardtrader"}`}>
                        {offer.marketplaceName ??
                          ((offer.marketplace ?? "cardtrader") === "ebay"
                            ? "eBay"
                            : "CardTrader")}
                      </span>

                      <div className="sellerCell">
                        <strong className="seller">
                          {offer.seller ?? "Vendedor"}
                        </strong>
                        {offerPriceBRL(offer) === minPrice && (
                          <span className="bestBadge">Menor preço</span>
                        )}
                      </div>

                      <span className={`condition condition-${condition.tone}`}>
                        {condition.label}
                      </span>

                      <span>{languageLabel(offer.language)}</span>
                      <span className="country">
                        <span>{country.flag}</span>
                        {country.label}
                      </span>

                      <div className="priceCell">
                        <strong className="price">
                          {offerPriceBRL(offer) != null
                            ? formatPrice(offerPriceBRL(offer)!)
                            : `${offer.currency} ${offer.price.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`}
                        </strong>

                        {offer.currency?.toUpperCase() !== "BRL" &&
                          offerPriceBRL(offer) != null && (
                            <small className="originalPrice">
                              {offer.currency} {offer.price.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </small>
                          )}
                      </div>

                      {offer.url ? (
                        <a
                          href={offer.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="offerLink"
                        >
                          Ver oferta →
                        </a>
                      ) : (
                        <span />
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <div className="paginationInfo">
                    Exibindo {pageStart + 1}–{Math.min(pageStart + offersPerPage, displayedOffers.length)} de {displayedOffers.length}
                  </div>

                  <div className="paginationControls">
                    <button
                      type="button"
                      className="pageButton"
                      disabled={safeCurrentPage === 1}
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    >
                      ← Anterior
                    </button>

                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                      <button
                        type="button"
                        key={page}
                        className={`pageNumber ${page === safeCurrentPage ? "active" : ""}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      type="button"
                      className="pageButton"
                      disabled={safeCurrentPage === totalPages}
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    >
                      Próxima →
                    </button>
                  </div>
                </div>
              )}

              <div className="summaryGrid">
                <div className="summaryCard">
                  <span>Menor preço</span>
                  <strong className="good">
                    {minPrice != null ? formatPrice(minPrice) : "—"}
                  </strong>
                  <small>Entre as ofertas filtradas</small>
                </div>

                <div className="summaryCard">
                  <span>Preço médio</span>
                  <strong>
                    {averagePrice != null ? formatPrice(averagePrice) : "—"}
                  </strong>
                  <small>Média das ofertas filtradas</small>
                </div>

                <div className="summaryCard">
                  <span>Maior preço</span>
                  <strong>
                    {maxPrice != null ? formatPrice(maxPrice) : "—"}
                  </strong>
                  <small>Entre as ofertas filtradas</small>
                </div>

                <div className="summaryCard sourceSummary">
                  <span>Fonte ativa</span>
                  <strong>
                    {sourceFilter === "all"
                      ? "Todas"
                      : sourceFilter === "ebay"
                        ? "eBay"
                        : "CardTrader"}
                  </strong>
                  <small>
                    {sourceFilter === "all"
                      ? `${cardTraderOffers.length} CardTrader · ${ebayOffers.length} eBay`
                      : sourceFilter === "ebay"
                        ? "Integração aguardando liberação"
                        : `${cardTraderOffers.length} ofertas disponíveis`}
                  </small>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <footer className="footer">
        <div className="shell footerInner">
          <div className="brand">
            <span className="brandBall"><span /></span>
            <span>POKÉMON <b>PRICE</b></span>
          </div>
          <span>Compare preços. Escolha melhor.</span>
        </div>
      </footer>

      <style jsx>{baseCss}</style>
    </main>
  );
}

const baseCss = `
  * { box-sizing: border-box; }

  .page {
    min-height: 100vh;
    color: #f5f9fd;
    background:
      radial-gradient(circle at 78% 8%, rgba(0, 151, 255, .11), transparent 24%),
      #06101a;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .shell {
    width: min(1180px, calc(100% - 40px));
    margin: 0 auto;
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 20;
    border-bottom: 1px solid rgba(128, 161, 190, .12);
    background: rgba(5, 13, 23, .86);
    backdrop-filter: blur(16px);
  }

  .nav {
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    color: #f5f9fd;
    text-decoration: none;
    font-size: 14px;
    font-weight: 900;
  }

  .brand b { color: #3bb8ff; }

  .brandBall {
    width: 27px;
    height: 27px;
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #d8e6f1;
    border-radius: 50%;
    overflow: hidden;
  }

  .brandBall:before {
    content: "";
    position: absolute;
    width: 100%;
    height: 2px;
    background: #d8e6f1;
  }

  .brandBall span {
    width: 7px;
    height: 7px;
    z-index: 1;
    border: 2px solid #06101a;
    border-radius: 50%;
    background: #3bb8ff;
  }

  .navLinks {
    display: flex;
    gap: 28px;
    color: #9bafc1;
    font-size: 13px;
  }

  .navLinks a { color: inherit; text-decoration: none; }
  .navLinks .muted { opacity: .5; }

  .statusPill {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 11px;
    color: #9bd9ff;
    border: 1px solid rgba(59, 184, 255, .3);
    border-radius: 999px;
    background: rgba(16, 89, 137, .13);
    font-size: 11px;
    font-weight: 800;
  }

  .statusDot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #39d98a;
    box-shadow: 0 0 12px rgba(57, 217, 138, .8);
  }

  .content { padding: 32px 0 72px; }

  .back {
    display: inline-block;
    margin-bottom: 30px;
    color: #91a7ba;
    text-decoration: none;
    font-size: 14px;
  }

  .back:hover { color: #fff; }

  .cardHero {
    display: grid;
    grid-template-columns: minmax(280px, 390px) 1fr;
    gap: 54px;
    align-items: center;
  }

  .imagePanel {
    min-height: 500px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    border: 1px solid rgba(128, 161, 190, .18);
    border-radius: 22px;
    background:
      radial-gradient(circle at 50% 30%, rgba(44, 151, 224, .13), transparent 44%),
      rgba(9, 24, 38, .8);
  }

  .cardImage {
    display: block;
    max-width: 100%;
    max-height: 465px;
    border-radius: 13px;
    box-shadow: 0 20px 55px rgba(0, 0, 0, .35);
  }

  .noImage { color: #71869a; }

  .cardInfo { max-width: 610px; }

  .setBadge {
    display: inline-flex;
    padding: 7px 10px;
    color: #72ccff;
    border: 1px solid rgba(57, 181, 255, .32);
    border-radius: 999px;
    background: rgba(17, 93, 143, .12);
    font-size: 12px;
    font-weight: 900;
  }

  h1 {
    margin: 15px 0 12px;
    font-size: clamp(48px, 7vw, 78px);
    line-height: .98;
    letter-spacing: -3px;
  }

  .identity {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-bottom: 27px;
    color: #53c0ff;
  }

  .identity > strong { font-size: 15px; }

  .rarityBadge {
    display: inline-flex;
    align-items: center;
    width: fit-content;
    padding: 6px 9px;
    border: 1px solid rgba(59, 184, 255, .32);
    border-radius: 999px;
    color: #a7dcfb;
    background: rgba(17, 93, 143, .11);
    font-size: 11px;
    font-weight: 800;
  }

  .metaPanel {
    overflow: hidden;
    border: 1px solid rgba(128, 161, 190, .16);
    border-radius: 17px;
    background: rgba(9, 23, 36, .72);
  }

  .metaRow {
    min-height: 51px;
    display: grid;
    grid-template-columns: 130px 1fr;
    align-items: center;
    gap: 18px;
    padding: 0 18px;
    border-bottom: 1px solid rgba(128, 161, 190, .1);
  }

  .metaRow:last-child { border-bottom: 0; }
  .metaRow span { color: #8197aa; font-size: 12px; }
  .metaRow strong { font-size: 13px; }

  .compareSection { margin-top: 46px; }

  .sectionHeading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 20px;
  }

  .kicker {
    color: #43baff;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 1.7px;
  }

  h2 {
    margin: 6px 0 4px;
    font-size: 34px;
    letter-spacing: -1px;
  }

  .sectionHeading p {
    margin: 0;
    color: #8095a8;
    font-size: 13px;
  }

  .offerCount {
    padding: 8px 11px;
    border: 1px solid rgba(128, 161, 190, .16);
    border-radius: 999px;
    color: #a3b7c8;
    background: rgba(9, 23, 36, .72);
    font-size: 11px;
    font-weight: 800;
  }

  .sourceTabs {
    display: flex;
    gap: 9px;
    margin-bottom: 14px;
  }

  .sourceTab {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 0 17px;
    border: 1px solid rgba(128, 161, 190, .18);
    border-radius: 11px;
    color: #a8bbca;
    background: rgba(9, 23, 36, .7);
    font-weight: 800;
  }

  .sourceTab.active {
    color: #8dd5ff;
    border-color: rgba(50, 174, 247, .48);
    background: rgba(17, 105, 163, .15);
    box-shadow: inset 0 -2px 0 #31b3ff;
  }

  .sourceTab b {
    min-width: 21px;
    height: 21px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    color: #04111c;
    background: #3bb8ff;
    font-size: 10px;
  }

  .sourceMark {
    font-size: 10px;
    font-weight: 950;
  }

  .sourceTab.pending { opacity: .72; }

  .pendingLabel {
    color: #71899e;
    font-size: 9px;
    font-weight: 800;
  }

  .marketplaceBadge {
    display: inline-flex;
    align-items: center;
    width: fit-content;
    padding: 5px 8px;
    border: 1px solid rgba(128, 161, 190, .26);
    border-radius: 999px;
    font-size: 9px;
    font-weight: 950;
    white-space: nowrap;
  }

  .marketplace-cardtrader {
    color: #83d3ff;
    border-color: rgba(59, 184, 255, .42);
    background: rgba(27, 132, 201, .11);
  }

  .marketplace-ebay {
    color: #f4d36b;
    border-color: rgba(244, 211, 107, .38);
    background: rgba(166, 133, 24, .1);
  }


  .offerFilters {
    display: grid;
    grid-template-columns: 1.25fr 1fr 1fr auto;
    gap: 12px;
    align-items: end;
    margin: 0 0 14px;
    padding: 14px;
    border: 1px solid rgba(128, 161, 190, .17);
    border-radius: 15px;
    background: rgba(8, 21, 34, .78);
  }

  .filterField {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .filterField > span {
    color: #71899e;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: .8px;
  }

  .filterField select {
    width: 100%;
    min-height: 40px;
    padding: 0 34px 0 11px;
    color: #dcebf5;
    border: 1px solid rgba(59, 184, 255, .28);
    border-radius: 9px;
    outline: none;
    background: #0a1b2a;
    font: inherit;
    font-size: 11px;
    cursor: pointer;
  }

  .filterField select:focus {
    border-color: rgba(59, 184, 255, .72);
    box-shadow: 0 0 0 3px rgba(59, 184, 255, .08);
  }

  .clearFilters {
    min-height: 40px;
    padding: 0 14px;
    border: 1px solid rgba(128, 161, 190, .22);
    border-radius: 9px;
    color: #9eb2c2;
    background: rgba(12, 30, 45, .78);
    font-weight: 800;
    cursor: pointer;
    white-space: nowrap;
  }

  .clearFilters:hover {
    color: #fff;
    border-color: rgba(59, 184, 255, .4);
  }



  .condition {
    display: inline-flex;
    align-items: center;
    width: fit-content;
    padding: 6px 9px;
    border: 1px solid;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 900;
    white-space: nowrap;
  }

  .condition-nm {
    color: #72e7a8;
    border-color: rgba(55, 211, 128, .48);
    background: rgba(28, 155, 91, .12);
  }

  .condition-sp {
    color: #83d3ff;
    border-color: rgba(59, 184, 255, .48);
    background: rgba(27, 132, 201, .12);
  }

  .condition-mp {
    color: #ffd66f;
    border-color: rgba(242, 190, 48, .5);
    background: rgba(188, 137, 18, .12);
  }

  .condition-pl {
    color: #ff9a91;
    border-color: rgba(239, 87, 76, .48);
    background: rgba(190, 51, 42, .12);
  }

  .condition-po {
    color: #ff746d;
    border-color: rgba(255, 75, 66, .62);
    background: rgba(203, 42, 34, .17);
  }

  .condition-unknown {
    color: #a7bac9;
    border-color: rgba(128, 161, 190, .3);
    background: rgba(128, 161, 190, .08);
  }

  .sellerCell {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .bestBadge {
    display: inline-flex;
    align-items: center;
    padding: 4px 7px;
    border-radius: 999px;
    color: #63e69d;
    border: 1px solid rgba(57, 217, 138, .4);
    background: rgba(28, 155, 91, .12);
    font-size: 9px;
    font-weight: 900;
    white-space: nowrap;
  }

  .bestOffer {
    background: linear-gradient(90deg, rgba(30, 137, 86, .07), transparent 48%);
    box-shadow: inset 3px 0 0 rgba(57, 217, 138, .7);
  }

  .country {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }

  .tableWrap {
    overflow-x: auto;
    border: 1px solid rgba(128, 161, 190, .17);
    border-radius: 16px;
    background: rgba(8, 21, 34, .78);
  }

  .offerTable { min-width: 900px; }

  .tableHeader,
  .offerRow {
    display: grid;
    grid-template-columns: 38px .85fr 1.25fr 1.35fr .75fr .95fr .95fr 120px;
    gap: 12px;
    align-items: center;
    padding: 0 16px;
  }

  .tableHeader {
    min-height: 43px;
    color: #6f8599;
    border-bottom: 1px solid rgba(128, 161, 190, .12);
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .5px;
  }

  .offerRow {
    min-height: 67px;
    color: #a7bac9;
    border-bottom: 1px solid rgba(128, 161, 190, .1);
    font-size: 12px;
  }

  .offerRow:last-child { border-bottom: 0; }

  .rank { color: #61788c; font-weight: 900; }
  .seller { color: #f1f6fa; font-size: 13px; }
  .right { text-align: right; }

  .priceCell {
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 3px;
  }

  .price {
    color: #f8fbfd;
    text-align: right;
    white-space: nowrap;
    font-size: 15px;
  }

  .originalPrice {
    color: #61788c;
    font-size: 9px;
    font-weight: 700;
    white-space: nowrap;
  }

  .offerLink {
    min-height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    border: 1px solid rgba(59, 184, 255, .55);
    border-radius: 9px;
    color: #79d0ff;
    background: rgba(12, 79, 124, .13);
    text-decoration: none;
    font-size: 11px;
    font-weight: 900;
    white-space: nowrap;
  }

  .offerLink:hover {
    color: #04111c;
    background: #3bb8ff;
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 14px;
    padding: 12px 14px;
    border: 1px solid rgba(128, 161, 190, .14);
    border-radius: 13px;
    background: rgba(9, 23, 36, .68);
  }

  .paginationInfo {
    color: #71899e;
    font-size: 11px;
    font-weight: 700;
  }

  .paginationControls {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .pageButton,
  .pageNumber {
    min-height: 34px;
    border: 1px solid rgba(59, 184, 255, .28);
    border-radius: 8px;
    color: #9fc8df;
    background: rgba(10, 27, 42, .9);
    font-size: 11px;
    font-weight: 800;
    cursor: pointer;
  }

  .pageButton { padding: 0 12px; }
  .pageNumber { min-width: 34px; padding: 0 8px; }

  .pageButton:hover:not(:disabled),
  .pageNumber:hover,
  .pageNumber.active {
    color: #04111c;
    border-color: #3bb8ff;
    background: #3bb8ff;
  }

  .pageButton:disabled {
    opacity: .35;
    cursor: not-allowed;
  }

  .summaryGrid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-top: 14px;
  }

  .summaryCard {
    min-height: 125px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 18px;
    border: 1px solid rgba(128, 161, 190, .14);
    border-radius: 15px;
    background: rgba(9, 23, 36, .68);
  }

  .summaryCard > span {
    color: #788fa3;
    font-size: 11px;
  }

  .summaryCard strong {
    margin: 7px 0 5px;
    font-size: 21px;
  }

  .summaryCard strong.good { color: #49dc91; }

  .summaryCard small {
    color: #61788c;
    font-size: 10px;
  }

  .sourceSummary strong { color: #45baff; }

  .neutralBox,
  .errorBox {
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding: 20px;
    border: 1px solid rgba(128, 161, 190, .16);
    border-radius: 15px;
    color: #a4b7c7;
    background: rgba(9, 23, 36, .72);
  }

  .errorBox {
    color: #ff9da8;
    border-color: rgba(192, 68, 80, .34);
    background: rgba(58, 18, 23, .5);
  }

  .loading { padding-top: 60px; }

  .footer {
    border-top: 1px solid rgba(128, 161, 190, .1);
    background: rgba(4, 12, 20, .76);
  }

  .footerInner {
    min-height: 92px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #71869a;
    font-size: 11px;
  }

  @media (max-width: 820px) {
    .shell { width: min(100% - 28px, 1180px); }
    .navLinks, .statusPill { display: none; }

    .cardHero {
      grid-template-columns: 1fr;
      gap: 28px;
    }

    .imagePanel { min-height: 420px; }
    .cardImage { max-height: 390px; }

    h1 {
      font-size: clamp(43px, 13vw, 68px);
      letter-spacing: -2px;
    }

    .summaryGrid { grid-template-columns: repeat(2, 1fr); }
    .offerFilters { grid-template-columns: 1fr 1fr; }
    .clearFilters { width: 100%; }

    .sectionHeading {
      align-items: flex-start;
      flex-direction: column;
    }

    .footerInner {
      align-items: flex-start;
      flex-direction: column;
      gap: 15px;
      padding: 24px 0;
    }
  }

  @media (max-width: 520px) {
    .content { padding-top: 24px; }

    .imagePanel {
      min-height: 360px;
      padding: 16px;
    }

    .cardImage { max-height: 335px; }

    .metaRow {
      grid-template-columns: 90px 1fr;
      gap: 12px;
    }

    .sourceTabs { overflow-x: auto; }
    .summaryGrid { grid-template-columns: 1fr; }
    .offerFilters { grid-template-columns: 1fr; }
  }
`;
