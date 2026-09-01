"""Orchestrateur : transforme les sorties de hexagonal en données compactes pour
la carte (dossier data_app/). À lancer une fois (et à chaque mise à jour des données) :

    uv run --project ./hexagonal python prepare_data.py

La racine des données hexagonal est cherchée d'abord sous ce dépôt (./hexagonal/data),
puis dans /home/veesion/hexagonal/data ; HEXAGONAL_DATA force le choix.
"""

from __future__ import annotations

import collections
import json
import os
from pathlib import Path

import pandas as pd

import prep_admin
import prep_bake
import prep_geo
import prep_immo
import prep_iris_bv
import prep_mobilisation
from prep_elections import construire_resultats
from prep_socio import construire_references, construire_socio


# Racine des données hexagonal. Le dépôt est cloné SOUS celui-ci (cf. .gitignore, qui
# ignore /hexagonal/), mais il a aussi vécu à côté, dans /home/veesion/hexagonal — le
# chemin était codé en dur sur cette seconde forme, et le pipeline ne trouvait plus rien
# depuis un clone conforme à la convention du dépôt. On prend le premier qui existe, et
# la variable d'environnement HEXAGONAL_DATA tranche si les deux sont là.
def _racine_hexagonal() -> Path:
    depuis_env = os.environ.get("HEXAGONAL_DATA")
    candidats = [Path(depuis_env)] if depuis_env else []
    candidats += [
        Path(__file__).parent / "hexagonal" / "data",
        Path("/home/veesion/hexagonal/data"),
    ]
    for c in candidats:
        if (c / "02_clean").is_dir():
            return c
    return candidats[-1]  # message d'erreur explicite au premier accès


