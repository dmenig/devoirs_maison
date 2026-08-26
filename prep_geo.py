"""Fonds de carte (contours WGS84/GeoJSON) à toutes les échelles, pour la carte
cliquable. Régions/départements/communes proviennent de france-geojson ; les IRIS
depuis l'IGN."""

from __future__ import annotations

import json
import subprocess
import time
from pathlib import Path

import geopandas as gpd
import shapely

FG = "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master"
# Les fonds france-geojson s'arrêtent à la MÉTROPOLE : 13 régions, 96 départements, et
# pas une commune ultramarine. La Guadeloupe, la Martinique, la Guyane, La Réunion et
# Mayotte n'avaient donc de contour à aucune échelle — introuvables sur la carte, alors
# que leurs valeurs sont bakées depuis toujours et que leurs bureaux de vote, eux, ont
# bien un contour. geo.api.gouv.fr (Etalab) sert leurs communes ; le département et la
# région n'y ont pas de géométrie, mais un DROM est à lui seul un département ET une
# région, donc l'union de ses communes donne exactement les deux.
API_GEO = "https://geo.api.gouv.fr"
DROM = {"971": "01", "972": "02", "973": "03", "974": "04", "976": "06"}
# L'union des communes garde CHAQUE sommet de littoral au trait de l'IGN : les cinq
# contours ultramarins pesaient à eux seuls 83 742 sommets, plus que les treize régions
# métropolitaines réunies (75 961), pour des îles qui ne s'affichent qu'entre les zooms
# 6 et 11. On simplifie donc le seul tracé d'ensemble — 9 270 sommets, 0,11 % d'écart de
# surface au pire, et ~55 m d'erreur, soit moins d'un pixel jusqu'au zoom 11. Les contours
# COMMUNAUX, eux, restent au trait exact : ce sont eux qu'on colore et qu'on clique.
TOL_DROM = 0.0005


def _telecharger(url: str, dest: Path, essais: int = 4) -> bool:
    dest.parent.mkdir(parents=True, exist_ok=True)
    for i in range(essais):
        r = subprocess.run(
            ["curl", "-sSL", "--max-time", "180", "-o", str(dest), url],
            capture_output=True,
        )
        if r.returncode == 0 and dest.exists() and dest.stat().st_size > 500:
            return True
        time.sleep(5 * (i + 1))
    return False


def contours_de_base(geo_dir: Path) -> None:
    for nom in ("regions", "departements"):
        dest = geo_dir / f"{nom}.geojson"
        if not dest.exists():
            _telecharger(f"{FG}/{nom}.geojson", dest)


def contours_communes(geo_dir: Path) -> None:
    """Télécharge le fond communal national puis le découpe par département."""
    com_dir = geo_dir / "communes"
    com_dir.mkdir(parents=True, exist_ok=True)
    if any(com_dir.glob("*.geojson")):
        return
    plein = geo_dir / "_communes_full.geojson"
    if not plein.exists() and not _telecharger(f"{FG}/communes.geojson", plein):
        return
    gdf = gpd.read_file(plein)
    gdf["dep"] = (
        gdf["code"].str[:3].where(gdf["code"].str.startswith("97"), gdf["code"].str[:2])
    )
    for dep, sous in gdf.groupby("dep"):
        sous[["code", "nom", "geometry"]].to_file(
            com_dir / f"{dep}.geojson", driver="GeoJSON"
        )


def _api_json(url: str):
    r = subprocess.run(["curl", "-sSL", "--max-time", "180", url], capture_output=True)
    return json.loads(r.stdout) if r.returncode == 0 and r.stdout else None


def _ajouter_contours(dest: Path, features: list[dict]) -> int:
    """Complète un fond existant sans réécrire ses propres contours : on ajoute au
    niveau JSON plutôt que via geopandas, qui reprojetterait et réencoderait les 96
    départements métropolitains pour cinq ajouts."""
    fc = json.loads(dest.read_text())
    presents = {str(f["properties"].get("code")) for f in fc["features"]}
    neuf = [f for f in features if str(f["properties"]["code"]) not in presents]
    if neuf:
        fc["features"].extend(neuf)
        dest.write_text(json.dumps(fc, ensure_ascii=False, separators=(",", ":")))
    return len(neuf)


def contours_drom(geo_dir: Path) -> None:
    """Ajoute les cinq DROM aux fonds région / département / commune (cf. DROM)."""
    com_dir = geo_dir / "communes"
    com_dir.mkdir(parents=True, exist_ok=True)
    par_fond: dict[str, list[dict]] = {"regions": [], "departements": []}
    for dep, reg in DROM.items():
        f = com_dir / f"{dep}.geojson"
        if not f.exists() and not _telecharger(
            f"{API_GEO}/communes?codeDepartement={dep}"
            "&format=geojson&geometry=contour&fields=code,nom",
            f,
        ):
            print(f"   DROM {dep} : communes indisponibles — ignoré")
            continue
        ensemble = gpd.read_file(f).geometry.union_all()
        contour = shapely.geometry.mapping(
            ensemble.simplify(TOL_DROM, preserve_topology=True)
        )
        for fond, code, url in (
            ("departements", dep, f"{API_GEO}/departements/{dep}"),
            ("regions", reg, f"{API_GEO}/regions/{reg}"),
        ):
            nom = (_api_json(url) or {}).get("nom", code)
            par_fond[fond].append(
                {
                    "type": "Feature",
                    "properties": {"code": code, "nom": nom},
                    "geometry": contour,
                }
            )
    for fond, features in par_fond.items():
        dest = geo_dir / f"{fond}.geojson"
        if dest.exists():
            print(f"   {fond} : {_ajouter_contours(dest, features)} DROM ajoutés")


def contours_iris(iris_gpkg: Path, geo_dir: Path) -> None:
    """Découpe les contours IRIS de l'IGN par département (si disponibles)."""
    iris_dir = geo_dir / "iris"
    if not iris_gpkg.exists() or any(iris_dir.glob("*.geojson")):
        return
    iris_dir.mkdir(parents=True, exist_ok=True)
    gdf = gpd.read_file(iris_gpkg).to_crs(4326)
    cols = {c.upper(): c for c in gdf.columns}
    code_iris = gdf[cols.get("CODE_IRIS", list(gdf.columns)[0])].astype(str)
    nom = cols.get("NOM_IRIS")
    gdf["code_iris"] = code_iris
    gdf["nom_iris"] = gdf[nom] if nom else code_iris
    gdf["dep"] = gdf["code_iris"].str[:2]
    for dep, sous in gdf.groupby("dep"):
        sous[["code_iris", "nom_iris", "geometry"]].to_file(
            iris_dir / f"{dep}.geojson", driver="GeoJSON"
        )


def telecharger_iris_ign(url: str, sept_z: Path, gpkg: Path, essais: int = 6) -> bool:
    """Télécharge + extrait les contours IRIS IGN (sujet au throttling 429)."""
    if gpkg.exists():
        return True
    if not sept_z.exists() and not _telecharger(url, sept_z, essais=essais):
        return False
    r = subprocess.run(
        f"7z e {sept_z} -so -r 'iris.gpkg' > {gpkg}", shell=True, capture_output=True
    )
    return gpkg.exists() and gpkg.stat().st_size > 1000
