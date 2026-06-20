"""Catalogue d'indicateurs et calculs de réservoirs de voix / reports, à partir des
tables resultats_<niveau>.parquet."""

from __future__ import annotations

import pandas as pd

# label affiché -> (colonne, unité, palette colorbrewer, palette inversée ?)
INDICATEURS_ELECT: dict[str, tuple[str, str, str, bool]] = {
    "Participation": ("participation", "%", "Greens", False),
    "Abstention": ("abstention", "%", "Greys", False),
    "Vote LFI (% inscrits)": ("lfi_pct", "%", "Reds", False),
    "Vote gauche (% inscrits)": ("gauche_pct", "%", "Reds", False),
    "Bloc LFI-PCF-EXG": ("b6_LFI-PCF-EXG", "%", "Reds", False),
    "Bloc PS-EELV": ("b6_PS-EELV", "%", "RdPu", False),
    "Bloc MoDem-EM": ("b6_MoDem-EM", "%", "Oranges", False),
    "Bloc LR-DVD": ("b6_LR-DVD", "%", "Blues", False),
    "Bloc RN-EXD": ("b6_RN-EXD", "%", "PuBu", False),
    "Bloc social-écologique": ("tri_social_ecologique", "%", "Reds", False),
    "Bloc libéral-progressiste": ("tri_liberal_progressiste", "%", "Oranges", False),
    "Bloc national-patriote": ("tri_national_patriote", "%", "Blues", False),
}

INDICATEURS_SOCIO: dict[str, tuple[str, str, str, bool]] = {
    "Revenu médian (€)": ("revenu_median", "€", "Blues", False),
    "Taux de pauvreté": ("taux_pauvrete", "%", "Reds", False),
}

BLOC6 = ["LFI-PCF-EXG", "PS-EELV", "MoDem-EM", "LR-DVD", "RN-EXD", "Autres"]
_ORDRE_TYPE = {
    "presidentielle": 0,
    "legislatives": 1,
    "europeenne": 2,
    "municipales": 3,
    "departementales": 4,
    "regionales": 5,
    "referendum": 6,
}


def scrutins_ordonnes(df: pd.DataFrame) -> list[tuple[str, str]]:
    if df.empty:
        return []
    meta = df[["scrutin", "scrutin_libelle", "annee", "type", "tour"]].drop_duplicates()
    meta["o"] = meta["type"].map(_ORDRE_TYPE).fillna(9)
    meta = meta.sort_values(["annee", "o", "tour"])
    return list(zip(meta["scrutin"], meta["scrutin_libelle"]))


def valeurs_par_code(df: pd.DataFrame, scrutin: str, colonne: str) -> dict[str, float]:
    sub = df[df["scrutin"] == scrutin]
    return dict(zip(sub["code"], sub[colonne]))


def table_recomposition(df: pd.DataFrame, code: str) -> pd.DataFrame:
    """Tableau « recomposition » d'une entité : une ligne par scrutin, colonnes =
    blocs en % des inscrits + abstention (comme la prez)."""
    sub = df[df["code"] == code].copy()
    if sub.empty:
        return sub
    sub["o"] = sub["type"].map(_ORDRE_TYPE).fillna(9)
    sub = sub.sort_values(["annee", "o", "tour"])
    cols = {"scrutin_libelle": "Scrutin"}
    cols.update({f"b6_{b}": b for b in BLOC6})
    cols["abstention"] = "Abs."
    out = sub[list(cols)].rename(columns=cols)
    return out.set_index("Scrutin")


def reservoirs(
    df: pd.DataFrame, code: str, sa: str, sb: str
) -> dict[str, float | None]:
    """Réservoirs entre deux scrutins pour une entité."""
    a = df[(df["code"] == code) & (df["scrutin"] == sa)]
    b = df[(df["code"] == code) & (df["scrutin"] == sb)]
    if a.empty or b.empty:
        return {}
    a, b = a.iloc[0], b.iloc[0]
    lfi_a, lfi_b = a["lfi_voix"], b["lfi_voix"]
    g_a, g_b = a["gauche_voix"], b["gauche_voix"]
    insc_b = b["inscrits"]
    return {
        "report_lfi": round(100 * lfi_b / lfi_a, 1) if lfi_a else None,
        "diff_voix_lfi": int(lfi_b - lfi_a),
        "taux_perte_gauche": round(100 * (g_a - g_b) / g_a, 1) if g_a else None,
        "ratio_participation": round(100 * b["participation"] / a["participation"], 1)
        if a["participation"]
        else None,
        "stock_abstention_b": int(round(insc_b * (b["abstention"] or 0) / 100)),
    }


def reservoirs_par_code(
    df: pd.DataFrame, sa: str, sb: str, metrique: str
) -> dict[str, float]:
    """Carte d'un réservoir : valeur par code entre deux scrutins."""
    a = df[df["scrutin"] == sa].set_index("code")
    b = df[df["scrutin"] == sb].set_index("code")
    codes = a.index.intersection(b.index)
    out: dict[str, float] = {}
    for c in codes:
        ra, rb = a.loc[c], b.loc[c]
        if metrique == "report_lfi" and ra["lfi_voix"]:
            out[c] = round(100 * rb["lfi_voix"] / ra["lfi_voix"], 1)
        elif metrique == "ratio_participation" and ra["participation"]:
            out[c] = round(100 * rb["participation"] / ra["participation"], 1)
        elif metrique == "stock_abstention" and rb["inscrits"]:
            out[c] = int(round(rb["inscrits"] * (rb["abstention"] or 0) / 100))
    return out
