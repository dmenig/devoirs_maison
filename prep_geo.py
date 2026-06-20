"""Fonds de carte (contours WGS84/GeoJSON) à toutes les échelles, pour la carte
cliquable. Régions/départements/communes proviennent de france-geojson ; les
circonscriptions sont reconstruites depuis le fond INSEE ; les IRIS depuis l'IGN."""

from __future__ import annotations

import json
import subprocess
import time
import zipfile
from pathlib import Path

import geopandas as gpd

FG = "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master"


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


def contours_circonscriptions(insee_zip: Path, geo_dir: Path) -> None:
    """Reconstruit les contours de circonscriptions puis les découpe par département
    (geo/circ/<dep>.geojson), pour ne charger côté carte que les circos du département."""
    circ_dir = geo_dir / "circ"
    if any(circ_dir.glob("*.geojson")) or not insee_zip.exists():
        return
    with zipfile.ZipFile(insee_zip) as z:
        shp = next(n for n in z.namelist() if n.endswith(".shp"))
        tmp = geo_dir / "_circo_src"
        z.extractall(tmp)
    gdf = gpd.read_file(tmp / shp).to_crs(4326)
    cols = {c.lower(): c for c in gdf.columns}
    dep = gdf[cols.get("dep", "dep")].astype(str)
    idc = gdf[cols.get("id_circo", "id_circo")].astype(str)
    gdf["code_circonscription"] = dep.str.zfill(2) + "-" + idc.str[-2:].str.zfill(2)
    gdf["dep"] = gdf["code_circonscription"].str.split("-").str[0]
    circ_dir.mkdir(parents=True, exist_ok=True)
    for d, sous in gdf.groupby("dep"):
        sous[["code_circonscription", "geometry"]].to_file(
            circ_dir / f"{d}.geojson", driver="GeoJSON"
        )


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
