export type TCGdexSetLike = {
  id?: string | null;
  name?: string | null;

  serie?: {
    id?: string | null;
    name?: string | null;
  } | null;

  series?: {
    id?: string | null;
    name?: string | null;
  } | null;
};

export type CatalogClassification =
  | "PHYSICAL_TCG"
  | "TCG_POCKET"
  | "UNKNOWN";

export function getTCGdexSeriesId(
  set: TCGdexSetLike
): string | null {
  const value =
    set.serie?.id ??
    set.series?.id ??
    null;

  return value?.toLowerCase().trim() ?? null;
}

export function classifyTCGdexSet(
  set: TCGdexSetLike
): CatalogClassification {
  const seriesId = getTCGdexSeriesId(set);

  if (seriesId === "tcgp") {
    return "TCG_POCKET";
  }

  if (seriesId) {
    return "PHYSICAL_TCG";
  }

  return "UNKNOWN";
}

export function isPhysicalTCGSet(
  set: TCGdexSetLike
): boolean {
  return classifyTCGdexSet(set) === "PHYSICAL_TCG";
}

export function shouldImportTCGdexSet(
  set: TCGdexSetLike
): boolean {
  return classifyTCGdexSet(set) !== "TCG_POCKET";
}