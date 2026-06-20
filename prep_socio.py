"""Données socio-économiques INSEE-FILOSOFI 2021 (revenu disponible) par IRIS,
+ agrégat communal approché. Ce sont les variables que la présentation demande de
regarder : revenu médian, taux de pauvreté, écarts (déciles/quartiles)."""

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


def construire_socio(filosofi_csv: Path) -> tuple[pd.DataFrame, pd.DataFrame]:
    df = pd.read_csv(filosofi_csv, dtype={"code_iris": str})
    garde = [c for c in COLS if c in df.columns]
    iris = df[garde].rename(columns=COLS)
    iris["code_commune"] = iris["code_iris"].str[:5]
    num = [c for c in iris.columns if c not in ("code_iris", "code_commune")]
    iris[num] = iris[num].apply(pd.to_numeric, errors="coerce")

    commune = (
        iris.groupby("code_commune")[["revenu_median", "taux_pauvrete", "q1", "q3"]]
        .mean()
        .round(0)
        .reset_index()
    )
    commune["nb_iris"] = iris.groupby("code_commune").size().values
    return iris, commune
