"""Construction des cartes choroplèthes cliquables (folium)."""

from __future__ import annotations

import branca.colormap as cm
import folium

SCHEMES: dict[str, list[str]] = {
    "Reds": ["#fff5f0", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"],
    "Greens": ["#f7fcf5", "#bae4b3", "#74c476", "#31a354", "#006d2c"],
    "Blues": ["#f7fbff", "#bdd7e7", "#6baed6", "#3182bd", "#08519c"],
    "Oranges": ["#feedde", "#fdbe85", "#fd8d3c", "#e6550d", "#a63603"],
    "Greys": ["#f7f7f7", "#cccccc", "#969696", "#636363", "#252525"],
    "RdPu": ["#feebe2", "#fbb4b9", "#f768a1", "#c51b8a", "#7a0177"],
    "PuBu": ["#f1eef6", "#bdc9e1", "#74a9cf", "#2b8cbe", "#045a8d"],
}


def _bornes(features: list[dict]) -> list[list[float]] | None:
    xs: list[float] = []
    ys: list[float] = []

    def parcourir(coords):
        if isinstance(coords[0], (int, float)):
            xs.append(coords[0])
            ys.append(coords[1])
        else:
            for c in coords:
                parcourir(c)

    for f in features:
        geom = f.get("geometry")
        if geom and geom.get("coordinates"):
            parcourir(geom["coordinates"])
    if not xs:
        return None
    return [[min(ys), min(xs)], [max(ys), max(xs)]]


def _colormap(values, scheme: str) -> cm.LinearColormap | None:
    vals = [float(v) for v in values if v is not None]
    if not vals:
        return None
    vmin, vmax = min(vals), max(vals)
    if vmin == vmax:
        vmax = vmin + 1
    return cm.LinearColormap(SCHEMES.get(scheme, SCHEMES["Reds"]), vmin=vmin, vmax=vmax)


def choropleth(
    gj: dict, values: dict, code_prop: str, label: str, unit: str, scheme: str,
    bounds: list[list[float]] | None = None,
) -> folium.Map:
    cmap = _colormap(values.values(), scheme)
    feats = []
    for f in gj["features"]:
        code = str(f["properties"].get(code_prop))
        v = values.get(code)
        nf = {"type": "Feature", "geometry": f["geometry"], "properties": dict(f["properties"])}
        nf["properties"]["_code"] = code
        nf["properties"]["_nom"] = f["properties"].get("nom") or f["properties"].get("nom_iris") or code
        nf["properties"]["_val"] = None if v is None else round(float(v), 1)
        feats.append(nf)
    data = {"type": "FeatureCollection", "features": feats}

    m = folium.Map(tiles="cartodbpositron", zoom_control=True, control_scale=True)
    bornes = bounds or _bornes(feats)
    if bornes:
        m.fit_bounds(bornes)

    def style(feat):
        v = feat["properties"]["_val"]
        return {
            "fillColor": cmap(v) if (cmap and v is not None) else "#dddddd",
            "color": "#444", "weight": 0.6, "fillOpacity": 0.78,
        }

    folium.GeoJson(
        data,
        style_function=style,
        highlight_function=lambda _f: {"weight": 2.5, "color": "#000", "fillOpacity": 0.9},
        tooltip=folium.GeoJsonTooltip(
            fields=["_nom", "_val"], aliases=["", f"{label} ({unit}) :"], localize=True
        ),
    ).add_to(m)

    if cmap:
        cmap.caption = f"{label} ({unit})"
        cmap.add_to(m)
    return m
