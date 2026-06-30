"""Orchestrateur : transforme les sorties de hexagonal en données compactes pour
l'application Streamlit (dossier data_app/). À lancer une fois (et à chaque mise à
jour des données) :

    uv run --project /home/veesion/hexagonal python prepare_data.py
"""

from __future__ import annotations

import collections
import json
from pathlib import Path

import pandas as pd

import prep_admin
import prep_geo
from prep_elections import construire_resultats
from prep_socio import construire_references, construire_socio

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


def construire_circonscriptions(clean_elections: Path, values_dir: Path) -> None:
    """Mappe communes ↔ circonscriptions législatives 2024 (sélection « circo entière »
    côté client, retour Elia point 4). La maille circonscription est sinon absente de
    l'app (scrutin présidentiel = national). Une commune à cheval (~0,4 %) est rattachée
    à sa circo majoritaire mais reste listée dans chacune de ses circos."""
    f = (
        clean_elections
        / "2024-legislatives-correspondances-bureau_de_vote-circonscription.csv"
    )
    if not f.exists():
        print("   circo : correspondance introuvable — étape ignorée")
        return
    df = pd.read_csv(f, dtype=str).dropna(subset=["code_commune", "circonscription"])
    circo_communes: dict[str, set[str]] = {}
    for com, circ in zip(df["code_commune"], df["circonscription"]):
        circo_communes.setdefault(circ, set()).add(com)
    # Le client n'a besoin que de circo → communes (sélection « circo entière ») ; la maille
    # circonscription est regroupée par département dans le navigateur (préfixe « dep- »).
    data = {k: sorted(v) for k, v in sorted(circo_communes.items())}
    values_dir.mkdir(parents=True, exist_ok=True)
    (values_dir / "_circo.json").write_text(
        json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    )
    n_com = len({c for v in circo_communes.values() for c in v})
    print(f"   circo : {len(circo_communes)} circonscriptions, {n_com} communes")


def charger_cog() -> tuple[pd.DataFrame, dict[str, pd.DataFrame]]:
    communes = _lire_csv(CLEAN / "cog" / "communes.csv")
    deps = _lire_csv(CLEAN / "cog" / "departements.csv")
    regs = _lire_csv(CLEAN / "cog" / "regions.csv")
    communes = communes.rename(columns={"libelle": "nom"})
    for d in (communes, deps, regs):
        d.columns = [c.strip() for c in d.columns]
    return communes, {"departement": deps, "region": regs}


def main() -> None:
    OUT.mkdir(exist_ok=True)
    GEO.mkdir(parents=True, exist_ok=True)

    print("→ COG")
    communes, admin = charger_cog()

    print("→ Résultats électoraux (toutes échelles)")
    listes_lfi = RAW / "lafranceinsoumise" / "2026-municipales-1-listes-lfi.parquet"
    resultats = construire_resultats(
        CLEAN / "elections", communes, GEO / "bv", listes_lfi
    )
    for niveau, df in resultats.items():
        df.to_parquet(OUT / f"resultats_{niveau}.parquet", index=False)
        print(f"   {niveau}: {len(df)} lignes")

    print("→ Circonscriptions (mapping commune ↔ circo, sélection multiple)")
    construire_circonscriptions(CLEAN / "elections", OUT / "values")

    print("→ Socio-économique (FILOSOFI IRIS + commune)")
    filosofi = CLEAN / "filosofi" / "disponible.csv"
    if filosofi.exists():
        iris, commune_socio = construire_socio(
            filosofi,
            CLEAN / "filosofi" / "commune.csv",
            CLEAN / "recensement" / "iris.csv",
        )
        iris.to_parquet(OUT / "socio_iris.parquet", index=False)
        commune_socio.to_parquet(OUT / "socio_commune.parquet", index=False)
        rp = CLEAN / "recensement" / "iris.csv"
        if rp.exists():
            refs = construire_references(commune_socio, rp, communes)
            (OUT / "socio_reference.json").write_text(json.dumps(refs))
        print(f"   IRIS: {len(iris)} | communes: {len(commune_socio)}")

    print("→ Données administratives INSEE (âges, logement, transport, maires)")
    admin_insee = prep_admin.construire_admin(OUT / "_insee_cache", communes)
    if not admin_insee.commune.empty:
        admin_insee.commune.to_parquet(OUT / "admin_commune.parquet", index=False)
        print(f"   admin commune: {len(admin_insee.commune) - 1} communes (+ France)")
    else:
        print("   admin indisponible (téléchargements INSEE échoués)")

    print("→ Référentiels (noms)")
    communes[["code_commune", "nom", "code_departement", "code_region"]].to_parquet(
        OUT / "ref_communes.parquet", index=False
    )
    for k, d in admin.items():
        d.to_parquet(OUT / f"ref_{k}.parquet", index=False)

    print("→ Contours (fonds de carte)")
    prep_geo.contours_de_base(GEO)
    prep_geo.contours_communes(GEO)
    # Échelle circonscription retirée (présidentielle) : plus de contours circo à produire.
    gpkg = RAW / "ign" / "iris-metropole.gpkg"
    if prep_geo.telecharger_iris_ign(
        IRIS_IGN_URL, RAW / "ign" / "iris-metropole.7z", gpkg
    ):
        prep_geo.contours_iris(gpkg, GEO)
        print("   IRIS contours OK")
    else:
        print(
            "   IRIS contours indisponibles (IGN throttling) — tables IRIS quand même servies"
        )

    manifest = {
        "scrutins": sorted(resultats["commune"]["scrutin"].unique().tolist()),
        "niveaux": sorted(resultats.keys()),
        "iris_contours": (GEO / "iris").exists(),
        "admin_commune": (OUT / "admin_commune.parquet").exists(),
    }
    (OUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2)
    )
    print("✓ prepare_data terminé")


if __name__ == "__main__":
    main()
