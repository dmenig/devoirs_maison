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
    filosofi_csv: Path, filosofi_commune_csv: Path | None = None
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
    return iris, commune


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
