"""Découpe le fichier national des contours de bureaux de vote (data.gouv,
« Proposition de contours des bureaux de vote », méthode Voronoï) par département,
pour un chargement paresseux par l'app."""

from __future__ import annotations

import math
from pathlib import Path

import geopandas as gpd

# Fiabilité géométrique (chantier 4) : les contours Voronoï data.gouv sont approchés. Un
# découpage absurde se trahit par des polygones disjoints (fragmentation) ou très peu
# compacts (Polsby-Popper). Au-delà des seuils, le contour n'est pas considéré fiable et la
# carte ne l'affiche pas (les résultats restent disponibles via l'export).
BV_MAX_PARTS = 2
BV_MIN_COMPACITE = 0.12


def _fiable(geom) -> int:
    if geom is None or geom.is_empty:
        return 0
    parts = len(geom.geoms) if geom.geom_type == "MultiPolygon" else 1
    if parts > BV_MAX_PARTS:
        return 0
    perim = geom.length
    compacite = 4 * math.pi * geom.area / (perim * perim) if perim else 0
    return int(compacite >= BV_MIN_COMPACITE)


# Champs possibles selon les versions du jeu de données.
CHAMPS_COMMUNE = (
    "codecommune",
    "code_commune",
    "insee",
    "codeinsee",
    "cog",
    "com",
    "id_commune",
)
CHAMPS_BUREAU = (
    "codebureauvote",
    "code_bureau",
    "numerobureauvote",
    "id_bv",
    "bureau",
    "codebureau",
    "numero",
    "id_brut",
)


def _trouver(cols: dict[str, str], candidats: tuple[str, ...]) -> str | None:
    for k in candidats:
        if k in cols:
            return cols[k]
    return None


def split_bv(src_geojson: Path, out_dir: Path) -> dict[str, str]:
    out_dir.mkdir(parents=True, exist_ok=True)
    gdf = gpd.read_file(src_geojson)
    if gdf.crs and gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs(4326)
    cols = {c.lower(): c for c in gdf.columns}
    cc = _trouver(cols, CHAMPS_COMMUNE)
    bv = _trouver(cols, CHAMPS_BUREAU)
    if cc is None:
        raise ValueError(f"Champ code commune introuvable parmi {list(gdf.columns)}")
    gdf["code_commune"] = gdf[cc].astype(str).str.zfill(5)
    gdf["bureau"] = gdf[bv].astype(str) if bv else ""
    gdf["fiable"] = gdf.geometry.map(_fiable)
    gdf["dep"] = (
        gdf["code_commune"]
        .str[:3]
        .where(gdf["code_commune"].str.startswith("97"), gdf["code_commune"].str[:2])
    )
    for dep, sous in gdf.groupby("dep"):
        sous[["code_commune", "bureau", "fiable", "geometry"]].to_file(
            out_dir / f"{dep}.geojson", driver="GeoJSON"
        )
    return {"champ_commune": cc, "champ_bureau": str(bv), "n": str(len(gdf))}
