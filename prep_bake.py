"""Produit des fichiers de valeurs compacts (JSON, {code: {indicateur: valeur}}) pour
le rendu côté client (carte Leaflet). La géométrie reste dans les GeoJSON ; ces JSON
de valeurs sont joints par code dans le navigateur.

On expose un jeu d'indicateurs ciblé (scrutins à couverture nationale + réservoirs),
suffisant pour l'usage militant et léger à charger."""

from __future__ import annotations

import json
import math
from pathlib import Path

import pandas as pd

import indicators as ind


def _clean(o):
    """Remplace NaN/Infinity par None : JSON valide pour les navigateurs."""
    if isinstance(o, float):
        return None if (math.isnan(o) or math.isinf(o)) else o
    if isinstance(o, dict):
        return {k: _clean(v) for k, v in o.items()}
    if isinstance(o, list):
        return [_clean(v) for v in o]
    return o


def _dumps(data) -> str:
    return json.dumps(_clean(data), ensure_ascii=False, separators=(",", ":"), allow_nan=False)

OUT = Path(__file__).parent / "data_app" / "values"

SCRUTINS = {  # clé courte -> clé de scrutin
    "P22": "2022-presidentielle-1",
    "E24": "2024-europeenne",
    "L24": "2024-legislatives-1",
    "M26": "2026-municipales-1",
}
COLS = {  # clé courte -> colonne
    "part": ("participation", "Participation"),
    "lfi": ("lfi_pct", "Vote LFI"),
    "gauche": ("tri_social_ecologique", "Bloc social-écologique"),
    "rn": ("b6_RN-EXD", "Bloc RN-EXD"),
    "em": ("b6_MoDem-EM", "Bloc MoDem-EM"),
    "lr": ("b6_LR-DVD", "Bloc LR-DVD"),
}
# réservoirs : clé -> (métrique, scrutin départ, scrutin arrivée)
RESERVOIRS = {
    "rep_lfi": ("report_lfi", "2022-presidentielle-1", "2024-europeenne"),
    "dpart": ("ratio_participation", "2022-presidentielle-1", "2024-europeenne"),
    "abst": ("stock_abstention", "2024-europeenne", "2024-europeenne"),
}


def catalogue() -> list[dict]:
    """Liste des indicateurs (clé, libellé) pour le menu du client."""
    cat = []
    for sc, scl in SCRUTINS.items():
        for c, (_col, lab) in COLS.items():
            cat.append({"key": f"{c}_{sc}", "label": f"{lab} — {sc}",
                        "unit": "%", "groupe": "Électoral"})
    cat.append({"key": "rep_lfi", "label": "Report LFI P2022→E2024", "unit": "%", "groupe": "Réservoirs"})
    cat.append({"key": "dpart", "label": "Différentiel particip. P2022→E2024", "unit": "%", "groupe": "Réservoirs"})
    cat.append({"key": "abst", "label": "Stock abstentionnistes E2024", "unit": "voix", "groupe": "Réservoirs"})
    return cat


def _valeurs_niveau(df: pd.DataFrame) -> dict[str, dict[str, float]]:
    out: dict[str, dict[str, float]] = {}
    for sc, scl in SCRUTINS.items():
        sub = df[df["scrutin"] == scl]
        for c, (col, _lab) in COLS.items():
            for code, v in zip(sub["code"], sub[col]):
                if pd.notna(v):
                    out.setdefault(str(code), {})[f"{c}_{sc}"] = round(float(v), 1)
    for key, (metr, sa, sb) in RESERVOIRS.items():
        for code, v in ind.reservoirs_par_code(df, sa, sb, metr).items():
            out.setdefault(str(code), {})[key] = v
    return out


def _ecrire(nom: str, data: dict) -> None:
    (OUT / f"{nom}.json").write_text(_dumps(data))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    DA = Path(__file__).parent / "data_app"

    for niveau in ("region", "departement", "commune", "circonscription"):
        df = pd.read_parquet(DA / f"resultats_{niveau}.parquet")
        _ecrire(niveau, _valeurs_niveau(df))
        print(f"  ✓ values {niveau}")

    iris = pd.read_parquet(DA / "socio_iris.parquet")
    _ecrire("iris", {str(c): {"rev": (round(r) if pd.notna(r) else None),
                              "pauv": (round(p, 1) if pd.notna(p) else None)}
                     for c, r, p in zip(iris["code_iris"], iris["revenu_median"], iris["taux_pauvrete"])})
    print("  ✓ values iris")

    bv = pd.read_parquet(DA / "resultats_bureau.parquet")
    bv["dep"] = bv["code"].str[:3].where(bv["code"].str.startswith("97"), bv["code"].str[:2])
    (OUT / "bv").mkdir(exist_ok=True)
    for dep, sous in bv.groupby("dep"):
        (OUT / "bv" / f"{dep}.json").write_text(
            _dumps(_valeurs_niveau(sous)))
    print("  ✓ values bv (par département)")

    _ecrire("_catalogue", {"indicateurs": catalogue()})
    print("✓ prep_bake terminé")


if __name__ == "__main__":
    main()