HEX = _racine_hexagonal()
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
    # Le fichier a changé de place dans hexagonal (sous-dossier `elections/`) : on essaie
    # les deux, sans quoi la requalification des listes LFI 2026 tombait en silence.
    listes_lfi = next(
        (
            f
            for f in (
                RAW / "lafranceinsoumise/elections/2026-municipales-1-listes-lfi.parquet",
                RAW / "lafranceinsoumise/2026-municipales-1-listes-lfi.parquet",
            )
            if f.exists()
        ),
        None,
    )
    resultats = construire_resultats(
        CLEAN / "elections", communes, GEO / "bv", listes_lfi, OUT
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
        print("→ Logement (prix au m² DVF + effort d'accession)")
        immo = prep_immo.construire_immo(OUT / "_immo_cache", commune_socio)
        immo.to_parquet(OUT / "immo_commune.parquet", index=False)
        print(f"   communes avec un prix au m² : {len(immo)}")
        rp = CLEAN / "recensement" / "iris.csv"
        if rp.exists():
            refs = construire_references(commune_socio, rp, communes)
            pop_commune = (
                pd.read_csv(
                    rp, dtype={"code_commune": str}, usecols=["code_commune", "pop"]
                )
                .groupby("code_commune")["pop"]
                .sum()
            )
            prep_immo.references_immo(immo, communes, refs, pop_commune)
            (OUT / "socio_reference.json").write_text(json.dumps(refs))
            # population par IRIS : sert à répartir les électeurs d'un bureau de vote
            # entre les quartiers qu'il recoupe, au prorata du peuplement et non de la
            # seule surface (cf. prep_iris_bv).
            pd.read_csv(
                rp, dtype={"code_iris": str}, usecols=["code_iris", "pop"]
            ).to_parquet(OUT / "pop_iris.parquet", index=False)
        print(f"   IRIS: {len(iris)} | communes: {len(commune_socio)}")

    print("→ Données administratives INSEE (âges, logement, transport, maires)")
    admin_insee = prep_admin.construire_admin(OUT / "_insee_cache", communes)
    if not admin_insee.commune.empty:
        admin_insee.commune.to_parquet(OUT / "admin_commune.parquet", index=False)
        print(f"   admin commune: {len(admin_insee.commune) - 1} communes (+ France)")
    else:
        print("   admin indisponible (téléchargements INSEE échoués)")

    print("→ Référentiels (noms)")
    # `code_commune_parent` : la commune NOUVELLE qui a absorbé une commune déléguée.
    # C'est ce qui permet à la recherche de mener « Corcelles » à Champdor-Corcelles au
    # lieu d'une fiche morte sans contour (cf. prep_index).
    # `type_commune` distingue l'arrondissement municipal (ARM) de la commune déléguée
    # (COMD/COMA) : les deux se rattachent à un `code_commune_parent`, mais un
    # arrondissement n'est pas un ANCIEN nom (cf. prep_index).
    communes[
        [
            "code_commune",
            "nom",
            "type_commune",
            "code_departement",
            "code_region",
            "code_commune_parent",
        ]
    ].to_parquet(OUT / "ref_communes.parquet", index=False)
    for k, d in admin.items():
        d.to_parquet(OUT / f"ref_{k}.parquet", index=False)

    print("→ Contours (fonds de carte)")
    prep_geo.contours_de_base(GEO)
    prep_geo.contours_communes(GEO)
    prep_geo.contours_drom(GEO)
    # le fond national est un millésime figé : les communes nouvelles postérieures n'y
    # sont pas, et une commune sans polygone est une fiche que la carte ignore.
    prep_geo.completer_communes(GEO, communes)
    # Échelle circonscription retirée (présidentielle) : plus de contours circo à produire.
    gpkg = RAW / "ign" / "iris-metropole.gpkg"
    if prep_geo.telecharger_iris_ign(
        IRIS_IGN_URL, RAW / "ign" / "iris-metropole.7z", gpkg
    ):
        prep_geo.contours_iris(gpkg, GEO)
        print("   IRIS contours métropole OK")
    else:
        print(
            "   IRIS contours indisponibles (IGN throttling) — tables IRIS quand même servies"
        )
    # les paquets d'outre-mer sont indépendants : un throttling sur la métropole ne doit
    # pas les emporter avec lui.
    prep_geo.contours_iris_drom(RAW / "ign", GEO)

    print("→ Électoral estimé par quartier (intersection IRIS × bureaux de vote)")
    if (GEO / "iris").exists() and (GEO / "bv").exists():
        prep_iris_bv.construire(OUT)
    else:
        print("   contours IRIS ou BV absents — étape ignorée")

    print("→ Voix à conquérir 2027 (modèle elections_predictions + porte-à-porte)")
    # Étape OPTIONNELLE : elle lit un second dépôt (elections_predictions), qu'on ne peut
    # pas exiger d'un checkout de celui-ci. Absent, les versions 2 et 3 du site n'ont pas
    # de score — la version 1 (objectif arithmétique) reste entière.
    if (prep_mobilisation.SOURCE_DEFAUT / "report_app/2027/data/communes.json").exists():
        mb, ref = prep_mobilisation.construire(prep_mobilisation.SOURCE_DEFAUT, OUT)
        mb.to_parquet(OUT / "mobilisation_bv.parquet", index=False)
        (OUT / "mobilisation_ref.json").write_text(
            json.dumps(ref, ensure_ascii=False, indent=1), encoding="utf-8"
        )
        print(f"   ✓ {ref['mob_france']} voix sur {ref['n_bv']} bureaux")
    else:
        print(
            f"   {prep_mobilisation.SOURCE_DEFAUT} absent — étape ignorée "
            "(cloner elections_predictions pour les versions 2 et 3)"
        )

    # Le manifeste est écrit par prep_bake, qui termine aussi bien cette chaîne que
    # celle de regen_elections : écrit ici, il dérivait à chaque régénération partielle.
    prep_bake.ecrire_manifest(OUT)
    print("✓ prepare_data terminé — enchaîner prep_bake.py")


if __name__ == "__main__":
    main()
