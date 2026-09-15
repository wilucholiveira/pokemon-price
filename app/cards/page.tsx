"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type CardResult = {
  id: string;
  name: string;
  originalName?: string;
  number: string;
  printedNumber?: string | null;
  displayNumber?: string | null;
  isSpecial?: boolean;
  rarity?: string | null;
  image?: string | null;
  set?: {
    id: string;
    name: string;
    originalName?: string;
  };
};

const examples = [
  "Charizard 199/165",
  "Pikachu",
  "Eevee 050/064",
  "151",
];

export default function CardsPage() {
  const [query, setQuery] = useState("");
  const [cards, setCards] = useState<CardResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [selectedSet, setSelectedSet] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [rarityFilter, setRarityFilter] = useState("");
  const [specialFilter, setSpecialFilter] = useState("");

  const resultLabel = useMemo(() => {
    if (!searched || loading || error) return "";
    if (cards.length === 0) return "Nenhuma carta encontrada";
    const count = total || cards.length;
    return `${count.toLocaleString("pt-BR")} ${count === 1 ? "resultado" : "resultados"}`;
  }, [cards.length, total, searched, loading, error]);

  async function runSearch(
    q: string,
    options?: { set?: string; page?: number; rarity?: string; special?: string }
  ) {
    const search = q.trim();
    const setFilter = options?.set?.trim() ?? "";
    const requestedPage = options?.page ?? 1;
    const rarity = options?.rarity ?? rarityFilter;
    const special = options?.special ?? specialFilter;

    if (!search && !setFilter) return;

    setLoading(true);
    setError("");
    setSearched(true);

    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (setFilter) params.set("set", setFilter);
      if (rarity) params.set("rarity", rarity);
      if (special) params.set("special", special);
      params.set("limit", "20");
      params.set("page", String(requestedPage));

      const response = await fetch(
        `/api/cards/search?${params.toString()}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.error ?? "Erro ao pesquisar cartas.");
      }

      const results = data.cards ?? data.data ?? data.results ?? [];
      const pagination = data.pagination ?? {};

      setCards(Array.isArray(results) ? results : []);
      setSelectedSet(setFilter);
      setPage(Number(pagination.page ?? requestedPage));
      setTotal(Number(pagination.total ?? (Array.isArray(results) ? results.length : 0)));
      setTotalPages(Number(pagination.totalPages ?? 1));
    } catch (err) {
      setCards([]);
      setTotal(0);
      setTotalPages(0);
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao pesquisar cartas."
      );
    } finally {
      setLoading(false);
    }
  }

  async function searchCards(event: FormEvent) {
    event.preventDefault();
    await runSearch(query, { page: 1 });
  }

  async function searchExample(value: string) {
    setQuery(value);
    setSelectedSet("");
    setRarityFilter("");
    setSpecialFilter("");
    await runSearch(value, { page: 1, rarity: "", special: "" });
  }

  async function exploreCollection(setName: string) {
    setQuery("");
    setSelectedSet(setName);
    setRarityFilter("");
    setSpecialFilter("");
    await runSearch("", { set: setName, page: 1, rarity: "", special: "" });
    requestAnimationFrame(() => {
      document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth" });
    });
  }

  async function changePage(nextPage: number) {
    if (loading || nextPage < 1 || nextPage > totalPages) return;
    await runSearch(query, {
      set: selectedSet || undefined,
      page: nextPage,
      rarity: rarityFilter,
      special: specialFilter,
    });
    requestAnimationFrame(() => {
      document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth" });
    });
  }

  async function applyFilters(nextRarity: string, nextSpecial: string) {
    setRarityFilter(nextRarity);
    setSpecialFilter(nextSpecial);

    await runSearch(query, {
      set: selectedSet || undefined,
      page: 1,
      rarity: nextRarity,
      special: nextSpecial,
    });

    requestAnimationFrame(() => {
      document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth" });
    });
  }

  return (
    <main className="page">
      <header className="topbar">
        <div className="shell nav">
          <Link href="/" className="brand" aria-label="Pokémon Price">
            <span className="brandBall" aria-hidden="true">
              <span />
            </span>
            <span>POKÉMON <b>PRICE</b></span>
          </Link>

          <nav className="navLinks" aria-label="Navegação principal">
            <Link href="/">Buscar</Link>
            <Link href="/cards" className="activeNav">Cartas</Link>
            <span className="mutedNav">Comparador</span>
          </nav>

          <div className="statusPill">
            <span className="statusDot" />
            CardTrader ativo
          </div>
        </div>
      </header>

      <section className="hero" id="buscar">
        <div className="heroGlow" />
        <div className="shell heroInner">
          <div className="eyebrow">CATÁLOGO DE CARTAS</div>

          <h1>
            Explore cartas.
            <span> Encontre a impressão certa.</span>
          </h1>

          <p className="heroText">
            Navegue pelo catálogo por nome, coleção ou código completo e abra
            a impressão exata para comparar preços.
          </p>

          <form onSubmit={searchCards} className="searchBox">
            <div className="searchIcon" aria-hidden="true">⌕</div>

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nome, coleção ou código (ex.: Charizard ou 199/165)"
              aria-label="Pesquisar carta Pokémon"
            />

            <button type="submit" disabled={loading}>
              {loading ? "Buscando..." : "Buscar"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="examples">
            <span className="exampleLabel">Exemplos:</span>
            {examples.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => searchExample(item)}
                disabled={loading}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="benefits">
            <div className="benefit">
              <div className="benefitIcon">₿</div>
              <div>
                <strong>Catálogo visual</strong>
                <span>Encontre diferentes impressões da mesma carta.</span>
              </div>
            </div>

            <div className="benefit">
              <div className="benefitIcon">↕</div>
              <div>
                <strong>Identifique a impressão</strong>
                <span>Confira coleção, número e raridade antes de abrir.</span>
              </div>
            </div>

            <div className="benefit">
              <div className="benefitIcon">✓</div>
              <div>
                <strong>Vá direto aos preços</strong>
                <span>Abra a carta escolhida e compare as ofertas disponíveis.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="resultsSection shell" id="resultados">
        <div className="sectionHeader">
          <div>
            <span className="sectionKicker">
              {searched ? "CARTAS ENCONTRADAS" : "CATÁLOGO"}
            </span>
            <h2>
              {searched
                ? selectedSet
                  ? `Coleção ${selectedSet}`
                  : query.trim()
                    ? `Resultados para “${query.trim()}”`
                    : "Resultados"
                : "Explore o catálogo Pokémon"}
            </h2>
            <p>
              {searched
                ? "Selecione a carta correta para comparar as ofertas disponíveis."
                : "Busque diretamente uma carta ou comece por uma das coleções em destaque."}
            </p>
          </div>

          {resultLabel && <div className="resultCount">{resultLabel}</div>}
        </div>

        {error && <div className="message error">{error}</div>}

        {!loading && searched && !error && cards.length === 0 && (
          <div className="emptyState">
            <div className="emptyIcon">⌕</div>
            <strong>Nenhuma carta encontrada</strong>
            <span>Tente outro nome, coleção ou número.</span>
          </div>
        )}

        {!searched && (
          <div className="collectionExplorer">
            <div className="collectionHeading">
              <div>
                <span className="sectionKicker">EXPLORAR POR COLEÇÃO</span>
                <h3>Coleções em destaque</h3>
                <p>Escolha uma coleção para começar a explorar o catálogo.</p>
              </div>
            </div>

            <div className="collectionGrid">
              {[
                { name: "151", code: "MEW", era: "Scarlet & Violet" },
                { name: "Obsidian Flames", code: "OBF", era: "Scarlet & Violet" },
                { name: "Paldea Evolved", code: "PAL", era: "Scarlet & Violet" },
                { name: "Shrouded Fable", code: "SFA", era: "Scarlet & Violet" },
                { name: "Pokémon GO", code: "PGO", era: "Sword & Shield" },
                { name: "Base Set", code: "BS", era: "Classic" },
              ].map((set) => (
                <button
                  key={set.name}
                  type="button"
                  className="collectionCard"
                  onClick={() => exploreCollection(set.name)}
                >
                  <span className="collectionCode">{set.code}</span>
                  <strong>{set.name}</strong>
                  <span className="collectionEra">{set.era}</span>
                  <span className="collectionAction">Explorar →</span>
                </button>
              ))}
            </div>

            <div className="collectionNote">
              Clique em uma coleção para carregar as cartas diretamente pelo filtro real da API.
            </div>
          </div>
        )}

        {searched && !error && (
          <div className="filtersBar">
            <div className="filterGroup">
              <label htmlFor="rarityFilter">Raridade</label>
              <select
                id="rarityFilter"
                value={rarityFilter}
                disabled={loading}
                onChange={(event) =>
                  applyFilters(event.target.value, specialFilter)
                }
              >
                <option value="">Todas</option>
                <option value="Common">Common</option>
                <option value="Uncommon">Uncommon</option>
                <option value="Rare">Rare</option>
                <option value="Double Rare">Double Rare</option>
                <option value="Ultra Rare">Ultra Rare</option>
                <option value="Illustration Rare">Illustration Rare</option>
                <option value="Special Illustration Rare">Special Illustration Rare</option>
              </select>
            </div>

            <div className="filterGroup">
              <label htmlFor="specialFilter">Numeração</label>
              <select
                id="specialFilter"
                value={specialFilter}
                disabled={loading}
                onChange={(event) =>
                  applyFilters(rarityFilter, event.target.value)
                }
              >
                <option value="">Todas</option>
                <option value="false">Regulares</option>
                <option value="true">★ Especiais</option>
              </select>
            </div>

            {(rarityFilter || specialFilter) && (
              <button
                type="button"
                className="clearFilters"
                disabled={loading}
                onClick={() => applyFilters("", "")}
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}

        <div className="cardGrid">
          {cards.map((card) => {
            const number =
              card.displayNumber ??
              card.printedNumber ??
              card.number;

            return (
              <Link
                key={card.id}
                href={`/cards/${card.id}`}
                className="card"
              >
                <div className="imageArea">
                  {card.image ? (
                    <img src={card.image} alt={card.name} />
                  ) : (
                    <div className="noImage">Sem imagem</div>
                  )}

                  {card.isSpecial && (
                    <span className="specialBadge">★ Especial</span>
                  )}
                </div>

                <div className="cardBody">
                  <div className="cardTopline">
                    <span>{card.set?.name ?? "Coleção não informada"}</span>
                    <span>#{number}</span>
                  </div>

                  <strong className="cardName">{card.name}</strong>

                  <div className="cardFooter">
                    <span className="rarity">
                      {card.rarity ?? "Raridade não informada"}
                    </span>
                    <span className="viewLink">Ver carta →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {!loading && searched && !error && cards.length > 0 && totalPages > 1 && (
          <div className="pagination">
            <button
              type="button"
              onClick={() => changePage(page - 1)}
              disabled={page <= 1 || loading}
            >
              ← Anterior
            </button>

            <span>
              Página <b>{page}</b> de <b>{totalPages}</b>
            </span>

            <button
              type="button"
              onClick={() => changePage(page + 1)}
              disabled={page >= totalPages || loading}
            >
              Próxima →
            </button>
          </div>
        )}
      </section>

      <footer className="footer">
        <div className="shell footerInner">
          <div className="brand footerBrand">
            <span className="brandBall" aria-hidden="true">
              <span />
            </span>
            <span>POKÉMON <b>PRICE</b></span>
          </div>

          <span>Compare preços. Escolha melhor.</span>
        </div>
      </footer>

      <style jsx>{`
        :global(*) {
          box-sizing: border-box;
        }

        :global(html) {
          scroll-behavior: smooth;
        }

        :global(body) {
          margin: 0;
          background: #06101a;
        }

        :global(a) {
          color: inherit;
        }

        .page {
          min-height: 100vh;
          color: #f7fbff;
          background:
            radial-gradient(circle at 72% 8%, rgba(0, 153, 255, 0.13), transparent 23%),
            linear-gradient(180deg, #07111d 0%, #07101a 44%, #06101a 100%);
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
          background: rgba(5, 13, 23, 0.82);
          border-bottom: 1px solid rgba(133, 166, 197, 0.12);
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
          gap: 10px;
          color: #f8fbff;
          text-decoration: none;
          font-weight: 900;
          font-size: 15px;
          letter-spacing: 0.3px;
        }

        .brand b {
          color: #36b5ff;
        }

        .brandBall {
          width: 28px;
          height: 28px;
          border: 2px solid #d9e7f2;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .brandBall::before {
          content: "";
          position: absolute;
          width: 100%;
          height: 2px;
          background: #d9e7f2;
        }

        .brandBall span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #36b5ff;
          border: 2px solid #07111d;
          z-index: 1;
        }

        .navLinks {
          display: flex;
          align-items: center;
          gap: 28px;
          font-size: 14px;
          color: #9db0c3;
        }

        .navLinks a {
          text-decoration: none;
        }

        .navLinks a:hover {
          color: #fff;
        }

        .navLinks .activeNav {
          color: #fff;
          font-weight: 800;
        }

        .mutedNav {
          opacity: 0.55;
        }

        .statusPill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border: 1px solid rgba(57, 181, 255, 0.28);
          border-radius: 999px;
          color: #9ed9ff;
          background: rgba(19, 94, 144, 0.12);
          font-size: 12px;
          font-weight: 800;
        }

        .statusDot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #39d98a;
          box-shadow: 0 0 12px rgba(57, 217, 138, 0.9);
        }

        .hero {
          position: relative;
          overflow: hidden;
          border-bottom: 1px solid rgba(133, 166, 197, 0.11);
        }

        .heroGlow {
          position: absolute;
          width: 520px;
          height: 520px;
          top: -220px;
          right: 8%;
          border-radius: 50%;
          background: rgba(0, 153, 255, 0.12);
          filter: blur(60px);
          pointer-events: none;
        }

        .heroInner {
          position: relative;
          padding: 92px 0 64px;
        }

        .eyebrow,
        .sectionKicker {
          color: #43b9ff;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1.8px;
        }

        h1 {
          max-width: 850px;
          margin: 14px 0 18px;
          font-size: clamp(48px, 7vw, 84px);
          line-height: 0.96;
          letter-spacing: -4px;
        }

        h1 span {
          color: #35b6ff;
        }

        .heroText {
          max-width: 690px;
          margin: 0;
          color: #a9bacb;
          font-size: clamp(17px, 2.3vw, 20px);
          line-height: 1.55;
        }

        .searchBox {
          max-width: 920px;
          margin-top: 36px;
          min-height: 72px;
          display: grid;
          grid-template-columns: 42px 1fr auto;
          align-items: center;
          gap: 4px;
          padding: 7px;
          border: 1px solid rgba(78, 166, 222, 0.45);
          border-radius: 18px;
          background: rgba(11, 25, 39, 0.82);
          box-shadow:
            0 24px 70px rgba(0, 0, 0, 0.24),
            inset 0 0 0 1px rgba(255, 255, 255, 0.02);
        }

        .searchIcon {
          text-align: center;
          color: #7fa2bd;
          font-size: 25px;
        }

        .searchBox input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: none;
          background: transparent;
          color: #f6fbff;
          font-size: 16px;
          padding: 0 8px;
        }

        .searchBox input::placeholder {
          color: #6f8295;
        }

        .searchBox button {
          height: 56px;
          min-width: 126px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: 0;
          border-radius: 13px;
          background: linear-gradient(135deg, #16a9ff, #2d8df6);
          color: #03101b;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 8px 30px rgba(29, 161, 255, 0.26);
        }

        .searchBox button:disabled,
        .examples button:disabled {
          opacity: 0.55;
          cursor: wait;
        }

        .examples {
          margin-top: 14px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }

        .exampleLabel {
          color: #7890a5;
          font-size: 12px;
          margin-right: 2px;
        }

        .examples button {
          border: 1px solid rgba(120, 154, 183, 0.24);
          border-radius: 999px;
          background: rgba(13, 30, 46, 0.75);
          color: #bed0df;
          padding: 8px 11px;
          cursor: pointer;
          font-size: 12px;
        }

        .examples button:hover {
          border-color: rgba(54, 181, 255, 0.55);
          color: #fff;
        }

        .benefits {
          margin-top: 48px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .benefit {
          min-height: 110px;
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 20px;
          border: 1px solid rgba(121, 157, 188, 0.12);
          border-radius: 16px;
          background: rgba(11, 27, 42, 0.55);
        }

        .benefitIcon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: rgba(33, 138, 220, 0.16);
          color: #43b9ff;
          font-weight: 900;
        }

        .benefit strong {
          display: block;
          font-size: 14px;
          margin-bottom: 4px;
        }

        .benefit span {
          display: block;
          color: #7f93a7;
          font-size: 12px;
          line-height: 1.45;
        }

        .resultsSection {
          padding-top: 58px;
          padding-bottom: 70px;
        }

        .sectionHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 26px;
        }

        .sectionHeader h2 {
          margin: 7px 0 6px;
          font-size: clamp(27px, 4vw, 40px);
          letter-spacing: -1.2px;
        }

        .sectionHeader p {
          margin: 0;
          color: #7f93a7;
          max-width: 650px;
          line-height: 1.55;
        }

        .resultCount {
          flex: 0 0 auto;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(121, 157, 188, 0.18);
          background: rgba(14, 31, 47, 0.75);
          color: #9fb4c7;
          font-size: 12px;
          font-weight: 800;
        }

        .introGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .introCard {
          min-height: 170px;
          padding: 24px;
          border-radius: 18px;
          border: 1px solid rgba(122, 156, 188, 0.14);
          background: rgba(11, 26, 40, 0.64);
        }

        .introCard.primary {
          border-color: rgba(55, 181, 255, 0.34);
          background:
            linear-gradient(135deg, rgba(26, 127, 199, 0.18), rgba(8, 22, 35, 0.7));
        }

        .introNumber {
          color: #45baff;
          font-weight: 900;
          font-size: 12px;
          letter-spacing: 1.4px;
        }

        .introCard strong {
          display: block;
          margin-top: 34px;
          font-size: 18px;
        }

        .introCard p {
          color: #7f93a7;
          margin: 7px 0 0;
          font-size: 14px;
          line-height: 1.5;
        }

        .collectionExplorer {
          margin-top: 8px;
        }

        .collectionHeading {
          margin-bottom: 20px;
        }

        .collectionHeading h3 {
          margin: 7px 0 6px;
          font-size: 26px;
          letter-spacing: -0.7px;
        }

        .collectionHeading p {
          margin: 0;
          color: #7f93a7;
          line-height: 1.5;
        }

        .collectionGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .collectionCard {
          min-height: 170px;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          padding: 22px;
          border: 1px solid rgba(122, 156, 188, 0.16);
          border-radius: 18px;
          background:
            radial-gradient(circle at 100% 0%, rgba(53, 182, 255, 0.12), transparent 44%),
            rgba(11, 26, 40, 0.72);
          color: #f7fbff;
          cursor: pointer;
          transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
        }

        .collectionCard:hover {
          transform: translateY(-3px);
          border-color: rgba(54, 181, 255, 0.48);
          background:
            radial-gradient(circle at 100% 0%, rgba(53, 182, 255, 0.2), transparent 48%),
            rgba(11, 26, 40, 0.9);
        }

        .collectionCode {
          display: inline-flex;
          padding: 5px 8px;
          border-radius: 999px;
          border: 1px solid rgba(54, 181, 255, 0.28);
          color: #62c5ff;
          background: rgba(25, 130, 199, 0.1);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.8px;
        }

        .collectionCard strong {
          margin-top: 22px;
          font-size: 19px;
        }

        .collectionEra {
          margin-top: 5px;
          color: #7890a5;
          font-size: 12px;
        }

        .collectionAction {
          margin-top: auto;
          padding-top: 18px;
          color: #43b9ff;
          font-size: 12px;
          font-weight: 900;
        }

        .collectionNote {
          margin-top: 14px;
          color: #667d91;
          font-size: 11px;
        }

        .filtersBar {
          margin: 0 0 24px;
          display: flex;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 12px;
          padding: 16px;
          border: 1px solid rgba(122, 156, 188, 0.16);
          border-radius: 16px;
          background: rgba(10, 24, 38, 0.72);
        }

        .filterGroup {
          min-width: 210px;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .filterGroup label {
          color: #7890a5;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }

        .filterGroup select {
          height: 42px;
          padding: 0 38px 0 12px;
          border: 1px solid rgba(54, 181, 255, 0.25);
          border-radius: 11px;
          outline: none;
          background: #0b1e2e;
          color: #eaf6ff;
          font: inherit;
          font-size: 13px;
          cursor: pointer;
        }

        .filterGroup select:focus {
          border-color: rgba(54, 181, 255, 0.7);
        }

        .filterGroup select:disabled {
          opacity: 0.55;
          cursor: wait;
        }

        .clearFilters {
          height: 42px;
          padding: 0 14px;
          border: 1px solid rgba(121, 157, 188, 0.2);
          border-radius: 11px;
          background: transparent;
          color: #9fb4c7;
          font-weight: 800;
          cursor: pointer;
        }

        .clearFilters:hover:not(:disabled) {
          color: #fff;
          border-color: rgba(54, 181, 255, 0.5);
        }

        .clearFilters:disabled {
          opacity: 0.45;
          cursor: wait;
        }

        .cardGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 18px;
        }

        .card {
          overflow: hidden;
          text-decoration: none;
          color: inherit;
          border: 1px solid rgba(125, 160, 190, 0.16);
          border-radius: 18px;
          background: rgba(10, 24, 38, 0.8);
          transition:
            transform 160ms ease,
            border-color 160ms ease,
            box-shadow 160ms ease;
        }

        .card:hover {
          transform: translateY(-3px);
          border-color: rgba(54, 181, 255, 0.46);
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.2);
        }

        .imageArea {
          position: relative;
          min-height: 295px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background:
            radial-gradient(circle at 50% 35%, rgba(47, 142, 211, 0.12), transparent 45%),
            #07111b;
        }

        .imageArea img {
          display: block;
          max-width: 100%;
          max-height: 278px;
          border-radius: 11px;
          box-shadow: 0 14px 36px rgba(0, 0, 0, 0.35);
        }

        .specialBadge {
          position: absolute;
          left: 12px;
          top: 12px;
          padding: 6px 8px;
          border: 1px solid rgba(66, 186, 255, 0.4);
          border-radius: 999px;
          color: #8fd6ff;
          background: rgba(5, 18, 29, 0.88);
          font-size: 11px;
          font-weight: 900;
          backdrop-filter: blur(8px);
        }

        .noImage {
          color: #64788c;
          font-size: 13px;
        }

        .cardBody {
          padding: 17px;
        }

        .cardTopline {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: #7590a7;
          font-size: 12px;
        }

        .cardName {
          display: block;
          margin-top: 7px;
          font-size: 19px;
          line-height: 1.2;
        }

        .cardFooter {
          min-height: 58px;
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid rgba(121, 157, 188, 0.11);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .rarity {
          color: #9fb1c1;
          font-size: 11px;
          line-height: 1.3;
        }

        .viewLink {
          flex: 0 0 auto;
          color: #47bdff;
          font-size: 12px;
          font-weight: 900;
        }

        .pagination {
          margin-top: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          color: #8fa6ba;
          font-size: 13px;
        }

        .pagination button {
          border: 1px solid rgba(54, 181, 255, 0.3);
          border-radius: 11px;
          background: rgba(11, 30, 46, 0.9);
          color: #55c2ff;
          padding: 10px 15px;
          font-weight: 800;
          cursor: pointer;
        }

        .pagination button:hover:not(:disabled) {
          border-color: rgba(54, 181, 255, 0.65);
          color: #fff;
        }

        .pagination button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .message,
        .emptyState {
          border-radius: 16px;
          border: 1px solid rgba(121, 157, 188, 0.14);
          background: rgba(11, 26, 40, 0.7);
        }

        .message {
          padding: 18px;
          margin-bottom: 18px;
        }

        .message.error {
          color: #ff9fa9;
          border-color: rgba(189, 67, 80, 0.35);
          background: rgba(57, 17, 22, 0.45);
        }

        .emptyState {
          min-height: 220px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #8093a5;
        }

        .emptyState strong {
          color: #dbe7f0;
        }

        .emptyIcon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          color: #42b9ff;
          background: rgba(33, 138, 220, 0.13);
          font-size: 24px;
          margin-bottom: 6px;
        }

        .footer {
          border-top: 1px solid rgba(121, 157, 188, 0.1);
          background: rgba(4, 12, 20, 0.75);
        }

        .footerInner {
          min-height: 94px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          color: #71869a;
          font-size: 12px;
        }

        .footerBrand {
          color: #dfeaf3;
        }

        @media (max-width: 800px) {
          .shell {
            width: min(100% - 28px, 1180px);
          }

          .navLinks,
          .statusPill {
            display: none;
          }

          .heroInner {
            padding: 66px 0 50px;
          }

          h1 {
            letter-spacing: -2.5px;
          }

          .searchBox {
            grid-template-columns: 36px 1fr;
            padding: 9px;
          }

          .searchBox button {
            grid-column: 1 / -1;
            width: 100%;
            height: 52px;
          }

          .benefits,
          .introGrid,
          .collectionGrid {
            grid-template-columns: 1fr;
          }

          .sectionHeader {
            align-items: flex-start;
            flex-direction: column;
          }

          .collectionExplorer {
          margin-top: 8px;
        }

        .collectionHeading {
          margin-bottom: 20px;
        }

        .collectionHeading h3 {
          margin: 7px 0 6px;
          font-size: 26px;
          letter-spacing: -0.7px;
        }

        .collectionHeading p {
          margin: 0;
          color: #7f93a7;
          line-height: 1.5;
        }

        .collectionGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .collectionCard {
          min-height: 170px;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          padding: 22px;
          border: 1px solid rgba(122, 156, 188, 0.16);
          border-radius: 18px;
          background:
            radial-gradient(circle at 100% 0%, rgba(53, 182, 255, 0.12), transparent 44%),
            rgba(11, 26, 40, 0.72);
          color: #f7fbff;
          cursor: pointer;
          transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
        }

        .collectionCard:hover {
          transform: translateY(-3px);
          border-color: rgba(54, 181, 255, 0.48);
          background:
            radial-gradient(circle at 100% 0%, rgba(53, 182, 255, 0.2), transparent 48%),
            rgba(11, 26, 40, 0.9);
        }

        .collectionCode {
          display: inline-flex;
          padding: 5px 8px;
          border-radius: 999px;
          border: 1px solid rgba(54, 181, 255, 0.28);
          color: #62c5ff;
          background: rgba(25, 130, 199, 0.1);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.8px;
        }

        .collectionCard strong {
          margin-top: 22px;
          font-size: 19px;
        }

        .collectionEra {
          margin-top: 5px;
          color: #7890a5;
          font-size: 12px;
        }

        .collectionAction {
          margin-top: auto;
          padding-top: 18px;
          color: #43b9ff;
          font-size: 12px;
          font-weight: 900;
        }

        .collectionNote {
          margin-top: 14px;
          color: #667d91;
          font-size: 11px;
        }

        .cardGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .imageArea {
            min-height: 220px;
            padding: 12px;
          }

          .imageArea img {
            max-height: 210px;
          }

          .cardBody {
            padding: 13px;
          }

          .cardFooter {
            align-items: flex-start;
            flex-direction: column;
          }

          .footerInner {
            align-items: flex-start;
            flex-direction: column;
            padding: 24px 0;
          }
        }

        @media (max-width: 480px) {
          .collectionExplorer {
          margin-top: 8px;
        }

        .collectionHeading {
          margin-bottom: 20px;
        }

        .collectionHeading h3 {
          margin: 7px 0 6px;
          font-size: 26px;
          letter-spacing: -0.7px;
        }

        .collectionHeading p {
          margin: 0;
          color: #7f93a7;
          line-height: 1.5;
        }

        .collectionGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .collectionCard {
          min-height: 170px;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          padding: 22px;
          border: 1px solid rgba(122, 156, 188, 0.16);
          border-radius: 18px;
          background:
            radial-gradient(circle at 100% 0%, rgba(53, 182, 255, 0.12), transparent 44%),
            rgba(11, 26, 40, 0.72);
          color: #f7fbff;
          cursor: pointer;
          transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
        }

        .collectionCard:hover {
          transform: translateY(-3px);
          border-color: rgba(54, 181, 255, 0.48);
          background:
            radial-gradient(circle at 100% 0%, rgba(53, 182, 255, 0.2), transparent 48%),
            rgba(11, 26, 40, 0.9);
        }

        .collectionCode {
          display: inline-flex;
          padding: 5px 8px;
          border-radius: 999px;
          border: 1px solid rgba(54, 181, 255, 0.28);
          color: #62c5ff;
          background: rgba(25, 130, 199, 0.1);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.8px;
        }

        .collectionCard strong {
          margin-top: 22px;
          font-size: 19px;
        }

        .collectionEra {
          margin-top: 5px;
          color: #7890a5;
          font-size: 12px;
        }

        .collectionAction {
          margin-top: auto;
          padding-top: 18px;
          color: #43b9ff;
          font-size: 12px;
          font-weight: 900;
        }

        .collectionNote {
          margin-top: 14px;
          color: #667d91;
          font-size: 11px;
        }

        .cardGrid {
            grid-template-columns: 1fr;
          }

          .imageArea {
            min-height: 310px;
          }

          .imageArea img {
            max-height: 290px;
          }
        }
      `}</style>
    </main>
  );
}
