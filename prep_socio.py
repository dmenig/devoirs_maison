"""Données socio-économiques INSEE-FILOSOFI 2021 (revenu disponible) par IRIS et par
commune. Ce sont les variables que la présentation demande de regarder : revenu médian,
taux de pauvreté, écarts (déciles/quartiles).

Le fichier IRIS ne couvre que les communes ≥ 5000 hab. : le niveau communal vient donc
de la base communale FILOSOFI (toutes communes), enrichie des quartiles agrégés depuis
les IRIS quand ils existent."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

COLS = {
    "code_iris": "code_iris",
    "mediane": "revenu_median",
    "taux_pauvrete_60": "taux_pauvrete",
    "quartile1": "q1",
    "quartile3": "q3",
    "decile1": "d1",
    "decile9": "d9",
    "rapport_interdecile_9_1": "rapport_interdecile",
    "indice_gini": "gini",
}

COLS_COMMUNE = {
    "code_commune": "code_commune",
    "revenu_median": "revenu_median",
    "taux_pauvrete": "taux_pauvrete",
    "decile1": "d1",
    "decile9": "d9",
    "rapport_interdecile_9_1": "rapport_interdecile",
}


def construire_socio(
    filosofi_csv: Path,
    filosofi_commune_csv: Path | None = None,
    rp_iris_csv: Path | None = None,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    df = pd.read_csv(filosofi_csv, dtype={"code_iris": str})
    garde = [c for c in COLS if c in df.columns]
    iris = df[garde].rename(columns=COLS)
    iris["code_commune"] = iris["code_iris"].str[:5]
    num = [c for c in iris.columns if c not in ("code_iris", "code_commune")]
    iris[num] = iris[num].apply(pd.to_numeric, errors="coerce")

    iris_agg = iris.groupby("code_commune", as_index=False)[
        ["revenu_median", "taux_pauvrete", "q1", "q3"]
    ].mean()
    iris_agg["nb_iris"] = (
        iris.groupby("code_commune").size().reindex(iris_agg["code_commune"]).values
    )

    if filosofi_commune_csv and filosofi_commune_csv.exists():
        commune = _commune_depuis_filosofi(filosofi_commune_csv, iris_agg)
    else:
        commune = iris_agg.round({"revenu_median": 0, "taux_pauvrete": 0})

    if rp_iris_csv and rp_iris_csv.exists():
        rp_iris, rp_com = _charger_rp(rp_iris_csv)
        iris = iris.merge(
            rp_iris.drop(columns="code_commune"), on="code_iris", how="outer"
        )
        iris["code_commune"] = iris["code_commune"].fillna(iris["code_iris"].str[:5])
        commune = commune.merge(rp_com, on="code_commune", how="outer")
        commune["nb_iris"] = commune["nb_iris"].fillna(0).astype(int)
    return iris, commune


# --- recensement (âge, CSP, diplômes, logement) : comptages -> parts (% ) ----------
_AGE = ("0014", "1529", "3044", "4559", "6074", "75p")
_CSP = ("cadres", "interm", "employes", "ouvriers", "retraites")


def _rp_parts(c: pd.DataFrame) -> pd.DataFrame:
    def pct(num: str, den: str) -> pd.Series:
        return (100 * c[num] / c[den]).where(c[den] > 0).round(1)

    out = pd.DataFrame(index=c.index)
    for b in _AGE:
        out[f"age_{b}"] = pct(f"age_{b}", "pop")
    for cs in _CSP:
        out[f"csp_{cs}"] = pct(f"cs_{cs}", "pop15p")
    out["taux_chomage"] = pct("chom1564", "act1564")
    out["part_sans_diplome"] = pct("dipl_aucun", "nscol15p")
    out["part_sup"] = pct("dipl_sup", "nscol15p")
    out["part_proprietaires"] = pct("rp_prop", "rp")
    out["part_locataires"] = pct("rp_loc", "rp")
    out["part_hlm"] = pct("rp_hlm", "rp")
    return out


def _charger_rp(rp_csv: Path) -> tuple[pd.DataFrame, pd.DataFrame]:
    c = pd.read_csv(rp_csv, dtype={"code_iris": str, "code_commune": str})
    iris = c.set_index("code_iris")
    iris_parts = _rp_parts(iris)
    iris_parts.insert(0, "code_commune", iris["code_commune"])
    com = c.groupby("code_commune").sum(numeric_only=True)
    return iris_parts.reset_index(), _rp_parts(com).reset_index()


def construire_references(
    commune_socio: pd.DataFrame, rp_iris_csv: Path, communes: pd.DataFrame
) -> dict[str, dict]:
    """Valeurs de référence (nationale + par région) pour situer une zone : un % de
    cadres ou un revenu n'a de sens que comparé à la moyenne. Parts RP exactes (somme des
    comptages) ; revenu/pauvreté en moyenne pondérée par la population communale."""
    counts = (
        pd.read_csv(rp_iris_csv, dtype={"code_commune": str})
        .groupby("code_commune", as_index=True)
        .sum(numeric_only=True)
    )
    reg = (
        communes.drop_duplicates("code_commune")
        .set_index("code_commune")["code_region"]
        .astype(str)
    )
    counts["region"] = reg.reindex(counts.index).values
    rs = commune_socio.set_index("code_commune")
    pop = counts["pop"]

    def bloc(idx: pd.Index) -> dict:
        somme = counts.loc[idx].drop(columns="region").sum().to_frame().T
        out = {
            k: (None if pd.isna(v) else v) for k, v in _rp_parts(somme).iloc[0].items()
        }
        sub = rs.index.intersection(idx)
        v, w = rs.loc[sub], pop.reindex(sub)
        for col in ("revenu_median", "taux_pauvrete"):
            m = v[col].notna() & w.notna() & (w > 0)
            tot = w[m].sum()
            out[col] = round((v.loc[m, col] * w[m]).sum() / tot, 1) if tot else None
        return out

    refs = {"FR": bloc(counts.index)}
    for r, grp in counts.groupby("region"):
        if r and r != "nan":
            refs[r] = bloc(grp.index)
    return refs


def _commune_depuis_filosofi(chemin: Path, iris_agg: pd.DataFrame) -> pd.DataFrame:
    src = pd.read_csv(chemin, dtype={"code_commune": str})
    garde = [c for c in COLS_COMMUNE if c in src.columns]
    base = src[garde].rename(columns=COLS_COMMUNE)
    com = base.merge(
        iris_agg[["code_commune", "q1", "q3", "nb_iris"]],
        on="code_commune",
        how="outer",
    ).set_index("code_commune")
    # le niveau communal direct prime ; à défaut on retombe sur l'agrégat IRIS.
    iris_idx = iris_agg.set_index("code_commune")
    for col in ("revenu_median", "taux_pauvrete"):
        com[col] = com[col].fillna(iris_idx[col])
    com["nb_iris"] = com["nb_iris"].fillna(0).astype(int)
    return com.reset_index().round({"revenu_median": 0, "taux_pauvrete": 1})
