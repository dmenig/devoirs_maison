"""Orchestrateur : transforme les sorties de hexagonal en données compactes pour
l'application Streamlit (dossier data_app/). À lancer une fois (et à chaque mise à
jour des données) :

    uv run --project /home/veesion/hexagonal python prepare_data.py
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

import prep_geo
from prep_elections import construire_resultats
from prep_socio import construire_socio

HEX = Path("/home/veesion/hexagonal/data")
CLEAN = HEX / "02_clean"
RAW = HEX / "01_raw"
OUT = Path(__file__).parent / "data_app"
GEO = OUT / "geo"

IRIS_IGN_URL = (
    "https://data.geopf.fr/telechargement/download/CONTOURS-IRIS/"
    "CONTOURS-IRIS_3-0__GPKG_LAMB93_FXX_2025-01-01/"
    "CONTOURS-IRIS_3-0__GPKG_LAMB93_FXX_2025-01-01.7z"
)


def _lire_csv(path: Path, **kw) -> pd.DataFrame:
    return pd.read_csv(path, dtype=str, **kw)


def charger_cog() -> tuple[pd.DataFrame, dict[str, pd.DataFrame]]:
    communes = _lire_csv(CLEAN / "cog" / "communes.csv")
    deps = _lire_csv(CLEAN / "cog" / "departements.csv")
    regs = _lire_csv(CLEAN / "cog" / "regions.csv")
    communes = communes.rename(columns={"libelle": "nom"})
    for d in (communes, deps, regs):
        d.columns = [c.strip() for c in d.columns]
    return communes, {"departement": deps, "region": regs}


def charger_correspondances() -> pd.DataFrame | None:
    f = CLEAN / "elections" / "2024-legislatives-correspondances-bureau_de_vote-circonscription.csv"
    if not f.exists():
        return None
    df = _lire_csv(f)
    ren = {}
    for c in df.columns:
        cl = c.lower()
        if "circ" in cl:
            ren[c] = "circonscription"
        elif cl in ("code_commune", "commune"):
            ren[c] = "code_commune"
        elif "bureau" in cl or cl in ("code_bv", "bv"):
            ren[c] = "bureau_de_vote"
    df = df.rename(columns=ren)
    cols = [c for c in ("code_commune", "bureau_de_vote", "circonscription") if c in df.columns]
    return df[cols].drop_duplicates() if {"code_commune", "circonscription"} <= set(cols) else None


def main() -> None:
    OUT.mkdir(exist_ok=True)
    GEO.mkdir(parents=True, exist_ok=True)

    print("→ COG")
    communes, admin = charger_cog()
    corr = charger_correspondances()

    print("→ Résultats électoraux (toutes échelles)")
    resultats = construire_resultats(CLEAN / "elections", communes, corr)
    for niveau, df in resultats.items():
        df.to_parquet(OUT / f"resultats_{niveau}.parquet", index=False)
        print(f"   {niveau}: {len(df)} lignes")

    print("→ Socio-économique (FILOSOFI IRIS)")
    filosofi = CLEAN / "filosofi" / "disponible.csv"
    if filosofi.exists():
        iris, commune_socio = construire_socio(filosofi)
        iris.to_parquet(OUT / "socio_iris.parquet", index=False)
        commune_socio.to_parquet(OUT / "socio_commune.parquet", index=False)
        print(f"   IRIS: {len(iris)} | communes: {len(commune_socio)}")

    print("→ Référentiels (noms)")
    communes[["code_commune", "nom", "code_departement", "code_region"]].to_parquet(
        OUT / "ref_communes.parquet", index=False
    )
    for k, d in admin.items():
        d.to_parquet(OUT / f"ref_{k}.parquet", index=False)

    print("→ Contours (fonds de carte)")
    prep_geo.contours_de_base(GEO)
    prep_geo.contours_communes(GEO)
    prep_geo.contours_circonscriptions(RAW / "insee" / "insee_circonscriptions_legislatives.zip", GEO)
    gpkg = RAW / "ign" / "iris-metropole.gpkg"
    if prep_geo.telecharger_iris_ign(IRIS_IGN_URL, RAW / "ign" / "iris-metropole.7z", gpkg):
        prep_geo.contours_iris(gpkg, GEO)
        print("   IRIS contours OK")
    else:
        print("   IRIS contours indisponibles (IGN throttling) — tables IRIS quand même servies")

    manifest = {
        "scrutins": sorted(resultats["commune"]["scrutin"].unique().tolist()),
        "niveaux": sorted(resultats.keys()),
        "iris_contours": (GEO / "iris").exists(),
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    print("✓ prepare_data terminé")


if __name__ == "__main__":
    main()
